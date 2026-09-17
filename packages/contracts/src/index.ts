import { z } from 'zod';

export const platformRoles = ['CUSTOMER', 'BUSINESS', 'VENDOR', 'CONTRACTOR', 'DISTRIBUTOR', 'ADMIN'] as const;
export type PlatformRole = (typeof platformRoles)[number];

export const priceSegments = ['B2C', 'B2B'] as const;
export type PriceSegment = (typeof priceSegments)[number];

export const orderStatuses = ['CONFIRMED', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const;
export const orderStatusSchema = z.enum(orderStatuses);
export type OrderStatus = (typeof orderStatuses)[number];

export const bannerAudiences = ['B2C', 'B2B', 'BOTH'] as const;
export type BannerAudience = (typeof bannerAudiences)[number];

export const productSpecificationsSchema = z.record(
  z.string().trim().min(1),
  z.union([z.string(), z.number(), z.boolean()]),
);
export type ProductSpecifications = z.infer<typeof productSpecificationsSchema>;

export const productCategories = [
  'Hardware',
  'Electrical',
  'Electronics',
  'Paint',
  'PVC PIPE',
  'PVC & Plumbing',
  'Sanitary',
  'Others',
] as const;
export type ProductCategory = (typeof productCategories)[number];

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.enum(productCategories),
  categoryId: z.string().uuid().optional(),
  hsnId: z.string().uuid().optional(),
  hsnCode: z.string().trim().max(20).optional(),
  gstRate: z.number().min(0).max(100).optional(),
  subcategoryId: z.string().uuid().optional(),
  brand: z.string().min(1),
  description: z.string().min(1),
  // `priceInPaise` remains the compatibility/display alias used by the current client.
  priceInPaise: z.number().int().nonnegative(),
  priceVisible: z.boolean().optional(),
  b2cPriceInPaise: z.number().int().nonnegative().optional(),
  b2bPriceInPaise: z.number().int().nonnegative().optional(),
  minimumB2BQuantity: z.number().int().positive().optional(),
  allowB2BBackorder: z.boolean().optional(),
  codAvailable: z.boolean().default(true),
  specifications: productSpecificationsSchema.optional(),
  compareAtPriceInPaise: z.number().int().positive().optional(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  badge: z.string().optional(),
  tone: z.string(),
  serviceAvailable: z.boolean(),
  imageUrl: z.string().trim().min(1).optional(),
});
export type Product = z.infer<typeof productSchema>;

export const productReviewSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  customerName: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().min(1),
  createdAt: z.string(),
});
export type ProductReview = z.infer<typeof productReviewSchema>;

export const createProductReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(80).optional(),
  comment: z.string().trim().min(10).max(1000),
});
export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>;

