import { SetMetadata } from '@nestjs/common';
import type { AdminPermissionKey } from '../shared/contracts';

export const ADMIN_PERMISSION_KEY = 'admin-permission';
export const AdminPermission = (...permissions: AdminPermissionKey[]) =>
  SetMetadata(ADMIN_PERMISSION_KEY, permissions);
