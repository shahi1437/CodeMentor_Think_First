import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getVerifiedRole, portalDestination } from '@/lib/auth';
import { BackendRequestError } from '@/lib/backend';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const login = new URL('/auth/login', request.url);
  login.searchParams.set('authError', 'confirmation');
  const redirect = (url: URL) => NextResponse.redirect(url, {
    headers: { 'Cache-Control': 'private, no-store' },
  });

  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase || !code) return redirect(login);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) return redirect(login);

    const role = await getVerifiedRole(data.session.access_token);
    return redirect(new URL(portalDestination(role), request.url));
  } catch (error) {
    if (error instanceof BackendRequestError) {
      login.searchParams.set('authError', error.status === 403 ? 'profile' : 'unavailable');
    }
    return redirect(login);
  }
}