export const catalogQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(productCategories).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  subcategoryIds: z.array(z.string().uuid()).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).optional(),
  inStock: z.enum(['true', 'false']).optional(),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100000),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1).max(100).refine((items) => new Set(items.map((item) => item.productId)).size === items.length, 'Each product must appear only once'),
  billingAddress: z.string().trim().min(10).max(500),
  shippingSameAsBilling: z.boolean().default(true),
  shippingAddress: z.string().trim().min(10).max(500).optional(),
  paymentMethod: z.enum(['COD', 'ONLINE']),
}).superRefine((input, context) => {
  if (!input.shippingSameAsBilling && !input.shippingAddress) {
    context.addIssue({ code: 'custom', path: ['shippingAddress'], message: 'Shipping address is required when it differs from billing address' });
  }
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const paymentChannels = ['CARD', 'UPI', 'NETBANKING', 'WALLET', 'EMI', 'OTHER'] as const;
export type PaymentChannel = typeof paymentChannels[number];

export function paymentChannelLabel(channel?: PaymentChannel) {
  if (channel === 'CARD') return 'Card';
  if (channel === 'UPI') return 'UPI';
  if (channel === 'NETBANKING') return 'Net Banking';
  if (channel === 'WALLET') return 'Wallet';
  if (channel === 'EMI') return 'EMI';
  return channel ? 'Other online method' : 'Online';
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  buyerSegment?: PriceSegment;
  totalInPaise: number;
  itemCount: number;
  createdAt: string;
  paymentChannel?: PaymentChannel;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, string | number | boolean>;
}
export const publicUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  customerLocation: z.string().nullable().optional(),
  role: z.enum(platformRoles),
  active: z.boolean(),
  createdAt: z.string(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const customerProfileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().min(8).max(20).nullable().optional(),
  ),
}).strict();
export type CustomerProfileUpdate = z.infer<typeof customerProfileUpdateSchema>;

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = loginInputSchema.extend({
  name: z.string().trim().min(2).max(80),
  phone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(8).max(20).optional(),
  ),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

// This is deliberately separate from the shared registration schema so B2B
// and technician registration fields do not change.
export const customerRegisterInputSchema = registerInputSchema.extend({
  // Delivery details are collected when the customer places an order.
  customerLocation: z.string().trim().min(2).max(160).optional(),
});
export type CustomerRegisterInput = z.infer<typeof customerRegisterInputSchema>;

export const businessRegisterInputSchema = registerInputSchema.extend({
  businessName: z.string().trim().min(2).max(160),
  businessType: z.string().trim().max(100).optional(),
  gstin: z.string().trim().max(30).optional(),
  billingAddress: z.string().trim().min(10).max(500),
  shippingAddress: z.string().trim().max(500).optional(),
});
export type BusinessRegisterInput = z.infer<typeof businessRegisterInputSchema>;

export const authSessionSchema = z.object({
  token: z.string().min(20),
  user: publicUserSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const adminProductInputSchema = z.object({
  name: z.string().trim().min(2).max(140),
  category: z.enum(productCategories),
  categoryId: z.string().uuid().optional(),
  hsnId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  brand: z.string().trim().min(1).max(80),
  description: z.string().trim().min(2).max(1000),
  // Accept the existing admin client field while allowing the new explicit B2C field.
  priceInPaise: z.number().int().nonnegative().optional(),
  b2cPriceInPaise: z.number().int().nonnegative().optional(),
  b2bPriceInPaise: z.number().int().nonnegative().optional(),
  minimumB2BQuantity: z.number().int().positive().optional(),
  allowB2BBackorder: z.boolean().optional(),
  codAvailable: z.boolean().optional(),
  specifications: productSpecificationsSchema.optional(),
  compareAtPriceInPaise: z.number().int().positive().optional(),
  stock: z.number().int().nonnegative(),
  badge: z.string().trim().max(40).optional(),
  tone: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#1769FF'),
  serviceAvailable: z.boolean().default(false),
  active: z.boolean().default(true),
  imageUrl: z.string().trim().min(1).optional(),
}).refine((input) => input.priceInPaise !== undefined || input.b2cPriceInPaise !== undefined, {
  message: 'A B2C price is required',
  path: ['b2cPriceInPaise'],
});
export type AdminProductInput = z.infer<typeof adminProductInputSchema>;

export const adminProductSchema = productSchema.extend({ active: z.boolean() });
export type AdminProduct = z.infer<typeof adminProductSchema>;

export const bannerSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  imageUrl: z.string().optional(),
  productId: z.string().optional(),
  ctaLabel: z.string().optional(),
  audience: z.enum(bannerAudiences),
  backgroundColor: z.string(),
  sortOrder: z.number().int(),
  active: z.boolean(),
});
export type Banner = z.infer<typeof bannerSchema>;

export const adminBannerInputSchema = bannerSchema.omit({ id: true }).extend({
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(220).optional(),
  badge: z.string().trim().max(40).optional(),
  imageUrl: z.string().trim().min(1).optional(),
  productId: z.string().trim().min(1).optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  audience: z.enum(bannerAudiences).optional(),
  backgroundColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#0B1F33'),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});
export type AdminBannerInput = z.infer<typeof adminBannerInputSchema>;

export interface AdminOverview {
  userCount: number;
  activeUserCount: number;
  productCount: number;
  activeProductCount: number;
  bannerCount: number;
}

export interface OrderItemDetails {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  backorderedQuantity?: number;
  unitPriceInPaise: number;
  buyerSegment: PriceSegment;
  hsnCode?: string;
  taxRate?: number;
  taxInPaise?: number;
}

export interface OrderDetails extends OrderSummary {
  customerId: string;
  buyerName?: string;
  buyerEmail?: string;
  paymentMethod: 'COD' | 'ONLINE';
  paymentProvider?: 'RAZORPAY';
  razorpayPaymentId?: string;
  billingAddress: string;
  shippingAddress: string;
  shippingSameAsBilling: boolean;
  deliveryAddress: string;
  cancellationReason?: string;
  items: OrderItemDetails[];
  shopState?: string;
  customerState?: string;
  taxType?: 'CGST_SGST' | 'IGST' | 'NONE';
  subtotalInPaise?: number;
  discountInPaise?: number;
  cgstInPaise?: number;
  sgstInPaise?: number;
  igstInPaise?: number;
  taxInPaise?: number;
}

export interface HsnMaster {
  id: string;
  code: string;
  description: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  active: boolean;
}

export const adminHsnInputSchema = z.object({
  code: z.string().trim().regex(/^\d{4,8}$/, 'HSN code must contain 4 to 8 digits'),
  description: z.string().trim().min(3).max(240),
  cgstRate: z.number().min(0).max(100),
  sgstRate: z.number().min(0).max(100),
  igstRate: z.number().min(0).max(100),
});
export type AdminHsnInput = z.infer<typeof adminHsnInputSchema>;

export const orderRejectionSchema = z.object({
  reason: z.string().trim().min(2).max(500).optional(),
});

// Product-order cancellation always records a buyer-facing reason.  Service
// request rejection retains its existing optional reason for backwards compatibility.
export const orderCancellationSchema = z.object({
  reason: z.string().trim().min(2).max(500),
});

export const orderStatusUpdateSchema = z.object({
  status: orderStatusSchema,
});

export const returnRequestStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'RECEIVED', 'REFUNDED', 'CANCELLED'] as const;
export type ReturnRequestStatus = (typeof returnRequestStatuses)[number];

export const returnRequestItemInputSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100000),
});

