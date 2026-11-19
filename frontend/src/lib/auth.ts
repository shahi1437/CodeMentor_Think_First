import { BackendRequestError, backendRequestWithToken } from '@/lib/backend';
import type { Role } from '@/types';

export { canAccessPortal, portalDestination, requiredPortal } from './auth-access';

export async function getVerifiedRole(accessToken: string): Promise<Role> {
  const profile = await backendRequestWithToken<{ role?: unknown } | null>('/auth/me', accessToken, {
    signal: AbortSignal.timeout(8000),
  });
  const role = profile?.role;
  if (role === 'student' || role === 'teacher' || role === 'admin') return role;
  throw new BackendRequestError('The backend could not verify your account role.', 503);
}
