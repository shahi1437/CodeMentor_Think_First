import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canAccessPortal, getVerifiedRole, portalDestination, requiredPortal } from '@/lib/auth';
import { BackendRequestError } from '@/lib/backend';
import { getSupabaseConfig } from '@/lib/supabase/config';

export async function proxy(request: NextRequest) {
  const portal = requiredPortal(request.nextUrl.pathname);
  if (!portal) return NextResponse.next();

  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
  const settings = getSupabaseConfig();
  if (!settings) {
    loginUrl.searchParams.set('authError', 'configuration');
    return NextResponse.redirect(loginUrl);
  }

  const sessionCookies: { name: string; value: string; options: CookieOptions }[] = [];
  const sessionHeaders = new Headers();
  const supabase = createServerClient(settings.url, settings.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          sessionCookies.push(cookie);
        }
        for (const [name, value] of Object.entries(headers)) sessionHeaders.set(name, value);
      },
    },
  });

  const finish = (response: NextResponse) => {
    for (const { name, value, options } of sessionCookies) response.cookies.set(name, value, options);
    sessionHeaders.forEach((value, name) => response.headers.set(name, value));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };

  try {
    // FastAPI verifies the cookie's bearer token and reads the persisted role
    // before a page is authorized.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return finish(NextResponse.redirect(loginUrl));

    const role = await getVerifiedRole(session.access_token);
    if (!canAccessPortal(role, portal)) {
      return finish(NextResponse.redirect(new URL(portalDestination(role), request.url)));
    }
    return finish(NextResponse.next({ request }));
  } catch (error) {
    const status = error instanceof BackendRequestError ? error.status : 503;
    if (status !== 401) loginUrl.searchParams.set('authError', status === 403 ? 'profile' : 'unavailable');
    return finish(NextResponse.redirect(loginUrl));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
