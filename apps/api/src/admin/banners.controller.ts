import { Controller, Get } from '@nestjs/common';

import { AdminService } from './admin.service';

@Controller({ path: 'banners', version: '1' })
export class BannersController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async findAll() {
    const banners = await this.admin.listBanners(true, 'B2C');
    return { data: banners, meta: { count: banners.length } };
  }

  @Get('b2c')
  async findB2c() {
    const banners = await this.admin.listBanners(true, 'B2C');
    return { data: banners, meta: { count: banners.length } };
  }

  @Get('b2b')
  async findB2b() {
    const banners = await this.admin.listBanners(true, 'B2B');
    return { data: banners, meta: { count: banners.length } };
  }
}
