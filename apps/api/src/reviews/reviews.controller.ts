import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { createProductReviewSchema } from '../shared/contracts';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReviewsService } from './reviews.service';

@Controller({ path: 'catalog/b2c', version: '1' })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':productId/reviews')
  async list(@Param('productId') productId: string) {
    return { data: await this.reviews.list(productId) };
  }

  @Post(':productId/reviews')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  async create(
    @Param('productId') productId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = createProductReviewSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.reviews.create(productId, user.id, parsed.data) };
  }

  @Delete(':productId/reviews/:reviewId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  async remove(
    @Param('productId') productId: string,
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.reviews.removeForCustomer(productId, reviewId, user.id) };
  }
}
