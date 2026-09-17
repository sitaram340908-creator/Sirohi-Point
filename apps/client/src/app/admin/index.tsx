import { paymentChannelLabel, type AdminBannerInput, type AdminBusinessDetails, type AdminProduct, type AdminProductInput, type AdminUserProfile, type Banner, type BannerAudience, type ContractorAdminDetails, type ProductCategory, type PublicUser, type OrderDetails, type HsnMaster, type ReturnRequest } from '@sirohi/contracts';
import { productCategories } from '@sirohi/contracts';
import { radius, spacing, type ThemeColors } from '@sirohi/design-tokens';
import { formatMoney } from '@sirohi/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { ServiceOffersEditor } from '@/components/service-offers-editor';
import {
  createAdminBanner,
  createAdminProduct,
  approveAdminOrder,
  cancelAdminOrder,
  approveAdminContractor,
  approveAdminBusiness,
  approveAdminServiceBooking,
  getAdminBanners,
  getAdminBusinesses,
  getAdminContractors,
  getAdminOrders,
  getAdminReturnRequests,
  getAdminOverview,
  getAdminProducts,
  getAdminHsnMaster,
  createAdminHsnMaster,
  getAdminServiceBookings,
  getAdminUsers,
  getAdminUserProfile,
  getCatalogCategories,
  rejectAdminOrder,
  rejectAdminContractor,
  rejectAdminBusiness,
  rejectAdminServiceBooking,
  reapproveAdminContractor,
  reapproveAdminBusiness,
  removeAdminBanner,
  removeAdminProduct,
  removeAdminUser,
  restoreAdminUser,
  updateAdminOrderStatus,
  updateAdminReturnStatus,
  updateAdminBanner,
  updateAdminProduct,
  uploadAdminImage,
  type CatalogCategory,
  type NativeUploadFile,
  type ServiceBookingRecord,
} from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useAppTheme } from '@/theme/theme-context';

// NOTE: adjust this relative path if this file is moved.
// Expected logo file at: apps/client/assets/images/products/sirohi-logo.png
// (rename/place your uploaded logo file to that exact path, or change the
// path below to match whatever filename you use).
const sirohiLogo = require('./logo_sirohi.png');

type AdminTab = 'overview' | 'products' | 'hsn' | 'banners' | 'users' | 'orders' | 'returns' | 'services' | 'technicians' | 'businesses' | 'offers';
const tabs: { key: AdminTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'offers', label: 'Service discounts' },
  { key: 'products', label: 'Products' },
  { key: 'hsn', label: 'HSN Master' },
  { key: 'banners', label: 'Home banners' },
  { key: 'users', label: 'Users' },
  { key: 'orders', label: 'Order approvals' },
  { key: 'returns', label: 'Return requests' },
  { key: 'services', label: 'Service requests' },
  { key: 'technicians', label: 'Technician approvals' },
  { key: 'businesses', label: 'Business approvals' },
];

const emptyProduct = {
  name: '', category: 'Hardware' as ProductCategory, subcategoryId: '', hsnId: '', brand: '', description: '', price: '', b2bPrice: '', minimumB2BQuantity: '', compareAtPrice: '', stock: '', badge: '', tone: '#1769FF', serviceAvailable: false, allowB2BBackorder: false, codAvailable: true, active: true, imageUrl: '',
};
const emptyBanner = {
  title: '', subtitle: '', badge: '', imageUrl: '', productId: '', ctaLabel: 'Shop now', audience: 'B2C' as BannerAudience, backgroundColor: '#0B1F33', sortOrder: '0', active: true,
};

