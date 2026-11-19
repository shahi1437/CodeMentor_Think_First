export type Role = 'student' | 'teacher' | 'admin';

const portalPaths: Record<Role, string> = {
  student: '/dashboard',
  teacher: '/teacher',
  admin: '/admin',
};

const studentPaths = [
  '/dashboard', '/assessment', '/problems', '/workspace', '/analyzer',
  '/mentor', '/learning-dna', '/daily-plan', '/history',
];

const accessMatrix: Record<Role, readonly Role[]> = {
  student: ['student'],
  teacher: ['student', 'teacher'],
  admin: ['student', 'teacher', 'admin'],
};

const isWithin = (path: string, base: string) => path === base || path.startsWith(base + '/');

export function requiredPortal(path: string): Role | undefined {
  if (isWithin(path, '/admin')) return 'admin';
  if (isWithin(path, '/teacher')) return 'teacher';
  if (studentPaths.some((base) => isWithin(path, base))) return 'student';
}

export function canAccessPortal(role: Role, portal: Role) {
  return accessMatrix[role].includes(portal);
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
