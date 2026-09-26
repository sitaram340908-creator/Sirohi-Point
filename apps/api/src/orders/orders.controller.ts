import { BadRequestException, Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { createOrderSchema } from '../shared/contracts';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrdersService } from './orders.service';
import { RazorpayService } from './razorpay.service';
import { createOrderBillPdf } from './invoice-pdf';

@Controller({ path: 'orders', version: '1' })
@UseGuards(AuthGuard, RolesGuard)
@Roles('CUSTOMER', 'BUSINESS')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService, private readonly razorpay: RazorpayService) {}

  @Post('razorpay/initiate')
  async initiateRazorpayPayment(
    @Body() body: unknown,
    @CurrentUser() customer: AuthenticatedUser,
  ) {
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    if (parsed.data.paymentMethod !== 'ONLINE') throw new BadRequestException('Razorpay payments require the online payment method');
    const quote = await this.ordersService.quote(parsed.data, customer.role === 'BUSINESS' ? 'B2B' : 'B2C');
    const merchantOrderId = this.razorpay.createMerchantOrderId();
    const payment = await this.razorpay.createPayment(merchantOrderId, quote.totalInPaise, { customerId: customer.id, input: parsed.data, amount: quote.totalInPaise });
    return { data: payment };
  }

  @Post('razorpay/verify')
  async verifyRazorpayPayment(
    @Body() body: unknown,
    @CurrentUser() customer: AuthenticatedUser,
  ) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Razorpay payment details are required');
    const input = body as Record<string, unknown>;
    const razorpayOrderId = typeof input.razorpayOrderId === 'string' ? input.razorpayOrderId : '';
    const razorpayPaymentId = typeof input.razorpayPaymentId === 'string' ? input.razorpayPaymentId : '';
    const razorpaySignature = typeof input.razorpaySignature === 'string' ? input.razorpaySignature : '';
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) throw new BadRequestException('Razorpay payment details are incomplete');
    const pending = this.razorpay.getPendingPayment(razorpayOrderId);
    if (!pending || pending.customerId !== customer.id) throw new BadRequestException('This Razorpay payment session is not available');
    const payment = await this.razorpay.verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }, pending.amount);
    let orderId = pending.orderId;
    if (payment.state === 'COMPLETED' && !orderId) {
      const order = await this.ordersService.create(pending.input, customer.id, customer.role === 'BUSINESS' ? 'B2B' : 'B2C', { channel: payment.channel, provider: 'RAZORPAY', paymentId: razorpayPaymentId });
      orderId = order.id;
      this.razorpay.setCompletedOrder(razorpayOrderId, order.id);
    }
    return { data: { orderId: orderId ?? '', razorpayOrderId, state: payment.state, amount: payment.amount, ...(payment.state === 'COMPLETED' ? { paymentChannel: payment.channel } : {}) } };
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() customer: AuthenticatedUser,
  ) {
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const buyerSegment = customer.role === 'BUSINESS' ? 'B2B' : 'B2C';
    return { data: await this.ordersService.create(parsed.data, customer.id, buyerSegment) };
  }

  @Get()
  async list(@CurrentUser() customer: AuthenticatedUser) {
    return { data: await this.ordersService.listForCustomer(customer.id) };
  }

  @Get(':id/bill')
  async downloadBill(@Param('id') id: string, @CurrentUser() customer: AuthenticatedUser, @Res() response: Response) {
    const bill = await this.ordersService.billForCustomer(customer, id);
    const pdf = createOrderBillPdf(bill);
    const filename = `sirohi-point-bill-${id}.pdf`;
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store',
    });
    response.send(pdf);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() customer: AuthenticatedUser) {
    return { data: await this.ordersService.findOneForCustomer(customer.id, id) };
  }
}

