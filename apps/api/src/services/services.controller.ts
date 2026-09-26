import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  contractorProfileInputSchema,
  nearbyContractorQuerySchema,
  serviceBookingInputSchema,
} from '../shared/contracts';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ServicesService } from './services.service';

@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CONTRACTOR')
  @Post('contractor/profile')
  async saveProfile(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = contractorProfileInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.services.saveProfile(user, parsed.data) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CONTRACTOR')
  @Get('contractor/profile')
  async profile(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.services.getProfile(user) };
  }

  @Get('contractors/nearby')
  async nearby(@Query() query: Record<string, unknown>) {
    const parsed = nearbyContractorQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.services.nearby(parsed.data) };
  }

  @Get('contractors/:id')
  async publicProfile(@Param('id') id: string) { return { data: await this.services.publicProfile(id) }; }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Post('bookings')
  async createBooking(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = serviceBookingInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.services.createBooking(user.id, parsed.data) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Get('bookings')
  async customerBookings(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.services.listForCustomer(user.id) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CONTRACTOR')
  @Get('contractor/bookings')
  async contractorBookings(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.services.listForContractor(user) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CONTRACTOR')
  @Patch('bookings/:id/accept')
  async accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.services.respondAsTechnician(id, user.id, true) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CONTRACTOR')
  @Patch('bookings/:id/reject')
  async reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.services.respondAsTechnician(id, user.id, false) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Patch('bookings/:id/customer-complete')
  async customerComplete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.services.confirmCompletionAsCustomer(id, user.id) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CONTRACTOR')
  @Patch('bookings/:id/complete')
  async complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.services.completeAsTechnician(id, user.id) };
  }
}