export default function AdminScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 860;
  const tablet = width >= 640 && width < 860;
  const compact = width < 420;
  const styles = useMemo(() => createStyles({ colors, desktop, tablet, compact }), [colors, desktop, tablet, compact]);
  const { user, token, hydrated, logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [message, setMessage] = useState<string | null>(null);
  const authorised = user?.role === 'ADMIN' && Boolean(token);

  useEffect(() => {
    if (hydrated && !authorised) router.replace('/admin/login' as never);
  }, [authorised, hydrated, router]);

  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => getAdminOverview(token!), enabled: authorised, refetchInterval: 5000 });
  const products = useQuery({ queryKey: ['admin', 'products'], queryFn: () => getAdminProducts(token!), enabled: authorised, refetchInterval: 5000 });
  const banners = useQuery({ queryKey: ['admin', 'banners'], queryFn: () => getAdminBanners(token!), enabled: authorised, refetchInterval: 5000 });
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: () => getAdminUsers(token!), enabled: authorised, refetchInterval: 5000 });
  const orders = useQuery({ queryKey: ['admin', 'orders'], queryFn: () => getAdminOrders(token!), enabled: authorised, refetchInterval: 5000 });
  const returns = useQuery({ queryKey: ['admin', 'returns'], queryFn: () => getAdminReturnRequests(token!), enabled: authorised, refetchInterval: 5000 });
  const serviceBookings = useQuery({ queryKey: ['admin', 'service-bookings'], queryFn: () => getAdminServiceBookings(token!), enabled: authorised, refetchInterval: 5000 });
  const contractors = useQuery({ queryKey: ['admin', 'contractors'], queryFn: () => getAdminContractors(token!), enabled: authorised, refetchInterval: 5000 });
  const businesses = useQuery({ queryKey: ['admin', 'businesses'], queryFn: () => getAdminBusinesses(token!), enabled: authorised, refetchInterval: 5000 });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
      queryClient.invalidateQueries({ queryKey: ['banners'] }),
    ]);
  }

  if (!hydrated || !authorised) return <View style={styles.loading}><ActivityIndicator color={styles.spinner.color} /><Text style={styles.muted}>Checking administrator access…</Text></View>;

  return (
    <View style={styles.page}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.push('/')} style={styles.brandWrap}>
          <Image source={sirohiLogo} style={styles.brandLogo} resizeMode="contain" />
          <View style={styles.brandTextWrap}>
            <Text numberOfLines={1} style={styles.brand}>SIROHI POINT<Text style={styles.brandDot}>.</Text></Text>
            {!compact ? <Text numberOfLines={1} style={styles.brandTagline}>ADMIN PANEL</Text> : null}
          </View>
        </Pressable>
        <View style={styles.topActions}>{desktop ? <Text numberOfLines={1} style={styles.adminName}>{user.name}</Text> : null}<Pressable style={styles.outlineButton} onPress={() => void logout().then(() => router.replace('/admin/login' as never))}><Text style={styles.outlineText}>Sign out</Text></Pressable></View>
      </View>

      <View style={[styles.workspace, desktop && styles.workspaceDesktop]}>
        <ScrollView horizontal={!desktop} style={[styles.sidebar, !desktop && styles.sidebarMobile]} contentContainerStyle={!desktop ? styles.sidebarRow : undefined}>
          {tabs.map((item) => <Pressable key={item.key} onPress={() => { setTab(item.key); setMessage(null); }} style={[styles.navButton, tab === item.key && styles.navActive]}><Text style={[styles.navText, tab === item.key && styles.navTextActive]}>{item.label}</Text></Pressable>)}
          <Pressable onPress={() => router.push('/')} style={styles.storeLink}><Text style={styles.storeLinkText}>View store ↗</Text></Pressable>
        </ScrollView>

        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}><View><Text accessibilityRole="header" style={styles.title}>{tabs.find((item) => item.key === tab)?.label}</Text></View></View>
          {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}

          {tab === 'offers' ? <ServiceOffersEditor token={token!} /> : null}
          {tab === 'overview' ? <OverviewPanel data={overview.data} loading={overview.isLoading} styles={styles} /> : null}
          {tab === 'products' ? <ProductsPanel token={token!} products={products.data ?? []} loading={products.isLoading} onChanged={refresh} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'hsn' ? <HsnMasterPanel token={token!} onChanged={refresh} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'banners' ? <BannersPanel token={token!} banners={banners.data ?? []} products={products.data ?? []} loading={banners.isLoading} onChanged={refresh} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'users' ? <UsersPanel token={token!} users={users.data ?? []} currentUserId={user.id} loading={users.isLoading} onChanged={refresh} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'orders' ? <OrdersPanel token={token!} orders={orders.data} loading={orders.isLoading} error={orders.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'returns' ? <ReturnsPanel token={token!} requests={returns.data} loading={returns.isLoading} error={returns.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'services' ? <ServicesPanel token={token!} bookings={serviceBookings.data} loading={serviceBookings.isLoading} error={serviceBookings.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'technicians' ? <TechniciansPanel token={token!} contractors={contractors.data} loading={contractors.isLoading} error={contractors.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'businesses' ? <BusinessesPanel token={token!} businesses={businesses.data} loading={businesses.isLoading} error={businesses.isError} setMessage={setMessage} styles={styles} /> : null}
        </ScrollView>
      </View>
    </View>
  );
}

type AdminOrderPreview = {
  id: string;
  buyer: string;
  buyerEmail?: string;
  cancellationReason?: string;
  segment: 'B2C' | 'B2B';
  itemCount: number;
  totalInPaise: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  status: OrderDetails['status'];
  paymentMethod: OrderDetails['paymentMethod'];
  paymentChannel?: OrderDetails['paymentChannel'];
  summary: string;
};

const editableOrderStatuses: OrderDetails['status'][] = ['ACCEPTED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

type AdminServicePreview = {
  id: string;
  customer: string;
  serviceType: string;
  technician: string;
  area: string;
  status: 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
};

function OrdersPanel({ token, orders: liveOrders, loading, error, setMessage, styles }: { token: string; orders?: OrderDetails[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();
  const [cancellation, setCancellation] = useState<{ id: string; kind: 'reject' | 'cancel' } | null>(null);
  const [reason, setReason] = useState('');
  const orders = (liveOrders ?? []).map(toAdminOrderPreview);
  async function updateApproval(id: string, approvalStatus: 'APPROVED' | 'REJECTED') {
    if (approvalStatus === 'REJECTED') { setCancellation({ id, kind: 'reject' }); setReason(''); return; }
    try {
      await approveAdminOrder(token, id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setMessage(`Order ${id} marked ${approvalStatus.toLowerCase()}.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Unable to update the order.'); }
  }
  async function confirmCancellation() {
    if (!cancellation) return;
    if (reason.trim().length < 2) { setMessage('Enter a cancellation reason of at least 2 characters.'); return; }
    try {
      if (cancellation.kind === 'reject') await rejectAdminOrder(token, cancellation.id, reason.trim());
      else await cancelAdminOrder(token, cancellation.id, reason.trim());
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setMessage(`Order ${cancellation.id} ${cancellation.kind === 'reject' ? 'rejected' : 'cancelled'} with the recorded reason.`);
      setCancellation(null); setReason('');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Unable to cancel the order.'); }
  }
  async function updateStatus(id: string, status: AdminOrderPreview['status']) {
    try {
      await updateAdminOrderStatus(token, id, status);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });

      setMessage(`Order ${id} fulfilment status changed to ${status.toLowerCase()}.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Unable to update the order status.'); }
  }
  return <View style={styles.stack}>
    <View style={styles.previewBanner}><Text style={styles.previewTitle}>Approval workflow</Text><Text style={styles.previewCopy}>Customer or business submits → admin reviews → admin approves or rejects → fulfilment status continues.</Text></View>
    <Editor title="Product orders" styles={styles}>{loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load orders from the backend.</Text> : orders.length ? orders.map((order) => <View key={order.id} style={styles.dataRow}><View style={styles.segmentPill}><Text style={styles.segmentText}>{order.segment}</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{order.id} · {order.buyer}</Text><Text style={styles.rowMeta}>{order.buyerEmail ?? 'Email not recorded'} · {order.summary}</Text><Text style={styles.rowMeta}>{order.itemCount} items · {formatMoney(order.totalInPaise)} · Payment: {order.paymentMethod === 'ONLINE' ? `Online · ${paymentChannelLabel(order.paymentChannel)}` : 'Cash on Delivery'}</Text><Text style={[styles.stateText, (order.approvalStatus === 'REJECTED' || order.status === 'CANCELLED') && styles.dangerText]}>Approval: {order.approvalStatus} · {order.status}</Text>{order.cancellationReason ? <Text style={[styles.rowMeta, styles.dangerText]}>Reason: {order.cancellationReason}</Text> : null}</View><View style={styles.rowActions}>{order.approvalStatus === 'PENDING' ? <><Action label="Approve" small onPress={() => void updateApproval(order.id, 'APPROVED')} styles={styles} /><Action label="Reject" small danger onPress={() => void updateApproval(order.id, 'REJECTED')} styles={styles} /></> : order.approvalStatus === 'APPROVED' && order.status !== 'CANCELLED' ? <View style={styles.statusPicker}><Text style={styles.rowMeta}>Fulfilment status</Text><View style={styles.choiceRow}>{editableOrderStatuses.map((status) => <Choice key={status} label={status} selected={order.status === status} onPress={() => void updateStatus(order.id, status)} styles={styles} />)}<Action label="Cancel order" small danger onPress={() => { setCancellation({ id: order.id, kind: 'cancel' }); setReason(''); }} styles={styles} /></View></View> : <Text style={[styles.stateText, styles.dangerText]}>{order.status === 'CANCELLED' ? 'CANCELLED' : 'REJECTED'}</Text>}</View></View>) : <Text style={styles.muted}>No product orders in the database.</Text>}</Editor>
    {cancellation ? <Editor title={cancellation.kind === 'reject' ? 'Reject order' : 'Cancel approved order'} styles={styles}><Text style={styles.rowMeta}>This reason is stored with the order and displayed to the buyer.</Text><Field label="Cancellation reason" value={reason} onChangeText={setReason} styles={styles} multiline /><View style={styles.actionRow}><Action label={cancellation.kind === 'reject' ? 'Confirm rejection' : 'Confirm cancellation'} danger onPress={() => void confirmCancellation()} styles={styles} /><Action label="Keep order" secondary onPress={() => { setCancellation(null); setReason(''); }} styles={styles} /></View></Editor> : null}
  </View>;
}

function ServicesPanel({ token, bookings: liveBookings, loading, error, setMessage, styles }: { token: string; bookings?: ServiceBookingRecord[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();

  const bookings = (liveBookings ?? []).map(toAdminServicePreview);
  async function update(id: string, status: 'APPROVED' | 'REJECTED') {
    if (liveBookings) {
      try {
        if (status === 'APPROVED') await approveAdminServiceBooking(token, id);
        else await rejectAdminServiceBooking(token, id);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'service-bookings'] });
      } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Unable to update the service request.'); return; }
    }

    setMessage(`Service request ${id} marked ${status.toLowerCase()}.`);
  }
  return <View style={styles.stack}>
    <View style={styles.previewBanner}><Text style={styles.previewTitle}>Service approval workflow</Text><Text style={styles.previewCopy}>Customer request → admin approval → technician accepts or rejects → technician marks completed.</Text></View>
    <Editor title="Service requests" styles={styles}>{loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load service requests from the backend.</Text> : bookings.length ? bookings.map((booking) => <View key={booking.id} style={styles.dataRow}><View style={styles.serviceIcon}><Text style={styles.serviceIconText}>⚒</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{booking.id} · {booking.serviceType}</Text><Text style={styles.rowMeta}>{booking.customer} · {booking.technician}</Text><Text style={styles.rowMeta}>{booking.area}</Text></View><View style={styles.rowActions}>{booking.status === 'PENDING_ADMIN' ? <><Action label="Approve" small onPress={() => void update(booking.id, 'APPROVED')} styles={styles} /><Action label="Reject" small danger onPress={() => void update(booking.id, 'REJECTED')} styles={styles} /></> : <Text style={[styles.stateText, booking.status === 'REJECTED' && styles.dangerText]}>{booking.status}</Text>}</View></View>) : <Text style={styles.muted}>No service requests in the database.</Text>}</Editor>
  </View>;
}

function ReturnsPanel({ token, requests: liveRequests, loading, error, setMessage, styles }: { token: string; requests?: ReturnRequest[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();
  const requests = liveRequests ?? [];

  async function update(id: string, status: ReturnRequest['status']) {
    try {
      await updateAdminReturnStatus(token, id, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] });
      setMessage(`Return request ${id} marked ${status.toLowerCase().replace(/_/g, ' ')}.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to update the return request.');
    }
  }

  return <View style={styles.stack}>
    <View style={styles.previewBanner}><Text style={styles.previewTitle}>Return approval workflow</Text><Text style={styles.previewCopy}>Customer or business submits → admin reviews → pickup is scheduled → item is received → refund is completed.</Text></View>
    <Editor title="Customer and B2B return requests" styles={styles}>{loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load return requests from the backend.</Text> : requests.length ? requests.map((request) => <View key={request.id} style={styles.dataRow}><View style={styles.segmentPill}><Text style={styles.segmentText}>{request.buyerSegment}</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{request.id} · {request.items.map((item) => `${item.quantity} × ${item.productName}`).join(' · ')}</Text><Text style={styles.rowMeta}>{request.customerName ?? request.customerId}{request.customerEmail ? ` · ${request.customerEmail}` : ''} · Order {request.orderId}</Text><Text style={styles.rowMeta}>Pickup: {request.address}</Text><Text style={styles.rowMeta}>Submitted {new Date(request.createdAt).toLocaleDateString('en-IN')} {request.reason ? `· Reason: ${request.reason}` : ''}</Text>{request.adminNote ? <Text style={styles.rowMeta}>Admin note: {request.adminNote}</Text> : null}<Text style={[styles.stateText, (request.status === 'REJECTED' || request.status === 'CANCELLED') && styles.dangerText]}>Status: {request.status.replace(/_/g, ' ')}</Text></View><View style={styles.rowActions}>{returnActions(request.status).map((status) => <Action key={status} label={returnActionLabel(status)} small danger={status === 'REJECTED'} onPress={() => void update(request.id, status)} styles={styles} />)}</View></View>) : <Text style={styles.muted}>No return requests in the database.</Text>}</Editor>
  </View>;
}

function returnActions(status: ReturnRequest['status']): ReturnRequest['status'][] {
  if (status === 'PENDING') return ['APPROVED', 'REJECTED'];
  if (status === 'APPROVED') return ['PICKUP_SCHEDULED'];
  if (status === 'PICKUP_SCHEDULED') return ['RECEIVED'];
  if (status === 'RECEIVED') return ['REFUNDED'];
  return [];
}

function returnActionLabel(status: ReturnRequest['status']) {
  if (status === 'PICKUP_SCHEDULED') return 'Schedule pickup';
  if (status === 'RECEIVED') return 'Mark received';
  if (status === 'REFUNDED') return 'Mark refunded';
  return status === 'APPROVED' ? 'Approve' : 'Reject';
}

function toAdminOrderPreview(order: OrderDetails): AdminOrderPreview {
  return { id: order.id, buyer: order.buyerName ?? order.customerId, buyerEmail: order.buyerEmail, cancellationReason: order.cancellationReason, segment: order.buyerSegment ?? 'B2C', itemCount: order.itemCount, totalInPaise: order.totalInPaise, approvalStatus: order.approvalStatus ?? 'PENDING', status: order.status, paymentMethod: order.paymentMethod, paymentChannel: order.paymentChannel, summary: order.items.map((item) => `${item.quantity} × ${item.productName}`).join(' · ') };
}

function toAdminServicePreview(booking: ServiceBookingRecord): AdminServicePreview {
  return { id: booking.id, customer: booking.customer?.name ?? booking.customerId, serviceType: booking.serviceType, technician: booking.contractor?.user?.name ?? 'Unassigned', area: booking.address, status: booking.approvalStatus };
}

type AdminContractorPreview = Pick<ContractorAdminDetails, 'id' | 'name' | 'email' | 'phone' | 'skills' | 'serviceArea' | 'experienceYears' | 'availability' | 'approvalStatus' | 'services'>;

function TechniciansPanel({ token, contractors, loading, error, setMessage, styles }: { token: string; contractors?: ContractorAdminDetails[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();

  const profiles = contractors ?? [];

  async function update(id: string, status: AdminContractorPreview['approvalStatus'], reapprove = false) {
    try {
      if (status === 'APPROVED' && reapprove) await reapproveAdminContractor(token, id);
      else if (status === 'APPROVED') await approveAdminContractor(token, id);
      else await rejectAdminContractor(token, id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'contractors'] });
      await queryClient.invalidateQueries({ queryKey: ['services', 'nearby'] });

      setMessage(`Technician registration ${id} marked ${status.toLowerCase()}.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Unable to update technician registration.'); }
  }

  return <View style={styles.stack}>
    <View style={styles.previewBanner}><Text style={styles.previewTitle}>Technician registration workflow</Text><Text style={styles.previewCopy}>Technician submits profile → admin reviews the registration → approved profile becomes searchable to customers.</Text></View>
    {error ? <Text style={styles.errorText}>Unable to load technician registration requests.</Text> : null}
    <Editor title="Technician registration requests" styles={styles}>{loading ? <Loading styles={styles} /> : profiles.length ? profiles.map((profile) => <View key={profile.id} style={styles.dataRow}><View style={styles.avatar}><Text style={styles.avatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{profile.name}</Text><Text style={styles.rowMeta}>{profile.email ?? profile.phone ?? 'Contact not provided'} · {profile.skills.join(', ')}</Text><Text style={styles.rowMeta}>{profile.services.map((service) => service.serviceType).join(', ')} · {profile.serviceArea ?? 'Service area not provided'} · {profile.experienceYears ?? 0} years experience</Text><Text style={[styles.stateText, profile.approvalStatus === 'REJECTED' && styles.dangerText]}>{profile.approvalStatus} · {profile.availability}</Text></View><View style={styles.rowActions}>{profile.approvalStatus === 'PENDING' ? <><Action label="Approve" small onPress={() => void update(profile.id, 'APPROVED')} styles={styles} /><Action label="Reject" small danger onPress={() => void update(profile.id, 'REJECTED')} styles={styles} /></> : profile.approvalStatus === 'REJECTED' ? <Action label="Reapprove" small onPress={() => void update(profile.id, 'APPROVED', true)} styles={styles} /> : <Text style={styles.stateText}>APPROVED</Text>}</View></View>) : <Text style={styles.muted}>No technician registration requests yet.</Text>}</Editor>
  </View>;
}

function BusinessesPanel({ token, businesses: liveBusinesses, loading, error, setMessage, styles }: { token: string; businesses?: AdminBusinessDetails[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();

  const businesses = liveBusinesses ?? [];

  async function update(id: string, status: 'APPROVED' | 'REJECTED', reapprove = false) {
    try {
      if (status === 'APPROVED' && reapprove) await reapproveAdminBusiness(token, id);
      else if (status === 'APPROVED') await approveAdminBusiness(token, id);
      else await rejectAdminBusiness(token, id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'businesses'] });

      setMessage(`Business registration ${id} marked ${status.toLowerCase()}.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to update business registration.');
    }
  }

  return <View style={styles.stack}>
    <View style={styles.previewBanner}><Text style={styles.previewTitle}>B2B account approval workflow</Text><Text style={styles.previewCopy}>Business submits registration → admin reviews the details → approved businesses can sign in and use B2B pricing. Rejected requests can be approved again later.</Text></View>
    {error ? <Text style={styles.errorText}>Unable to load business registration requests.</Text> : null}
    <Editor title={`Business registration requests (${businesses.length})`} styles={styles}>{loading ? <Loading styles={styles} /> : businesses.length ? businesses.map((business) => <View key={business.id} style={styles.dataRow}><View style={styles.avatar}><Text style={styles.avatarText}>{business.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{business.businessName}</Text><Text style={styles.rowMeta}>{business.name} · {business.email}{business.phone ? ` · ${business.phone}` : ''}</Text><Text style={styles.rowMeta}>{business.businessType ?? 'Business type not provided'}{business.gstin ? ` · GSTIN ${business.gstin}` : ''}</Text><Text style={styles.rowMeta}>{business.billingAddress}</Text><Text style={[styles.stateText, business.approvalStatus === 'REJECTED' && styles.dangerText]}>{business.approvalStatus}</Text></View><View style={styles.rowActions}>{business.approvalStatus === 'PENDING' ? <><Action label="Approve" small onPress={() => void update(business.id, 'APPROVED')} styles={styles} /><Action label="Reject" small danger onPress={() => void update(business.id, 'REJECTED')} styles={styles} /></> : business.approvalStatus === 'REJECTED' ? <Action label="Reapprove" small onPress={() => void update(business.id, 'APPROVED', true)} styles={styles} /> : <Text style={styles.stateText}>APPROVED</Text>}</View></View>) : <Text style={styles.muted}>No business registration requests yet.</Text>}</Editor>
  </View>;
}

function OverviewPanel({ data, loading, styles }: { data?: { userCount: number; activeUserCount: number; productCount: number; activeProductCount: number; bannerCount: number }; loading: boolean; styles: Styles }) {
  if (loading || !data) return <Loading styles={styles} />;
  return <View style={styles.metricGrid}>
    <Metric value={data.activeUserCount} label="Active users" styles={styles} />
    <Metric value={data.activeProductCount} label="Live products" styles={styles} />
    <Metric value={data.bannerCount} label="Home banners" styles={styles} />
    <Metric value={data.userCount - data.activeUserCount} label="Removed access" styles={styles} />
  </View>;
}

function Metric({ value, label, styles }: { value: number; label: string; styles: Styles }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function ProductRow({ product, subcategoryName, onEdit, onRemove, busy, styles }: { product: AdminProduct; subcategoryName?: string; onEdit(): void; onRemove(): void; busy: boolean; styles: Styles }) {
  const b2cPriceInPaise = product.b2cPriceInPaise ?? product.priceInPaise;
  return (
    <View style={styles.productRow}>
      <View style={styles.productThumbWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.productThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.productThumb, styles.productThumbEmpty]}><Text style={styles.productThumbEmptyText}>No image</Text></View>
        )}
      </View>
      <View style={styles.productDetails}>
        <Text numberOfLines={1} style={styles.rowTitle}>{product.name}</Text>
        <Text style={styles.rowMeta}>{product.category}{subcategoryName ? ` › ${subcategoryName}` : ''} · {product.brand}</Text>
        <Text style={styles.rowMeta}>HSN: {product.hsnCode ?? 'Not assigned'}</Text>
        <Text style={styles.rowMeta}>
          B2C {formatMoney(b2cPriceInPaise)}
          {product.b2bPriceInPaise ? ` · B2B ${formatMoney(product.b2bPriceInPaise)}${product.minimumB2BQuantity ? ` (min ${product.minimumB2BQuantity})` : ''}` : ''}
          {product.compareAtPriceInPaise ? ` · MRP ${formatMoney(product.compareAtPriceInPaise)}` : ''}
        </Text>
        <Text style={styles.rowMeta}>Stock: {product.stock}{product.badge ? ` · Badge: ${product.badge}` : ''}</Text>
        {product.description ? <Text numberOfLines={2} style={styles.rowMeta}>{product.description}</Text> : null}
        <Text style={styles.rowMeta}>{product.serviceAvailable ? 'Installation available' : 'No installation'}{product.allowB2BBackorder ? ' · B2B backorder allowed' : ''}</Text>
        <Text style={[styles.stateText, !product.active && styles.dangerText]}>{product.active ? 'LIVE' : 'REMOVED'}</Text>
      </View>
      <View style={styles.rowActions}>
        <Action label="Edit" small secondary onPress={onEdit} styles={styles} />
        <Action label="Remove" small danger onPress={onRemove} disabled={!product.active || busy} styles={styles} />
      </View>
    </View>
  );
}

function ProductsPanel({ token, products, loading, onChanged, setMessage, styles }: { token: string; products: AdminProduct[]; loading: boolean; onChanged(): Promise<void>; setMessage(value: string): void; styles: Styles }) {
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hsnSearch, setHsnSearch] = useState('');
  const categoriesQuery = useQuery({ queryKey: ['catalog', 'categories'], queryFn: () => getCatalogCategories() });
  const hsnQuery = useQuery({ queryKey: ['admin', 'hsn-master'], queryFn: () => getAdminHsnMaster(token), enabled: Boolean(token) });
  const hsnMaster: HsnMaster[] = hsnQuery.data ?? [];
  const filteredHsn = hsnMaster.filter((hsn) => `${hsn.code} ${hsn.description}`.toLowerCase().includes(hsnSearch.trim().toLowerCase()));
  const categories: CatalogCategory[] = categoriesQuery.data ?? [];
  const categoryToSlugMap: Record<ProductCategory, string> = { 'Hardware': 'hardware', 'Electrical': 'electrical', 'Electronics': 'electronics', 'Paint': 'paint', 'PVC PIPE': 'plumbing', 'PVC & Plumbing': 'plumbing', 'Sanitary': 'sanitary', 'Others': 'others' };
  const selectedCategorySlug = categoryToSlugMap[form.category];
  const matchedCategory = categories.find((c) => c.slug === selectedCategorySlug);
  const subcategories = matchedCategory?.subcategories ?? [];

  function edit(product: AdminProduct) {
    setEditingId(product.id);
    setForm({ name: product.name, category: product.category, subcategoryId: product.subcategoryId ?? '', hsnId: product.hsnId ?? '', brand: product.brand, description: product.description, price: String((product.b2cPriceInPaise ?? product.priceInPaise) / 100), b2bPrice: product.b2bPriceInPaise ? String(product.b2bPriceInPaise / 100) : '', minimumB2BQuantity: product.minimumB2BQuantity ? String(product.minimumB2BQuantity) : '', compareAtPrice: product.compareAtPriceInPaise ? String(product.compareAtPriceInPaise / 100) : '', stock: String(product.stock), badge: product.badge ?? '', tone: product.tone, serviceAvailable: product.serviceAvailable, allowB2BBackorder: product.allowB2BBackorder ?? false, codAvailable: product.codAvailable ?? true, active: product.active, imageUrl: product.imageUrl ?? '' });
    setHsnSearch(product.hsnCode ?? '');
  }

  async function save() {
    const input: AdminProductInput = {
      name: form.name.trim(), category: form.category, ...(matchedCategory?.id ? { categoryId: matchedCategory.id } : {}), ...(form.hsnId ? { hsnId: form.hsnId } : {}), brand: form.brand.trim(), description: form.description.trim(), priceInPaise: Math.round(Number(form.price) * 100), stock: Number(form.stock), tone: form.tone, serviceAvailable: form.serviceAvailable, codAvailable: form.codAvailable, active: form.active,
      ...(form.b2bPrice ? { b2bPriceInPaise: Math.round(Number(form.b2bPrice) * 100) } : {}),
      ...(form.minimumB2BQuantity ? { minimumB2BQuantity: Number(form.minimumB2BQuantity) } : {}),
      ...(form.allowB2BBackorder ? { allowB2BBackorder: true } : {}),
      ...(form.compareAtPrice ? { compareAtPriceInPaise: Math.round(Number(form.compareAtPrice) * 100) } : {}),
      ...(form.badge.trim() ? { badge: form.badge.trim() } : {}),
      ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
      ...(form.subcategoryId ? { subcategoryId: form.subcategoryId } : {}),
    };
    if (!input.name || !input.brand || !input.description || !Number.isFinite(input.priceInPaise) || !Number.isInteger(input.stock) || !form.hsnId) { setMessage('Complete all required fields and select an HSN code.'); return; }
    setBusy(true);
    try {
      if (editingId) await updateAdminProduct(token, editingId, input); else await createAdminProduct(token, input);
      setForm(emptyProduct); setEditingId(null); setHsnSearch(''); setMessage(editingId ? 'Product updated.' : 'Product published.'); await onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save product.'); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); try { await removeAdminProduct(token, id); setMessage('Product removed from the storefront.'); await onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to remove product.'); } finally { setBusy(false); }
  }

  async function uploadImage() {
    await chooseAndUpload(token, (url) => setForm((current) => ({ ...current, imageUrl: url })), setMessage, setBusy);
  }

  return <View style={styles.stack}>
    <Editor title={editingId ? 'Edit product' : 'Add product'} styles={styles}>
      <View style={styles.formGrid}>
        <Field label="Product name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} styles={styles} />
        <Field label="Brand" value={form.brand} onChangeText={(brand) => setForm({ ...form, brand })} styles={styles} />
        <Field label="B2C price (₹)" value={form.price} keyboardType="decimal-pad" onChangeText={(price) => setForm({ ...form, price })} styles={styles} />
        <Field label="B2B price (₹)" value={form.b2bPrice} keyboardType="decimal-pad" onChangeText={(b2bPrice) => setForm({ ...form, b2bPrice })} styles={styles} />
        <Field label="B2B minimum quantity" value={form.minimumB2BQuantity} keyboardType="number-pad" onChangeText={(minimumB2BQuantity) => setForm({ ...form, minimumB2BQuantity })} styles={styles} />
        <Field label="Compare price (₹)" value={form.compareAtPrice} keyboardType="decimal-pad" onChangeText={(compareAtPrice) => setForm({ ...form, compareAtPrice })} styles={styles} />
        <Field label="Stock" value={form.stock} keyboardType="number-pad" onChangeText={(stock) => setForm({ ...form, stock })} styles={styles} />
        <Field label="Badge" value={form.badge} onChangeText={(badge) => setForm({ ...form, badge })} styles={styles} />
      </View>
      <Text style={styles.fieldLabel}>Category</Text><View style={styles.choiceRow}>{productCategories.map((category) => <Choice key={category} label={category} selected={form.category === category} onPress={() => setForm({ ...form, category, subcategoryId: '' })} styles={styles} />)}</View>
      {subcategories.length > 0 ? <><Text style={styles.fieldLabel}>Subcategory</Text><View style={styles.choiceRow}>{subcategories.map((sub) => <Choice key={sub.id} label={sub.name} selected={form.subcategoryId === sub.id} onPress={() => setForm({ ...form, subcategoryId: sub.id })} styles={styles} />)}</View></> : null}
      <HsnSelect value={form.hsnId} search={hsnSearch} options={filteredHsn} onSearch={setHsnSearch} onSelect={(hsn) => { setForm((current) => ({ ...current, hsnId: hsn.id })); setHsnSearch(`${hsn.code} · ${hsn.description}`); }} styles={styles} />
      <View style={styles.formGrid}>
        <Field label="Description" value={form.description} multiline onChangeText={(description) => setForm({ ...form, description })} styles={styles} wide />
        <Field label="Product image URL" value={form.imageUrl} onChangeText={(imageUrl) => setForm({ ...form, imageUrl })} styles={styles} wide />
      </View>
      <View style={styles.choiceRow}><Choice label="Upload image" selected={false} onPress={() => void uploadImage()} styles={styles} /><Choice label="Installation available" selected={form.serviceAvailable} onPress={() => setForm({ ...form, serviceAvailable: !form.serviceAvailable })} styles={styles} /><Choice label="B2B backorder allowed" selected={form.allowB2BBackorder} onPress={() => setForm({ ...form, allowB2BBackorder: !form.allowB2BBackorder })} styles={styles} /><Choice label="COD available" selected={form.codAvailable} onPress={() => setForm({ ...form, codAvailable: !form.codAvailable })} styles={styles} /><Choice label="Visible in store" selected={form.active} onPress={() => setForm({ ...form, active: !form.active })} styles={styles} /></View>
      <View style={styles.actionRow}><Action label={editingId ? 'Save changes' : 'Add product'} onPress={() => void save()} busy={busy} styles={styles} />{editingId ? <Action label="Cancel" secondary onPress={() => { setEditingId(null); setForm(emptyProduct); setHsnSearch(''); }} styles={styles} /> : null}</View>
    </Editor>
    <Editor title={`Products (${products.length})`} styles={styles}>{loading ? <Loading styles={styles} /> : products.map((product) => { const subName = product.subcategoryId ? categories.flatMap((c) => c.subcategories).find((s) => s.id === product.subcategoryId)?.name : undefined; return <ProductRow key={product.id} product={product} subcategoryName={subName} onEdit={() => edit(product)} onRemove={() => void remove(product.id)} busy={busy} styles={styles} />; })}</Editor>
  </View>;
}

function HsnMasterPanel({ token, onChanged, setMessage, styles }: { token: string; onChanged(): Promise<void>; setMessage(value: string): void; styles: Styles }) {
  const hsnQuery = useQuery({ queryKey: ['admin', 'hsn-master'], queryFn: () => getAdminHsnMaster(token) });
  const hsnMaster = hsnQuery.data ?? [];
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState('18');
  const [busy, setBusy] = useState(false);
  async function addHsn() {
    const total = Number(rate);
    if (!/^\d{4,8}$/.test(code.trim()) || description.trim().length < 3 || !Number.isFinite(total) || total < 0 || total > 100) { setMessage('Enter a valid HSN code, description and GST rate.'); return; }
    setBusy(true);
    try { await createAdminHsnMaster(token, { code: code.trim(), description: description.trim(), cgstRate: total / 2, sgstRate: total / 2, igstRate: total }); await hsnQuery.refetch(); await onChanged(); setCode(''); setDescription(''); setRate('18'); setMessage('HSN added with its GST rate.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to add HSN.'); } finally { setBusy(false); }
  }
  return <View style={styles.stack}>
    <Editor title="Add HSN number" styles={styles}><View style={styles.formGrid}><Field label="HSN code" value={code} onChangeText={setCode} keyboardType="number-pad" styles={styles} /><Field label="Description" value={description} onChangeText={setDescription} styles={styles} /><Field label="Total GST rate (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" styles={styles} /></View><Text style={styles.rowMeta}>CGST and SGST will be half of the total rate; IGST will use the total rate.</Text><Action label="Add to master data" small onPress={() => void addHsn()} busy={busy} styles={styles} /></Editor>
    <Editor title={`HSN master data (${hsnMaster.length})`} styles={styles}>{hsnMaster.map((hsn) => <View key={hsn.id} style={styles.dataRow}><View style={styles.rowBody}><Text style={styles.rowTitle}>{hsn.code}</Text><Text style={styles.rowMeta}>{hsn.description} · GST {hsn.igstRate}% (CGST {hsn.cgstRate}% + SGST {hsn.sgstRate}%)</Text></View></View>)}</Editor>
  </View>;
}

function HsnSelect({ value, search, options, onSearch, onSelect, styles }: { value: string; search: string; options: HsnMaster[]; onSearch(value: string): void; onSelect(hsn: HsnMaster): void; styles: Styles }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((hsn) => hsn.id === value);
  return <View style={styles.hsnSelectWrap}>
    <Text style={styles.fieldLabel}>HSN CODE</Text>
    <TextInput value={search} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChangeText={(text) => { onSearch(text); setOpen(true); }} placeholder="Type HSN code or description to search" placeholderTextColor={styles.placeholder.color} style={styles.input} accessibilityLabel="Search HSN code" />
    {open ? <View style={styles.hsnOptions}><ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.hsnOptionsScroll}>{options.length ? options.map((hsn) => <Pressable key={hsn.id} accessibilityRole="radio" accessibilityState={{ checked: value === hsn.id }} onPressIn={() => { onSelect(hsn); setOpen(false); }} style={[styles.hsnOption, value === hsn.id && styles.hsnOptionActive]}><Text numberOfLines={1} style={[styles.hsnOptionText, value === hsn.id && styles.hsnOptionTextActive]}>{value === hsn.id ? '✓ ' : ''}{hsn.code} · {hsn.description}</Text></Pressable>) : <Text style={styles.rowMeta}>No matching HSN found.</Text>}</ScrollView></View> : null}
    {selected && !open ? <Text style={styles.selectedHsn}>Selected: {selected.code} · {selected.description}</Text> : null}
  </View>;
}

function BannersPanel({ token, banners, products, loading, onChanged, setMessage, styles }: { token: string; banners: Banner[]; products: AdminProduct[]; loading: boolean; onChanged(): Promise<void>; setMessage(value: string): void; styles: Styles }) {
  const [form, setForm] = useState(emptyBanner);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function edit(banner: Banner) { setEditingId(banner.id); setForm({ title: banner.title, subtitle: banner.subtitle ?? '', badge: banner.badge ?? '', imageUrl: banner.imageUrl ?? '', productId: banner.productId ?? '', ctaLabel: banner.ctaLabel ?? '', audience: banner.audience, backgroundColor: banner.backgroundColor, sortOrder: String(banner.sortOrder), active: banner.active }); }
  async function save() {
    const input: AdminBannerInput = { title: form.title.trim(), backgroundColor: form.backgroundColor, sortOrder: Number(form.sortOrder), active: form.active, audience: form.audience, ...(form.subtitle.trim() ? { subtitle: form.subtitle.trim() } : {}), ...(form.badge.trim() ? { badge: form.badge.trim() } : {}), ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}), ...(form.productId ? { productId: form.productId } : {}), ...(form.ctaLabel.trim() ? { ctaLabel: form.ctaLabel.trim() } : {}) };
    setBusy(true); try { if (editingId) await updateAdminBanner(token, editingId, input); else await createAdminBanner(token, input); setForm(emptyBanner); setEditingId(null); setMessage(editingId ? 'Banner updated.' : 'Banner added to the home slider.'); await onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save banner.'); } finally { setBusy(false); }
  }
  async function remove(id: string) { setBusy(true); try { await removeAdminBanner(token, id); setMessage('Banner removed.'); await onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to remove banner.'); } finally { setBusy(false); } }
  async function uploadImage() { await chooseAndUpload(token, (url) => setForm((current) => ({ ...current, imageUrl: url })), setMessage, setBusy); }

  return <View style={styles.stack}>
    <Editor title={editingId ? 'Edit home banner' : 'Add home banner'} styles={styles}>
      <View style={styles.formGrid}><Field label="Banner title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} styles={styles} /><Field label="Badge" value={form.badge} onChangeText={(badge) => setForm({ ...form, badge })} styles={styles} /><Field label="Button label" value={form.ctaLabel} onChangeText={(ctaLabel) => setForm({ ...form, ctaLabel })} styles={styles} /><Field label="Background (#RRGGBB)" value={form.backgroundColor} onChangeText={(backgroundColor) => setForm({ ...form, backgroundColor })} styles={styles} /><Field label="Order" value={form.sortOrder} keyboardType="number-pad" onChangeText={(sortOrder) => setForm({ ...form, sortOrder })} styles={styles} /></View>
      <View style={styles.formGrid}>
        <Field label="Short subtitle (optional)" value={form.subtitle} onChangeText={(subtitle) => setForm({ ...form, subtitle })} styles={styles} wide />
        <Field label="Banner image URL" value={form.imageUrl} onChangeText={(imageUrl) => setForm({ ...form, imageUrl })} styles={styles} wide />
      </View>
      <Text style={styles.fieldLabel}>Banner audience</Text><View style={styles.choiceRow}>{(['B2C', 'B2B', 'BOTH'] as BannerAudience[]).map((audience) => <Choice key={audience} label={audience} selected={form.audience === audience} onPress={() => setForm({ ...form, audience })} styles={styles} />)}</View>
      <Text style={styles.fieldLabel}>Linked product</Text><View style={styles.choiceRow}>{products.filter((product) => product.active).map((product) => <Choice key={product.id} label={product.name} selected={form.productId === product.id} onPress={() => setForm({ ...form, productId: product.id })} styles={styles} />)}</View>
      <View style={styles.choiceRow}><Choice label="Upload image" selected={false} onPress={() => void uploadImage()} styles={styles} /><Choice label="Visible on home" selected={form.active} onPress={() => setForm({ ...form, active: !form.active })} styles={styles} /></View>
      <View style={styles.actionRow}><Action label={editingId ? 'Save changes' : 'Add banner'} onPress={() => void save()} busy={busy} styles={styles} />{editingId ? <Action label="Cancel" secondary onPress={() => { setEditingId(null); setForm(emptyBanner); }} styles={styles} /> : null}</View>
    </Editor>
    <Editor title={`Home banners (${banners.length})`} styles={styles}>{loading ? <Loading styles={styles} /> : banners.map((banner) => <View key={banner.id} style={styles.dataRow}><View style={[styles.bannerSwatch, { backgroundColor: banner.backgroundColor }]} /><View style={styles.rowBody}><Text style={styles.rowTitle}>{banner.title}</Text><Text style={styles.rowMeta}>Order {banner.sortOrder} · {banner.active ? 'Visible' : 'Hidden'}</Text></View><View style={styles.rowActions}><Action label="Edit" small secondary onPress={() => edit(banner)} styles={styles} /><Action label="Remove" small danger disabled={busy} onPress={() => void remove(banner.id)} styles={styles} /></View></View>)}</Editor>
  </View>;
}

function UsersPanel({ token, users, currentUserId, loading, onChanged, setMessage, styles }: { token: string; users: PublicUser[]; currentUserId: string; loading: boolean; onChanged(): Promise<void>; setMessage(value: string): void; styles: Styles }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUserProfile | null>(null);
  async function changeAccess(user: PublicUser) { setBusyId(user.id); try { if (user.active) { await removeAdminUser(token, user.id); setMessage(`Access removed for ${user.email}.`); } else { await restoreAdminUser(token, user.id); setMessage(`Access restored for ${user.email}.`); } await onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update user access.'); } finally { setBusyId(null); } }
  async function openProfile(id: string) { try { setSelected(await getAdminUserProfile(token, id)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load user details.'); } }
  return <View style={styles.stack}><Editor title={`Registered users (${users.length})`} styles={styles}>{loading ? <Loading styles={styles} /> : users.map((item) => <View key={item.id} style={styles.dataRow}><View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowMeta}>{item.email} · {item.role}</Text><Text style={[styles.stateText, !item.active && styles.dangerText]}>{item.active ? 'ACTIVE' : 'ACCESS REMOVED'}</Text></View><View style={styles.rowActions}><Action label="View details" small secondary onPress={() => void openProfile(item.id)} styles={styles} />{item.role !== 'ADMIN' && item.id !== currentUserId ? <Action label={item.active ? 'Remove access' : 'Restore access'} small danger={item.active} secondary={!item.active} disabled={busyId === item.id} busy={busyId === item.id} onPress={() => void changeAccess(item)} styles={styles} /> : null}</View></View>)}</Editor>{selected ? <Editor title={`${selected.name} — full account details`} styles={styles}><Text style={styles.rowMeta}>{selected.email}{selected.phone ? ` · ${selected.phone}` : ''} · {selected.role} · Joined {new Date(selected.createdAt).toLocaleDateString('en-IN')}</Text><Text style={styles.rowMeta}>{selected.orderCount} product orders · {selected.serviceRequestCount} service requests</Text>{selected.businessProfile ? <Text style={styles.rowMeta}>Business: {selected.businessProfile.businessName} · {selected.businessProfile.approvalStatus}</Text> : null}{selected.contractorProfile ? <Text style={styles.rowMeta}>Technician: {selected.contractorProfile.services.map((service) => service.serviceType).join(', ')} · {selected.contractorProfile.approvalStatus}</Text> : null}<Text style={styles.rowMeta}>Saved addresses: {selected.addresses.length ? selected.addresses.map((address) => `${address.label}: ${address.line1}, ${address.city}`).join(' · ') : 'None saved'}</Text><Action label="Close details" small secondary onPress={() => setSelected(null)} styles={styles} /></Editor> : null}</View>;
}

async function chooseAndUpload(token: string, onUploaded: (url: string) => void, setMessage: (value: string) => void, setBusy: (value: boolean) => void) {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setMessage('Allow photo access to upload a product image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setBusy(true);
    try {
      const file: NativeUploadFile = { uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: asset.fileName ?? `product-${Date.now()}.jpg` };
      const uploaded = await uploadAdminImage(token, file, file.name);
      onUploaded(uploaded.url); setMessage('Image uploaded. Save the item to publish it.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to upload image.'); } finally { setBusy(false); }
    return;
  }
  if (typeof document === 'undefined') return;
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => { const file = input.files?.[0]; if (!file) return; setBusy(true); try { const uploaded = await uploadAdminImage(token, file, file.name); onUploaded(uploaded.url); setMessage('Image uploaded. Save the item to publish it.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to upload image.'); } finally { setBusy(false); } };
  input.click();
}

function Editor({ title, children, styles }: { title: string; children: React.ReactNode; styles: Styles }) { return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>; }
function Loading({ styles }: { styles: Styles }) { return <View style={styles.inlineLoading}><ActivityIndicator color={styles.spinner.color} /><Text style={styles.muted}>Loading…</Text></View>; }
function Field({ label, styles, wide, ...props }: { label: string; styles: Styles; wide?: boolean } & ComponentProps<typeof TextInput>) { return <View style={[styles.field, wide && styles.fieldWide]}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor={styles.placeholder.color} style={[styles.input, props.multiline && styles.inputMultiline]} /></View>; }
function Choice({ label, selected, onPress, styles }: { label: string; selected: boolean; onPress(): void; styles: Styles }) { return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceActive]}><Text numberOfLines={1} style={[styles.choiceText, selected && styles.choiceTextActive]}>{selected ? '✓ ' : ''}{label}</Text></Pressable>; }
function Action({ label, onPress, styles, secondary = false, danger = false, small = false, busy = false, disabled = false }: { label: string; onPress(): void; styles: Styles; secondary?: boolean; danger?: boolean; small?: boolean; busy?: boolean; disabled?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={[styles.action, secondary && styles.actionSecondary, danger && styles.actionDanger, small && styles.actionSmall, (disabled || busy) && styles.disabled]}>{busy ? <ActivityIndicator size="small" color={danger ? styles.dangerText.color : '#FFFFFF'} /> : <Text style={[styles.actionText, secondary && styles.actionTextSecondary, danger && styles.actionTextDanger]}>{label}</Text>}</Pressable>; }

type Styles = ReturnType<typeof createStyles>;
const createStyles = ({ colors, desktop, tablet, compact }: { colors: ThemeColors; desktop: boolean; tablet: boolean; compact: boolean }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ink },
  loading: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.ink },
  spinner: { color: colors.teal },
  muted: { color: colors.muted, fontSize: 12 },

  topbar: { minHeight: desktop ? 68 : 56, paddingHorizontal: desktop ? spacing.lg : spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  brandWrap: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brandLogo: { width: desktop ? 36 : 28, height: desktop ? 36 : 28, borderRadius: radius.sm },
  brandTextWrap: { flexShrink: 1 },
  brand: { color: colors.cream, fontSize: desktop ? 18 : compact ? 13 : 15, fontWeight: '900', letterSpacing: .4 },
  brandDot: { color: colors.teal },
  brandTagline: { color: colors.teal, fontSize: desktop ? 10 : 8, fontWeight: '800', letterSpacing: 1.4, marginTop: 2 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  adminName: { color: colors.muted, fontSize: 11, fontWeight: '700' },

  workspace: { flex: 1 },
  workspaceDesktop: { flexDirection: 'row' },
  sidebar: { flexGrow: 0, width: 224, backgroundColor: colors.primary, padding: spacing.md },
  sidebarMobile: { width: '100%', maxHeight: 56 },
  sidebarRow: { flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.sm, alignItems: 'center' },
  navButton: { minHeight: desktop ? 44 : 38, paddingHorizontal: desktop ? spacing.md : spacing.sm, borderRadius: desktop ? radius.sm : radius.pill, justifyContent: 'center', marginBottom: desktop ? spacing.xs : 0 },
  navActive: { backgroundColor: colors.teal },
  navText: { color: '#CBD5E1', fontSize: desktop ? 13 : 11, fontWeight: '800' },
  navTextActive: { color: '#FFFFFF' },
  storeLink: { minHeight: desktop ? 44 : 38, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  storeLinkText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  main: { flex: 1, backgroundColor: colors.surfaceSunken },
  mainContent: { padding: desktop ? spacing.xl : spacing.md, gap: desktop ? spacing.lg : spacing.md, width: '100%', maxWidth: 1280, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.cream, fontSize: desktop ? 28 : 20, fontWeight: '900', marginTop: 2 },
  message: { color: colors.cream, backgroundColor: colors.tealTint, borderWidth: 1, borderColor: colors.teal, borderRadius: radius.sm, padding: spacing.sm, fontSize: 11 },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { flexGrow: 1, flexBasis: desktop ? 200 : tablet ? '31%' : '45%', padding: desktop ? spacing.xl : spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  metricValue: { color: colors.cream, fontSize: desktop ? 34 : 24, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 4 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '800' },

  stack: { gap: desktop ? spacing.lg : spacing.md },
  card: {
    padding: desktop ? spacing.lg : spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    maxWidth: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: desktop ? 8 : 4 },
    shadowOpacity: 0.14,
    shadowRadius: desktop ? 16 : 8,
    elevation: 3,
  },
  cardTitle: { color: colors.cream, fontSize: desktop ? 18 : 15, fontWeight: '900' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: desktop ? spacing.md : spacing.sm },
  field: { flexGrow: 1, flexBasis: desktop ? 220 : tablet ? '47%' : '100%', gap: 4 },
  fieldWide: { flexBasis: desktop ? '48%' : '100%' },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: .5 },
  input: { minHeight: desktop ? 46 : 42, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 13 },
  inputMultiline: { minHeight: desktop ? 90 : 72, paddingVertical: spacing.xs, textAlignVertical: 'top' },
  placeholder: { color: colors.muted },
  hsnSelectWrap: { gap: 4, zIndex: 20 },
  hsnOptions: { maxHeight: 210, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  hsnOptionsScroll: { maxHeight: 208 },
  hsnOption: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  hsnOptionActive: { backgroundColor: colors.tealTint },
  hsnOptionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  hsnOptionTextActive: { color: colors.teal },
  selectedHsn: { color: colors.teal, fontSize: 11, fontWeight: '800' },

  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: { minHeight: desktop ? 36 : 34, maxWidth: 260, paddingHorizontal: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  choiceActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  choiceText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  choiceTextActive: { color: colors.teal },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  action: { minHeight: desktop ? 44 : 40, paddingHorizontal: desktop ? spacing.lg : spacing.md, borderRadius: radius.sm, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  actionSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  actionDanger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
  actionSmall: { minHeight: desktop ? 36 : 34, paddingHorizontal: spacing.sm },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  actionTextSecondary: { color: colors.cream },
  actionTextDanger: { color: colors.danger },
  outlineButton: { minHeight: 36, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: colors.cream, fontSize: 11, fontWeight: '800' },
  disabled: { opacity: .45 },

  dataRow: { minHeight: desktop ? 82 : 64, flexDirection: desktop ? 'row' : 'column', flexWrap: 'wrap', alignItems: desktop ? 'center' : 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line, overflow: 'hidden' },
  rowBody: { flex: 1, minWidth: 0, width: '100%' },
  productRow: { flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'flex-start' : 'stretch', gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
  productThumbWrap: { flexShrink: 0, alignItems: desktop ? 'flex-start' : 'center' },
  productThumb: { width: desktop ? 76 : 84, height: desktop ? 76 : 84, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken },
  productThumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  productThumbEmptyText: { color: colors.muted, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  productDetails: { flex: 1, minWidth: 0, width: '100%', gap: 3 },
  rowTitle: { color: colors.cream, fontSize: 13, fontWeight: '900' },
  rowMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  stateText: { color: colors.success, fontSize: 9, fontWeight: '900', marginTop: 3 },
  dangerText: { color: colors.danger },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: desktop ? 0 : spacing.xs },
  statusPicker: { flex: 1, minWidth: desktop ? 260 : 0, gap: spacing.xs },
  bannerSwatch: { width: desktop ? 64 : 48, height: desktop ? 48 : 36, borderRadius: radius.sm },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealTint },
  avatarText: { color: colors.teal, fontSize: 14, fontWeight: '900' },
  inlineLoading: { minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },

  previewBanner: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.tealTint, borderWidth: 1, borderColor: colors.teal, gap: spacing.xs },
  previewTitle: { color: colors.teal, fontSize: 11, fontWeight: '900' },
  previewCopy: { color: colors.cream, fontSize: 11, lineHeight: 16 },
  segmentPill: { minWidth: 42, minHeight: 26, paddingHorizontal: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: colors.teal, fontSize: 9, fontWeight: '900' },
  serviceIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.copperTint },
  serviceIconText: { color: colors.copper, fontSize: 15 },
});
