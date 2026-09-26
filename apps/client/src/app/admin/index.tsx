import { paymentChannelLabel, type AdminPermissionKey, type AdminBannerInput, type AdminBusinessDetails, type AdminProduct, type AdminProductInput, type AdminProductReview, type AdminUserProfile, type Banner, type BannerAudience, type ContractorAdminDetails, type ProductCategory, type PublicUser, type OrderDetails, type HsnMaster, type ReturnRequest } from '@/shared/contracts';
import { productCategories } from '@/shared/contracts';
import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { formatMoney, priceIncludingGstInPaise } from '@/shared/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

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
  getAdminReviews,
  getAdminOverview,
  getAdminSubAdmins,
  createAdminSubAdmin,
  updateAdminSubAdmin,
  getAdminProducts,
  getAdminHsnMaster,
  removeAdminHsnMaster,
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
  removeAdminReview,
  removeAdminUser,
  restoreAdminUser,
  updateAdminOrderStatus,
  updateAdminOrderInvoice,
  updateAdminReturnStatus,
  updateAdminBanner,
  updateAdminHsnMaster,
  updateAdminProduct,
  uploadAdminImage,
  type CatalogCategory,
  type NativeUploadFile,
  type ServiceBookingRecord,
} from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useAppTheme } from '@/theme/theme-context';
import { AdminPermissionContext } from './admin-permission-context';

// NOTE: adjust this relative path if this file is moved.
// Expected logo file at: apps/client/assets/images/products/sirohi-logo.png
// (rename/place your uploaded logo file to that exact path, or change the
// path below to match whatever filename you use).
const sirohiLogo = require('./logo_sirohi.png');

type AdminTab = 'overview' | 'users' | 'products' | 'hsn' | 'banners' | 'orders' | 'returns' | 'reviews' | 'services' | 'technicians' | 'businesses' | 'offers' | 'subadmins';
const tabs: { key: AdminTab; label: string; permission?: AdminPermissionKey }[] = [
  { key: 'overview', label: 'Overview', permission: 'overview.view' },
  { key: 'users', label: 'Users', permission: 'users.view' },
  { key: 'products', label: 'Products', permission: 'products.view' },
  { key: 'hsn', label: 'HSN Master', permission: 'hsn.view' },
  { key: 'banners', label: 'Home banners', permission: 'banners.view' },
  { key: 'orders', label: 'Order approvals', permission: 'orders.view' },
  { key: 'returns', label: 'Return requests', permission: 'returns.view' },
  { key: 'reviews', label: 'Reviews', permission: 'reviews.view' },
  { key: 'technicians', label: 'Technician approvals', permission: 'technicians.view' },
  { key: 'businesses', label: 'Business approvals', permission: 'businesses.view' },
  { key: 'offers', label: 'Service discounts', permission: 'serviceOffers.view' },
  { key: 'services', label: 'Service requests', permission: 'serviceRequests.view' },
  { key: 'subadmins', label: 'Subadmins' },
];

