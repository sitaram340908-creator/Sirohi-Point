import { radius, spacing, type ThemeColors } from '@sirohi/design-tokens';
import { formatMoney } from '@sirohi/domain';
import { paymentChannelLabel, type CustomerAddress, type CustomerAddressInput, type CustomerProfileUpdate, type OrderDetails, type PublicUser } from '@sirohi/contracts';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ProductVisual } from '@/components/product-visual';
import { ReturnRequestsPanel } from '@/components/return-requests-panel';
import { ScreenHeading } from '@/components/screen-heading';
import { SessionLoading } from '@/components/session-loading';
import { downloadOrderBill, getCatalog, getCustomerAddresses, getOrders, getReturnRequests, saveCustomerAddress, updateCustomerAddress } from '@/lib/api';
import { ADDRESS_LABEL_OPTIONS, INDIAN_STATE_OPTIONS } from '@/lib/address-options';
import { getRoleHomePath } from '@/lib/role-navigation';
import { useAppState, type CustomerOrder } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useCustomerStyles as useThemedStyles } from '@/theme/customer-theme';

type AccountTab = 'account' | 'orders' | 'saved' | 'addresses' | 'support' | 'returns';

const tabs: { value: AccountTab; label: string }[] = [
  { value: 'account', label: 'My account' },
  { value: 'orders', label: 'Your orders' },
  { value: 'saved', label: 'Saved products' },
  { value: 'addresses', label: 'Addresses' },
  { value: 'support', label: 'Help & support' },
  { value: 'returns', label: 'Returns & refunds' },
];

