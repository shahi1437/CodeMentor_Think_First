import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseMiddlewareClient } from '@/lib/supabase/server';

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/register', '/_next'];
const STUDENT_PATHS = ['/dashboard', '/assessment', '/problems', '/workspace', '/analyzer', '/mentor', '/learning-dna', '/daily-plan', '/history'];
const TEACHER_PATHS = ['/teacher'];
const ADMIN_PATHS = ['/admin'];

const routeMatches = (pathname: string, matches: string[]) => matches.some((base) => pathname === base || pathname.startsWith(`${base}/`));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith('/_next'))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = getSupabaseMiddlewareClient(request, response);
  if (!supabase) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  const role = (user.app_metadata?.role ?? user.user_metadata?.role ?? 'student') as string;
  const normalizedRole = role === 'teacher' ? 'teacher' : role === 'admin' ? 'admin' : 'student';

  const isStudentRoute = routeMatches(pathname, STUDENT_PATHS);
  const isTeacherRoute = routeMatches(pathname, TEACHER_PATHS);
  const isAdminRoute = routeMatches(pathname, ADMIN_PATHS);

  if (isStudentRoute && normalizedRole !== 'student') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (isTeacherRoute && normalizedRole !== 'teacher' && normalizedRole !== 'admin') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (isAdminRoute && normalizedRole !== 'admin') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
