import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateReturnRequestInput, CustomerAddress, ReturnRequest, ReturnRequestStatusUpdateInput } from '@sirohi/contracts';

import { AddressesService } from '../addresses/addresses.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

const returnInclude = {
  customer: { select: { name: true, email: true } },
  order: { select: { buyerSegment: true } },
  orderItem: { select: { id: true, productId: true, quantity: true, product: { select: { name: true } } } },
  items: { include: { orderItem: { select: { id: true, productId: true, quantity: true, product: { select: { name: true } } } } } },
} as const;
type ReturnRecord = Prisma.ReturnRequestGetPayload<{ include: typeof returnInclude }>;

const activeStatuses = ['PENDING', 'APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED'] as const;
const returnWindowMs = 7 * 24 * 60 * 60 * 1000;

function formatAddress(address: CustomerAddress) {
  return [address.name, address.houseNumber, address.line1, address.city, address.state, address.postalCode, address.phone].filter(Boolean).join(', ');
}

@Injectable()
export class ReturnsService {
  private readonly memory: ReturnRequest[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly addresses: AddressesService,
  ) {}

  async create(input: CreateReturnRequestInput, customerId: string): Promise<ReturnRequest> {
    const order = await this.orders.findOneForCustomer(customerId, input.orderId);
    if (order.status !== 'DELIVERED') throw new BadRequestException('Only delivered orders can be returned');
    if (Date.now() - new Date(order.createdAt).getTime() > returnWindowMs) throw new BadRequestException('The 7-day return window for this order has expired');
    const requests = await this.listForCustomer(customerId);
    const selectedItems = input.items.map((inputItem) => {
      const item = order.items.find((candidate) => candidate.id === inputItem.orderItemId);
      if (!item) throw new NotFoundException('One of the selected products was not found in this order');
      const activeQuantity = requests.filter((request) => request.items.some((returnItem) => returnItem.orderItemId === inputItem.orderItemId && activeStatuses.includes(request.status as typeof activeStatuses[number]))).reduce((sum, request) => sum + (request.items.find((returnItem) => returnItem.orderItemId === inputItem.orderItemId)?.quantity ?? 0), 0);
      if (inputItem.quantity > item.quantity - activeQuantity) throw new BadRequestException(`${item.productName}: only ${Math.max(0, item.quantity - activeQuantity)} units are available for return`);
      return { input: inputItem, item };
    });
    const address = (await this.addresses.list(customerId)).find((candidate) => candidate.id === input.addressId);
    if (!address) throw new NotFoundException('Select one of your saved addresses for the return');

    const addressSnapshot = formatAddress(address);
    if (!process.env.DATABASE_URL) {
      const request: ReturnRequest = {
        id: randomUUID(), orderId: order.id, customerId, buyerSegment: order.buyerSegment ?? 'B2C',
        items: selectedItems.map(({ input: itemInput, item }) => ({ id: randomUUID(), orderItemId: item.id, productId: item.productId, productName: item.productName, orderedQuantity: item.quantity, quantity: itemInput.quantity })),
        addressId: address.id, address: addressSnapshot, ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
        status: 'PENDING', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      this.memory.unshift(request);
      return request;
    }

    return this.prisma.$transaction(async (tx) => {
      const dbOrder = await tx.order.findFirst({ where: { id: input.orderId, customerId }, select: { status: true, buyerSegment: true } });
      if (!dbOrder) throw new NotFoundException('Order not found');
      if (dbOrder.status !== 'DELIVERED') throw new BadRequestException('Only delivered orders can be returned');
      if (Date.now() - new Date(order.createdAt).getTime() > returnWindowMs) throw new BadRequestException('The 7-day return window for this order has expired');
      const dbItems = await tx.orderItem.findMany({ where: { orderId: input.orderId, id: { in: input.items.map((item) => item.orderItemId) } }, include: { product: { select: { name: true } } } });
      if (dbItems.length !== input.items.length) throw new NotFoundException('One of the selected products was not found in this order');
      const dbAddress = await tx.customerAddress.findFirst({ where: { id: input.addressId, userId: customerId } });
      if (!dbAddress) throw new NotFoundException('Select one of your saved addresses for the return');
      const orderItemIds = input.items.map((item) => item.orderItemId);
      const existingItems = await tx.returnRequestItem.findMany({ where: { orderItemId: { in: orderItemIds }, returnRequest: { status: { in: [...activeStatuses] } } }, select: { orderItemId: true, quantity: true } });
      const legacyRequests = await tx.returnRequest.findMany({ where: { orderItemId: { in: orderItemIds }, status: { in: [...activeStatuses] }, items: { none: {} } }, select: { orderItemId: true, quantity: true } });
      for (const inputItem of input.items) {
        const dbItem = dbItems.find((item) => item.id === inputItem.orderItemId)!;
        const reservedQuantity = existingItems.filter((item) => item.orderItemId === inputItem.orderItemId).reduce((sum, item) => sum + item.quantity, 0) + legacyRequests.filter((item) => item.orderItemId === inputItem.orderItemId).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
        if (inputItem.quantity > dbItem.quantity - reservedQuantity) throw new BadRequestException(`${dbItem.product.name}: only ${Math.max(0, dbItem.quantity - reservedQuantity)} units are available for return`);
      }
      const firstItem = input.items[0];
      return this.toPublic(await tx.returnRequest.create({
        data: {
          orderId: input.orderId, orderItemId: firstItem.orderItemId, customerId, addressId: input.addressId,
          addressSnapshot, quantity: firstItem.quantity, reason: input.reason?.trim() || null,
          items: { create: input.items.map((item) => ({ orderItemId: item.orderItemId, quantity: item.quantity })) },
        },
        include: returnInclude,
      }));
    });
  }

  async listForCustomer(customerId: string): Promise<ReturnRequest[]> {
    if (!process.env.DATABASE_URL) return this.memory.filter((request) => request.customerId === customerId);
    const records = await this.prisma.returnRequest.findMany({ where: { customerId }, include: returnInclude, orderBy: { createdAt: 'desc' } });
    return records.map((record) => this.toPublic(record));
  }

  async findOneForCustomer(customerId: string, id: string): Promise<ReturnRequest> {
    const request = (await this.listForCustomer(customerId)).find((item) => item.id === id);
    if (!request) throw new NotFoundException('Return request not found');
    return request;
  }

  async listForAdmin(): Promise<ReturnRequest[]> {
    if (!process.env.DATABASE_URL) return [...this.memory];
    const records = await this.prisma.returnRequest.findMany({ include: returnInclude, orderBy: { createdAt: 'desc' } });
    return records.map((record) => this.toPublic(record));
  }

  async updateStatus(id: string, input: ReturnRequestStatusUpdateInput, adminId: string): Promise<ReturnRequest> {
    if (!process.env.DATABASE_URL) {
      const request = this.memory.find((item) => item.id === id);
      if (!request) throw new NotFoundException('Return request not found');
      this.validateStatus(request.status, input.status);
      request.status = input.status;
      if (input.adminNote !== undefined) request.adminNote = input.adminNote.trim() || undefined;
      request.updatedAt = new Date().toISOString();
      return request;
    }
    const existing = await this.prisma.returnRequest.findUnique({ where: { id }, include: returnInclude });
    if (!existing) throw new NotFoundException('Return request not found');
    this.validateStatus(existing.status, input.status);
    return this.toPublic(await this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.adminNote !== undefined ? { adminNote: input.adminNote.trim() || null } : {}),
        ...(input.status === 'APPROVED' ? { approvedById: adminId, approvedAt: new Date() } : {}),
      },
      include: returnInclude,
    }));
  }

  private validateStatus(current: ReturnRequest['status'], next: ReturnRequest['status']) {
    if (current === next) return;
    if (['REJECTED', 'REFUNDED', 'CANCELLED'].includes(current)) throw new BadRequestException('This return request is already closed');
    if (current === 'PENDING' && !['APPROVED', 'REJECTED'].includes(next)) throw new BadRequestException('Approve or reject the request before moving it forward');
    if (current === 'APPROVED' && !['PICKUP_SCHEDULED', 'RECEIVED', 'REFUNDED'].includes(next)) throw new BadRequestException('Approved requests can only move through the return workflow');
    if (current === 'PICKUP_SCHEDULED' && !['RECEIVED', 'REFUNDED'].includes(next)) throw new BadRequestException('Pickup-scheduled requests can only be received or refunded');
    if (current === 'RECEIVED' && next !== 'REFUNDED') throw new BadRequestException('Received requests can only be marked refunded');
  }

  private toPublic(record: ReturnRecord): ReturnRequest {
    const items = record.items.length
      ? record.items.map((item) => ({ id: item.id, orderItemId: item.orderItem.id, productId: item.orderItem.productId, productName: item.orderItem.product.name, orderedQuantity: item.orderItem.quantity, quantity: item.quantity }))
      : [{ id: record.id, orderItemId: record.orderItem.id, productId: record.orderItem.productId, productName: record.orderItem.product.name, orderedQuantity: record.orderItem.quantity, quantity: record.quantity }];
    return {
      id: record.id, orderId: record.orderId, customerId: record.customerId,
      customerName: record.customer.name, ...(record.customer.email ? { customerEmail: record.customer.email } : {}),
      buyerSegment: record.order.buyerSegment, items, addressId: record.addressId, address: record.addressSnapshot,
      ...(record.reason ? { reason: record.reason } : {}), status: record.status, ...(record.adminNote ? { adminNote: record.adminNote } : {}),
      createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
    };
  }
}
