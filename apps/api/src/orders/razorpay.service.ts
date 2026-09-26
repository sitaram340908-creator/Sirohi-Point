import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { BadGatewayException, BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { CreateOrderInput, PaymentChannel } from '../shared/contracts';

interface PendingRazorpayPayment {
  customerId: string;
  input: CreateOrderInput;
  amount: number;
  orderId?: string;
}

interface RazorpayPaymentVerificationInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getRazorpayErrorMessage(value: unknown, fallback: string) {
  if (!isRecord(value)) return fallback;
  const error = isRecord(value.error) ? value.error : value;
  return typeof error.description === 'string'
    ? error.description
    : typeof error.message === 'string'
      ? error.message
      : fallback;
}

function normalizePaymentChannel(method: unknown): PaymentChannel {
  const value = typeof method === 'string' ? method.toLowerCase() : '';
  if (value === 'card') return 'CARD';
  if (value === 'upi') return 'UPI';
  if (value === 'netbanking') return 'NETBANKING';
  if (value === 'wallet') return 'WALLET';
  if (value === 'emi') return 'EMI';
  return 'OTHER';
}

@Injectable()
export class RazorpayService {
  private readonly pendingPayments = new Map<string, PendingRazorpayPayment>();

  private get apiBaseUrl() {
    return (process.env.RAZORPAY_API_BASE_URL ?? 'https://api.razorpay.com/v1').replace(/\/$/, '');
  }

  private get keyId() {
    return process.env.RAZORPAY_KEY_ID;
  }

  private get keySecret() {
    return process.env.RAZORPAY_KEY_SECRET;
  }

  private requireCredentials() {
    const keyId = this.keyId;
    const keySecret = this.keySecret;
    if (!keyId || !keySecret) {
      throw new InternalServerErrorException('Razorpay credentials are not configured on the backend');
    }
    return { keyId, keySecret };
  }

  private authHeader(keyId: string, keySecret: string) {
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  }

  async createPayment(merchantOrderId: string, amount: number, pendingPayment: Omit<PendingRazorpayPayment, 'orderId'>) {
    if (!Number.isInteger(amount) || amount < 100) {
      throw new BadGatewayException('Razorpay requires an order amount of at least ₹1');
    }
    const credentials = this.requireCredentials();
    const response = await fetch(`${this.apiBaseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(credentials.keyId, credentials.keySecret),
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: merchantOrderId,
        notes: { application: 'sirohi-point' },
      }),
    });
    const payload = await response.json().catch(() => null) as unknown;
    if (!response.ok || !isRecord(payload) || typeof payload.id !== 'string') {
      throw new BadGatewayException(getRazorpayErrorMessage(payload, 'Razorpay could not create the payment order'));
    }
    this.pendingPayments.set(payload.id, pendingPayment);
    return { razorpayOrderId: payload.id, keyId: credentials.keyId, amount, currency: 'INR' as const };
  }

  getPendingPayment(razorpayOrderId: string) {
    return this.pendingPayments.get(razorpayOrderId);
  }

  setCompletedOrder(razorpayOrderId: string, orderId: string) {
    const pending = this.pendingPayments.get(razorpayOrderId);
    if (pending) this.pendingPayments.set(razorpayOrderId, { ...pending, orderId });
  }

  async verifyPayment(input: RazorpayPaymentVerificationInput, expectedAmount: number) {
    const credentials = this.requireCredentials();
    if (input.razorpayOrderId.length > 100 || input.razorpayPaymentId.length > 100 || input.razorpaySignature.length > 200) {
      throw new BadRequestException('Invalid Razorpay payment details');
    }
    const expectedSignature = createHmac('sha256', credentials.keySecret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(input.razorpaySignature, 'utf8');
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new BadRequestException('Razorpay payment signature verification failed');
    }

    const response = await fetch(`${this.apiBaseUrl}/payments/${encodeURIComponent(input.razorpayPaymentId)}`, {
      headers: { Authorization: this.authHeader(credentials.keyId, credentials.keySecret) },
    });
    const payload = await response.json().catch(() => null) as unknown;
    if (!response.ok || !isRecord(payload)) {
      throw new BadGatewayException(getRazorpayErrorMessage(payload, 'Razorpay payment status could not be verified'));
    }
    if (typeof payload.order_id !== 'string' || payload.order_id !== input.razorpayOrderId) {
      throw new BadRequestException('Razorpay payment does not match this order');
    }
    if (typeof payload.amount === 'number' && payload.amount !== expectedAmount) {
      throw new BadRequestException('Razorpay payment amount does not match the order amount');
    }
    return {
      state: payload.status === 'captured' ? 'COMPLETED' as const : 'FAILED' as const,
      amount: typeof payload.amount === 'number' ? payload.amount : expectedAmount,
      channel: normalizePaymentChannel(payload.method),
    };
  }

  createMerchantOrderId() {
    return `SP-${randomUUID()}`;
  }
}

