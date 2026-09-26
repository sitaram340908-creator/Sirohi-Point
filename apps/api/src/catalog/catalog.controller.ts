import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { catalogQuerySchema } from '../shared/contracts';

import { CatalogService } from './catalog.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { AuthService } from '../auth/auth.service';

@Controller({ path: 'catalog', version: '1' })
export class CatalogController {
  constructor(private readonly catalogService: CatalogService, private readonly auth: AuthService) {}

  private async hasBusinessAccess(request: Request) {
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) return false;
    try {
      return (await this.auth.resolveToken(token)).role === 'BUSINESS';
    } catch {
      return false;
    }
  }

  @Get()
  async findAll(@Query() query: CatalogQueryDto) {
    return this.findAllB2c(query);
  }

  @Get('categories')
  async findCategories() {
    return { data: await this.catalogService.findCategories() };
  }

  @Get('b2c')
  async findAllB2c(@Query() query: CatalogQueryDto) {
    const parsed = catalogQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const products = await this.catalogService.findAllForSegment(parsed.data, 'B2C');
    return { data: products, meta: { count: products.length } };
  }

  @Get('b2c/:id')
  async findOneB2c(@Param('id') id: string) {
    return { data: await this.catalogService.findOneForSegment(id, 'B2C') };
  }

  @Get('b2b')
  async findAllB2b(@Query() query: CatalogQueryDto, @Req() request: Request) {
    const parsed = catalogQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const products = await this.catalogService.findAllForSegment(parsed.data, 'B2B', await this.hasBusinessAccess(request));
    return { data: products, meta: { count: products.length } };
  }

  @Get('b2b/:id')
  async findOneB2b(@Param('id') id: string, @Req() request: Request) {
    return { data: await this.catalogService.findOneForSegment(id, 'B2B', await this.hasBusinessAccess(request)) };
  }

}