export default function DashboardScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = tabs.some((item) => item.value === params.tab) ? params.tab as AccountTab : 'orders';
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { wishlist, cartCount, addToCart, toggleWishlist, showNotice } = useAppState();
  const { user, token, hydrated, logout, updateProfile } = useAuth();
  const otherPortal = user?.role === 'BUSINESS' || user?.role === 'CONTRACTOR' || user?.role === 'ADMIN';
  const desktop = width >= 900;
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: getCatalog });
  const ordersQuery = useQuery({ queryKey: ['orders', user?.id], queryFn: () => getOrders(token!), enabled: hydrated && Boolean(token) && !otherPortal, refetchInterval: 5000 });
  const addressesQuery = useQuery({ queryKey: ['customer-addresses', user?.id], queryFn: () => getCustomerAddresses(token!), enabled: hydrated && Boolean(token) && !otherPortal });
  const returnRequestsQuery = useQuery({ queryKey: ['return-requests', user?.id], queryFn: () => getReturnRequests(token!), enabled: hydrated && Boolean(token) && !otherPortal, refetchInterval: 5000 });
  const visibleOrders = ordersQuery.data?.map(toCustomerOrder) ?? [];
  const savedProducts = (catalog.data ?? []).filter((product) => wishlist.includes(product.id));

  useEffect(() => {
    if (tabs.some((item) => item.value === params.tab)) setTab(params.tab as AccountTab);
  }, [params.tab]);

  function selectTab(nextTab: AccountTab) {
    setTab(nextTab);
    router.setParams({ tab: nextTab });
  }

  if (!hydrated) return <SessionLoading />;
  if (!user) return <Redirect href="/" />;
  if (otherPortal) return <Redirect href={getRoleHomePath(user.role)} />;

  return (
    <AppShell>
      <View style={styles.hero}>
        <View style={styles.inner}>
          <View style={[styles.heroTop, desktop && styles.heroTopDesktop]}>
            <ScreenHeading eyebrow="YOUR ACCOUNT" title={`Welcome, ${user.name}`} copy="Manage your orders, saved products and delivery details." />
            <View style={styles.heroActions}>
              <Pressable style={styles.technicianButton} onPress={() => router.push('/services/nearby')}><Text style={styles.technicianButtonText}>Explore technicians →</Text></Pressable>
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <Summary value={String(visibleOrders.length)} label={visibleOrders.length === 1 ? 'order' : 'orders'} styles={styles} />
            <Summary value={String(wishlist.length)} label="saved products" styles={styles} />
            <Summary value={String(cartCount)} label="items in cart" styles={styles} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRail}>
          {tabs.map((item) => (
            <Pressable key={item.value} onPress={() => selectTab(item.value)} style={[styles.tabButton, tab === item.value && styles.tabButtonActive]}>
              <Text style={[styles.tabText, tab === item.value && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === 'account' ? <AccountPanel user={user} token={token!} addresses={addressesQuery.data ?? []} addressesLoading={addressesQuery.isLoading} onAddressesChanged={() => addressesQuery.refetch()} onUpdateProfile={updateProfile} onSignOut={() => void logout().then(() => router.replace('/'))} showNotice={showNotice} styles={styles} /> : null}

        {tab === 'orders' ? <><OrdersPanel orders={visibleOrders} loading={ordersQuery.isLoading} compact={width < 480} styles={styles} onShop={() => router.push('/catalog')} token={token} onMessage={showNotice} />{ordersQuery.isError ? <Text style={styles.error}>Unable to load order history from the backend: {ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Unknown error'}</Text> : null}</> : null}

        {tab === 'saved' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}><View><Text style={styles.panelEyebrow}>SAVED FOR LATER</Text><Text style={styles.panelTitle}>Products you want to revisit</Text></View></View>
            {savedProducts.length ? savedProducts.map((product) => (
              <View key={product.id} style={styles.savedRow}>
                <Pressable onPress={() => router.push(`/product/${product.id}`)}><ProductVisual product={product} compact /></Pressable>
                <Pressable style={styles.savedBody} onPress={() => router.push(`/product/${product.id}`)}>
                  <Text style={styles.savedBrand}>{product.brand}</Text><Text style={styles.savedName}>{product.name}</Text><Text style={styles.savedPrice}>{formatMoney(product.priceInPaise)}</Text>
                </Pressable>
                <View style={styles.savedActions}>
                  <Pressable style={styles.addButton} onPress={() => addToCart(product)}><Text style={styles.addButtonText}>Add to cart</Text></Pressable>
                  <Pressable onPress={() => toggleWishlist(product.id)}><Text style={styles.removeText}>Remove</Text></Pressable>
                </View>
              </View>
            )) : <EmptyState title="No saved products yet" copy="Use the heart button on any product card to keep it here." action="Browse products" onPress={() => router.push('/catalog')} styles={styles} />}
          </View>
        ) : null}

        {tab === 'addresses' ? (
          <AddressManager user={user} token={token!} addresses={addressesQuery.data ?? []} loading={addressesQuery.isLoading} onChanged={() => addressesQuery.refetch()} showNotice={showNotice} styles={styles} />
        ) : null}

        {tab === 'support' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}><View><Text style={styles.panelEyebrow}>CUSTOMER SUPPORT</Text><Text style={styles.panelTitle}>How can we help?</Text></View></View>
            <View style={styles.supportGrid}>
              <SupportCard icon="▣" title="Order help" copy="Questions about confirmation, delivery or payment." action="View your orders" onPress={() => selectTab('orders')} styles={styles} />
              <SupportCard icon="☎" title="Contact support" copy="Use your account or order details when you contact the Sirohi Point team." action="Open support" onPress={() => showNotice('Support contact details will be provided by the platform.')} styles={styles} />
              <SupportCard icon="⚒" title="Installation support" copy="Book an electrician, painter, plumber or contractor." action="View services" onPress={() => router.push('/services/nearby')} styles={styles} />
            </View>
          </View>
        ) : null}

        {tab === 'returns' ? <ReturnRequestsPanel token={token!} orders={ordersQuery.data ?? []} addresses={addressesQuery.data ?? []} requests={returnRequestsQuery.data ?? []} loading={returnRequestsQuery.isLoading} addressesLoading={addressesQuery.isLoading} onChanged={() => returnRequestsQuery.refetch()} showNotice={showNotice} /> : null}
      </View>
    </AppShell>
  );
}

function AccountPanel({ user, token, addresses, addressesLoading, onAddressesChanged, onUpdateProfile, onSignOut, showNotice, styles }: {
  user: PublicUser;
  token: string;
  addresses: CustomerAddress[];
  addressesLoading: boolean;
  onAddressesChanged(): Promise<unknown>;
  onUpdateProfile(input: CustomerProfileUpdate): Promise<PublicUser>;
  onSignOut(): void;
  showNotice(message: string): void;
  styles: ReturnType<typeof createStyles>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? '');
  }, [user.name, user.email, user.phone]);

  async function saveProfile() {
    setSaving(true);
    try {
      await onUpdateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() || null });
      setEditing(false);
      showNotice('Your profile details have been updated.');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.accountStack}>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View><Text style={styles.panelEyebrow}>MY ACCOUNT</Text><Text style={styles.panelTitle}>Profile details</Text></View>
          {!editing ? <Pressable style={styles.outlineButton} onPress={() => setEditing(true)}><Text style={styles.outlineButtonText}>Edit profile</Text></Pressable> : null}
        </View>
        <View style={styles.profileGrid}>
          <View style={styles.profileField}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            {editing ? <TextInput accessibilityLabel="Full name" value={name} onChangeText={setName} autoCapitalize="words" style={styles.profileInput} /> : <Text style={styles.profileValue}>{user.name}</Text>}
          </View>
          <View style={styles.profileField}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            {editing ? <TextInput accessibilityLabel="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.profileInput} /> : <Text style={styles.profileValue}>{user.email}</Text>}
          </View>
          <View style={styles.profileField}>
            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
            {editing ? <TextInput accessibilityLabel="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.profileInput} /> : <Text style={styles.profileValue}>{user.phone || 'Not provided'}</Text>}
          </View>
          <View style={styles.profileField}><Text style={styles.fieldLabel}>ACCOUNT TYPE</Text><Text style={styles.profileValue}>Customer</Text></View>
          <View style={styles.profileField}><Text style={styles.fieldLabel}>MEMBER SINCE</Text><Text style={styles.profileValue}>{new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</Text></View>
        </View>
        {editing ? <View style={styles.formActions}><Pressable disabled={saving} style={[styles.primaryButton, saving && styles.disabledButton]} onPress={() => void saveProfile()}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save changes</Text>}</Pressable><Pressable disabled={saving} style={styles.outlineButton} onPress={() => { setName(user.name); setEmail(user.email); setPhone(user.phone ?? ''); setEditing(false); }}><Text style={styles.outlineButtonText}>Cancel</Text></Pressable></View> : null}
        <View style={styles.signOutRow}><View style={styles.signOutCopy}><Text style={styles.signOutTitle}>Done for now?</Text><Text style={styles.addressText}>Sign out securely from this device.</Text></View><Pressable accessibilityRole="button" style={styles.signOutButton} onPress={onSignOut}><Text style={styles.signOutButtonText}>Sign out</Text></Pressable></View>
      </View>
      <AddressManager user={user} token={token} addresses={addresses} loading={addressesLoading} onChanged={onAddressesChanged} showNotice={showNotice} styles={styles} />
    </View>
  );
}