const emptyProduct = {
  name: '', category: 'Hardware' as ProductCategory, subcategoryId: '', hsnId: '', brand: '', description: '', price: '', b2bPrice: '', gstRate: '18', deliveryCharge: '50', minimumB2BQuantity: '', compareAtPrice: '', stock: '', badge: '', tone: '#1769FF', serviceAvailable: false, allowB2BBackorder: false, codAvailable: true, active: true, imageUrl: '',
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
  const superAdmin = user?.role === 'SUPER_ADMIN';
  const hasPermission = (permission: AdminPermissionKey) => superAdmin || (user?.role === 'SUB_ADMIN' && user.adminPermissions?.includes(permission) === true);
  const visibleTabs = tabs.filter((item) => item.key === 'subadmins' ? superAdmin : item.permission ? hasPermission(item.permission) : false);
  const authorised = (user?.role === 'SUPER_ADMIN' || user?.role === 'SUB_ADMIN') && Boolean(token);

  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((item) => item.key === tab)) setTab(visibleTabs[0].key);
  }, [visibleTabs, tab]);

  useEffect(() => {
    if (hydrated && !authorised) router.replace('/admin/login' as never);
  }, [authorised, hydrated, router]);

  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => getAdminOverview(token!), enabled: authorised && hasPermission('overview.view'), refetchInterval: 5000 });
  const products = useQuery({ queryKey: ['admin', 'products'], queryFn: () => getAdminProducts(token!), enabled: authorised && hasPermission('products.view'), refetchInterval: 5000 });
  const banners = useQuery({ queryKey: ['admin', 'banners'], queryFn: () => getAdminBanners(token!), enabled: authorised && hasPermission('banners.view'), refetchInterval: 5000 });
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: () => getAdminUsers(token!), enabled: authorised && hasPermission('users.view'), refetchInterval: 5000 });
  const orders = useQuery({ queryKey: ['admin', 'orders'], queryFn: () => getAdminOrders(token!), enabled: authorised && hasPermission('orders.view'), refetchInterval: 5000 });
  const returns = useQuery({ queryKey: ['admin', 'returns'], queryFn: () => getAdminReturnRequests(token!), enabled: authorised && hasPermission('returns.view'), refetchInterval: 5000 });
  const reviews = useQuery({ queryKey: ['admin', 'reviews'], queryFn: () => getAdminReviews(token!), enabled: authorised && hasPermission('reviews.view'), refetchInterval: 5000 });
  const serviceBookings = useQuery({ queryKey: ['admin', 'service-bookings'], queryFn: () => getAdminServiceBookings(token!), enabled: authorised && hasPermission('serviceRequests.view'), refetchInterval: 5000 });
  const contractors = useQuery({ queryKey: ['admin', 'contractors'], queryFn: () => getAdminContractors(token!), enabled: authorised && hasPermission('technicians.view'), refetchInterval: 5000 });
  const businesses = useQuery({ queryKey: ['admin', 'businesses'], queryFn: () => getAdminBusinesses(token!), enabled: authorised && hasPermission('businesses.view'), refetchInterval: 5000 });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
      queryClient.invalidateQueries({ queryKey: ['banners'] }),
    ]);
  }

  if (!hydrated || !authorised) return <View style={styles.loading}><ActivityIndicator color={styles.spinner.color} /><Text style={styles.muted}>Checking administrator access…</Text></View>;

  return (
    <AdminPermissionContext.Provider value={hasPermission}><View style={styles.page}>
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
          {visibleTabs.map((item) => <Pressable key={item.key} onPress={() => { setTab(item.key); setMessage(null); }} style={[styles.navButton, tab === item.key && styles.navActive]}><Text style={[styles.navText, tab === item.key && styles.navTextActive]}>{item.label}</Text></Pressable>)}
          <Pressable onPress={() => router.push('/')} style={styles.storeLink}><Text style={styles.storeLinkText}>View store ↗</Text></Pressable>
        </ScrollView>

        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}><View><Text accessibilityRole="header" style={styles.title}>{tabs.find((item) => item.key === tab)?.label}</Text></View></View>
          {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}

          {tab === 'offers' ? <ServiceOffersEditor token={token!} /> : null}
          {visibleTabs.length === 0 ? <Editor title="No sections assigned" styles={styles}><Text style={styles.muted}>Ask your Super Admin to assign the sections you need.</Text></Editor> : null}
          {tab === 'overview' ? <OverviewPanel data={overview.data} loading={overview.isLoading} styles={styles} /> : null}
          {tab === 'users' ? <UsersPanel token={token!} users={users.data ?? []} businesses={businesses.data ?? []} contractors={contractors.data ?? []} currentUserId={user.id} loading={users.isLoading} onChanged={refresh} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'products' ? <ProductsPanel token={token!} products={products.data ?? []} loading={products.isLoading} onChanged={refresh} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'hsn' ? <HsnMasterPanel token={token!} onChanged={refresh} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'banners' ? <BannersPanel token={token!} banners={banners.data ?? []} products={products.data ?? []} loading={banners.isLoading} onChanged={refresh} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'orders' ? <OrdersPanel token={token!} orders={orders.data} loading={orders.isLoading} error={orders.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'returns' ? <ReturnsPanel token={token!} requests={returns.data} loading={returns.isLoading} error={returns.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'reviews' ? <ReviewsPanel token={token!} reviews={reviews.data} loading={reviews.isLoading} error={reviews.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'services' ? <ServicesPanel token={token!} bookings={serviceBookings.data} loading={serviceBookings.isLoading} error={serviceBookings.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'subadmins' && superAdmin ? <SubAdminsPanel token={token!} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'technicians' ? <TechniciansPanel token={token!} contractors={contractors.data} loading={contractors.isLoading} error={contractors.isError} setMessage={setMessage} styles={styles} /> : null}
          {tab === 'businesses' ? <BusinessesPanel token={token!} businesses={businesses.data} loading={businesses.isLoading} error={businesses.isError} setMessage={setMessage} styles={styles} /> : null}
        </ScrollView>
      </View>
    </View></AdminPermissionContext.Provider>
  );
}

const permissionGroups: { label: string; keys: AdminPermissionKey[] }[] = [
  { label: 'Overview', keys: ['overview.view'] },
  { label: 'Users', keys: ['users.view', 'users.remove', 'users.restore'] },
  { label: 'Products', keys: ['products.view', 'products.create', 'products.edit', 'products.delete'] },
  { label: 'HSN Master', keys: ['hsn.view', 'hsn.create', 'hsn.edit', 'hsn.delete'] },
  { label: 'Home banners', keys: ['banners.view', 'banners.create', 'banners.edit', 'banners.delete'] },
  { label: 'Orders', keys: ['orders.view', 'orders.approve', 'orders.reject', 'orders.cancel', 'orders.status', 'orders.invoice'] },
  { label: 'Returns', keys: ['returns.view', 'returns.update'] },
  { label: 'Reviews', keys: ['reviews.view', 'reviews.delete'] },
  { label: 'Technician approvals', keys: ['technicians.view', 'technicians.approve', 'technicians.reject', 'technicians.reapprove'] },
  { label: 'Business approvals', keys: ['businesses.view', 'businesses.approve', 'businesses.reject', 'businesses.reapprove'] },
  { label: 'Service discounts', keys: ['serviceOffers.view', 'serviceOffers.create', 'serviceOffers.edit'] },
  { label: 'Service requests', keys: ['serviceRequests.view', 'serviceRequests.approve', 'serviceRequests.reject'] },
];

function permissionLabel(permission: AdminPermissionKey) {
  const action = permission.split('.')[1];
  const actionLabels: Record<string, string> = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', approve: 'Approve', reject: 'Reject', reapprove: 'Reapprove', cancel: 'Cancel', status: 'Change status', invoice: 'Manage invoice', update: 'Update', remove: 'Remove access', restore: 'Restore access' };
  return actionLabels[action] ?? action;
}

function SubAdminsPanel({ token, setMessage, styles }: { token: string; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();
  const subAdmins = useQuery({ queryKey: ['admin', 'subadmins'], queryFn: () => getAdminSubAdmins(token) });
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<AdminPermissionKey[]>([]);
  const [busy, setBusy] = useState(false);

  function beginEdit(item: PublicUser) {
    setEditing(item);
    setName(item.name);
    setEmail(item.email);
    setPassword('');
    setPermissions(item.adminPermissions ?? []);
  }
  function reset() {
    setEditing(null); setName(''); setEmail(''); setPassword(''); setPermissions([]);
  }
  function toggle(permission: AdminPermissionKey) {
    setPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  }
  async function save() {
    setBusy(true); setMessage('');
    try {
      if (editing) {
        await updateAdminSubAdmin(token, editing.id, { name: name.trim(), email: email.trim(), adminPermissions: permissions, ...(password ? { password } : {}) });
        setMessage('Subadmin details and permissions saved.');
      } else {
        if (!password) throw new Error('Set an initial password with at least 10 characters.');
        await createAdminSubAdmin(token, { name: name.trim(), email: email.trim(), password, adminPermissions: permissions });
        setMessage('Subadmin created with the selected permissions.');
      }
      reset();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'subadmins'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save this subadmin.');
    } finally { setBusy(false); }
  }
  async function toggleActive(item: PublicUser) {
    setBusy(true); setMessage('');
    try {
      await updateAdminSubAdmin(token, item.id, { active: !item.active });
      setMessage(item.active ? 'Subadmin access deactivated.' : 'Subadmin access restored.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'subadmins'] });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update subadmin access.'); }
    finally { setBusy(false); }
  }

  return <View style={styles.stack}>
    <Editor title={editing ? `Edit ${editing.name}` : 'Create a subadmin'} styles={styles}>
      <View style={styles.formGrid}>
        <Field label="Name" value={name} onChangeText={setName} styles={styles} />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" styles={styles} />
        <Field label={editing ? 'New password (optional)' : 'Initial password (minimum 10 characters)'} value={password} onChangeText={setPassword} secureTextEntry styles={styles} />
      </View>
      <Text style={styles.fieldLabel}>SECTION AND ACTION ACCESS</Text>
      {permissionGroups.map((group) => <View key={group.label} style={styles.permissionGroup}>
        <Text style={styles.rowTitle}>{group.label}</Text>
        <View style={styles.choiceRow}>{group.keys.map((permission) => <Choice key={permission} label={permissionLabel(permission)} selected={permissions.includes(permission)} onPress={() => toggle(permission)} styles={styles} />)}</View>
      </View>)}
      <View style={styles.actionRow}><Action label={busy ? 'Saving…' : editing ? 'Save subadmin' : 'Create subadmin'} onPress={() => void save()} disabled={busy || !name.trim() || !email.trim()} styles={styles} />{editing ? <Action label="Cancel" secondary onPress={reset} styles={styles} /> : null}</View>
      {!editing ? <Text style={styles.rowMeta}>New subadmins start with no section access until you select permissions above.</Text> : null}
    </Editor>
    <Editor title={`Subadmins (${subAdmins.data?.length ?? 0})`} styles={styles}>
      {subAdmins.isLoading ? <Loading styles={styles} /> : subAdmins.isError ? <Text style={styles.errorText}>Unable to load subadmins.</Text> : subAdmins.data?.length ? subAdmins.data.map((item) => <View key={item.id} style={styles.dataRow}>
        <View style={styles.rowBody}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowMeta}>{item.email}</Text><Text style={[styles.stateText, !item.active && styles.dangerText]}>{item.active ? 'ACTIVE' : 'DEACTIVATED'} · {(item.adminPermissions ?? []).length} permissions</Text></View>
        <View style={styles.rowActions}><Action label="Edit access" small secondary onPress={() => beginEdit(item)} styles={styles} /><Action label={item.active ? 'Deactivate' : 'Activate'} small danger={item.active} secondary={!item.active} disabled={busy} onPress={() => void toggleActive(item)} styles={styles} /></View>
      </View>) : <Text style={styles.muted}>No subadmins have been created.</Text>}
    </Editor>
  </View>;
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
  invoiceNumber?: string;
  showInvoiceNumber: boolean;
  summary: string;
  createdAt?: string;
  location?: string;
  shippingAddress?: string;
  billingAddress?: string;
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
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | '1' | '7' | '30' | '365' | 'CUSTOM'>('ALL');
  const [customDays, setCustomDays] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const orders = (liveOrders ?? []).map(toAdminOrderPreview);
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();

    return orders.filter((order) => {
      if (dateFilter !== 'ALL') {
        const orderTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;
        if (orderTime > 0) {
          let allowedDays = 0;
          if (dateFilter === '1') allowedDays = 1;
          else if (dateFilter === '7') allowedDays = 7;
          else if (dateFilter === '30') allowedDays = 30;
          else if (dateFilter === '365') allowedDays = 365;
          else if (dateFilter === 'CUSTOM') {
            const parsed = parseInt(customDays, 10);
            if (parsed > 0) allowedDays = parsed;
          }
          if (allowedDays > 0) {
            const diffMs = now - orderTime;
            if (diffMs > allowedDays * 24 * 60 * 60 * 1000 || diffMs < 0) {
              return false;
            }
          }
        }
      }

      if (query) {
        const haystack = `${order.id} ${order.buyer} ${order.buyerEmail ?? ''} ${order.summary} ${order.shippingAddress ?? ''} ${order.billingAddress ?? ''} ${order.segment} ${order.status} ${order.paymentMethod} ${order.invoiceNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, search, dateFilter, customDays]);

  async function updateApproval(id: string, approvalStatus: 'APPROVED' | 'REJECTED') {
    if (approvalStatus === 'REJECTED') { setSelectedOrderId(id); setCancellation({ id, kind: 'reject' }); setReason(''); return; }
    try {
      await approveAdminOrder(token, id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setMessage(`Order ${id} marked ${approvalStatus.toLowerCase()}.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Unable to update the order.'); }
  }
  async function confirmCancellation() {
    if (!cancellation) return;
    const targetOrder = orders.find((o) => o.id === cancellation.id);
    if (targetOrder?.status === 'DELIVERED') {
      setMessage('Delivered orders cannot be cancelled.');
      setCancellation(null);
      setReason('');
      return;
    }
    if (reason.trim().length < 2) { setMessage('Enter a cancellation reason of at least 2 characters.'); return; }
    try {
      if (cancellation.kind === 'reject') await rejectAdminOrder(token, cancellation.id, reason.trim());
      else await cancelAdminOrder(token, cancellation.id, reason.trim());
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setMessage(`Order ${cancellation.id} ${cancellation.kind === 'reject' ? 'rejected' : 'cancelled'} with the recorded reason.`);
      setCancellation(null); setReason(''); setSelectedOrderId(null);
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
    <Editor title={`Product orders (${filteredOrders.length}${filteredOrders.length !== orders.length ? ` of ${orders.length}` : ''})`} styles={styles}>
      <Field label="Search by order ID, product, location, buyer..." value={search} onChangeText={setSearch} styles={styles} placeholder="Search by order ID, product name, address/city, buyer name or email" />
      <View style={{ gap: 6, marginTop: 2, marginBottom: 6 }}>
        <Text style={styles.fieldLabel}>Filter by date</Text>
        <View style={styles.choiceRow}>
          <Choice label="All orders" selected={dateFilter === 'ALL'} onPress={() => setDateFilter('ALL')} styles={styles} />
          <Choice label="Last day" selected={dateFilter === '1'} onPress={() => setDateFilter('1')} styles={styles} />
          <Choice label="Last week (7d)" selected={dateFilter === '7'} onPress={() => setDateFilter('7')} styles={styles} />
          <Choice label="Last month (30d)" selected={dateFilter === '30'} onPress={() => setDateFilter('30')} styles={styles} />
          <Choice label="Last year (365d)" selected={dateFilter === '365'} onPress={() => setDateFilter('365')} styles={styles} />
          <Choice label={dateFilter === 'CUSTOM' && customDays ? `Last ${customDays} days` : 'Custom days'} selected={dateFilter === 'CUSTOM'} onPress={() => setDateFilter('CUSTOM')} styles={styles} />
        </View>
        {dateFilter === 'CUSTOM' ? (
          <View style={[styles.choiceRow, { alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }]}>
            <View style={{ width: 130, minWidth: 100 }}>
              <TextInput accessibilityLabel="Custom number of days" value={customDays} onChangeText={(val) => setCustomDays(val.replace(/[^0-9]/g, ''))} placeholder="e.g. 10" placeholderTextColor={styles.placeholder.color} keyboardType="number-pad" style={styles.input} />
            </View>
            <Text style={[styles.rowMeta, { flexShrink: 1 }]}>Enter number of days (e.g. 10 for last 10 days)</Text>
          </View>
        ) : null}
      </View>
      {loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load orders from the backend.</Text> : filteredOrders.length ? filteredOrders.map((order) => <View key={order.id} style={styles.dataRow}>
        <View style={styles.segmentPill}><Text style={styles.segmentText}>{order.segment}</Text></View>
        <Pressable onPress={() => setSelectedOrderId(order.id)} style={styles.rowBody}>
          <Text style={styles.rowTitle}>{order.id} · {order.buyer}</Text>
          <Text style={styles.rowMeta}>{order.itemCount} items · {formatMoney(order.totalInPaise)} · Payment: {order.paymentMethod === 'ONLINE' ? `Online · ${paymentChannelLabel(order.paymentChannel)}` : 'Cash on Delivery'}</Text>
          <Text style={[styles.stateText, (order.approvalStatus === 'REJECTED' || order.status === 'CANCELLED') && styles.dangerText]}>Approval: {order.approvalStatus} · Status: {order.status}</Text>
          {order.createdAt ? <Text style={styles.rowMeta}>Ordered: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text> : null}
        </Pressable>
        <View style={styles.rowActions}>
          <Action label="View details" small secondary onPress={() => setSelectedOrderId(order.id)} styles={styles} />
          {order.approvalStatus === 'PENDING' ? <>
            <Action label="Approve" small permission="orders.approve" onPress={() => void updateApproval(order.id, 'APPROVED')} styles={styles} />
            <Action label="Reject" small permission="orders.reject" danger onPress={() => void updateApproval(order.id, 'REJECTED')} styles={styles} />
          </> : null}
        </View>
      </View>) : <Text style={styles.muted}>{search.trim() || dateFilter !== 'ALL' ? 'No orders match this search or date filter.' : 'No product orders in the database.'}</Text>}
    </Editor>
    {selectedOrder ? (
      <Editor title={`Order #${selectedOrder.id} — full order details`} styles={styles}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ gap: 3 }}>
            <Text style={styles.rowTitle}>Customer & Order</Text>
            <Text style={styles.rowMeta}>Buyer: {selectedOrder.buyer} ({selectedOrder.segment})</Text>
            <Text style={styles.rowMeta}>Email: {selectedOrder.buyerEmail ?? 'Email not recorded'}</Text>
            {selectedOrder.createdAt ? <Text style={styles.rowMeta}>Ordered on: {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text> : null}
          </View>

          <View style={{ gap: 3, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.xs }}>
            <Text style={styles.rowTitle}>Ordered Items ({selectedOrder.itemCount})</Text>
            <Text style={styles.rowMeta}>{selectedOrder.summary}</Text>
            <Text style={styles.rowMeta}>Total: {formatMoney(selectedOrder.totalInPaise)} · Payment: {selectedOrder.paymentMethod === 'ONLINE' ? `Online · ${paymentChannelLabel(selectedOrder.paymentChannel)}` : 'Cash on Delivery'}</Text>
          </View>

          <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.xs }}>
            <Text style={styles.rowTitle}>Addresses</Text>
            <View style={{ gap: 2 }}>
              <Text style={styles.fieldLabel}>SHIPPING ADDRESS</Text>
              <Text style={styles.rowMeta}>{selectedOrder.shippingAddress || 'Address not recorded'}</Text>
            </View>
            <View style={{ gap: 2, marginTop: 4 }}>
              <Text style={styles.fieldLabel}>BILLING ADDRESS</Text>
              <Text style={styles.rowMeta}>
                {selectedOrder.billingAddress
                  ? selectedOrder.billingAddress === selectedOrder.shippingAddress
                    ? `${selectedOrder.billingAddress} (Same as shipping)`
                    : selectedOrder.billingAddress
                  : 'Same as shipping'}
              </Text>
            </View>
          </View>

          <View style={{ gap: 3, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.xs }}>
            <Text style={styles.rowTitle}>Approval & Fulfilment</Text>
            <Text style={[styles.stateText, (selectedOrder.approvalStatus === 'REJECTED' || selectedOrder.status === 'CANCELLED') && styles.dangerText]}>
              Approval: {selectedOrder.approvalStatus} · Fulfilment: {selectedOrder.status}
            </Text>
            {selectedOrder.cancellationReason ? <Text style={[styles.rowMeta, styles.dangerText]}>Cancellation Reason: {selectedOrder.cancellationReason}</Text> : null}

            {cancellation && cancellation.id === selectedOrder.id && selectedOrder.status !== 'DELIVERED' ? (
              <View style={{ gap: spacing.xs, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.xs }}>
                <Text style={[styles.rowTitle, styles.dangerText]}>
                  {cancellation.kind === 'reject' ? 'Reject order' : 'Cancel order'}
                </Text>
                <Text style={styles.rowMeta}>This reason is stored with the order and displayed to the buyer.</Text>
                <Field label="Cancellation reason" value={reason} onChangeText={setReason} styles={styles} multiline placeholder="Enter reason (at least 2 characters)..." />
                <View style={[styles.actionRow, { marginTop: spacing.xs }]}>
                  <Action label={cancellation.kind === 'reject' ? 'Confirm rejection' : 'Confirm cancellation'} permission={cancellation.kind === 'reject' ? 'orders.reject' : 'orders.cancel'} danger onPress={() => void confirmCancellation()} styles={styles} />
                  <Action label="Keep order" secondary onPress={() => { setCancellation(null); setReason(''); }} styles={styles} />
                </View>
              </View>
            ) : selectedOrder.approvalStatus === 'PENDING' ? (
              <View style={[styles.actionRow, { marginTop: spacing.xs }]}>
                <Action label="Approve" small permission="orders.approve" onPress={() => void updateApproval(selectedOrder.id, 'APPROVED')} styles={styles} />
                <Action label="Reject" small permission="orders.reject" danger onPress={() => void updateApproval(selectedOrder.id, 'REJECTED')} styles={styles} />
              </View>
            ) : selectedOrder.approvalStatus === 'APPROVED' && selectedOrder.status !== 'CANCELLED' ? (
              <View style={[styles.statusPicker, { marginTop: spacing.xs }]}>
                <Text style={styles.rowMeta}>Change fulfilment status</Text>
                <View style={styles.choiceRow}>
                  {editableOrderStatuses.map((status) => (
                    <Choice key={status} label={status} permission="orders.status" selected={selectedOrder.status === status} onPress={() => void updateStatus(selectedOrder.id, status)} styles={styles} />
                  ))}
                  {selectedOrder.status !== 'DELIVERED' ? (
                    <Action label="Cancel order" small permission="orders.cancel" danger onPress={() => { setCancellation({ id: selectedOrder.id, kind: 'cancel' }); setReason(''); }} styles={styles} />
                  ) : null}
                </View>
                {selectedOrder.status === 'DELIVERED' ? (
                  <Text style={[styles.rowMeta, { marginTop: 4, color: '#10b981' }]}>Order is delivered and cannot be cancelled.</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.xs }}>
            <AdminInvoiceNumberEditor token={token} order={selectedOrder} setMessage={setMessage} styles={styles} onSaved={() => void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })} />
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <Action label="Close details" small secondary onPress={() => setSelectedOrderId(null)} styles={styles} />
          </View>
        </View>
      </Editor>
    ) : null}
  </View>;
}

function ServicesPanel({ token, bookings: liveBookings, loading, error, setMessage, styles }: { token: string; bookings?: ServiceBookingRecord[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();
  const bookings = (liveBookings ?? []).map(toAdminServicePreview);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | AdminServicePreview['status']>('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | ServiceBookingRecord['status']>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('ALL');

  const serviceTypes = Array.from(new Set(bookings.map((booking) => booking.serviceType).filter(Boolean))).sort();
  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking, index) => {
      const liveBooking = liveBookings?.[index];
      const approvalMatches = approvalFilter === 'ALL' || booking.status === approvalFilter;
      const bookingStatusMatches = bookingStatusFilter === 'ALL' || liveBooking?.status === bookingStatusFilter;
      const serviceTypeMatches = serviceTypeFilter === 'ALL' || booking.serviceType === serviceTypeFilter;
      const haystack = `${booking.id} ${booking.customer} ${booking.serviceType} ${booking.technician} ${booking.area} ${liveBooking?.notes ?? ''} ${liveBooking?.offerTitle ?? ''}`.toLowerCase();
      return approvalMatches && bookingStatusMatches && serviceTypeMatches && (!query || haystack.includes(query));
    });
  }, [bookings, liveBookings, search, approvalFilter, bookingStatusFilter, serviceTypeFilter]);

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
    <Editor title={`Service requests (${filteredBookings.length}${filteredBookings.length !== bookings.length ? ` of ${bookings.length}` : ''})`} styles={styles}>
      <Field label="Search by service ID, customer, technician or location" value={search} onChangeText={setSearch} styles={styles} placeholder="Search service ID, customer, technician, service type or address" />
      <Text style={styles.fieldLabel}>FILTER BY APPROVAL STATUS</Text>
      <View style={styles.choiceRow}>{(['ALL', 'PENDING_ADMIN', 'APPROVED', 'REJECTED'] as const).map((status) => <Choice key={status} label={status === 'ALL' ? 'All approvals' : status.replace(/_/g, ' ')} selected={approvalFilter === status} onPress={() => setApprovalFilter(status)} styles={styles} />)}</View>
      <Text style={styles.fieldLabel}>FILTER BY BOOKING STATUS</Text>
      <View style={styles.choiceRow}>{(['ALL', 'REQUESTED', 'MATCHED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map((status) => <Choice key={status} label={status === 'ALL' ? 'All booking statuses' : status.replace(/_/g, ' ')} selected={bookingStatusFilter === status} onPress={() => setBookingStatusFilter(status)} styles={styles} />)}</View>
      <Text style={styles.fieldLabel}>FILTER BY SERVICE TYPE</Text>
      <View style={styles.choiceRow}><Choice label="All service types" selected={serviceTypeFilter === 'ALL'} onPress={() => setServiceTypeFilter('ALL')} styles={styles} />{serviceTypes.map((serviceType) => <Choice key={serviceType} label={serviceType} selected={serviceTypeFilter === serviceType} onPress={() => setServiceTypeFilter(serviceType)} styles={styles} />)}</View>
      {loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load service requests from the backend.</Text> : filteredBookings.length ? filteredBookings.map((booking) => <View key={booking.id} style={styles.dataRow}><View style={styles.serviceIcon}><Text style={styles.serviceIconText}>⚒</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{booking.id} · {booking.serviceType}</Text><Text style={styles.rowMeta}>{booking.customer} · {booking.technician}</Text><Text style={styles.rowMeta}>{booking.area}</Text><Text style={[styles.stateText, booking.status === 'REJECTED' && styles.dangerText]}>{booking.status} · {liveBookings?.find((item) => item.id === booking.id)?.status ?? 'REQUESTED'}</Text></View><View style={styles.rowActions}>{booking.status === 'PENDING_ADMIN' ? <><Action label="Approve" small permission="serviceRequests.approve" onPress={() => void update(booking.id, 'APPROVED')} styles={styles} /><Action label="Reject" small permission="serviceRequests.reject" danger onPress={() => void update(booking.id, 'REJECTED')} styles={styles} /></> : booking.status === 'REJECTED' ? <Action label="Reapprove" small permission="serviceRequests.approve" onPress={() => void update(booking.id, 'APPROVED')} styles={styles} /> : <Text style={styles.stateText}>APPROVED</Text>}</View></View>) : <Text style={styles.muted}>{search.trim() || approvalFilter !== 'ALL' || bookingStatusFilter !== 'ALL' || serviceTypeFilter !== 'ALL' ? 'No service requests match this search or filter.' : 'No service requests in the database.'}</Text>}
    </Editor>
  </View>;
}

function ReviewsPanel({ token, reviews: liveReviews, loading, error, setMessage, styles }: { token: string; reviews?: AdminProductReview[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();
  const reviews = liveReviews ?? [];
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | 1 | 2 | 3 | 4 | 5>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const query = search.trim().toLowerCase();
  const filteredReviews = useMemo(() => reviews.filter((review) => {
    if (ratingFilter !== 'ALL' && review.rating !== ratingFilter) return false;
    if (!query) return true;
    return [
      review.id,
      review.customerId,
      review.customerName,
      review.customerEmail,
      review.customerPhone,
      review.productId,
      review.productName,
      review.productSlug,
      review.rating,
      review.title,
      review.comment,
      review.createdAt,
    ].filter(Boolean).join(' ').toLowerCase().includes(query);
  }), [reviews, query, ratingFilter]);

  function confirmDelete(review: AdminProductReview) {
    const message = `${review.customerName} ka ${review.productName} review permanently remove ho jayega.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) void remove(review);
      return;
    }
    Alert.alert(
      'Delete this review?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove(review) },
      ],
    );
  }

  async function remove(review: AdminProductReview) {
    setBusyId(review.id);
    try {
      await removeAdminReview(token, review.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setMessage(`Review by ${review.customerName} deleted.`);
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Unable to delete the review.');
    } finally {
      setBusyId(null);
    }
  }

  return <View style={styles.stack}>
    <View style={styles.previewBanner}><Text style={styles.previewTitle}>Customer review moderation</Text><Text style={styles.previewCopy}>Search reviews by customer, product, rating, title or review content. Deleted reviews are removed from the product rating too.</Text></View>
    <Editor title={`Customer reviews (${filteredReviews.length}${filteredReviews.length !== reviews.length ? ` of ${reviews.length}` : ''})`} styles={styles}>
      <Field label="Search customer, product or review content" value={search} onChangeText={setSearch} styles={styles} placeholder="Search by name, email, phone, product, title or comment" />
      <Text style={styles.fieldLabel}>FILTER BY RATING</Text>
      <View style={styles.choiceRow}>{(['ALL', 5, 4, 3, 2, 1] as const).map((rating) => <Choice key={rating} label={rating === 'ALL' ? 'All ratings' : `${rating} star${rating === 1 ? '' : 's'}`} selected={ratingFilter === rating} onPress={() => setRatingFilter(rating)} styles={styles} />)}</View>
      {loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load reviews from the backend.</Text> : filteredReviews.length ? filteredReviews.map((review) => <View key={review.id} style={styles.dataRow}>
        <View style={styles.segmentPill}><Text style={styles.segmentText}>{'★'.repeat(review.rating)}</Text></View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{review.productName}{review.title ? ` · ${review.title}` : ''}</Text>
          <Text style={styles.rowMeta}>{review.customerName} · {review.customerEmail ?? review.customerPhone ?? review.customerId}</Text>
          <Text style={styles.rowMeta} numberOfLines={3}>{review.comment}</Text>
          <Text style={styles.stateText}>Submitted {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        </View>
        <View style={styles.rowActions}><Action label="Delete" small permission="reviews.delete" danger disabled={busyId === review.id} busy={busyId === review.id} onPress={() => confirmDelete(review)} styles={styles} /></View>
      </View>) : <Text style={styles.muted}>{query || ratingFilter !== 'ALL' ? 'No reviews match this search or rating filter.' : 'No customer reviews in the database.'}</Text>}
    </Editor>
  </View>;
}

function ReturnsPanel({ token, requests: liveRequests, loading, error, setMessage, styles }: { token: string; requests?: ReturnRequest[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();
  const requests = liveRequests ?? [];
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | '1' | '7' | '30' | '365' | 'CUSTOM'>('ALL');
  const [customDays, setCustomDays] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReturnRequest['status']>('ALL');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejection, setRejection] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();

    return requests.filter((request) => {
      if (statusFilter !== 'ALL' && request.status !== statusFilter) return false;

      if (dateFilter !== 'ALL') {
        let allowedDays = 0;
        if (dateFilter === '1') allowedDays = 1;
        else if (dateFilter === '7') allowedDays = 7;
        else if (dateFilter === '30') allowedDays = 30;
        else if (dateFilter === '365') allowedDays = 365;
        else if (dateFilter === 'CUSTOM') {
          const parsed = parseInt(customDays, 10);
          if (parsed > 0) allowedDays = parsed;
        }
        if (allowedDays > 0) {
          const createdAt = new Date(request.createdAt).getTime();
          const diffMs = now - createdAt;
          if (diffMs > allowedDays * 24 * 60 * 60 * 1000 || diffMs < 0) return false;
        }
      }

      if (query) {
        const haystack = [
          request.id,
          request.orderId,
          request.customerId,
          request.customerName,
          request.customerEmail,
          request.buyerSegment,
          request.status,
          request.address,
          request.reason,
          request.adminNote,
          ...request.items.flatMap((item) => [item.productName, String(item.quantity), String(item.orderedQuantity)]),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [requests, search, dateFilter, customDays, statusFilter]);

  async function update(id: string, status: ReturnRequest['status']) {
    if (status === 'REJECTED') {
      setSelectedRequestId(id);
      setRejection({ id });
      setRejectReason('');
      return;
    }
    try {
      await updateAdminReturnStatus(token, id, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] });
      setMessage(`Return request ${id} marked ${status.toLowerCase().replace(/_/g, ' ')}.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to update the return request.');
    }
  }

  async function confirmRejection() {
    if (!rejection) return;
    if (rejectReason.trim().length < 2) {
      setMessage('Enter a rejection reason of at least 2 characters.');
      return;
    }
    try {
      await updateAdminReturnStatus(token, rejection.id, { status: 'REJECTED', adminNote: rejectReason.trim() });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] });
      setMessage(`Return request ${rejection.id} rejected with the recorded reason.`);
      setRejection(null);
      setRejectReason('');
      setSelectedRequestId(null);
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Unable to reject the return request.');
    }
  }

  return <View style={styles.stack}>
    <View style={styles.previewBanner}><Text style={styles.previewTitle}>Return approval workflow</Text><Text style={styles.previewCopy}>Customer or business submits → admin reviews → pickup is scheduled → item is received → refund is completed.</Text></View>
    <Editor title={`Customer and B2B return requests (${filteredRequests.length}${filteredRequests.length !== requests.length ? ` of ${requests.length}` : ''})`} styles={styles}>
      <Field label="Search by return ID, order ID, product, buyer or location" value={search} onChangeText={setSearch} styles={styles} placeholder="Search return ID, order ID, product, customer, address or reason" />
      <View style={{ gap: 6, marginTop: 2, marginBottom: 6 }}>
        <Text style={styles.fieldLabel}>FILTER BY SUBMITTED DATE</Text>
        <View style={styles.choiceRow}>
          <Choice label="All requests" selected={dateFilter === 'ALL'} onPress={() => setDateFilter('ALL')} styles={styles} />
          <Choice label="Last day" selected={dateFilter === '1'} onPress={() => setDateFilter('1')} styles={styles} />
          <Choice label="Last week (7d)" selected={dateFilter === '7'} onPress={() => setDateFilter('7')} styles={styles} />
          <Choice label="Last month (30d)" selected={dateFilter === '30'} onPress={() => setDateFilter('30')} styles={styles} />
          <Choice label="Last year (365d)" selected={dateFilter === '365'} onPress={() => setDateFilter('365')} styles={styles} />
          <Choice label={dateFilter === 'CUSTOM' && customDays ? `Last ${customDays} days` : 'Custom days'} selected={dateFilter === 'CUSTOM'} onPress={() => setDateFilter('CUSTOM')} styles={styles} />
        </View>
        {dateFilter === 'CUSTOM' ? <View style={[styles.choiceRow, { alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }]}><View style={{ width: 130, minWidth: 100 }}><TextInput accessibilityLabel="Custom number of days for returns" value={customDays} onChangeText={(value) => setCustomDays(value.replace(/[^0-9]/g, ''))} placeholder="e.g. 10" placeholderTextColor={styles.placeholder.color} keyboardType="number-pad" style={styles.input} /></View><Text style={[styles.rowMeta, { flexShrink: 1 }]}>Enter number of days (e.g. 10 for last 10 days)</Text></View> : null}
      </View>
      <Text style={styles.fieldLabel}>FILTER BY STATUS</Text>
      <View style={styles.choiceRow}>{(['ALL', ...returnStatuses] as const).map((status) => <Choice key={status} label={status === 'ALL' ? 'All statuses' : status.replace(/_/g, ' ')} selected={statusFilter === status} onPress={() => setStatusFilter(status)} styles={styles} />)}</View>
      {loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load return requests from the backend.</Text> : filteredRequests.length ? filteredRequests.map((request) => <View key={request.id} style={styles.dataRow}>
        <View style={styles.segmentPill}><Text style={styles.segmentText}>{request.buyerSegment}</Text></View>
        <Pressable onPress={() => setSelectedRequestId(request.id)} style={styles.rowBody}>
          <Text style={styles.rowTitle}>{request.id} · {request.items.map((item) => `${item.quantity} × ${item.productName}`).join(' · ')}</Text>
          <Text style={styles.rowMeta}>{request.customerName ?? request.customerId}{request.customerEmail ? ` · ${request.customerEmail}` : ''} · Order {request.orderId}</Text>
          <Text style={styles.rowMeta}>Pickup: {request.address}</Text>
          <Text style={[styles.stateText, (request.status === 'REJECTED' || request.status === 'CANCELLED') && styles.dangerText]}>Status: {request.status.replace(/_/g, ' ')} · Submitted {new Date(request.createdAt).toLocaleDateString('en-IN')}</Text>
        </Pressable>
        <View style={styles.rowActions}>
          <Action label="View details" small secondary onPress={() => setSelectedRequestId(request.id)} styles={styles} />
          {returnActions(request.status).map((status) => <Action key={status} label={returnActionLabel(status)} small permission="returns.update" danger={status === 'REJECTED'} onPress={() => void update(request.id, status)} styles={styles} />)}
        </View>
      </View>) : <Text style={styles.muted}>{search.trim() || dateFilter !== 'ALL' || statusFilter !== 'ALL' ? 'No return requests match this search or filter.' : 'No return requests in the database.'}</Text>}
    </Editor>
    {selectedRequest ? <Editor title={`Return #${selectedRequest.id} — full return details`} styles={styles}>
      <View style={{ gap: spacing.sm }}>
        <View style={{ gap: 3 }}>
          <Text style={styles.rowTitle}>Customer & Return</Text>
          <Text style={styles.rowMeta}>Return ID: {selectedRequest.id} · Segment: {selectedRequest.buyerSegment}</Text>
          <Text style={styles.rowMeta}>Customer: {selectedRequest.customerName ?? selectedRequest.customerId}</Text>
          <Text style={styles.rowMeta}>Email: {selectedRequest.customerEmail ?? 'Email not recorded'}</Text>
          <Text style={styles.rowMeta}>Submitted on: {new Date(selectedRequest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
          <Text style={styles.rowMeta}>Last updated: {new Date(selectedRequest.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={{ gap: 3, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.xs }}>
          <Text style={styles.rowTitle}>Linked Order</Text>
          <Text style={styles.rowMeta}>Order ID: {selectedRequest.orderId}</Text>
          <Text style={styles.rowMeta}>Products: {selectedRequest.items.length}</Text>
        </View>
        <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.xs }}>
          <Text style={styles.rowTitle}>Returned Items</Text>
          {selectedRequest.items.map((item) => <Text key={item.id} style={styles.rowMeta}>{item.quantity} × {item.productName} · Ordered quantity: {item.orderedQuantity}</Text>)}
        </View>
        <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.xs }}>
          <Text style={styles.rowTitle}>Pickup & Reason</Text>
          <Text style={styles.fieldLabel}>PICKUP ADDRESS</Text>
          <Text style={styles.rowMeta}>{selectedRequest.address}</Text>
          <Text style={styles.rowMeta}>Reason: {selectedRequest.reason ?? 'No reason provided'}</Text>
          {selectedRequest.adminNote ? <Text style={[styles.rowMeta, selectedRequest.status === 'REJECTED' && styles.dangerText]}>{selectedRequest.status === 'REJECTED' ? 'Rejection reason: ' : 'Admin note: '}{selectedRequest.adminNote}</Text> : null}
        </View>
        <View style={{ gap: 3, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.xs }}>
          <Text style={styles.rowTitle}>Return Status</Text>
          <Text style={[styles.stateText, (selectedRequest.status === 'REJECTED' || selectedRequest.status === 'CANCELLED') && styles.dangerText]}>Status: {selectedRequest.status.replace(/_/g, ' ')}</Text>
          {rejection && rejection.id === selectedRequest.id ? (
            <View style={{ gap: spacing.xs, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.xs }}>
              <Text style={[styles.rowTitle, styles.dangerText]}>Reject return request</Text>
              <Text style={styles.rowMeta}>This reason is stored with the return request and displayed to the buyer.</Text>
              <Field label="Rejection reason" value={rejectReason} onChangeText={setRejectReason} styles={styles} multiline placeholder="Enter reason (at least 2 characters)..." />
              <View style={[styles.actionRow, { marginTop: spacing.xs }]}>
                <Action label="Confirm rejection" danger onPress={() => void confirmRejection()} styles={styles} />
                <Action label="Keep request" secondary onPress={() => { setRejection(null); setRejectReason(''); }} styles={styles} />
              </View>
            </View>
          ) : (
            <View style={[styles.actionRow, { marginTop: spacing.xs }]}>
              {returnActions(selectedRequest.status).map((status) => <Action key={status} label={returnActionLabel(status)} small permission="returns.update" danger={status === 'REJECTED'} onPress={() => void update(selectedRequest.id, status)} styles={styles} />)}
            </View>
          )}
        </View>
        <Action label="Close details" small secondary onPress={() => { setSelectedRequestId(null); setRejection(null); setRejectReason(''); }} styles={styles} />
      </View>
    </Editor> : null}
  </View>;
}

const returnStatuses: ReturnRequest['status'][] = ['PENDING', 'APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED', 'REFUNDED', 'REJECTED', 'CANCELLED'];

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
  const shippingAddress = order.deliveryAddress?.trim() || order.shippingAddress?.trim() || '';
  const billingAddress = order.billingAddress?.trim() || '';
  const location = shippingAddress || billingAddress;
  return { id: order.id, buyer: order.buyerName ?? order.customerId, buyerEmail: order.buyerEmail, cancellationReason: order.cancellationReason, segment: order.buyerSegment ?? 'B2C', itemCount: order.itemCount, totalInPaise: order.totalInPaise, approvalStatus: order.approvalStatus ?? 'PENDING', status: order.status, paymentMethod: order.paymentMethod, paymentChannel: order.paymentChannel, invoiceNumber: order.invoiceNumber, showInvoiceNumber: order.showInvoiceNumber ?? false, summary: order.items.map((item) => `${item.quantity} × ${item.productName}`).join(' · '), createdAt: order.createdAt, location, shippingAddress, billingAddress };
}

function AdminInvoiceNumberEditor({ token, order, setMessage, styles, onSaved }: { token: string; order: AdminOrderPreview; setMessage(value: string): void; styles: Styles; onSaved(): void }) {
  const can = useContext(AdminPermissionContext);
  const [invoiceNumber, setInvoiceNumber] = useState(order.invoiceNumber ?? '');
  const [showInvoiceNumber, setShowInvoiceNumber] = useState(order.showInvoiceNumber);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInvoiceNumber(order.invoiceNumber ?? '');
    setShowInvoiceNumber(order.showInvoiceNumber);
  }, [order.invoiceNumber, order.showInvoiceNumber]);

  async function save() {
    if (showInvoiceNumber && !invoiceNumber.trim()) { setMessage('Enter an invoice number before showing it on the bill.'); return; }
    setBusy(true);
    try {
      await updateAdminOrderInvoice(token, order.id, { invoiceNumber: invoiceNumber.trim() || undefined, showInvoiceNumber });
      onSaved();
      setMessage(`Invoice number settings saved for order ${order.id}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save invoice number settings.'); }
    finally { setBusy(false); }
  }

  return can('orders.invoice') ? <View style={styles.stack}><Text style={styles.rowMeta}>Invoice number for bill</Text><View style={styles.formGrid}><Field label="Invoice number" value={invoiceNumber} onChangeText={setInvoiceNumber} styles={styles} /></View><Text style={styles.rowMeta}>Show invoice number on bill</Text><View style={styles.choiceRow}><Choice label="Yes" selected={showInvoiceNumber} onPress={() => setShowInvoiceNumber(true)} styles={styles} /><Choice label="No" selected={!showInvoiceNumber} onPress={() => setShowInvoiceNumber(false)} styles={styles} /><Action label="Save invoice setting" small onPress={() => void save()} busy={busy} styles={styles} /></View></View> : <Text style={styles.rowMeta}>Invoice settings are view only for your account.</Text>;
}

function toAdminServicePreview(booking: ServiceBookingRecord): AdminServicePreview {
  return { id: booking.id, customer: booking.customer?.name ?? booking.customerId, serviceType: booking.serviceType, technician: booking.contractor?.user?.name ?? 'Unassigned', area: booking.address, status: booking.approvalStatus };
}

type AdminContractorPreview = Pick<ContractorAdminDetails, 'id' | 'name' | 'email' | 'phone' | 'skills' | 'serviceArea' | 'experienceYears' | 'availability' | 'approvalStatus' | 'services'>;

function TechniciansPanel({ token, contractors, loading, error, setMessage, styles }: { token: string; contractors?: ContractorAdminDetails[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();
  const profiles = contractors ?? [];
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | AdminContractorPreview['approvalStatus']>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | AdminContractorPreview['availability']>('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');

  const serviceTypes = Array.from(new Set(profiles.flatMap((profile) => profile.services.map((service) => service.serviceType)).filter(Boolean))).sort();
  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      const approvalMatches = approvalFilter === 'ALL' || profile.approvalStatus === approvalFilter;
      const availabilityMatches = availabilityFilter === 'ALL' || profile.availability === availabilityFilter;
      const serviceMatches = serviceFilter === 'ALL' || profile.services.some((service) => service.serviceType === serviceFilter);
      const haystack = `${profile.id} ${profile.userId} ${profile.name} ${profile.email ?? ''} ${profile.phone ?? ''} ${profile.skills.join(' ')} ${profile.services.map((service) => service.serviceType).join(' ')} ${profile.serviceArea ?? ''}`.toLowerCase();
      return approvalMatches && availabilityMatches && serviceMatches && (!query || haystack.includes(query));
    });
  }, [profiles, search, approvalFilter, availabilityFilter, serviceFilter]);

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
    <Editor title={`Technician registration requests (${filteredProfiles.length}${filteredProfiles.length !== profiles.length ? ` of ${profiles.length}` : ''})`} styles={styles}>
      <Field label="Search by name, email, phone, skill or service area" value={search} onChangeText={setSearch} styles={styles} placeholder="Search technician name, skill, service or area" />
      <Text style={styles.fieldLabel}>FILTER BY APPROVAL STATUS</Text>
      <View style={styles.choiceRow}>{(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => <Choice key={status} label={status === 'ALL' ? 'All approvals' : status} selected={approvalFilter === status} onPress={() => setApprovalFilter(status)} styles={styles} />)}</View>
      <Text style={styles.fieldLabel}>FILTER BY AVAILABILITY</Text>
      <View style={styles.choiceRow}>{(['ALL', 'AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((availability) => <Choice key={availability} label={availability === 'ALL' ? 'All availability' : availability} selected={availabilityFilter === availability} onPress={() => setAvailabilityFilter(availability)} styles={styles} />)}</View>
      <Text style={styles.fieldLabel}>FILTER BY SERVICE</Text>
      <View style={styles.choiceRow}><Choice label="All services" selected={serviceFilter === 'ALL'} onPress={() => setServiceFilter('ALL')} styles={styles} />{serviceTypes.map((serviceType) => <Choice key={serviceType} label={serviceType} selected={serviceFilter === serviceType} onPress={() => setServiceFilter(serviceType)} styles={styles} />)}</View>
      {loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load technician registration requests.</Text> : filteredProfiles.length ? filteredProfiles.map((profile) => <View key={profile.id} style={styles.dataRow}><View style={styles.avatar}><Text style={styles.avatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{profile.name}</Text><Text style={styles.rowMeta}>{profile.email ?? profile.phone ?? 'Contact not provided'} · {profile.skills.join(', ')}</Text><Text style={styles.rowMeta}>{profile.services.map((service) => service.serviceType).join(', ')} · {profile.serviceArea ?? 'Service area not provided'} · {profile.experienceYears ?? 0} years experience</Text><Text style={[styles.stateText, profile.approvalStatus === 'REJECTED' && styles.dangerText]}>{profile.approvalStatus} · {profile.availability}</Text></View><View style={styles.rowActions}>{profile.approvalStatus === 'PENDING' ? <><Action label="Approve" small permission="technicians.approve" onPress={() => void update(profile.id, 'APPROVED')} styles={styles} /><Action label="Reject" small permission="technicians.reject" danger onPress={() => void update(profile.id, 'REJECTED')} styles={styles} /></> : profile.approvalStatus === 'REJECTED' ? <Action label="Reapprove" small permission="technicians.reapprove" onPress={() => void update(profile.id, 'APPROVED', true)} styles={styles} /> : <Text style={styles.stateText}>APPROVED</Text>}</View></View>) : <Text style={styles.muted}>{search.trim() || approvalFilter !== 'ALL' || availabilityFilter !== 'ALL' || serviceFilter !== 'ALL' ? 'No technicians match this search or filter.' : 'No technician registration requests yet.'}</Text>}
    </Editor>
  </View>;
}

function BusinessesPanel({ token, businesses: liveBusinesses, loading, error, setMessage, styles }: { token: string; businesses?: AdminBusinessDetails[]; loading: boolean; error: boolean; setMessage(value: string): void; styles: Styles }) {
  const queryClient = useQueryClient();
  const businesses = liveBusinesses ?? [];
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | AdminBusinessDetails['approvalStatus']>('ALL');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('ALL');

  const businessTypes = Array.from(new Set(businesses.map((business) => business.businessType).filter((type): type is string => Boolean(type)))).sort();
  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return businesses.filter((business) => {
      const approvalMatches = approvalFilter === 'ALL' || business.approvalStatus === approvalFilter;
      const businessTypeMatches = businessTypeFilter === 'ALL' || business.businessType === businessTypeFilter;
      const haystack = `${business.id} ${business.userId} ${business.businessName} ${business.name} ${business.email} ${business.phone ?? ''} ${business.businessType ?? ''} ${business.gstin ?? ''} ${business.billingAddress} ${business.shippingAddress ?? ''}`.toLowerCase();
      return approvalMatches && businessTypeMatches && (!query || haystack.includes(query));
    });
  }, [businesses, search, approvalFilter, businessTypeFilter]);

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
    <Editor title={`Business registration requests (${filteredBusinesses.length}${filteredBusinesses.length !== businesses.length ? ` of ${businesses.length}` : ''})`} styles={styles}>
      <Field label="Search by business, owner, email, GSTIN or address" value={search} onChangeText={setSearch} styles={styles} placeholder="Search business name, owner, email, GSTIN or address" />
      <Text style={styles.fieldLabel}>FILTER BY APPROVAL STATUS</Text>
      <View style={styles.choiceRow}>{(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => <Choice key={status} label={status === 'ALL' ? 'All approvals' : status} selected={approvalFilter === status} onPress={() => setApprovalFilter(status)} styles={styles} />)}</View>
      <Text style={styles.fieldLabel}>FILTER BY BUSINESS TYPE</Text>
      <View style={styles.choiceRow}><Choice label="All business types" selected={businessTypeFilter === 'ALL'} onPress={() => setBusinessTypeFilter('ALL')} styles={styles} />{businessTypes.map((businessType) => <Choice key={businessType} label={businessType} selected={businessTypeFilter === businessType} onPress={() => setBusinessTypeFilter(businessType)} styles={styles} />)}</View>
      {loading ? <Loading styles={styles} /> : error ? <Text style={styles.errorText}>Unable to load business registration requests.</Text> : filteredBusinesses.length ? filteredBusinesses.map((business) => <View key={business.id} style={styles.dataRow}><View style={styles.avatar}><Text style={styles.avatarText}>{business.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.rowBody}><Text style={styles.rowTitle}>{business.businessName}</Text><Text style={styles.rowMeta}>{business.name} · {business.email}{business.phone ? ` · ${business.phone}` : ''}</Text><Text style={styles.rowMeta}>{business.businessType ?? 'Business type not provided'}{business.gstin ? ` · GSTIN ${business.gstin}` : ''}</Text><Text style={styles.rowMeta}>{business.billingAddress}</Text><Text style={[styles.stateText, business.approvalStatus === 'REJECTED' && styles.dangerText]}>{business.approvalStatus}</Text></View><View style={styles.rowActions}>{business.approvalStatus === 'PENDING' ? <><Action label="Approve" small permission="businesses.approve" onPress={() => void update(business.id, 'APPROVED')} styles={styles} /><Action label="Reject" small permission="businesses.reject" danger onPress={() => void update(business.id, 'REJECTED')} styles={styles} /></> : business.approvalStatus === 'REJECTED' ? <Action label="Reapprove" small permission="businesses.reapprove" onPress={() => void update(business.id, 'APPROVED', true)} styles={styles} /> : <Text style={styles.stateText}>APPROVED</Text>}</View></View>) : <Text style={styles.muted}>{search.trim() || approvalFilter !== 'ALL' || businessTypeFilter !== 'ALL' ? 'No businesses match this search or filter.' : 'No business registration requests yet.'}</Text>}
    </Editor>
  </View>;
}

function OverviewPanel({ data, loading, styles }: { data?: { userCount: number; activeUserCount: number; approvedB2BUserCount: number; approvedB2CUserCount: number; approvedTechnicianUserCount: number; productCount: number; activeProductCount: number; bannerCount: number }; loading: boolean; styles: Styles }) {
  if (loading || !data) return <Loading styles={styles} />;
  return <View style={styles.metricGrid}>
    <Metric value={data.approvedB2BUserCount} label="Approved B2B users" styles={styles} />
    <Metric value={data.approvedB2CUserCount} label="Approved B2C users" styles={styles} />
    <Metric value={data.approvedTechnicianUserCount} label="Approved technicians" styles={styles} />
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
  const gstRate = product.gstRate ?? 18;
  const b2cDisplayPrice = priceIncludingGstInPaise(b2cPriceInPaise, gstRate);
  const b2bDisplayPrice = product.b2bPriceInPaise ? priceIncludingGstInPaise(product.b2bPriceInPaise, gstRate) : undefined;
  const displayCompareAtPrice = product.compareAtPriceInPaise ? priceIncludingGstInPaise(product.compareAtPriceInPaise, gstRate) : undefined;
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
          B2C {formatMoney(b2cDisplayPrice)} incl. GST ({gstRate}%)
          {b2bDisplayPrice ? ` · B2B ${formatMoney(b2bDisplayPrice)} incl. GST${product.minimumB2BQuantity ? ` (min ${product.minimumB2BQuantity})` : ''}` : ''}
          {displayCompareAtPrice ? ` · MRP ${formatMoney(displayCompareAtPrice)}` : ''}
        </Text>
        <Text style={styles.rowMeta}>Stock: {product.stock}{product.badge ? ` · Badge: ${product.badge}` : ''}</Text>
        {product.description ? <Text numberOfLines={2} style={styles.rowMeta}>{product.description}</Text> : null}
        <Text style={styles.rowMeta}>{product.serviceAvailable ? 'Installation available' : 'No installation'}{product.allowB2BBackorder ? ' · B2B backorder allowed' : ''}</Text>
        <Text style={[styles.stateText, !product.active && styles.dangerText]}>{product.active ? 'LIVE' : 'REMOVED'}</Text>
      </View>
      <View style={styles.rowActions}>
        <Action label="Edit" small permission="products.edit" secondary onPress={onEdit} styles={styles} />
        <Action label="Remove" small permission="products.delete" danger onPress={onRemove} disabled={!product.active || busy} styles={styles} />
      </View>
    </View>
  );
}

function ProductsPanel({ token, products, loading, onChanged, setMessage, styles }: { token: string; products: AdminProduct[]; loading: boolean; onChanged(): Promise<void>; setMessage(value: string): void; styles: Styles }) {
  const can = useContext(AdminPermissionContext);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hsnSearch, setHsnSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<'ALL' | ProductCategory>('ALL');
  const [productSubcategoryFilter, setProductSubcategoryFilter] = useState('ALL');
  const categoriesQuery = useQuery({ queryKey: ['catalog', 'categories'], queryFn: () => getCatalogCategories() });
  const hsnQuery = useQuery({ queryKey: ['admin', 'hsn-master'], queryFn: () => getAdminHsnMaster(token), enabled: Boolean(token) && can('hsn.view') });
  const hsnMaster: HsnMaster[] = hsnQuery.data ?? [];
  const filteredHsn = hsnMaster.filter((hsn) => `${hsn.code} ${hsn.description}`.toLowerCase().includes(hsnSearch.trim().toLowerCase()));
  const categories: CatalogCategory[] = categoriesQuery.data ?? [];
  const categoryToSlugMap: Record<ProductCategory, string> = { 'Hardware': 'hardware', 'Electrical': 'electrical', 'Electronics': 'electronics', 'Paint': 'paint', 'PVC PIPE': 'plumbing', 'PVC & Plumbing': 'plumbing', 'Sanitary': 'sanitary', 'Others': 'others' };
  const selectedCategorySlug = categoryToSlugMap[form.category];
  const matchedCategory = categories.find((c) => c.slug === selectedCategorySlug);
  const subcategories = matchedCategory?.subcategories ?? [];
  const filterCategorySlug = productCategoryFilter === 'ALL' ? undefined : categoryToSlugMap[productCategoryFilter];
  const subcategoryFilterOptions = categories
    .filter((category) => !filterCategorySlug || category.slug === filterCategorySlug)
    .flatMap((category) => category.subcategories)
    .filter((subcategory, index, all) => all.findIndex((item) => item.id === subcategory.id) === index);
  const productSearchQuery = productSearch.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const subcategoryName = product.subcategoryId ? categories.flatMap((category) => category.subcategories).find((subcategory) => subcategory.id === product.subcategoryId)?.name : undefined;
    const searchMatches = !productSearchQuery || `${product.name} ${product.brand} ${product.hsnCode ?? ''} ${subcategoryName ?? ''}`.toLowerCase().includes(productSearchQuery);
    const categoryMatches = productCategoryFilter === 'ALL' || product.category === productCategoryFilter;
    const subcategoryMatches = productSubcategoryFilter === 'ALL' || product.subcategoryId === productSubcategoryFilter;
    return searchMatches && categoryMatches && subcategoryMatches;
  });

  function edit(product: AdminProduct) {
    setEditingId(product.id);
    setForm({ name: product.name, category: product.category, subcategoryId: product.subcategoryId ?? '', hsnId: product.hsnId ?? '', brand: product.brand, description: product.description, price: String((product.b2cPriceInPaise ?? product.priceInPaise) / 100), b2bPrice: product.b2bPriceInPaise ? String(product.b2bPriceInPaise / 100) : '', gstRate: String(product.gstRate ?? 18), deliveryCharge: product.deliveryChargeInPaise ? String(product.deliveryChargeInPaise / 100) : '', minimumB2BQuantity: product.minimumB2BQuantity ? String(product.minimumB2BQuantity) : '', compareAtPrice: product.compareAtPriceInPaise ? String(product.compareAtPriceInPaise / 100) : '', stock: String(product.stock), badge: product.badge ?? '', tone: product.tone, serviceAvailable: product.serviceAvailable, allowB2BBackorder: product.allowB2BBackorder ?? false, codAvailable: product.codAvailable ?? true, active: product.active, imageUrl: product.imageUrl ?? '' });
    setHsnSearch(product.hsnCode ?? '');
  }

  async function save() {
    const input: AdminProductInput = {
      name: form.name.trim(), category: form.category, ...(matchedCategory?.id ? { categoryId: matchedCategory.id } : {}), ...(form.hsnId ? { hsnId: form.hsnId } : {}), brand: form.brand.trim(), description: form.description.trim(), priceInPaise: Math.round(Number(form.price) * 100), gstRate: Number(form.gstRate), deliveryChargeInPaise: Math.round(Number(form.deliveryCharge || 0) * 100), stock: Number(form.stock), tone: form.tone, serviceAvailable: form.serviceAvailable, codAvailable: form.codAvailable, active: form.active,
      ...(form.b2bPrice ? { b2bPriceInPaise: Math.round(Number(form.b2bPrice) * 100) } : {}),
      ...(form.minimumB2BQuantity ? { minimumB2BQuantity: Number(form.minimumB2BQuantity) } : {}),
      ...(form.allowB2BBackorder ? { allowB2BBackorder: true } : {}),
      ...(form.compareAtPrice ? { compareAtPriceInPaise: Math.round(Number(form.compareAtPrice) * 100) } : {}),
      ...(form.badge.trim() ? { badge: form.badge.trim() } : {}),
      ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
      ...(form.subcategoryId ? { subcategoryId: form.subcategoryId } : {}),
    };
    if (!input.name || !input.brand || !input.description || !Number.isFinite(input.priceInPaise) || !Number.isInteger(input.stock) || !Number.isFinite(input.gstRate) || input.gstRate < 0 || input.gstRate > 100 || !Number.isFinite(input.deliveryChargeInPaise) || input.deliveryChargeInPaise < 0 || !form.hsnId) { setMessage('Complete all required fields, GST rate, delivery charge and select an HSN code.'); return; }
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
    {(editingId ? can('products.edit') : can('products.create')) ? <Editor title={editingId ? 'Edit product' : 'Add product'} styles={styles}>
      <View style={styles.formGrid}>
        <Field label="Product name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} styles={styles} />
        <Field label="Brand" value={form.brand} onChangeText={(brand) => setForm({ ...form, brand })} styles={styles} />
        <Field label="B2C price (₹)" value={form.price} keyboardType="decimal-pad" onChangeText={(price) => setForm({ ...form, price })} styles={styles} />
        <Field label="B2B price (₹)" value={form.b2bPrice} keyboardType="decimal-pad" onChangeText={(b2bPrice) => setForm({ ...form, b2bPrice })} styles={styles} />
        <Field label="GST (%)" value={form.gstRate} keyboardType="decimal-pad" onChangeText={(gstRate) => setForm({ ...form, gstRate })} styles={styles} />
        <Field label="Delivery charge per quantity (₹)" value={form.deliveryCharge} keyboardType="decimal-pad" onChangeText={(deliveryCharge) => setForm({ ...form, deliveryCharge })} styles={styles} />
        <Field label="B2B minimum quantity" value={form.minimumB2BQuantity} keyboardType="number-pad" onChangeText={(minimumB2BQuantity) => setForm({ ...form, minimumB2BQuantity })} styles={styles} />
        <Field label="Compare price (₹)" value={form.compareAtPrice} keyboardType="decimal-pad" onChangeText={(compareAtPrice) => setForm({ ...form, compareAtPrice })} styles={styles} />
        <Field label="Stock" value={form.stock} keyboardType="number-pad" onChangeText={(stock) => setForm({ ...form, stock })} styles={styles} />
        <Field label="Badge" value={form.badge} onChangeText={(badge) => setForm({ ...form, badge })} styles={styles} />
      </View>
      <Text style={styles.fieldLabel}>Category</Text><View style={styles.choiceRow}>{productCategories.map((category) => <Choice key={category} label={category} selected={form.category === category} onPress={() => setForm({ ...form, category, subcategoryId: '' })} styles={styles} />)}</View>
      {subcategories.length > 0 ? <><Text style={styles.fieldLabel}>Subcategory</Text><View style={styles.choiceRow}>{subcategories.map((sub) => <Choice key={sub.id} label={sub.name} selected={form.subcategoryId === sub.id} onPress={() => setForm({ ...form, subcategoryId: sub.id })} styles={styles} />)}</View></> : null}
      <HsnSelect value={form.hsnId} search={hsnSearch} options={filteredHsn} onSearch={setHsnSearch} onSelect={(hsn) => { setForm((current) => ({ ...current, hsnId: hsn.id, gstRate: String(hsn.igstRate) })); setHsnSearch(`${hsn.code} · ${hsn.description}`); }} styles={styles} />
      <View style={styles.formGrid}>
        <Field label="Description" value={form.description} multiline onChangeText={(description) => setForm({ ...form, description })} styles={styles} wide />
        <Field label="Product image URL" value={form.imageUrl} onChangeText={(imageUrl) => setForm({ ...form, imageUrl })} styles={styles} wide />
      </View>
      <View style={styles.choiceRow}><Choice label="Upload image" selected={false} onPress={() => void uploadImage()} styles={styles} /><Choice label="Installation available" selected={form.serviceAvailable} onPress={() => setForm({ ...form, serviceAvailable: !form.serviceAvailable })} styles={styles} /><Choice label="B2B backorder allowed" selected={form.allowB2BBackorder} onPress={() => setForm({ ...form, allowB2BBackorder: !form.allowB2BBackorder })} styles={styles} /><Choice label="COD available" selected={form.codAvailable} onPress={() => setForm({ ...form, codAvailable: !form.codAvailable })} styles={styles} /><Choice label="Visible in store" selected={form.active} onPress={() => setForm({ ...form, active: !form.active })} styles={styles} /></View>
      <View style={styles.actionRow}><Action label={editingId ? 'Save changes' : 'Add product'} permission={editingId ? 'products.edit' : 'products.create'} onPress={() => void save()} busy={busy} styles={styles} />{editingId ? <Action label="Cancel" secondary onPress={() => { setEditingId(null); setForm(emptyProduct); setHsnSearch(''); }} styles={styles} /> : null}</View>
    </Editor> : null}
    <Editor title={`Products (${filteredProducts.length}${filteredProducts.length !== products.length ? ` of ${products.length}` : ''})`} styles={styles}>
      <Field label="Search products by name, brand or HSN" value={productSearch} onChangeText={setProductSearch} styles={styles} placeholder="Search products" />
      <Text style={styles.fieldLabel}>Filter by category</Text>
      <View style={styles.choiceRow}>
        <Choice label="All categories" selected={productCategoryFilter === 'ALL'} onPress={() => { setProductCategoryFilter('ALL'); setProductSubcategoryFilter('ALL'); }} styles={styles} />
        {productCategories.map((category) => <Choice key={category} label={category} selected={productCategoryFilter === category} onPress={() => { setProductCategoryFilter(category); setProductSubcategoryFilter('ALL'); }} styles={styles} />)}
      </View>
      {subcategoryFilterOptions.length ? <>
        <Text style={styles.fieldLabel}>Filter by subcategory</Text>
        <View style={styles.choiceRow}>
          <Choice label="All subcategories" selected={productSubcategoryFilter === 'ALL'} onPress={() => setProductSubcategoryFilter('ALL')} styles={styles} />
          {subcategoryFilterOptions.map((subcategory) => <Choice key={subcategory.id} label={subcategory.name} selected={productSubcategoryFilter === subcategory.id} onPress={() => setProductSubcategoryFilter(subcategory.id)} styles={styles} />)}
        </View>
      </> : null}
      {loading ? <Loading styles={styles} /> : filteredProducts.length ? filteredProducts.map((product) => { const subName = product.subcategoryId ? categories.flatMap((c) => c.subcategories).find((s) => s.id === product.subcategoryId)?.name : undefined; return <ProductRow key={product.id} product={product} subcategoryName={subName} onEdit={() => edit(product)} onRemove={() => void remove(product.id)} busy={busy} styles={styles} />; }) : <Text style={styles.muted}>No products match this search or filter.</Text>}
    </Editor>
  </View>;
}

function HsnMasterPanel({ token, onChanged, setMessage, styles }: { token: string; onChanged(): Promise<void>; setMessage(value: string): void; styles: Styles }) {
  const can = useContext(AdminPermissionContext);
  const hsnQuery = useQuery({ queryKey: ['admin', 'hsn-master'], queryFn: () => getAdminHsnMaster(token), enabled: can('hsn.view') });
  const hsnMaster = hsnQuery.data ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState('18');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [gstFilter, setGstFilter] = useState('ALL');
  const gstRates = Array.from(new Set(hsnMaster.map((hsn) => hsn.igstRate))).sort((a, b) => a - b);
  const filteredHsn = hsnMaster.filter((hsn) => {
    const searchMatches = `${hsn.code} ${hsn.description}`.toLowerCase().includes(search.trim().toLowerCase());
    const gstMatches = gstFilter === 'ALL' || hsn.igstRate === Number(gstFilter);
    return searchMatches && gstMatches;
  });
  function resetForm() { setEditingId(null); setCode(''); setDescription(''); setRate('18'); }
  function editHsn(hsn: HsnMaster) { setEditingId(hsn.id); setCode(hsn.code); setDescription(hsn.description); setRate(String(hsn.igstRate)); }
  async function saveHsn() {
    const total = Number(rate);
    if (!/^\d{4,8}$/.test(code.trim()) || description.trim().length < 3 || !Number.isFinite(total) || total < 0 || total > 100) { setMessage('Enter a valid HSN code, description and GST rate.'); return; }
    setBusy(true);
    try {
      const input = { code: code.trim(), description: description.trim(), cgstRate: total / 2, sgstRate: total / 2, igstRate: total };
      if (editingId) await updateAdminHsnMaster(token, editingId, input);
      else await createAdminHsnMaster(token, input);
      await hsnQuery.refetch(); await onChanged(); resetForm(); setMessage(editingId ? 'HSN updated.' : 'HSN added with its GST rate.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save HSN.'); } finally { setBusy(false); }
  }
  async function deleteHsn(hsn: HsnMaster) {
    setBusy(true);
    try { await removeAdminHsnMaster(token, hsn.id); await hsnQuery.refetch(); await onChanged(); if (editingId === hsn.id) resetForm(); setMessage(`HSN ${hsn.code} deleted.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete HSN.'); } finally { setBusy(false); }
  }
  function confirmDelete(hsn: HsnMaster) {
    Alert.alert('Delete HSN master record?', `HSN ${hsn.code} will be removed from the active master list.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void deleteHsn(hsn) }]);
  }
  return <View style={styles.stack}>
    {(editingId ? can('hsn.edit') : can('hsn.create')) ? <Editor title={editingId ? 'Edit HSN number' : 'Add HSN number'} styles={styles}><View style={styles.formGrid}><Field label="HSN code" value={code} onChangeText={setCode} keyboardType="number-pad" styles={styles} /><Field label="Description" value={description} onChangeText={setDescription} styles={styles} /><Field label="Total GST rate (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" styles={styles} /></View><Text style={styles.rowMeta}>CGST and SGST will be half of the total rate; IGST will use the total rate.</Text><View style={styles.actionRow}><Action label={editingId ? 'Update HSN' : 'Add to master data'} permission={editingId ? 'hsn.edit' : 'hsn.create'} small onPress={() => void saveHsn()} busy={busy} styles={styles} />{editingId ? <Action label="Cancel edit" small secondary onPress={resetForm} styles={styles} /> : null}</View></Editor> : null}
    <Editor title={`HSN master data (${filteredHsn.length}${filteredHsn.length !== hsnMaster.length ? ` of ${hsnMaster.length}` : ''})`} styles={styles}><Field label="Search HSN code or description" value={search} onChangeText={setSearch} styles={styles} placeholder="Search HSN master data" /><Text style={styles.fieldLabel}>Filter by GST percentage</Text><View style={styles.choiceRow}>{['ALL', ...gstRates.map(String)].map((value) => <Choice key={value} label={value === 'ALL' ? 'All GST' : `${value}% GST`} selected={gstFilter === value} onPress={() => setGstFilter(value)} styles={styles} />)}</View>{filteredHsn.length ? filteredHsn.map((hsn) => <View key={hsn.id} style={styles.dataRow}><View style={styles.rowBody}><Text style={styles.rowTitle}>{hsn.code}</Text><Text style={styles.rowMeta}>{hsn.description} · GST {hsn.igstRate}% (CGST {hsn.cgstRate}% + SGST {hsn.sgstRate}%)</Text></View><View style={styles.rowActions}><Action label="Edit" permission="hsn.edit" small secondary onPress={() => editHsn(hsn)} styles={styles} /><Action label="Delete" permission="hsn.delete" small danger disabled={busy} onPress={() => confirmDelete(hsn)} styles={styles} /></View></View>) : <Text style={styles.muted}>No HSN records match this search or GST filter.</Text>}</Editor>
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

function LinkedProductSelect({ value, products, onSelect, styles }: { value: string; products: AdminProduct[]; onSelect(productId: string): void; styles: Styles }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const activeProducts = products.filter((product) => product.active);
  const selected = activeProducts.find((product) => product.id === value);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = normalizedSearch
    ? activeProducts.filter((product) => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(normalizedSearch))
    : activeProducts;

  return <View style={styles.productSelectWrap}>
    <Text style={styles.fieldLabel}>Linked product</Text>
    <TextInput
      value={search}
      onFocus={() => setOpen(true)}
      onBlur={() => setTimeout(() => setOpen(false), 150)}
      onChangeText={(text) => { setSearch(text); setOpen(true); }}
      placeholder="Search and select a product"
      placeholderTextColor={styles.placeholder.color}
      style={styles.input}
      accessibilityLabel="Search linked product"
    />
    {open ? <View style={styles.productOptions}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.productOptionsScroll}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: !value }}
          onPressIn={() => { onSelect(''); setSearch(''); setOpen(false); }}
          style={[styles.productOption, !value && styles.productOptionActive]}
        >
          <Text style={[styles.productOptionText, !value && styles.productOptionTextActive]}>{!value ? '✓ ' : ''}No linked product</Text>
        </Pressable>
        {filteredProducts.length ? filteredProducts.map((product) => <Pressable
          key={product.id}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === product.id }}
          onPressIn={() => { onSelect(product.id); setSearch(''); setOpen(false); }}
          style={[styles.productOption, value === product.id && styles.productOptionActive]}
        >
          <Text numberOfLines={1} style={[styles.productOptionText, value === product.id && styles.productOptionTextActive]}>{value === product.id ? '✓ ' : ''}{product.name}</Text>
        </Pressable>) : <Text style={styles.rowMeta}>No matching products found.</Text>}
      </ScrollView>
    </View> : null}
    {selected && !open ? <Text style={styles.selectedProduct}>Selected: {selected.name}</Text> : null}
  </View>;
}

function BannersPanel({ token, banners, products, loading, onChanged, setMessage, styles }: { token: string; banners: Banner[]; products: AdminProduct[]; loading: boolean; onChanged(): Promise<void>; setMessage(value: string): void; styles: Styles }) {
  const can = useContext(AdminPermissionContext);
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
    {(editingId ? can('banners.edit') : can('banners.create')) ? <Editor title={editingId ? 'Edit home banner' : 'Add home banner'} styles={styles}>
      <View style={styles.formGrid}><Field label="Banner title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} styles={styles} /><Field label="Badge" value={form.badge} onChangeText={(badge) => setForm({ ...form, badge })} styles={styles} /><Field label="Button label" value={form.ctaLabel} onChangeText={(ctaLabel) => setForm({ ...form, ctaLabel })} styles={styles} /><Field label="Background (#RRGGBB)" value={form.backgroundColor} onChangeText={(backgroundColor) => setForm({ ...form, backgroundColor })} styles={styles} /><Field label="Order" value={form.sortOrder} keyboardType="number-pad" onChangeText={(sortOrder) => setForm({ ...form, sortOrder })} styles={styles} /></View>
      <View style={styles.formGrid}>
        <Field label="Short subtitle (optional)" value={form.subtitle} onChangeText={(subtitle) => setForm({ ...form, subtitle })} styles={styles} wide />
        <Field label="Banner image URL" value={form.imageUrl} onChangeText={(imageUrl) => setForm({ ...form, imageUrl })} styles={styles} wide />
      </View>
      <Text style={styles.fieldLabel}>Banner audience</Text><View style={styles.choiceRow}>{(['B2C', 'B2B', 'BOTH'] as BannerAudience[]).map((audience) => <Choice key={audience} label={audience} selected={form.audience === audience} onPress={() => setForm({ ...form, audience })} styles={styles} />)}</View>
      <LinkedProductSelect value={form.productId} products={products} onSelect={(productId) => setForm({ ...form, productId })} styles={styles} />
      <View style={styles.choiceRow}><Choice label="Upload image" selected={false} onPress={() => void uploadImage()} styles={styles} /><Choice label="Visible on home" selected={form.active} onPress={() => setForm({ ...form, active: !form.active })} styles={styles} /></View>
      <View style={styles.actionRow}><Action label={editingId ? 'Save changes' : 'Add banner'} permission={editingId ? 'banners.edit' : 'banners.create'} onPress={() => void save()} busy={busy} styles={styles} />{editingId ? <Action label="Cancel" secondary onPress={() => { setEditingId(null); setForm(emptyBanner); }} styles={styles} /> : null}</View>
    </Editor> : null}
    <Editor title={`Home banners (${banners.length})`} styles={styles}>{loading ? <Loading styles={styles} /> : banners.map((banner) => <View key={banner.id} style={styles.dataRow}>{banner.imageUrl ? <Image source={{ uri: banner.imageUrl }} style={styles.bannerSwatch} resizeMode="cover" /> : <View style={[styles.bannerSwatch, { backgroundColor: banner.backgroundColor }]} />}<View style={styles.rowBody}><Text style={styles.rowTitle}>{banner.title}</Text><Text style={styles.rowMeta}>Order {banner.sortOrder} · {banner.active ? 'Visible' : 'Hidden'}</Text></View><View style={styles.rowActions}><Action label="Edit" permission="banners.edit" small secondary onPress={() => edit(banner)} styles={styles} /><Action label="Remove" permission="banners.delete" small danger disabled={busy} onPress={() => void remove(banner.id)} styles={styles} /></View></View>)}</Editor>
  </View>;
}

function UsersPanel({ token, users, businesses, contractors, currentUserId, loading, onChanged, setMessage, styles }: { token: string; users: PublicUser[]; businesses: AdminBusinessDetails[]; contractors: ContractorAdminDetails[]; currentUserId: string; loading: boolean; onChanged(): Promise<void>; setMessage(value: string): void; styles: Styles }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUserProfile | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'B2B' | 'B2C' | 'TECHNICIAN' | 'REMOVED'>('ALL');
  const approvedUsers = users.filter((item) => {
    if (item.role === 'CUSTOMER') return true;
    if (item.role === 'BUSINESS') return businesses.some((business) => business.userId === item.id && business.approvalStatus === 'APPROVED');
    if (item.role === 'CONTRACTOR') return contractors.some((contractor) => contractor.userId === item.id && contractor.approvalStatus === 'APPROVED');
    return false;
  });
  const filteredUsers = approvedUsers.filter((item) => {
    const roleMatches = roleFilter === 'REMOVED' ? !item.active : roleFilter === 'ALL' || (roleFilter === 'B2B' && item.role === 'BUSINESS') || (roleFilter === 'B2C' && item.role === 'CUSTOMER') || (roleFilter === 'TECHNICIAN' && item.role === 'CONTRACTOR');
    const business = item.role === 'BUSINESS' ? businesses.find((profile) => profile.userId === item.id) : undefined;
    const contractor = item.role === 'CONTRACTOR' ? contractors.find((profile) => profile.userId === item.id) : undefined;
    const haystack = `${item.name} ${item.email} ${item.phone ?? ''} ${item.customerLocation ?? ''} ${business?.businessName ?? ''} ${business?.businessType ?? ''} ${business?.gstin ?? ''} ${business?.billingAddress ?? ''} ${contractor?.serviceArea ?? ''} ${contractor?.skills.join(' ') ?? ''} ${contractor?.services.map((service) => service.serviceType).join(' ') ?? ''}`.toLowerCase();
    return roleMatches && haystack.includes(search.trim().toLowerCase());
  });
  async function changeAccess(user: PublicUser) { setBusyId(user.id); try { if (user.active) { await removeAdminUser(token, user.id); setMessage(`Access removed for ${user.email}.`); } else { await restoreAdminUser(token, user.id); setMessage(`Access restored for ${user.email}.`); } await onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update user access.'); } finally { setBusyId(null); } }
  async function openProfile(id: string) { try { setSelected(await getAdminUserProfile(token, id)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load user details.'); } }
  return <View style={styles.stack}>
    <Editor title={`Approved users (${filteredUsers.length}${filteredUsers.length !== approvedUsers.length ? ` of ${approvedUsers.length}` : ''})`} styles={styles}>
      <Field label="Search by name, email, phone or location" value={search} onChangeText={setSearch} styles={styles} placeholder="Search approved users" />
      <Text style={styles.fieldLabel}>Filter by role</Text>
      <View style={styles.choiceRow}>{(['ALL', 'B2B', 'B2C', 'TECHNICIAN', 'REMOVED'] as const).map((role) => <Choice key={role} label={role === 'ALL' ? 'All roles' : role === 'TECHNICIAN' ? 'Technician' : role === 'REMOVED' ? 'Access removed' : role} selected={roleFilter === role} onPress={() => setRoleFilter(role)} styles={styles} />)}</View>
      {loading ? <Loading styles={styles} /> : filteredUsers.length ? filteredUsers.map((item) => <View key={item.id} style={styles.dataRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.rowBody}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowMeta}>{item.email} · {item.role === 'BUSINESS' ? 'B2B' : item.role === 'CONTRACTOR' ? 'Technician' : 'B2C'}{item.phone ? ` · ${item.phone}` : ''}</Text><Text style={styles.rowMeta}>{item.customerLocation ?? 'Location not added'}</Text><Text style={[styles.stateText, !item.active && styles.dangerText]}>{item.active ? 'APPROVED' : 'ACCESS REMOVED'}</Text></View>
        <View style={styles.rowActions}>
          <Action label="View details" permission="users.view" small secondary onPress={() => void openProfile(item.id)} styles={styles} />
          {item.role !== 'SUPER_ADMIN' && item.role !== 'SUB_ADMIN' && item.id !== currentUserId ? <Action label={item.active ? 'Remove access' : 'Restore access'} permission={item.active ? 'users.remove' : 'users.restore'} small danger={item.active} secondary={!item.active} disabled={busyId === item.id} busy={busyId === item.id} onPress={() => void changeAccess(item)} styles={styles} /> : null}
        </View>
      </View>) : <Text style={styles.muted}>{search.trim() || roleFilter !== 'ALL' ? 'No approved users match this search or role.' : 'No approved users found.'}</Text>}
    </Editor>
    {selected ? <Editor title={`${selected.name} — full account details`} styles={styles}><Text style={styles.rowMeta}>{selected.email}{selected.phone ? ` · ${selected.phone}` : ''}{selected.customerLocation ? ` · ${selected.customerLocation}` : ''} · {selected.role} · Joined {new Date(selected.createdAt).toLocaleDateString('en-IN')}</Text><Text style={styles.rowMeta}>{selected.orderCount} product orders · {selected.serviceRequestCount} service requests</Text>{selected.businessProfile ? <Text style={styles.rowMeta}>Business: {selected.businessProfile.businessName} · {selected.businessProfile.approvalStatus}</Text> : null}{selected.contractorProfile ? <Text style={styles.rowMeta}>Technician: {selected.contractorProfile.services.map((service) => service.serviceType).join(', ')} · {selected.contractorProfile.approvalStatus}</Text> : null}<Text style={styles.rowMeta}>Saved addresses: {selected.addresses.length ? selected.addresses.map((address) => `${address.label}: ${address.line1}, ${address.city}`).join(' · ') : 'None saved'}</Text><Action label="Close details" small secondary onPress={() => setSelected(null)} styles={styles} /></Editor> : null}
  </View>;
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

function Editor({ title, children, styles }: { title: string; children: React.ReactNode; styles: Styles }) {
  if (title.includes('— full account details') || title.includes('— full order details') || title.includes('— full return details')) {
    return <Modal transparent visible animationType="fade" onRequestClose={() => undefined}><View style={[styles.modalBackdrop, Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any : undefined]}><View style={styles.userDetailsModal}><Text style={styles.modalTitle}>{title}</Text><ScrollView style={styles.modalDetailsScroll} contentContainerStyle={styles.modalDetailsContent}>{children}</ScrollView></View></View></Modal>;
  }
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>;
}
function Loading({ styles }: { styles: Styles }) { return <View style={styles.inlineLoading}><ActivityIndicator color={styles.spinner.color} /><Text style={styles.muted}>Loading…</Text></View>; }
function Field({ label, styles, wide, ...props }: { label: string; styles: Styles; wide?: boolean } & ComponentProps<typeof TextInput>) { const compact = props.placeholder?.toLowerCase().includes('search') || label.toLowerCase().includes('search'); return <View style={[styles.field, compact && styles.fieldCompact, wide && styles.fieldWide]}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor={styles.placeholder.color} style={[styles.input, props.multiline && styles.inputMultiline]} /></View>; }
function Choice({ label, selected, onPress, styles, permission }: { label: string; selected: boolean; onPress(): void; styles: Styles; permission?: AdminPermissionKey }) { const can = useContext(AdminPermissionContext); if (permission && !can(permission)) return null; return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceActive]}><Text numberOfLines={1} style={[styles.choiceText, selected && styles.choiceTextActive]}>{selected ? '✓ ' : ''}{label}</Text></Pressable>; }
function Action({ label, onPress, styles, secondary = false, danger = false, small = false, busy = false, disabled = false, permission }: { label: string; onPress(): void; styles: Styles; secondary?: boolean; danger?: boolean; small?: boolean; busy?: boolean; disabled?: boolean; permission?: AdminPermissionKey }) { const can = useContext(AdminPermissionContext); if (permission && !can(permission)) return null; return <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={[styles.action, secondary && styles.actionSecondary, danger && styles.actionDanger, small && styles.actionSmall, (disabled || busy) && styles.disabled]}>{busy ? <ActivityIndicator size="small" color={danger ? styles.dangerText.color : '#FFFFFF'} /> : <Text style={[styles.actionText, secondary && styles.actionTextSecondary, danger && styles.actionTextDanger]}>{label}</Text>}</Pressable>; }

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
  fieldCompact: { flexGrow: 0, flexBasis: 'auto', width: '100%' },
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
  productSelectWrap: { gap: 4, zIndex: 20 },
  productOptions: { maxHeight: 230, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  productOptionsScroll: { maxHeight: 228 },
  productOption: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  productOptionActive: { backgroundColor: colors.tealTint },
  productOptionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  productOptionTextActive: { color: colors.teal },
  selectedProduct: { color: colors.teal, fontSize: 11, fontWeight: '800' },

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
  permissionGroup: { gap: spacing.xs, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.line },

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
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: desktop ? spacing.xl : spacing.md, backgroundColor: 'rgba(3, 9, 17, 0.78)' },
  userDetailsModal: { width: '100%', maxWidth: 680, maxHeight: '88%', padding: desktop ? spacing.lg : spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.teal, backgroundColor: colors.surface, gap: spacing.sm, shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 28, elevation: 12 },
  modalTitle: { color: colors.cream, fontSize: desktop ? 22 : 18, fontWeight: '900' },
  modalDetailsScroll: { flexGrow: 0 },
  modalDetailsContent: { gap: spacing.xs, paddingVertical: spacing.xs },
  segmentPill: { minWidth: 42, minHeight: 26, paddingHorizontal: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: colors.teal, fontSize: 9, fontWeight: '900' },
  serviceIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.copperTint },
  serviceIconText: { color: colors.copper, fontSize: 15 },
});
