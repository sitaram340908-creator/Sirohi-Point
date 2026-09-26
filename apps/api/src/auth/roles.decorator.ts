import { SetMetadata } from '@nestjs/common';
import type { PlatformRole } from '../shared/contracts';

export const ROLES_KEY = 'sirohi_roles';
export const Roles = (...roles: PlatformRole[]) =>
  SetMetadata(ROLES_KEY, roles);