export const createReturnRequestSchema = z.object({
  orderId: z.string().min(1),
  items: z.array(returnRequestItemInputSchema).min(1).max(100).refine((items) => new Set(items.map((item) => item.orderItemId)).size === items.length, 'Each product can appear only once in a return request'),
  addressId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});
export type CreateReturnRequestInput = z.infer<typeof createReturnRequestSchema>;

export const returnRequestStatusUpdateSchema = z.object({
  status: z.enum(returnRequestStatuses),
  adminNote: z.string().trim().max(500).optional(),
});
export type ReturnRequestStatusUpdateInput = z.infer<typeof returnRequestStatusUpdateSchema>;

export interface ReturnRequestItem {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  orderedQuantity: number;
  quantity: number;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  buyerSegment: PriceSegment;
  items: ReturnRequestItem[];
  addressId: string;
  address: string;
  reason?: string;
  status: ReturnRequestStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfileDetails {
  id: string;
  userId: string;
  businessName: string;
  businessType?: string;
  gstin?: string;
  billingAddress: string;
  shippingAddress?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  verified: boolean;
}

export interface AdminBusinessDetails extends BusinessProfileDetails {
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
}

export const customerAddressInputSchema = z.object({
  label: z.string().trim().min(2).max(40).default('Service address'),
  name: z.string().trim().max(80).optional(),
  line1: z.string().trim().min(10).max(300),
  houseNumber: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  phone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(8).max(20).optional(),
  ),
  alternatePhone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(8).max(20).optional(),
  ),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(true),
}).refine((value) => (value.latitude === undefined) === (value.longitude === undefined), { message: 'Provide both latitude and longitude', path: ['latitude'] });
export type CustomerAddressInput = z.infer<typeof customerAddressInputSchema>;
export interface CustomerAddress extends CustomerAddressInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserProfile extends PublicUser {
  orderCount: number;
  serviceRequestCount: number;
  addresses: CustomerAddress[];
  businessProfile?: BusinessProfileDetails;
  contractorProfile?: ContractorAdminDetails;
}

export interface ContractorServiceDetails {
  id: string;
  serviceType: string;
  description?: string;
  visitChargeInPaise: number;
  priceFromInPaise?: number;
  priceToInPaise?: number;
}

