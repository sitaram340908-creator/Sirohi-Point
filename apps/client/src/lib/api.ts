import type {
  ServiceOffer,
  ServiceOfferInput,
  AdminBannerInput,
  AdminUserProfile,
  AdminBusinessDetails,
  AdminOverview,
  AdminProduct,
  AdminProductInput,
  ApiEnvelope,
  AuthSession,
  BusinessProfileDetails,
  Banner,
  BusinessRegisterInput,
  CreateOrderInput,
  ContractorAdminDetails,
  ContractorProfileInput,
  ContractorRegisterInput,
  LoginInput,
  NearbyContractor,
  NearbyContractorQuery,
  OrderDetails,
  OrderSummary,
  PaymentChannel,
  Product,
  PublicUser,
  CustomerRegisterInput,
  CustomerProfileUpdate,
  CustomerAddress,
  CustomerAddressInput,
  CreateProductReviewInput,
  ProductReview,
  ServiceBookingInput,
  HsnMaster,
  AdminHsnInput,
  CreateReturnRequestInput,
  ReturnRequest,
  ReturnRequestStatusUpdateInput,
} from '@sirohi/contracts';

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  subcategories: Array<{ id: string; name: string; slug: string }>;
};

export type BusinessRegistrationInput = Omit<BusinessRegisterInput, 'billingAddress'> & { billingAddress?: string };

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

