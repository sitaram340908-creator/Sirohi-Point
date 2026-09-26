import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { AdminPermissionsGuard } from './admin-permissions.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, AdminPermissionsGuard],
  exports: [AuthService, AuthGuard, RolesGuard, AdminPermissionsGuard],
})
export class AuthModule {}
