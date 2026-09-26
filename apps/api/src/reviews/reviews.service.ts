import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminProductReview, CreateProductReviewInput, ProductReview as ProductReviewDto } from '../shared/contracts';

import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';

const reviewInclude = { user: { select: { id: true, name: true } } } as const;
type ReviewRecord = Prisma.ProductReviewGetPayload<{ include: typeof reviewInclude }>;
type MemoryReview = ProductReviewDto & { userId: string };
const adminReviewInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  product: { select: { name: true, slug: true } },
} as const;
type AdminReviewRecord = Prisma.ProductReviewGetPayload<{ include: typeof adminReviewInclude }>;

@Injectable()
export class ReviewsService {
  private readonly memoryReviews: MemoryReview[] = [];

  constructor(private readonly catalog: CatalogService, private readonly prisma: PrismaService) {}

  async list(productId: string): Promise<ProductReviewDto[]> {
    await this.catalog.findOneForSegment(productId, 'B2C');
    if (!process.env.DATABASE_URL) {
      return this.memoryReviews
        .filter(review => review.productId === productId)
        .map(({ userId: _userId, ...review }) => review);
    }
    const reviews = await this.prisma.productReview.findMany({
      where: { productId },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map(review => this.toReview(review));
  }

  async create(productId: string, userId: string, input: CreateProductReviewInput): Promise<ProductReviewDto> {
    await this.catalog.findOneForSegment(productId, 'B2C');
    if (!process.env.DATABASE_URL) {
      if (this.memoryReviews.some(review => review.productId === productId && review.userId === userId)) {
        throw new ConflictException('You have already reviewed this product');
      }
      const review: MemoryReview = {
        id: 'review-' + Date.now() + '-' + this.memoryReviews.length,
        productId,
        userId,
        customerId: userId,
        customerName: 'You',
        rating: input.rating,
        ...(input.title?.trim() ? { title: input.title.trim() } : {}),
        comment: input.comment.trim(),
        createdAt: new Date().toISOString(),
      };
      this.memoryReviews.unshift(review);
      const { userId: _userId, ...publicReview } = review;
      return publicReview;
    }

    try {
      const review = await this.prisma.$transaction(async (tx) => {
        const created = await tx.productReview.create({
          data: {
            productId,
            userId,
            rating: input.rating,
            title: input.title?.trim() || null,
            comment: input.comment.trim(),
          },
          include: reviewInclude,
        });
        const summary = await tx.productReview.aggregate({
          where: { productId },
          _avg: { rating: true },
          _count: { _all: true },
        });
        await tx.product.update({
          where: { id: productId },
          data: {
            rating: summary._avg.rating ?? 0,
            reviewCount: summary._count._all,
          },
        });
        return created;
      });
      return this.toReview(review);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this product');
      }
      throw error;
    }
  }

  async listForAdmin(): Promise<AdminProductReview[]> {
    if (!process.env.DATABASE_URL) {
      return this.memoryReviews.map((review) => ({
        ...review,
        customerId: review.userId,
        productName: review.productId,
        productSlug: review.productId,
      }));
    }
    const reviews = await this.prisma.productReview.findMany({
      include: adminReviewInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((review) => this.toAdminReview(review));
  }

  async removeForAdmin(id: string): Promise<{ id: string }> {
    if (!process.env.DATABASE_URL) {
      const index = this.memoryReviews.findIndex((review) => review.id === id);
      if (index < 0) throw new NotFoundException('Review not found');
      this.memoryReviews.splice(index, 1);
      return { id };
    }

    await this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.findUnique({ where: { id }, select: { productId: true } });
      if (!review) throw new NotFoundException('Review not found');
      await tx.productReview.delete({ where: { id } });
      const summary = await tx.productReview.aggregate({
        where: { productId: review.productId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await tx.product.update({
        where: { id: review.productId },
        data: {
          rating: summary._avg.rating ?? 0,
          reviewCount: summary._count._all,
        },
      });
    });
    return { id };
  }

  async removeForCustomer(productId: string, id: string, userId: string): Promise<{ id: string }> {
    await this.catalog.findOneForSegment(productId, 'B2C');
    if (!process.env.DATABASE_URL) {
      const index = this.memoryReviews.findIndex((review) => review.id === id && review.productId === productId && review.userId === userId);
      if (index < 0) throw new NotFoundException('Review not found');
      this.memoryReviews.splice(index, 1);
      return { id };
    }

    await this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.findFirst({ where: { id, productId, userId }, select: { productId: true } });
      if (!review) throw new NotFoundException('Review not found');
      await tx.productReview.delete({ where: { id } });
      const summary = await tx.productReview.aggregate({
        where: { productId: review.productId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await tx.product.update({
        where: { id: review.productId },
        data: {
          rating: summary._avg.rating ?? 0,
          reviewCount: summary._count._all,
        },
      });
    });
    return { id };
  }

  private toReview(review: ReviewRecord): ProductReviewDto {
    return {
      id: review.id,
      productId: review.productId,
      customerId: review.user.id,
      customerName: review.user.name,
      rating: review.rating,
      ...(review.title ? { title: review.title } : {}),
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }

  private toAdminReview(review: AdminReviewRecord): AdminProductReview {
    return {
      id: review.id,
      productId: review.productId,
      customerId: review.user.id,
      customerName: review.user.name,
      ...(review.user.email ? { customerEmail: review.user.email } : {}),
      ...(review.user.phone ? { customerPhone: review.user.phone } : {}),
      productName: review.product.name,
      productSlug: review.product.slug,
      rating: review.rating,
      ...(review.title ? { title: review.title } : {}),
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }
}
