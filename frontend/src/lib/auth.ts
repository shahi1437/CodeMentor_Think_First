import { Role } from '@/types';

export type AuthSession = {
  role: Role;
  email: string;
  full_name?: string | null;
  id?: string;
};

export function normalizeRole(value: string | null | undefined): Role {
  if (value === 'teacher') return 'teacher';
  if (value === 'admin') return 'admin';
  return 'student';
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('codementor_session');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed && parsed.role ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('codementor_session', JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('codementor_session');
}
