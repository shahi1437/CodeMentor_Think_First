import { BackendRequestError, backendRequestWithToken } from '@/lib/backend';
import type { Role } from '@/types';

const portalPaths: Record<Role, string> = {
  student: '/dashboard',
  teacher: '/teacher',
  admin: '/admin',
};

const studentPaths = [
  '/dashboard', '/assessment', '/problems', '/workspace', '/analyzer',
  '/mentor', '/learning-dna', '/daily-plan', '/history',
];

const isWithin = (path: string, base: string) => path === base || path.startsWith(base + '/');

export function requiredPortal(path: string): Role | undefined {
  if (isWithin(path, '/admin')) return 'admin';
  if (isWithin(path, '/teacher')) return 'teacher';
  if (studentPaths.some((base) => isWithin(path, base))) return 'student';
}

export function canAccessPortal(role: Role, portal: Role) {
  return role === portal || (role === 'admin' && portal === 'teacher');
}

export function portalDestination(role: Role, requestedPath?: string | null) {
  if (requestedPath?.startsWith('/') && !requestedPath.startsWith('//')) {
    const origin = 'http://localhost';
    const url = new URL(requestedPath, origin);
    const portal = requiredPortal(url.pathname);
    if (url.origin === origin && portal && canAccessPortal(role, portal)) {
      return url.pathname + url.search;
    }
  }
  return portalPaths[role];
}

export async function getVerifiedRole(accessToken: string): Promise<Role> {
  const profile = await backendRequestWithToken<{ role?: unknown } | null>('/auth/me', accessToken, {
    signal: AbortSignal.timeout(8000),
  });
  const role = profile?.role;
  if (role === 'student' || role === 'teacher' || role === 'admin') return role;
  throw new BackendRequestError('The backend could not verify your account role.', 503);
}
