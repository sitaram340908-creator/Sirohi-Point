import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminPermissionKey } from '../shared/contracts';
import type { AuthenticatedUser } from './auth.types';
import { ADMIN_PERMISSION_KEY } from './admin-permission.decorator';

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: Parameters<CanActivate['canActivate']>[0]) {
    const permissions = this.reflector.get<AdminPermissionKey[]>(
      ADMIN_PERMISSION_KEY,
      context.getHandler(),
    );
    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (user?.role === 'SUPER_ADMIN') return true;
    if (permissions?.length && user?.role === 'SUB_ADMIN' && permissions.some((permission) => user.adminPermissions?.includes(permission))) return true;
    throw new ForbiddenException('You do not have permission to perform this action');
  }
}