function requireApiBaseUrl() {
  if (!configuredApiBaseUrl) {
    throw new Error('The API URL is not configured. Set EXPO_PUBLIC_API_URL before signing in.');
  }
  return configuredApiBaseUrl;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; detailedValidationErrors?: boolean } = {},
): Promise<T> {
  const { token, headers, detailedValidationErrors = true, ...init } = options;
  const response = await fetch(`${requireApiBaseUrl()}/api/v1${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const payload = await response.json().catch(() => null) as
    | ApiEnvelope<T>
    | { message?: string | string[]; error?: string }
    | null;

  if (!response.ok) {
    const message = detailedValidationErrors ? formatApiError(payload) : getBasicApiError(payload);
    throw new ApiError(message || `Request failed with status ${response.status}`, response.status);
  }
  return (payload as ApiEnvelope<T>).data;
}

function getBasicApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) return message.join(', ');
  if (getFieldErrors(payload)) return 'Please check your email and password.';
  return null;
}

function formatApiError(payload: unknown): string | null {
  const basicMessage = getBasicApiError(payload);
  if (!payload || typeof payload !== 'object') return basicMessage;
  const fieldErrors = getFieldErrors(payload);
  if (!fieldErrors) return basicMessage;
  const messages = Object.entries(fieldErrors as Record<string, unknown>).flatMap(([field, value]) => {
    const errors = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    return errors.map((error) => `${formatFieldName(field)}: ${friendlyValidationMessage(field, error)}`);
  });
  return messages.length ? messages.join(' · ') : basicMessage;
}

function getFieldErrors(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { fieldErrors?: unknown; message?: unknown };
  if (body.fieldErrors && typeof body.fieldErrors === 'object' && !Array.isArray(body.fieldErrors)) {
    return body.fieldErrors as Record<string, unknown>;
  }
  if (!body.message || typeof body.message !== 'object' || Array.isArray(body.message)) return null;
  const nested = (body.message as { fieldErrors?: unknown }).fieldErrors;
  return nested && typeof nested === 'object' && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : null;
}

function formatFieldName(field: string) {
  const names: Record<string, string> = { gstin: 'GSTIN', businessName: 'Business name', businessType: 'Business type', billingAddress: 'Billing address', shippingAddress: 'Shipping address', customerLocation: 'Location' };
  return names[field] ?? field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/^./, (letter) => letter.toUpperCase());
}

function friendlyValidationMessage(field: string, message: string) {
  const minimum = message.match(/>=([0-9]+)/)?.[1];
  if (minimum && message.includes('expected string')) return `must be at least ${minimum} characters`;
  const maximum = message.match(/<=([0-9]+)/)?.[1];
  if (maximum && message.includes('expected string')) return `must be ${maximum} characters or fewer`;
  if (field === 'email' && message.toLowerCase().includes('email')) return 'must be a valid email address';
  return message;
}

type CatalogListQuery = {
  search?: string;
  category?: string;
  categoryIds?: string[];
  subcategoryIds?: string[];
  limit?: number;
  offset?: number;
  sort?: string;
  inStock?: string;
};

export async function getCatalog(query: CatalogListQuery = {}): Promise<Product[]> {
  return request<Product[]>(`/catalog${queryString({ ...query, limit: query.limit ?? 100 })}`);
}

export function getCatalogCategories() {
  return request<CatalogCategory[]>('/catalog/categories');
}
export function getB2CProduct(id: string) { return request<Product>(`/catalog/b2c/${encodeURIComponent(id)}`); }

export function getProductReviews(productId: string) { return request<ProductReview[]>('/catalog/b2c/' + encodeURIComponent(productId) + '/reviews'); }
export function createProductReview(token: string, productId: string, input: CreateProductReviewInput) {
  return request<ProductReview>('/catalog/b2c/' + encodeURIComponent(productId) + '/reviews', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function getBanners(): Promise<Banner[]> {
  return request<Banner[]>('/banners');
}

export function login(input: LoginInput) {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    detailedValidationErrors: false,
  });
}

export function register(input: CustomerRegisterInput) {
  return request<AuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
    detailedValidationErrors: true,
  });
}

export function registerBusiness(input: BusinessRegistrationInput) {
  return request<AuthSession>('/auth/register-business', {
    method: 'POST',
    body: JSON.stringify(input),
    detailedValidationErrors: true,
  });
}

export function registerTechnician(input: ContractorRegisterInput) {
  return request<AuthSession>('/auth/register-contractor', {
    method: 'POST',
    body: JSON.stringify(input),
    detailedValidationErrors: true,
  });
}

export function getCurrentUser(token: string) {
  return request<PublicUser>('/auth/me', { token });
}
export function updateCustomerProfile(token: string, input: CustomerProfileUpdate) {
  return request<AuthSession>('/auth/me', { token, method: 'PATCH', body: JSON.stringify(input) });
}
export function getBusinessProfile(token: string) { return request<BusinessProfileDetails>('/auth/business-profile', { token }); }

export function getCustomerAddresses(token: string) { return request<CustomerAddress[]>('/addresses', { token }); }
export function saveCustomerAddress(token: string, input: CustomerAddressInput) { return request<CustomerAddress>('/addresses', { token, method: 'POST', body: JSON.stringify(input) }); }
export function updateCustomerAddress(token: string, id: string, input: CustomerAddressInput) { return request<CustomerAddress>(`/addresses/${encodeURIComponent(id)}`, { token, method: 'PATCH', body: JSON.stringify(input) }); }
export function makeDefaultCustomerAddress(token: string, id: string) { return request<CustomerAddress>(`/addresses/${encodeURIComponent(id)}/default`, { token, method: 'PATCH' }); }

export function submitOrder(token: string, input: CreateOrderInput) {
  return request<OrderSummary>('/orders', {
    token,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface RazorpayPaymentInit {
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  currency: 'INR';
}

export interface RazorpayPaymentVerification {
  orderId: string;
  razorpayOrderId: string;
  state: 'COMPLETED' | 'FAILED' | string;
  amount: number;
  paymentChannel?: PaymentChannel;
}

export function initiateRazorpayPayment(token: string, input: CreateOrderInput) {
  return request<RazorpayPaymentInit>('/orders/razorpay/initiate', {
    token,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function verifyRazorpayPayment(token: string, input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  return request<RazorpayPaymentVerification>('/orders/razorpay/verify', {
    token,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getOrders(token: string) {
  return request<OrderDetails[]>('/orders', { token });
}

export function getOrder(token: string, id: string) {
  return request<OrderDetails>(`/orders/${encodeURIComponent(id)}`, { token });
}

export function getReturnRequests(token: string) {
  return request<ReturnRequest[]>('/returns', { token });
}

export function createReturnRequest(token: string, input: CreateReturnRequestInput) {
  return request<ReturnRequest>('/returns', { token, method: 'POST', body: JSON.stringify(input) });
}

export async function downloadOrderBill(token: string, id: string) {
  if (typeof document === 'undefined') throw new Error('Bill download is currently available in the web app.');
  const response = await fetch(`${requireApiBaseUrl()}/api/v1/orders/${encodeURIComponent(id)}/bill`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError('Unable to download this bill.', response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sirohi-point-bill-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function queryString(values: Record<string, string | number | boolean | string[] | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => params.append(key, item));
    } else if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });
  const result = params.toString();
  return result ? `?${result}` : '';
}

export function getB2BCatalog(token: string | undefined, query: CatalogListQuery = {}) {
  return request<Product[]>(`/catalog/b2b${queryString(query)}`, { token });
}

export function getB2BProduct(token: string | undefined, id: string) {
  return request<Product>(`/catalog/b2b/${encodeURIComponent(id)}`, { token });
}

export function getB2CBanners() {
  return request<Banner[]>('/banners/b2c');
}

export function getB2BBanners() {
  return request<Banner[]>('/banners/b2b');
}

export interface ServiceBookingRecord {
  id: string;
  customerId: string;
  contractorId?: string | null;
  serviceType: string;
  address: string;
  scheduledFor?: string | null;
  status: 'REQUESTED' | 'MATCHED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  approvalStatus: 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
  technicianResponse: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  requestedPriceInPaise?: number | null;
  finalPriceInPaise?: number | null;
  discountInPaise?: number;
  offerTitle?: string | null;
  notes?: string | null;
  customer?: { name: string; email?: string | null };
  contractor?: { user?: { name: string }; serviceArea?: string | null };
}

export function getNearbyContractors(query: NearbyContractorQuery) {
  return request<NearbyContractor[]>(`/services/contractors/nearby${queryString(query)}`);
}

export function getPublicTechnician(id: string) { return request<ContractorAdminDetails>(`/services/contractors/${encodeURIComponent(id)}`); }
export function getServiceOffers() { return request<ServiceOffer[]>('/services/offers'); }
export function getAdminServiceOffers(token: string) { return request<ServiceOffer[]>('/admin/service-offers', { token }); }
export function saveAdminServiceOffer(token: string, input: ServiceOfferInput, id?: string) { return request<ServiceOffer>(`/admin/service-offers${id ? `/${encodeURIComponent(id)}` : ''}`, { token, method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) }); }

export function createServiceBooking(token: string, input: ServiceBookingInput) {
  return request<ServiceBookingRecord>('/services/bookings', {
    token,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getServiceBookings(token: string) {
  return request<ServiceBookingRecord[]>('/services/bookings', { token });
}

export function getContractorBookings(token: string) {
  return request<ServiceBookingRecord[]>('/services/contractor/bookings', { token });
}

export function getContractorProfile(token: string) {
  return request<ContractorAdminDetails>('/services/contractor/profile', { token });
}

export function saveContractorProfile(token: string, input: ContractorProfileInput) {
  return request<ContractorAdminDetails>('/services/contractor/profile', {
    token,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function acceptServiceBooking(token: string, id: string) {
  return request<ServiceBookingRecord>(`/services/bookings/${encodeURIComponent(id)}/accept`, { token, method: 'PATCH' });
}

export function rejectServiceBookingAsTechnician(token: string, id: string) {
  return request<ServiceBookingRecord>(`/services/bookings/${encodeURIComponent(id)}/reject`, { token, method: 'PATCH' });
}

export function confirmServiceBookingCompletion(token: string, id: string) {
  return request<ServiceBookingRecord>(`/services/bookings/${encodeURIComponent(id)}/customer-complete`, { token, method: 'PATCH' });
}

export function completeServiceBooking(token: string, id: string) {
  return request<ServiceBookingRecord>(`/services/bookings/${encodeURIComponent(id)}/complete`, { token, method: 'PATCH' });
}

export function getAdminOverview(token: string) {
  return request<AdminOverview>('/admin/overview', { token });
}

export function getAdminProducts(token: string) {
  return request<AdminProduct[]>('/admin/products', { token });
}
export function getAdminHsnMaster(token: string) { return request<HsnMaster[]>('/admin/hsn-master', { token }); }
export function createAdminHsnMaster(token: string, input: AdminHsnInput) { return request<HsnMaster>('/admin/hsn-master', { token, method: 'POST', body: JSON.stringify(input) }); }

export function createAdminProduct(token: string, input: AdminProductInput) {
  return request<AdminProduct>('/admin/products', {
    token,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminProduct(token: string, id: string, input: AdminProductInput) {
  return request<AdminProduct>(`/admin/products/${encodeURIComponent(id)}`, {
    token,
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function removeAdminProduct(token: string, id: string) {
  return request<AdminProduct>(`/admin/products/${encodeURIComponent(id)}`, {
    token,
    method: 'DELETE',
  });
}

export function getAdminUsers(token: string) {
  return request<PublicUser[]>('/admin/users', { token });
}
export function getAdminUserProfile(token: string, id: string) { return request<AdminUserProfile>(`/admin/users/${encodeURIComponent(id)}`, { token }); }

export function getAdminBusinesses(token: string) {
  return request<AdminBusinessDetails[]>('/admin/businesses', { token });
}

export function approveAdminBusiness(token: string, id: string) {
  return request<AdminBusinessDetails>(`/admin/businesses/${encodeURIComponent(id)}/approve`, { token, method: 'PATCH' });
}

export function rejectAdminBusiness(token: string, id: string) {
  return request<AdminBusinessDetails>(`/admin/businesses/${encodeURIComponent(id)}/reject`, { token, method: 'PATCH' });
}

export function reapproveAdminBusiness(token: string, id: string) {
  return request<AdminBusinessDetails>(`/admin/businesses/${encodeURIComponent(id)}/reapprove`, { token, method: 'PATCH' });
}

export function getAdminOrders(token: string) {
  return request<OrderDetails[]>('/admin/orders', { token });
}

export function getAdminReturnRequests(token: string) {
  return request<ReturnRequest[]>('/admin/returns', { token });
}

export function updateAdminReturnStatus(token: string, id: string, input: ReturnRequestStatusUpdateInput) {
  return request<ReturnRequest>(`/admin/returns/${encodeURIComponent(id)}/status`, { token, method: 'PATCH', body: JSON.stringify(input) });
}

export function approveAdminOrder(token: string, id: string) {
  return request<OrderSummary>(`/admin/orders/${encodeURIComponent(id)}/approve`, { token, method: 'PATCH' });
}

export function rejectAdminOrder(token: string, id: string, reason: string) {
  return request<OrderSummary>(`/admin/orders/${encodeURIComponent(id)}/reject`, {
    token,
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}
export function cancelAdminOrder(token: string, id: string, reason: string) {
  return request<OrderSummary>(`/admin/orders/${encodeURIComponent(id)}/cancel`, { token, method: 'PATCH', body: JSON.stringify({ reason }) });
}

export function updateAdminOrderStatus(token: string, id: string, status: OrderSummary['status']) {
  return request<OrderSummary>(`/admin/orders/${encodeURIComponent(id)}/status`, {
    token,
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getAdminServiceBookings(token: string) {
  return request<ServiceBookingRecord[]>('/admin/service-bookings', { token });
}

export function getAdminContractors(token: string) {
  return request<ContractorAdminDetails[]>('/admin/contractors', { token });
}

export function approveAdminContractor(token: string, id: string) {
  return request<ContractorAdminDetails>(`/admin/contractors/${encodeURIComponent(id)}/approve`, { token, method: 'PATCH' });
}

export function rejectAdminContractor(token: string, id: string) {
  return request<ContractorAdminDetails>(`/admin/contractors/${encodeURIComponent(id)}/reject`, { token, method: 'PATCH' });
}

export function reapproveAdminContractor(token: string, id: string) {
  return request<ContractorAdminDetails>(`/admin/contractors/${encodeURIComponent(id)}/reapprove`, { token, method: 'PATCH' });
}

export function approveAdminServiceBooking(token: string, id: string) {
  return request<ServiceBookingRecord>(`/admin/service-bookings/${encodeURIComponent(id)}/approve`, { token, method: 'PATCH' });
}

export function rejectAdminServiceBooking(token: string, id: string, reason?: string) {
  return request<ServiceBookingRecord>(`/admin/service-bookings/${encodeURIComponent(id)}/reject`, {
    token,
    method: 'PATCH',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export function removeAdminUser(token: string, id: string) {
  return request<PublicUser>(`/admin/users/${encodeURIComponent(id)}`, {
    token,
    method: 'DELETE',
  });
}

export function restoreAdminUser(token: string, id: string) {
  return request<PublicUser>(`/admin/users/${encodeURIComponent(id)}/restore`, {
    token,
    method: 'PATCH',
  });
}

export function getAdminBanners(token: string) {
  return request<Banner[]>('/admin/banners', { token });
}

export function createAdminBanner(token: string, input: AdminBannerInput) {
  return request<Banner>('/admin/banners', {
    token,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminBanner(token: string, id: string, input: AdminBannerInput) {
  return request<Banner>(`/admin/banners/${encodeURIComponent(id)}`, {
    token,
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function removeAdminBanner(token: string, id: string) {
  return request<{ id: string }>(`/admin/banners/${encodeURIComponent(id)}`, {
    token,
    method: 'DELETE',
  });
}

export type NativeUploadFile = { uri: string; type: string; name: string };

export async function uploadAdminImage(token: string, file: Blob | NativeUploadFile, name: string) {
  const body = new FormData();
  if ('uri' in file) body.append('file', file as unknown as Blob);
  else body.append('file', file, name);
  return request<{ url: string; size: number }>('/admin/uploads', {
    token,
    method: 'POST',
    body,
  });
}