type AddressForm = CustomerAddressInput & { id?: string };

function AddressManager({ user, token, addresses, loading, onChanged, showNotice, styles }: {
  user: PublicUser;
  token: string;
  addresses: CustomerAddress[];
  loading: boolean;
  onChanged(): Promise<unknown>;
  showNotice(message: string): void;
  styles: ReturnType<typeof createStyles>;
}) {
  const [form, setForm] = useState<AddressForm | null>(null);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function addAddress() {
    setForm({ label: 'Home', name: user.name, line1: '', city: '', state: '', postalCode: '', phone: user.phone ?? '', alternatePhone: '', houseNumber: '', isDefault: addresses.length === 0 });
  }

  function editAddress(address: CustomerAddress) {
    setForm({ id: address.id, label: address.label, name: address.name ?? '', line1: address.line1, city: address.city, state: address.state ?? '', postalCode: address.postalCode ?? '', phone: address.phone ?? '', alternatePhone: address.alternatePhone ?? '', houseNumber: address.houseNumber ?? '', isDefault: address.isDefault });
  }

  async function saveAddress() {
    if (!form) return;
    setSaving(true);
    const { id, ...input } = form;
    try {
      if (id) await updateCustomerAddress(token, id, input);
      else await saveCustomerAddress(token, input);
      await onChanged();
      setForm(null);
      showNotice(id ? 'Address updated successfully.' : 'Address added successfully.');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Unable to save this address.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}><View><Text style={styles.panelEyebrow}>DELIVERY ADDRESSES</Text><Text style={styles.panelTitle}>Your saved addresses</Text></View>{!form ? <Pressable style={styles.outlineButton} onPress={addAddress}><Text style={styles.outlineButtonText}>+ Add address</Text></Pressable> : null}</View>
      {form ? <View style={styles.addressForm}>
        <Text style={styles.formTitle}>{form.id ? 'Edit address' : 'Add a new address'}</Text>
        <View style={styles.formGrid}>
          <AddressSelect label="LABEL" value={form.label} options={ADDRESS_LABEL_OPTIONS} onChange={(value) => setField('label', value)} styles={styles} />
          <EditableField label="CONTACT NAME" value={form.name ?? ''} onChangeText={(value) => setField('name', value)} placeholder="Recipient name" styles={styles} />
          <EditableField label="FLAT / HOUSE / BUILDING" value={form.houseNumber ?? ''} onChangeText={(value) => setField('houseNumber', value)} placeholder="Flat, house or building name" styles={styles} />
          <EditableField label="CITY" value={form.city} onChangeText={(value) => setField('city', value)} placeholder="City" styles={styles} />
          <AddressSelect label="STATE" value={form.state ?? ''} options={INDIAN_STATE_OPTIONS} onChange={(value) => setField('state', value)} styles={styles} />
          <EditableField label="PIN CODE" value={form.postalCode ?? ''} onChangeText={(value) => setField('postalCode', value)} placeholder="PIN code" keyboardType="number-pad" styles={styles} />
          <EditableField label="PRIMARY PHONE" value={form.phone ?? ''} onChangeText={(value) => setField('phone', value)} placeholder="Primary delivery number" keyboardType="phone-pad" styles={styles} />
          <EditableField label="ALTERNATIVE PHONE (OPTIONAL)" value={form.alternatePhone ?? ''} onChangeText={(value) => setField('alternatePhone', value)} placeholder="Backup contact number" keyboardType="phone-pad" styles={styles} />
        </View>
        <View><Text style={styles.fieldLabel}>STREET / AREA / LANDMARK</Text><TextInput accessibilityLabel="Street, area and landmark" value={form.line1} onChangeText={(value) => setField('line1', value)} placeholder="Street, area and landmark" placeholderTextColor={styles.placeholder.color} multiline style={[styles.profileInput, styles.addressInput]} /></View>
        <View style={styles.formActions}><Pressable disabled={saving} style={[styles.primaryButton, saving && styles.disabledButton]} onPress={() => void saveAddress()}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save address</Text>}</Pressable><Pressable disabled={saving} style={styles.outlineButton} onPress={() => setForm(null)}><Text style={styles.outlineButtonText}>Cancel</Text></Pressable></View>
      </View> : null}
      {loading ? <Text style={styles.loadingText}>Loading saved addresses…</Text> : null}
      {!loading && !addresses.length && !form ? <View style={styles.addressCard}><Text style={styles.addressName}>No saved addresses</Text><Text style={styles.addressText}>Add an address here so your delivery details stay together with your account.</Text></View> : null}
      {!loading && addresses.length ? <View style={styles.addressGrid}>{addresses.map((address) => <View style={styles.addressCard} key={address.id}><View style={styles.addressTop}><Text style={styles.addressLabel}>{address.label.toUpperCase()}</Text>{address.isDefault ? <View style={styles.defaultPill}><Text style={styles.defaultPillText}>DEFAULT</Text></View> : null}</View>{address.name ? <Text style={styles.addressName}>{address.name}</Text> : null}<Text style={styles.addressName}>{[address.houseNumber, address.line1].filter(Boolean).join(', ')}</Text><Text style={styles.addressText}>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</Text>{address.phone ? <Text style={styles.addressPhone}>Primary phone · {address.phone}</Text> : null}{address.alternatePhone ? <Text style={styles.addressPhone}>Alternative phone · {address.alternatePhone}</Text> : null}<Pressable onPress={() => editAddress(address)}><Text style={styles.editLink}>Edit address</Text></Pressable></View>)}</View> : null}
    </View>
  );
}

