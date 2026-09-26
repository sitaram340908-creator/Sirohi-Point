import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { Request } from 'express';
import {
  adminBannerInputSchema,
  adminProductInputSchema,
  adminHsnInputSchema,
  orderCancellationSchema,
  orderInvoiceUpdateSchema,
  orderRejectionSchema,
  orderStatusUpdateSchema,
  subAdminCreateSchema,
  subAdminUpdateSchema,
} from '../shared/contracts';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminPermission } from '../auth/admin-permission.decorator';
import { AdminPermissionsGuard } from '../auth/admin-permissions.guard';
import { AdminService } from './admin.service';

@Controller({ path: 'admin', version: '1' })
@UseGuards(AuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles('SUPER_ADMIN', 'SUB_ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @AdminPermission('overview.view')
  async overview() {
    return { data: await this.admin.overview() };
  }

  @Get('products')
  @AdminPermission('products.view')
  async products() {
    return { data: await this.admin.listProducts() };
  }

  @Get('hsn-master')
  @AdminPermission('hsn.view')
  async hsnMaster() {
    return { data: await this.admin.listHsnMaster() };
  }

  @Post('hsn-master')
  @AdminPermission('hsn.create')
  async createHsn(@Body() body: unknown) {
    const parsed = adminHsnInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.createHsnMaster(parsed.data) };
  }

  @Patch('hsn-master/:id')
  @AdminPermission('hsn.edit')
  async updateHsn(@Param('id') id: string, @Body() body: unknown) {
    const parsed = adminHsnInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.updateHsnMaster(id, parsed.data) };
  }

  @Delete('hsn-master/:id')
  @AdminPermission('hsn.delete')
  async removeHsn(@Param('id') id: string) {
    return { data: await this.admin.removeHsnMaster(id) };
  }


  @Post('products')
  @AdminPermission('products.create')
  async createProduct(@Body() body: unknown) {
    const parsed = adminProductInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.createProduct(parsed.data) };
  }

  @Patch('products/:id')
  @AdminPermission('products.edit')
  async updateProduct(@Param('id') id: string, @Body() body: unknown) {
    const parsed = adminProductInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.updateProduct(id, parsed.data) };
  }

  @Delete('products/:id')
  @AdminPermission('products.delete')
  async removeProduct(@Param('id') id: string) {
    return { data: await this.admin.removeProduct(id) };
  }

  @Get('users')
  @AdminPermission('users.view')
  async users() {
    return { data: await this.admin.listUsers() };
  }

  @Get('users/:id')
  @AdminPermission('users.view')
  async userProfile(@Param('id') id: string) {
    return { data: await this.admin.getUserProfile(id) };
  }

  @Delete('users/:id')
  @AdminPermission('users.remove')
  async removeUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.admin.removeUser(id, admin.id) };
  }

  @Patch('users/:id/restore')
  @AdminPermission('users.restore')
  async restoreUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.admin.restoreUser(id, admin.id) };
  }

  @Get('businesses')
  @AdminPermission('businesses.view')
  async businesses() {
    return { data: await this.admin.listBusinessProfiles() };
  }

  @Patch('businesses/:id/approve')
  @AdminPermission('businesses.approve')
  async approveBusiness(@Param('id') id: string) {
    return { data: await this.admin.approveBusiness(id) };
  }

  @Patch('businesses/:id/reject')
  @AdminPermission('businesses.reject')
  async rejectBusiness(@Param('id') id: string) {
    return { data: await this.admin.rejectBusiness(id) };
  }

  @Patch('businesses/:id/reapprove')
  @AdminPermission('businesses.reapprove')
  async reapproveBusiness(@Param('id') id: string) {
    return { data: await this.admin.reapproveBusiness(id) };
  }

  @Get('orders')
  @AdminPermission('orders.view')
  async orders() {
    return { data: await this.admin.listOrders() };
  }

  @Get('reviews')
  @AdminPermission('reviews.view')
  async reviews() {
    return { data: await this.admin.listReviews() };
  }

  @Delete('reviews/:id')
  @AdminPermission('reviews.delete')
  async removeReview(@Param('id') id: string) {
    return { data: await this.admin.removeReview(id) };
  }

  @Patch('orders/:id/approve')
  @AdminPermission('orders.approve')
  async approveOrder(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.admin.approveOrder(id, admin.id) };
  }

  @Patch('orders/:id/reject')
  @AdminPermission('orders.reject')
  async rejectOrder(@Param('id') id: string, @Body() body: unknown, @CurrentUser() admin: AuthenticatedUser) {
    const parsed = orderCancellationSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.rejectOrder(id, admin.id, parsed.data.reason) };
  }

  @Patch('orders/:id/cancel')
  @AdminPermission('orders.cancel')
  async cancelOrder(@Param('id') id: string, @Body() body: unknown, @CurrentUser() admin: AuthenticatedUser) {
    const parsed = orderCancellationSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.cancelOrder(id, admin.id, parsed.data.reason) };
  }

  @Patch('orders/:id/status')
  @AdminPermission('orders.status')
  async updateOrderStatus(@Param('id') id: string, @Body() body: unknown) {
    const parsed = orderStatusUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.updateOrderStatus(id, parsed.data.status) };
  }

  @Patch('orders/:id/invoice')
  @AdminPermission('orders.invoice')
  async updateOrderInvoice(@Param('id') id: string, @Body() body: unknown) {
    const parsed = orderInvoiceUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.updateOrderInvoice(id, parsed.data) };
  }

  @Get('service-bookings')
  @AdminPermission('serviceRequests.view')
  async serviceBookings() {
    return { data: await this.admin.listServiceBookings() };
  }

  @Patch('service-bookings/:id/approve')
  @AdminPermission('serviceRequests.approve')
  async approveServiceBooking(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.admin.approveServiceBooking(id, admin.id) };
  }

  @Patch('service-bookings/:id/reject')
  @AdminPermission('serviceRequests.reject')
  async rejectServiceBooking(@Param('id') id: string, @Body() body: unknown) {
    const parsed = orderRejectionSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.rejectServiceBooking(id, parsed.data.reason) };
  }

  @Get('contractors')
  @AdminPermission('technicians.view')
  async contractors() {
    return { data: await this.admin.listContractorProfiles() };
  }

  @Patch('contractors/:id/approve')
  @AdminPermission('technicians.approve')
  async approveContractor(@Param('id') id: string) {
    return { data: await this.admin.approveContractor(id) };
  }

  @Patch('contractors/:id/reject')
  @AdminPermission('technicians.reject')
  async rejectContractor(@Param('id') id: string) {
    return { data: await this.admin.rejectContractor(id) };
  }

  @Patch('contractors/:id/reapprove')
  @AdminPermission('technicians.reapprove')
  async reapproveContractor(@Param('id') id: string) {
    return { data: await this.admin.reapproveContractor(id) };
  }

  @Get('banners')
  @AdminPermission('banners.view')
  async banners() {
    return { data: await this.admin.listBanners(false) };
  }

  @Post('banners')
  @AdminPermission('banners.create')
  async createBanner(@Body() body: unknown) {
    const parsed = adminBannerInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.createBanner(parsed.data) };
  }

  @Patch('banners/:id')
  @AdminPermission('banners.edit')
  async updateBanner(@Param('id') id: string, @Body() body: unknown) {
    const parsed = adminBannerInputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.updateBanner(id, parsed.data) };
  }

  @Delete('banners/:id')
  @AdminPermission('banners.delete')
  async removeBanner(@Param('id') id: string) {
    return { data: await this.admin.removeBanner(id) };
  }

  @Post('uploads')
  @AdminPermission('products.create', 'products.edit', 'banners.create', 'banners.edit')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 3 * 1024 * 1024 } }),
  )
  upload(
    @Req() request: Request,
    @UploadedFile()
    file?: {
      mimetype: string;
      size: number;
      buffer: Buffer;
      originalname: string;
    },
  ) {
    if (!file || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'Choose a PNG, JPEG, WebP or other image file',
      );
    }
    const uploadsDirectory = resolve(process.cwd(), 'uploads');
    mkdirSync(uploadsDirectory, { recursive: true });
    const extension = extname(file.originalname).toLowerCase() ||
      (file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg');
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    writeFileSync(resolve(uploadsDirectory, filename), file.buffer);
    const configuredPublicUrl = process.env.PUBLIC_API_URL?.replace(/\/$/, '');
    const publicBaseUrl = configuredPublicUrl || `${request.protocol}://${request.get('host')}`;
    return {
      data: {
        url: `${publicBaseUrl}/uploads/${filename}`,
        size: file.size,
      },
    };
  }

  @Get('subadmins')
  @Roles('SUPER_ADMIN')
  async subAdmins() {
    return { data: await this.admin.listSubAdmins() };
  }

  @Post('subadmins')
  @Roles('SUPER_ADMIN')
  async createSubAdmin(@Body() body: unknown) {
    const parsed = subAdminCreateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.createSubAdmin(parsed.data) };
  }

  @Patch('subadmins/:id')
  @Roles('SUPER_ADMIN')
  async updateSubAdmin(@Param('id') id: string, @Body() body: unknown) {
    const parsed = subAdminUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return { data: await this.admin.updateSubAdmin(id, parsed.data) };
  }
}
