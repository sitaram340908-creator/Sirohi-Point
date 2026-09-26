import { randomInt, randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateOrderInput, OrderDetails, OrderStatus, OrderSummary, PaymentChannel, PriceSegment } from '../shared/contracts';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { OrderBillData } from './invoice-pdf';

const stages: OrderStatus[] = ['CONFIRMED', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const orderInclude = { customer: { select: { name: true, email: true, phone: true } }, items: { include: { product: { select: { name: true, hsn: { select: { code: true, cgstRate: true, sgstRate: true, igstRate: true } } } } } } } as const;
type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function stateFromAddress(address: string) {
  const value = address.toLowerCase();
  const states = ['andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir', 'ladakh'];
  return states.find((state) => value.includes(state));
}

function taxForLine(base: number, rate: number, interstate: boolean) {
  const tax = taxAmountForLine(base, rate);
  return { tax, cgst: interstate ? 0 : Math.round(tax / 2), sgst: interstate ? 0 : tax - Math.round(tax / 2), igst: interstate ? tax : 0 };
}

function taxAmountForLine(base: number, rate: number) {
  return Math.round(base * rate / 100);
}

@Injectable()
export class OrdersService {
  private readonly memoryOrders: OrderDetails[] = [];
  constructor(private readonly catalog: CatalogService, private readonly prisma: PrismaService) {}

  private async transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
      catch (error) {
        if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') continue;
        throw error;
      }
    }
  }

  private async nextOrderId(tx?: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const id = String(randomInt(100000000000, 1000000000000));
      const exists = tx
        ? await tx.order.findUnique({ where: { id }, select: { id: true } })
        : this.memoryOrders.some((order) => order.id === id);
      if (!exists) return id;
    }
    throw new BadRequestException('Unable to create a unique order number');
  }

  async quote(input: CreateOrderInput, buyerSegment: PriceSegment): Promise<{ totalInPaise: number; itemCount: number }> {
    if (new Set(input.items.map((item) => item.productId)).size !== input.items.length) throw new BadRequestException('Each product must appear only once');
    const items = [];
    for (const item of input.items) {
      const product = await this.catalog.findOneForSegment(item.productId, buyerSegment);
      const minimum = buyerSegment === 'B2B' ? product.minimumB2BQuantity ?? 1 : 1;
      if (!Number.isInteger(item.quantity) || item.quantity < minimum || item.quantity > 100000) throw new BadRequestException(product.name + ': quantity must be a whole number between ' + minimum + ' and 100000');
      const backorderedQuantity = Math.max(0, item.quantity - product.stock);
      if (backorderedQuantity && (buyerSegment === 'B2C' || !product.allowB2BBackorder)) throw new BadRequestException(product.name + ' has only ' + product.stock + ' available');
      if (input.paymentMethod === 'COD' && product.codAvailable === false) throw new BadRequestException(product.name + ' is available for online payment only');
      items.push({ quantity: item.quantity, unitPriceInPaise: product.priceInPaise, deliveryChargeInPaise: product.deliveryChargeInPaise ?? 5000, gstRate: product.gstRate ?? 18 });
    }
    const deliveryChargeInPaise = items.reduce((sum, item) => sum + item.quantity * item.deliveryChargeInPaise, 0);
    const subtotalInPaise = items.reduce((sum, item) => sum + item.quantity * item.unitPriceInPaise, 0);
    const taxInPaise = items.reduce((sum, item) => sum + taxAmountForLine(item.quantity * item.unitPriceInPaise, item.gstRate), 0);
    const totalInPaise = subtotalInPaise + taxInPaise + deliveryChargeInPaise;
    return { totalInPaise, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
  }

  async create(input: CreateOrderInput, customerId: string, buyerSegment: PriceSegment, payment?: { channel: PaymentChannel; provider: 'RAZORPAY'; paymentId: string }): Promise<OrderSummary> {
    if (new Set(input.items.map((item) => item.productId)).size !== input.items.length) throw new BadRequestException('Each product must appear only once');
    const prepare = async (tx?: Prisma.TransactionClient) => {
      const items = [];
      for (const item of input.items) {
        const record = tx ? await tx.product.findUnique({ where: { id: item.productId }, include: { inventory: true, hsn: true } }) : null;
        if (tx && (!record?.active || (buyerSegment === 'B2B' && record.b2bPriceInPaise === null))) throw new BadRequestException('A product is no longer available');
        const product = record ? {
          name: record.name, stock: record.inventory?.available ?? 0,
          priceInPaise: buyerSegment === 'B2B' ? record.b2bPriceInPaise! : record.b2cPriceInPaise,
          minimumB2BQuantity: record.minimumB2BQuantity, allowB2BBackorder: record.allowB2BBackorder,
          codAvailable: record.codAvailable,
          deliveryChargeInPaise: record.deliveryChargeInPaise,
          hsnCode: record.hsn?.code,
           taxRate: record.gstRate ?? record.hsn?.igstRate ?? 18,
        } : await this.catalog.findOneForSegment(item.productId, buyerSegment);
        const minimum = buyerSegment === 'B2B' ? product.minimumB2BQuantity ?? 1 : 1;
        if (!Number.isInteger(item.quantity) || item.quantity < minimum || item.quantity > 100000) throw new BadRequestException(product.name + ': quantity must be a whole number between ' + minimum + ' and 100000');
        const backorderedQuantity = Math.max(0, item.quantity - product.stock);
        if (backorderedQuantity && (buyerSegment === 'B2C' || !product.allowB2BBackorder)) throw new BadRequestException(product.name + ' has only ' + product.stock + ' available');
        if (input.paymentMethod === 'COD' && product.codAvailable === false) throw new BadRequestException(product.name + ' is available for online payment only');
        const hsnCode = 'hsnCode' in product && typeof product.hsnCode === 'string' ? product.hsnCode : undefined;
        const taxRate = 'taxRate' in product && typeof product.taxRate === 'number' ? product.taxRate : 18;
        items.push({ productId: item.productId, productName: product.name, quantity: item.quantity, backorderedQuantity, unitPriceInPaise: product.priceInPaise, buyerSegment, hsnCode, taxRate, deliveryChargeInPaise: product.deliveryChargeInPaise ?? 5000 });
      }
      const deliveryChargeInPaise = items.reduce((sum, item) => sum + item.quantity * item.deliveryChargeInPaise, 0);
      const subtotalInPaise = items.reduce((sum, item) => sum + item.quantity * item.unitPriceInPaise, 0);
      const taxInPaise = Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitPriceInPaise * (item.taxRate ?? 18) / 100, 0));
       const totalInPaise = subtotalInPaise + taxInPaise + deliveryChargeInPaise;
      if (totalInPaise > 2147483647) throw new BadRequestException('Order total is too large; please split it into smaller orders');
      return { items, deliveryChargeInPaise, totalInPaise, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
    };
    const shippingAddress = input.shippingSameAsBilling ? input.billingAddress : input.shippingAddress!;
    if (!process.env.DATABASE_URL) {
      const prepared = await prepare();
      const orderId = await this.nextOrderId();
      const subtotalInPaise = prepared.items.reduce((sum, item) => sum + item.quantity * item.unitPriceInPaise, 0);
      const taxInPaise = prepared.items.reduce((sum, item) => sum + taxAmountForLine(item.quantity * item.unitPriceInPaise, item.taxRate ?? 18), 0);
      const order: OrderDetails = { ...prepared, items: prepared.items.map((item) => ({ ...item, id: randomUUID(), taxRate: item.taxRate ?? 18, taxInPaise: taxAmountForLine(item.quantity * item.unitPriceInPaise, item.taxRate ?? 18) })), id: orderId, customerId, buyerSegment, paymentMethod: input.paymentMethod, ...(payment ? { paymentChannel: payment.channel, paymentProvider: payment.provider, razorpayPaymentId: payment.paymentId } : {}), billingAddress: input.billingAddress, shippingAddress, shippingSameAsBilling: input.shippingSameAsBilling, deliveryAddress: shippingAddress, createdAt: new Date().toISOString(), status: 'CONFIRMED', approvalStatus: 'PENDING', taxType: 'NONE', subtotalInPaise, discountInPaise: 0, taxInPaise, totalInPaise: subtotalInPaise + taxInPaise + prepared.deliveryChargeInPaise, showInvoiceNumber: false };
      this.memoryOrders.unshift(order);
      return order;
    }
    return this.transaction(async (tx) => {
      const prepared = await prepare(tx);
      const orderId = await this.nextOrderId(tx);
      const shopState = (process.env.SHOP_STATE ?? 'Rajasthan').toLowerCase();
      const customerState = stateFromAddress(shippingAddress);
      const interstate = Boolean(customerState && customerState !== shopState);
      let subtotalInPaise = 0; let taxInPaise = 0; let cgstInPaise = 0; let sgstInPaise = 0; let igstInPaise = 0;
      const items = prepared.items.map((item) => {
        const base = item.quantity * item.unitPriceInPaise;
        const rate = item.taxRate ?? 18;
        const tax = taxForLine(base, rate, interstate);
        subtotalInPaise += base; taxInPaise += tax.tax; cgstInPaise += tax.cgst; sgstInPaise += tax.sgst; igstInPaise += tax.igst;
        return { ...item, taxRate: rate, taxInPaise: tax.tax };
      });
      const deliveryChargeInPaise = prepared.deliveryChargeInPaise;
      const totalInPaise = subtotalInPaise + taxInPaise + deliveryChargeInPaise;
      return this.toDetails(await tx.order.create({ data: { id: orderId, customerId, buyerSegment, paymentMethod: input.paymentMethod, ...(payment ? { paymentChannel: payment.channel, paymentProvider: payment.provider, razorpayPaymentId: payment.paymentId } : {}), billingAddress: input.billingAddress, shippingAddress, shippingSameAsBilling: input.shippingSameAsBilling, deliveryAddress: shippingAddress, shopState, customerState, taxType: customerState ? (interstate ? 'IGST' : 'CGST_SGST') : 'NONE', subtotalInPaise, discountInPaise: 0, cgstInPaise, sgstInPaise, igstInPaise, taxInPaise, totalInPaise, itemCount: prepared.itemCount, items: { create: items.map(({ productName: _name, ...item }) => item) } }, include: orderInclude }));
    });
  }

  async listForCustomer(customerId: string): Promise<OrderDetails[]> {
    if (!process.env.DATABASE_URL) return this.memoryOrders.filter((order) => order.customerId === customerId);
    return (await this.prisma.order.findMany({ where: { customerId }, include: orderInclude, orderBy: { createdAt: 'desc' } })).map((order) => this.toDetails(order));
  }
  async findOneForCustomer(customerId: string, id: string): Promise<OrderDetails> {
    const order = (await this.listForCustomer(customerId)).find((item) => item.id === id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
  async billForCustomer(customer: AuthenticatedUser, id: string): Promise<OrderBillData> {
    const order = await this.findOneForCustomer(customer.id, id);
    if (order.approvalStatus !== 'APPROVED') throw new BadRequestException('Bill is available after admin approval');
    let gstin: string | undefined;
    if (customer.role === 'BUSINESS' && process.env.DATABASE_URL) {
      const profile = await this.prisma.businessProfile.findUnique({ where: { userId: customer.id } });
      gstin = profile?.gstin ?? undefined;
    }
    return { order, customer: { name: order.buyerName ?? customer.name, email: order.buyerEmail ?? customer.email, phone: customer.phone, ...(gstin ? { gstin } : {}) } };
  }
  async listForAdmin(): Promise<OrderDetails[]> {
    if (!process.env.DATABASE_URL) return [...this.memoryOrders];
    return (await this.prisma.order.findMany({ include: orderInclude, orderBy: { createdAt: 'desc' } })).map((order) => this.toDetails(order));
  }
  approve(id: string, adminId: string) { return this.change(id, 'ACCEPTED', adminId); }
  reject(id: string, adminId: string, reason: string) { return this.cancelOrder(id, adminId, reason, true); }
  cancel(id: string, adminId: string, reason: string) { return this.cancelOrder(id, adminId, reason, false); }
  updateStatus(id: string, status: OrderStatus) {
    if (status === 'CANCELLED') throw new BadRequestException('Use the cancel action and provide a cancellation reason');
    return this.change(id, status);
  }

  async updateInvoice(id: string, invoiceNumber: string | undefined, showInvoiceNumber: boolean): Promise<OrderDetails> {
    const normalizedInvoiceNumber = invoiceNumber?.trim() || undefined;
    if (showInvoiceNumber && !normalizedInvoiceNumber) throw new BadRequestException('Enter an invoice number before showing it on the bill');
    if (!process.env.DATABASE_URL) {
      const order = this.memoryOrders.find((item) => item.id === id);
      if (!order) throw new NotFoundException('Order not found');
      order.invoiceNumber = normalizedInvoiceNumber;
      order.showInvoiceNumber = showInvoiceNumber;
      return order;
    }
    const order = await this.prisma.order.update({
      where: { id },
      data: { invoiceNumber: normalizedInvoiceNumber ?? null, showInvoiceNumber },
      include: orderInclude,
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('Order not found');
      throw error;
    });
    return this.toDetails(order);
  }

  private async cancelOrder(id: string, adminId: string, reason: string, rejectPending: boolean): Promise<OrderSummary> {
    if (!reason.trim()) throw new BadRequestException('A cancellation reason is required');
    if (!process.env.DATABASE_URL) {
      const order = this.memoryOrders.find((item) => item.id === id);
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === 'CANCELLED' || order.status === 'DELIVERED') throw new BadRequestException('A cancelled or delivered order cannot be cancelled');
      if (rejectPending && order.approvalStatus !== 'PENDING') throw new BadRequestException('This order was already approved; use cancel order instead');
      order.status = 'CANCELLED';
      order.approvalStatus = order.approvalStatus === 'PENDING' ? 'REJECTED' : order.approvalStatus;
      order.cancellationReason = reason;
      return order;
    }
    return this.transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id }, include: orderInclude });
      if (!existing) throw new NotFoundException('Order not found');
      if (existing.status === 'CANCELLED' || existing.status === 'DELIVERED') throw new BadRequestException('A cancelled or delivered order cannot be cancelled');
      if (rejectPending && existing.approvalStatus !== 'PENDING') throw new BadRequestException('This order was already approved; use cancel order instead');
      return this.toDetails(await tx.order.update({ where: { id }, data: { status: 'CANCELLED', approvalStatus: existing.approvalStatus === 'PENDING' ? 'REJECTED' : existing.approvalStatus, approvedById: adminId, approvedAt: new Date(), rejectionReason: reason }, include: orderInclude }));
    });
  }

  private async change(id: string, status: OrderStatus, adminId?: string, reason?: string, reject = false): Promise<OrderSummary> {
    const validate = (order: OrderSummary) => {
      if (order.status === status) return;
      if (order.status === 'CANCELLED' || order.status === 'DELIVERED') throw new BadRequestException('A cancelled or delivered order cannot be changed');
      if (reject && order.approvalStatus !== 'PENDING') throw new BadRequestException('Only pending orders can be rejected; use cancellation for an approved order');
      if (status !== 'CANCELLED' && !(adminId && status === 'ACCEPTED') && order.approvalStatus !== 'APPROVED') throw new BadRequestException('Approve this order before updating fulfilment');
      if (status !== 'CANCELLED' && stages.indexOf(status) <= stages.indexOf(order.status)) throw new BadRequestException('Order status cannot move backwards');
    };
    if (!process.env.DATABASE_URL) {
      const order = this.memoryOrders.find((item) => item.id === id);
      if (!order) throw new NotFoundException('Order not found');
      validate(order);
      order.status = status;
      if (reject) order.approvalStatus = 'REJECTED';
      else if (adminId) order.approvalStatus = 'APPROVED';
      return order;
    }
    return this.transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id }, include: orderInclude });
      if (!existing) throw new NotFoundException('Order not found');
      validate(this.toDetails(existing));
      if (existing.status === status) return this.toDetails(existing);
      return this.toDetails(await tx.order.update({ where: { id }, data: { status, ...(adminId ? { approvalStatus: reject ? 'REJECTED' : 'APPROVED', approvedById: adminId, approvedAt: new Date(), rejectionReason: reason ?? null } : {}) }, include: orderInclude }));
    });
  }

  private toDetails(order: OrderRecord): OrderDetails {
    return { id: order.id, customerId: order.customerId, buyerName: order.customer.name, ...(order.customer.email ? { buyerEmail: order.customer.email } : {}), buyerSegment: order.buyerSegment, status: order.status, approvalStatus: order.approvalStatus, paymentMethod: order.paymentMethod, ...(order.paymentChannel ? { paymentChannel: order.paymentChannel as OrderDetails['paymentChannel'] } : {}), ...(order.paymentProvider === 'RAZORPAY' ? { paymentProvider: 'RAZORPAY' as const } : {}), ...(order.razorpayPaymentId ? { razorpayPaymentId: order.razorpayPaymentId } : {}), billingAddress: order.billingAddress, shippingAddress: order.shippingAddress, shippingSameAsBilling: order.shippingSameAsBilling, deliveryAddress: order.deliveryAddress, ...(order.rejectionReason ? { cancellationReason: order.rejectionReason } : {}), totalInPaise: order.totalInPaise, itemCount: order.itemCount, createdAt: order.createdAt.toISOString(), invoiceNumber: order.invoiceNumber ?? undefined, showInvoiceNumber: order.showInvoiceNumber, shopState: order.shopState ?? undefined, customerState: order.customerState ?? undefined, taxType: (order.taxType as OrderDetails['taxType']) ?? 'NONE', subtotalInPaise: order.subtotalInPaise, discountInPaise: order.discountInPaise, cgstInPaise: order.cgstInPaise, sgstInPaise: order.sgstInPaise, igstInPaise: order.igstInPaise, taxInPaise: order.taxInPaise, items: order.items.map((item) => ({ id: item.id, productId: item.productId, productName: item.product.name, quantity: item.quantity, backorderedQuantity: item.backorderedQuantity, unitPriceInPaise: item.unitPriceInPaise, buyerSegment: item.buyerSegment, ...(item.hsnCode ? { hsnCode: item.hsnCode } : {}), ...(item.taxRate !== null ? { taxRate: item.taxRate } : {}), taxInPaise: item.taxInPaise, deliveryChargeInPaise: item.deliveryChargeInPaise })) };
  }
}