function EditableField({ label, value, onChangeText, placeholder, keyboardType, styles }: { label: string; value: string; onChangeText(value: string): void; placeholder: string; keyboardType?: 'default' | 'number-pad' | 'phone-pad'; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.formField}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={styles.placeholder.color} keyboardType={keyboardType} style={styles.profileInput} /></View>;
}

function AddressSelect<T extends string>({ label, value, options, onChange, styles }: { label: string; value: string; options: readonly T[]; onChange(value: T): void; styles: ReturnType<typeof createStyles> }) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    return <View style={styles.formField}><Text style={styles.fieldLabel}>{label}</Text>{createElement('select', { value, onChange: (event: unknown) => onChange((event as { currentTarget: { value: string } }).currentTarget.value as T), 'aria-label': `Select ${label.toLowerCase()}`, style: { width: '100%', minHeight: 46, padding: '0 12px', borderRadius: 6, border: '1px solid #2C4056', backgroundColor: 'transparent', color: styles.selectText.color, fontSize: 14 } }, options.map((option) => createElement('option', { key: option, value: option, style: { color: '#182D45', backgroundColor: '#FFFFFF' } }, option)))}</View>;
  }
  return <View style={[styles.formField, open && styles.selectFieldOpen]}><Text style={styles.fieldLabel}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Select ${label.toLowerCase()}`} accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={styles.select}><Text style={[styles.selectText, !value && styles.selectPlaceholder]}>{value || `Select ${label.toLowerCase()}`}</Text><Text style={styles.selectChevron}>{open ? '⌃' : '⌄'}</Text></Pressable>{open ? <View style={styles.selectOptions}><ScrollView style={styles.selectScroll} contentContainerStyle={styles.selectScrollContent} nestedScrollEnabled>{options.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option }} onPress={() => { onChange(option); setOpen(false); }} style={[styles.selectOption, value === option && styles.selectOptionActive]}><Text style={[styles.selectOptionText, value === option && styles.selectOptionTextActive]}>{value === option ? '✓ ' : ''}{option}</Text></Pressable>)}</ScrollView></View> : null}</View>;
}

function toCustomerOrder(order: OrderDetails): CustomerOrder {
  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    approvalStatus: order.approvalStatus,
    totalInPaise: order.totalInPaise,
    itemCount: order.itemCount,
    deliveryMode: 'standard',
    paymentMethod: order.paymentMethod,
    paymentChannel: order.paymentChannel,
    address: order.deliveryAddress,
    cancellationReason: order.cancellationReason,
    items: order.items.map((item) => ({ productId: item.productId, name: item.productName, quantity: item.quantity, unitPriceInPaise: item.unitPriceInPaise })),
  };
}

function formatOrderStatus(status: CustomerOrder['status']) {
  return status === 'CANCELLED' ? 'Cancelled' : status.replace(/_/g, ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function Summary({ value, label, styles }: { value: string; label: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.summaryCard}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function OrdersPanel({ orders, loading, compact, styles, onShop, token, onMessage }: { orders: CustomerOrder[]; loading: boolean; compact: boolean; styles: ReturnType<typeof createStyles>; onShop(): void; token: string | null; onMessage(message: string): void }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const download = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    try { await downloadOrderBill(token, id); onMessage('Bill download started.'); }
    catch (error) { onMessage(error instanceof Error ? error.message : 'Unable to download this bill.'); }
    finally { setDownloadingId(null); }
  };
  if (loading) return <View style={styles.panel}><Text style={styles.loadingText}>Loading order history…</Text></View>;
  if (!orders.length) return <View style={styles.panel}><EmptyState title="You have not placed an order yet" copy="Products you buy will appear here immediately after checkout." action="Start shopping" onPress={onShop} styles={styles} /></View>;
  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <View style={styles.panelHeader}><View><Text style={styles.panelEyebrow}>ORDER HISTORY</Text><Text style={styles.panelTitle}>Your recent orders</Text></View></View>
      {orders.map((order) => (
        <View style={[styles.orderCard, compact && styles.orderCardCompact]} key={order.id}>
          <View style={styles.orderTop}><View style={styles.orderIdentity}><Text style={[styles.orderId, compact && styles.orderIdCompact]} numberOfLines={1} ellipsizeMode="middle">{order.id}</Text><Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Text></View><View style={styles.orderBadges}><View style={[styles.statusPill, order.approvalStatus === 'REJECTED' && styles.statusPillDanger, order.approvalStatus === 'PENDING' && styles.statusPillPending]}><Text numberOfLines={1} style={[styles.statusText, compact && styles.statusTextCompact, order.approvalStatus === 'REJECTED' && styles.statusTextDanger, order.approvalStatus === 'PENDING' && styles.statusTextPending]}>{order.approvalStatus === 'PENDING' ? 'PENDING APPROVAL' : order.approvalStatus === 'REJECTED' ? 'REJECTED' : formatOrderStatus(order.status)}</Text></View><View style={[styles.paymentPill, order.paymentMethod === 'ONLINE' ? styles.paymentPillPaid : styles.paymentPillCod]}><Text style={styles.paymentPillText}>{order.paymentMethod === 'ONLINE' ? 'PAID' : 'COD'}</Text></View></View></View>
          <View style={styles.orderItems}>{order.items.map((item) => <Text style={styles.orderItem} numberOfLines={compact ? 2 : undefined} key={item.productId}>{item.quantity} × {item.name}</Text>)}</View>
          <View style={styles.orderBottom}><View style={styles.orderDetails}><Text style={styles.orderMeta}>{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {order.deliveryMode === 'express' ? 'Express delivery' : 'Standard delivery'}</Text><Text style={[styles.paymentMeta, order.paymentMethod === 'ONLINE' ? styles.paymentPaid : styles.paymentCod]}>Payment: {order.paymentMethod === 'ONLINE' ? `Paid · ${paymentChannelLabel(order.paymentChannel)}` : 'COD'}</Text><Text style={styles.orderAddress} numberOfLines={1}>{order.address}</Text></View><Text style={styles.orderTotal}>{formatMoney(order.totalInPaise)}</Text></View>
          <Text style={styles.approvalText}>{order.approvalStatus === 'PENDING' ? 'Waiting for admin approval' : order.approvalStatus === 'REJECTED' ? 'Admin rejected this order' : `Fulfilment status: ${formatOrderStatus(order.status)}`}</Text>{order.cancellationReason ? <Text style={styles.approvalText}>Cancellation reason: {order.cancellationReason}</Text> : null}<Pressable accessibilityRole="button" disabled={downloadingId === order.id} onPress={() => void download(order.id)} style={[styles.billButton, downloadingId === order.id && styles.billButtonDisabled]}><Text style={styles.billButtonText}>{downloadingId === order.id ? 'Preparing bill…' : 'Download bill PDF'}</Text></Pressable><View style={[styles.orderProgress, compact && styles.orderProgressCompact]}><ProgressStep label="Submitted" active compact={compact} /><View style={styles.progressLine} /><ProgressStep label="Packed" active={order.status === 'PACKED' || order.status === 'DISPATCHED' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED'} compact={compact} /><View style={styles.progressLine} /><ProgressStep label="Dispatched" active={order.status === 'DISPATCHED' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED'} compact={compact} /><View style={styles.progressLine} /><ProgressStep label="Out for delivery" active={order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED'} compact={compact} /><View style={styles.progressLine} /><ProgressStep label="Delivered" active={order.status === 'DELIVERED'} compact={compact} /></View>
        </View>
      ))}
    </View>
  );
}

// function ProgressStep({ label, active }: { label: string; active: boolean }) {
//   const styles = useThemedStyles(createStyles);
//   return <View style={styles.progressStep}><View style={[styles.progressDot, active && styles.progressDotActive]} /> <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{label}</Text></View>;
// }
function ProgressStep({ label, active, compact }: { label: string; active: boolean; compact: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.progressStep}>
      <View style={[styles.progressDot, active && styles.progressDotActive]} />
      <Text numberOfLines={compact ? 2 : undefined} style={[styles.progressLabel, compact && styles.progressLabelCompact, active && styles.progressLabelActive]}>{label}</Text>
    </View>
  );
}

function EmptyState({ title, copy, action, onPress, styles }: { title: string; copy: string; action: string; onPress(): void; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>SP</Text></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text><Pressable style={styles.shopButton} onPress={onPress}><Text style={styles.shopButtonText}>{action}  →</Text></Pressable></View>;
}

function SupportCard({ icon, title, copy, action, onPress, styles }: { icon: string; title: string; copy: string; action: string; onPress(): void; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.supportCard}><View style={styles.supportIcon}><Text style={styles.supportIconText}>{icon}</Text></View><Text style={styles.supportTitle}>{title}</Text><Text style={styles.supportCopy}>{copy}</Text><Pressable onPress={onPress}><Text style={styles.supportAction}>{action}  →</Text></Pressable></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  hero: { paddingHorizontal: spacing.lg, paddingVertical: spacing.section, backgroundColor: colors.surfaceSunken, borderBottomWidth: 1, borderBottomColor: colors.line },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center', gap: spacing.xl },
  heroTop: { gap: spacing.xl },
  heroTopDesktop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted, fontSize: 13 },
  shopButton: { minHeight: 48, paddingHorizontal: spacing.xl, borderRadius: radius.md, backgroundColor: colors.copper, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  shopButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  billButton: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  billButtonDisabled: { opacity: 0.6 },
  billButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  technicianButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  technicianButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  summaryCard: { flexGrow: 1, flexBasis: 180, minHeight: 92, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  summaryValue: { color: colors.brass, fontSize: 28, fontWeight: '900' },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 4 },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl, gap: spacing.xl },
  accountStack: { gap: spacing.xl },
  tabRail: { gap: spacing.sm },
  tabButton: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tabButtonActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  tabTextActive: { color: colors.teal },
  panel: { padding: spacing.xl, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: spacing.lg },
  panelCompact: { padding: spacing.md, gap: spacing.md },
  panelHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  panelEyebrow: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  panelTitle: { color: colors.cream, fontSize: 23, fontWeight: '900', marginTop: 4 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  profileField: { flexGrow: 1, flexBasis: 240, minWidth: 0, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, gap: 7 },
  fieldLabel: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  profileValue: { color: colors.cream, fontSize: 15, fontWeight: '800', lineHeight: 22 },
  profileInput: { minHeight: 46, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.cream, fontSize: 14 },
  placeholder: { color: colors.muted },
  select: { minHeight: 46, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  selectText: { flex: 1, color: colors.cream, fontSize: 14 },
  selectPlaceholder: { color: colors.muted },
  selectChevron: { color: colors.teal, fontSize: 18, fontWeight: '900' },
  selectOptions: { position: 'absolute', top: 69, left: 0, right: 0, zIndex: 120, elevation: 120, height: 240, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden' },
  selectScroll: { height: 238, backgroundColor: colors.surface },
  selectScrollContent: { backgroundColor: colors.surface },
  selectOption: { paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  selectOptionActive: { backgroundColor: colors.tealTint },
  selectOptionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  selectOptionTextActive: { color: colors.cream, fontWeight: '900' },
  formActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  primaryButton: { minWidth: 140, minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.copper, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  disabledButton: { opacity: 0.55 },
  signOutRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  signOutCopy: { flex: 1, minWidth: 180 },
  signOutTitle: { color: colors.cream, fontSize: 15, fontWeight: '900' },
  signOutButton: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  signOutButtonText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  addressForm: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.teal, backgroundColor: colors.surfaceSunken, gap: spacing.md },
  formTitle: { color: colors.cream, fontSize: 18, fontWeight: '900' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  formField: { flexGrow: 1, flexBasis: 210, minWidth: 0, gap: 7 },
  selectFieldOpen: { zIndex: 100, elevation: 100 },
  addressInput: { minHeight: 92, paddingVertical: spacing.md, textAlignVertical: 'top' },
  addressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  orderCard: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken },
  orderCardCompact: { padding: spacing.md },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  orderIdentity: { flex: 1, minWidth: 0 },
  orderBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end', gap: spacing.xs, maxWidth: '58%' },
  orderId: { color: colors.cream, fontSize: 17, fontWeight: '900', flexShrink: 1 },
  orderIdCompact: { fontSize: 15 },
  orderDate: { color: colors.muted, fontSize: 11, marginTop: 3 },
  statusPill: { alignSelf: 'flex-start', flexShrink: 1, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.successTint },
  statusText: { color: colors.success, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  statusTextCompact: { fontSize: 8, letterSpacing: 0.35 },
  statusPillPending: { backgroundColor: colors.copperTint },
  statusPillDanger: { backgroundColor: colors.surfaceSunken },
  statusTextPending: { color: colors.copper },
  statusTextDanger: { color: colors.danger },
  paymentPill: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill },
  paymentPillPaid: { backgroundColor: colors.successTint },
  paymentPillCod: { backgroundColor: colors.tealTint },
  paymentPillText: { color: colors.cream, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  approvalText: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: spacing.md },
  error: { color: colors.copper, fontSize: 11, fontWeight: '800' },
  orderItems: { gap: 4, marginTop: spacing.md },
  orderItem: { color: colors.cream, fontSize: 13, fontWeight: '700' },
  orderBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.md, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
  orderDetails: { flex: 1, minWidth: 0 },
  orderMeta: { color: colors.muted, fontSize: 11 },
  paymentMeta: { fontSize: 11, fontWeight: '900', marginTop: 5 },
  paymentPaid: { color: colors.success },
  paymentCod: { color: colors.copper },
  orderAddress: { color: colors.muted, fontSize: 10, maxWidth: 520, marginTop: 3 },
  orderTotal: { color: colors.brass, fontSize: 19, fontWeight: '900' },
  orderProgress: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.lg },
  orderProgressCompact: { marginTop: spacing.md },
  progressStep: { flex: 1, minWidth: 0, alignItems: 'center' },
  progressDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.track, borderWidth: 2, borderColor: colors.surfaceSunken },
  progressDotActive: { backgroundColor: colors.success },
  progressLabel: { color: colors.muted, fontSize: 8, marginTop: 5, textAlign: 'center', lineHeight: 10 },
  progressLabelCompact: { fontSize: 7, lineHeight: 9 },
  progressLabelActive: { color: colors.cream, fontWeight: '800' },
  progressLine: { flexGrow: 0, flexShrink: 0, width: 10, height: 2, backgroundColor: colors.track, marginTop: 5 },
  savedRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  savedBody: { flex: 1, minWidth: 160 },
  savedBrand: { color: colors.teal, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  savedName: { color: colors.cream, fontSize: 16, fontWeight: '900', marginTop: 3 },
  savedPrice: { color: colors.brass, fontSize: 15, fontWeight: '900', marginTop: 6 },
  savedActions: { alignItems: 'center', gap: spacing.sm },
  addButton: { minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.copper, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  removeText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  outlineButton: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { color: colors.cream, fontSize: 11, fontWeight: '900' },
  addressCard: { flexGrow: 1, flexBasis: 300, maxWidth: 620, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken },
  addressTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  addressLabel: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  defaultPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.tealTint },
  defaultPillText: { color: colors.teal, fontSize: 8, fontWeight: '900' },
  addressName: { color: colors.cream, fontSize: 17, fontWeight: '900', marginTop: spacing.md },
  addressText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  addressPhone: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  editLink: { color: colors.teal, fontSize: 12, fontWeight: '900', marginTop: spacing.lg },
  supportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  supportCard: { minWidth: 0, flexGrow: 1, flexBasis: 260, minHeight: 210, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken },
  supportIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  supportIconText: { color: colors.teal, fontSize: 18 },
  supportTitle: { color: colors.cream, fontSize: 17, fontWeight: '900', marginTop: spacing.md },
  supportCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: spacing.sm },
  supportAction: { color: colors.teal, fontSize: 11, fontWeight: '900', marginTop: spacing.lg },
  empty: { minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: colors.teal, fontSize: 16, fontWeight: '900' },
  emptyTitle: { color: colors.cream, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, maxWidth: 460, textAlign: 'center' },
});

