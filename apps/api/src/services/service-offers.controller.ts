import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { serviceOfferInputSchema } from '../shared/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminPermission } from '../auth/admin-permission.decorator';
import { AdminPermissionsGuard } from '../auth/admin-permissions.guard';
import { ServiceOffersService } from './service-offers.service';

@Controller({ path: 'services/offers', version: '1' })
export class PublicServiceOffersController {
  constructor(private readonly offers: ServiceOffersService) {}
  @Get() async list() { return { data: await this.offers.list() }; }
}

@Controller({ path: 'admin/service-offers', version: '1' })
@UseGuards(AuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles('SUPER_ADMIN', 'SUB_ADMIN')
export class AdminServiceOffersController {
  constructor(private readonly offers: ServiceOffersService) {}
  @Get() @AdminPermission('serviceOffers.view') async list() { return { data: await this.offers.list(true) }; }
  @Post() @AdminPermission('serviceOffers.create') async create(@Body() body: unknown) { return { data: await this.offers.save(this.parse(body)) }; }
  @Patch(':id') @AdminPermission('serviceOffers.edit') async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: unknown) { return { data: await this.offers.save(this.parse(body), id) }; }
  private parse(body: unknown) {
    const parsed = serviceOfferInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return parsed.data;
  }
}