// These labels seed customer-facing discovery and technician onboarding. A
// technician's actual offerings remain the ContractorService records; custom
// service names are still supported by the profile schema and discovery API.
export const technicianServiceTypes = [
  'Electrician Booking',
  'Installation',
  'Wiring Work',
  'Repair & Maintenance',
  'AMC Services',
  'Painter Booking',
  'Wall Painting',
  'Waterproofing Work',
  'Texture Design Work',
  'Color Consultation',
  'Hardware Installation',
  'Plumbing Work',
  'Fitting Services',
  'Contractor Services',
] as const;
export type TechnicianServiceType = (typeof technicianServiceTypes)[number];

export interface NearbyContractor {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  serviceArea?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  isNearby?: boolean;
  rating: number;
  experienceYears?: number;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  services: ContractorServiceDetails[];
}

export const contractorServiceInputSchema = z.object({
  serviceType: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  visitChargeInPaise: z.number().int().nonnegative().default(0),
  priceFromInPaise: z.number().int().nonnegative().optional(),
  priceToInPaise: z.number().int().nonnegative().optional(),
  active: z.boolean().default(true),
});

export const contractorProfileInputSchema = z.object({
  skills: z.array(z.string().trim().min(2).max(80)).min(1),
  serviceArea: z.string().trim().max(160).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  serviceRadiusKm: z.number().int().positive().max(500).default(15),
  experienceYears: z.number().int().nonnegative().max(80).optional(),
  bio: z.string().trim().max(1000).optional(),
  availability: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).default('OFFLINE'),
  services: z.array(contractorServiceInputSchema).min(1),
});
export type ContractorProfileInput = z.infer<typeof contractorProfileInputSchema>;

export const contractorRegisterInputSchema = registerInputSchema.extend({
  skills: z.array(z.string().trim().min(2).max(80)).min(1),
  serviceArea: z.string().trim().max(160).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  serviceRadiusKm: z.number().int().positive().max(500).default(15),
  experienceYears: z.number().int().nonnegative().max(80).optional(),
  bio: z.string().trim().max(1000).optional(),
  availability: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).default('AVAILABLE'),
  services: z.array(contractorServiceInputSchema).min(1),
});
export type ContractorRegisterInput = z.infer<typeof contractorRegisterInputSchema>;

export interface ContractorAdminDetails {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  skills: string[];
  serviceArea?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm: number;
  experienceYears?: number | null;
  bio?: string | null;
  rating: number;
  verified: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  services: ContractorServiceDetails[];
}

export const nearbyContractorQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  area: z.string().trim().max(160).optional(),
  serviceType: z.string().trim().min(2).max(80).optional(),
  // The existing endpoint remains an exploration/ranking endpoint by default.
  // Nearby discovery opts in to the strict location intersection.
  nearbyOnly: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  radiusKm: z.coerce.number().positive().max(500).default(15),
}).refine((value) => (value.latitude === undefined) === (value.longitude === undefined), { message: 'Provide both latitude and longitude', path: ['latitude'] });
export type NearbyContractorQuery = z.infer<typeof nearbyContractorQuerySchema>;

export const serviceBookingInputSchema = z.object({
  contractorId: z.string().uuid().optional(),
  serviceType: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(500),
  addressId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
  customerLatitude: z.number().min(-90).max(90).optional(),
  customerLongitude: z.number().min(-180).max(180).optional(),
  requestedPriceInPaise: z.number().int().nonnegative().optional(),
  offerId: z.string().uuid().optional(),
  orderId: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type ServiceBookingInput = z.infer<typeof serviceBookingInputSchema>;

// Discounts apply to the listed visit charge; additional labour/materials are quoted separately.
export const serviceOfferInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(''),
  discountInPaise: z.number().int().positive().max(10000000),
  serviceType: z.string().trim().min(2).max(80).nullable().optional(),
  contractorId: z.string().uuid().nullable().optional(),
  productId: z.string().min(1).nullable().optional(),
  active: z.boolean().default(true),
});
export type ServiceOfferInput = z.infer<typeof serviceOfferInputSchema>;
export interface ServiceOffer extends ServiceOfferInput { id: string }
