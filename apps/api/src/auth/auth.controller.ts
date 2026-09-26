import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { businessRegisterInputSchema, contractorRegisterInputSchema, customerProfileUpdateSchema, customerRegisterInputSchema, loginInputSchema } from '../shared/contracts';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = customerRegisterInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.auth.register(parsed.data) };
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const parsed = loginInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.auth.login(parsed.data) };
  }

  @Post('register-business')
  async registerBusiness(@Body() body: unknown) {
    const parsed = businessRegisterInputSchema.partial({ billingAddress: true }).safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.auth.registerBusiness({ ...parsed.data, billingAddress: parsed.data.billingAddress ?? '' }) };
  }

  @Post('register-contractor')
  async registerContractor(@Body() body: unknown) {
    const parsed = contractorRegisterInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.auth.registerContractor(parsed.data) };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return { data: user };
  }

  @UseGuards(AuthGuard)
  @Post('refresh')
  async refresh(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.auth.refreshSession(user) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Patch('me')
  async updateMe(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = customerProfileUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.auth.updateCustomerProfile(user.id, parsed.data) };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('BUSINESS')
  @Get('business-profile')
  businessProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getBusinessProfile(user).then((data) => ({ data }));
  }
}
