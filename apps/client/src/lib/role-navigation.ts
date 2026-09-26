import type { PlatformRole } from '@/shared/contracts';

export function getRoleHomePath(role: PlatformRole) {
  switch (role) {
    case 'BUSINESS': return '/business';
    case 'CONTRACTOR': return '/technician';
    case 'SUPER_ADMIN':
    case 'SUB_ADMIN': return '/admin';
    default: return '/';
  }
}
