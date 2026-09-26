import type { AdminPermissionKey, PlatformRole } from '../shared/contracts';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  customerLocation?: string | null;
  role: PlatformRole;
  adminPermissions?: AdminPermissionKey[];
  active: boolean;
  createdAt: string;
}
