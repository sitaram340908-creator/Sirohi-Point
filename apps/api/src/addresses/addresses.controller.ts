import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { customerAddressInputSchema } from '../shared/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AddressesService } from './addresses.service';

@Controller({ path: 'addresses', version: '1' })
@UseGuards(AuthGuard, RolesGuard)
@Roles('CUSTOMER', 'BUSINESS')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.addresses.list(user.id).then((data) => ({ data })); }
  @Post() save(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = customerAddressInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.addresses.save(user.id, parsed.data).then((data) => ({ data }));
  }
  @Patch(':id') update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = customerAddressInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.addresses.update(user.id, id, parsed.data).then((data) => ({ data }));
  }
  @Patch(':id/default') makeDefault(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.addresses.makeDefault(user.id, id).then((data) => ({ data })); }
}

