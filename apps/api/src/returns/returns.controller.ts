import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createReturnRequestSchema, returnRequestStatusUpdateSchema } from '@sirohi/contracts';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReturnsService } from './returns.service';

@Controller({ path: 'returns', version: '1' })
@UseGuards(AuthGuard, RolesGuard)
@Roles('CUSTOMER', 'BUSINESS')
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get()
  async list(@CurrentUser() customer: AuthenticatedUser) {
    return { data: await this.returns.listForCustomer(customer.id) };
  }

  @Post()
  async create(@Body() body: unknown, @CurrentUser() customer: AuthenticatedUser) {
    const parsed = createReturnRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.returns.create(parsed.data, customer.id) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() customer: AuthenticatedUser) {
    return { data: await this.returns.findOneForCustomer(customer.id, id) };
  }
}

@Controller({ path: 'admin/returns', version: '1' })
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get()
  async list() {
    return { data: await this.returns.listForAdmin() };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: unknown, @CurrentUser() admin: AuthenticatedUser) {
    const parsed = returnRequestStatusUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.returns.updateStatus(id, parsed.data, admin.id) };
  }
}
