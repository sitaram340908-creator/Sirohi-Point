import { formatMoney } from '@sirohi/domain';
import { paymentChannelLabel, type OrderDetails } from '@sirohi/contracts';
import type { ThemeColors } from '@sirohi/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PortalButton, PortalCard, PortalMetric, PortalShell, StatusBadge } from '@/components/business/business-ui';
import { ReturnRequestsPanel } from '@/components/return-requests-panel';
import { downloadOrderBill, getCustomerAddresses, getOrders, getReturnRequests } from '@/lib/api';
import { useAppState } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useBusinessStyles } from '@/theme/business-theme';

type OrderFilter = 'All orders' | 'Awaiting approval' | 'In progress' | 'Delivered';
export default function BusinessOrdersScreen() {
  const router = useRouter();
  const styles = useBusinessStyles(createStyles);
  const { token, user } = useAuth();
  const { showNotice } = useAppState();
  const [filter, setFilter] = useState<OrderFilter>('All orders');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const ordersQuery = useQuery({ queryKey: ['orders', user?.id], queryFn: () => getOrders(token!), enabled: user?.role === 'BUSINESS' && Boolean(token), refetchInterval: 5000 });
  const addressesQuery = useQuery({ queryKey: ['customer-addresses', user?.id], queryFn: () => getCustomerAddresses(token!), enabled: user?.role === 'BUSINESS' && Boolean(token) });
  const returnRequestsQuery = useQuery({ queryKey: ['return-requests', user?.id], queryFn: () => getReturnRequests(token!), enabled: user?.role === 'BUSINESS' && Boolean(token), refetchInterval: 5000 });
  const orders = ordersQuery.data ?? [];
  const pending = orders.filter(order => (order.approvalStatus ?? 'PENDING') === 'PENDING' && order.status !== 'CANCELLED');
  const delivered = orders.filter(order => order.status === 'DELIVERED');
  const inProgress = orders.filter(order => order.approvalStatus === 'APPROVED' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED');
  const filtered = filter === 'Awaiting approval' ? pending : filter === 'Delivered' ? delivered : filter === 'In progress' ? inProgress : orders;
  const download = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    try { await downloadOrderBill(token, id); showNotice('Bill download started.'); }
    catch (error) { showNotice(error instanceof Error ? error.message : 'Unable to download this bill.'); }
    finally { setDownloadingId(null); }
  };
  return <PortalShell eyebrow="YOUR BUSINESS ORDERS" title="From your cart to your doorstep." copy="Keep an eye on approvals, follow deliveries, and find all your past orders in one place." actions={<PortalButton label="Start a new order →" onPress={() => router.push('/business/catalog')} />}>
    <View style={styles.metrics}><PortalMetric value={ordersQuery.isSuccess ? String(orders.length) : '—'} label="Total orders" /><PortalMetric value={ordersQuery.isSuccess ? String(pending.length) : '—'} label="Awaiting approval" /><PortalMetric value={ordersQuery.isSuccess ? String(inProgress.length) : '—'} label="In progress" /><PortalMetric value={ordersQuery.isSuccess ? String(delivered.length) : '—'} label="Delivered" /></View>
    <View style={styles.toolbar}><View style={styles.filters}>{(['All orders', 'Awaiting approval', 'In progress', 'Delivered'] as const).map(label => <PortalButton key={label} label={label} secondary={filter !== label} onPress={() => setFilter(label)} />)}</View><Text style={styles.refresh}>Order status updates automatically</Text></View>
    {ordersQuery.isLoading ? <PortalCard title="Finding your orders…" copy="Your business order history will appear here." /> : null}
    {ordersQuery.isError ? <PortalCard title="Your orders could not be loaded" copy="Please try again to see the latest order updates."><PortalButton label="Reload orders" onPress={() => void ordersQuery.refetch()} /></PortalCard> : null}
    {ordersQuery.isSuccess && !filtered.length ? <PortalCard title={orders.length ? 'No orders in this view' : 'Your first order is a fresh start.'} copy={orders.length ? 'Choose another filter to explore your order history.' : 'Find your essentials, build your bulk cart, and follow your order here.'}><PortalButton label={orders.length ? 'View all orders' : 'Explore wholesale →'} onPress={() => orders.length ? setFilter('All orders') : router.push('/business/catalog')} /></PortalCard> : null}
    <View style={styles.list}>{filtered.map(order => <PortalCard key={order.id}>
      <View style={styles.top}><View style={styles.orderIdentity}><Text style={styles.eyebrow}>ORDER REFERENCE</Text><Text selectable style={styles.id}>{order.id}</Text><Text style={styles.date}>Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View><View style={styles.badges}><StatusBadge label={order.approvalStatus === 'APPROVED' ? 'Approved' : order.approvalStatus === 'REJECTED' ? 'Rejected' : 'Awaiting approval'} tone={order.approvalStatus === 'APPROVED' ? 'success' : order.approvalStatus === 'REJECTED' ? 'danger' : 'warning'} /><StatusBadge label={formatOrderStatus(order.status)} tone={order.status === 'CANCELLED' ? 'danger' : order.status === 'DELIVERED' ? 'success' : 'neutral'} /></View></View>
      <View style={styles.items}>{order.items.map((item, index) => <View key={`${order.id}-${index}`} style={styles.item}><View style={styles.itemMark}><Text style={styles.itemMarkText}>▤</Text></View><Text style={styles.itemName}>{item.productName}</Text><Text style={styles.itemQuantity}>{item.quantity} units</Text></View>)}</View>
      <View style={styles.bottom}><View><Text style={styles.meta}>{order.itemCount} units in this order</Text><Text style={styles.meta}>Payment: {order.paymentMethod === 'ONLINE' ? `Online · ${paymentChannelLabel(order.paymentChannel)}` : 'Cash on Delivery'}</Text></View><View style={styles.totalGroup}><Text style={styles.meta}>Order total</Text><Text style={styles.total}>{formatMoney(order.totalInPaise)}</Text></View></View>
      <View style={{ marginTop: 5, marginBottom: 5, paddingTop: 5, paddingBottom: 5 }}><PortalButton label={downloadingId === order.id ? 'Preparing bill…' : 'Download bill PDF'} secondary disabled={downloadingId === order.id} onPress={() => void download(order.id)} /></View>
      {order.cancellationReason ? <Text style={styles.error}>Cancellation reason: {order.cancellationReason}</Text> : null}
      <OrderStatusTimeline status={order.status} rejected={order.approvalStatus === 'REJECTED'} />
    </PortalCard>)}</View>
    <ReturnRequestsPanel token={token!} orders={orders} addresses={addressesQuery.data ?? []} requests={returnRequestsQuery.data ?? []} loading={returnRequestsQuery.isLoading} addressesLoading={addressesQuery.isLoading} variant="business" onChanged={() => returnRequestsQuery.refetch()} showNotice={showNotice} />
  </PortalShell>;
}
const statusSteps: OrderDetails['status'][] = ['CONFIRMED', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
function formatOrderStatus(status: OrderDetails['status']) { return status === 'CONFIRMED' ? 'Submitted' : status === 'ACCEPTED' ? 'Accepted' : status.replace(/_/g, ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase()); }
function OrderStatusTimeline({ status, rejected }: { status: OrderDetails['status']; rejected: boolean }) {
  const styles = useBusinessStyles(createStyles);
  if (status === 'CANCELLED' || rejected) return <View style={styles.timeline}><Text style={styles.meta}>{rejected ? 'This order was not approved for fulfilment.' : 'This order has been cancelled.'}</Text></View>;
  const activeIndex = statusSteps.indexOf(status);
  return <View style={styles.timeline}>{statusSteps.map((step, index) => <View key={step} style={styles.step}><View style={[styles.dot, index <= activeIndex && styles.dotActive]}><Text style={[styles.dotText, index <= activeIndex && styles.dotTextActive]}>{index < activeIndex ? '✓' : String(index + 1)}</Text></View><Text style={[styles.stepText, index <= activeIndex && styles.stepTextActive]}>{formatOrderStatus(step)}</Text></View>)}</View>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, refresh: { color: c.muted, fontSize: 11 }, list: { gap: 22 }, top: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }, orderIdentity: { flex: 1, minWidth: 190, gap: 7 }, eyebrow: { color: c.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }, id: { color: c.cream, fontSize: 16, fontWeight: '800' }, date: { color: c.muted, fontSize: 12 }, badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 }, items: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, paddingVertical: 8 }, item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, itemMark: { width: 40, height: 40, borderRadius: 11, backgroundColor: c.surfaceSunken, justifyContent: 'center', alignItems: 'center' }, itemMarkText: { color: c.teal, fontSize: 21 }, itemName: { flex: 1, color: c.cream, fontSize: 14, lineHeight: 21, fontWeight: '600' }, itemQuantity: { color: c.muted, fontSize: 12 }, bottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }, totalGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 }, total: { color: c.cream, fontSize: 24, fontWeight: '800', letterSpacing: -0.7 }, meta: { color: c.muted, fontSize: 12, lineHeight: 20 }, timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, padding: 20, borderRadius: 14, backgroundColor: c.surfaceRaised }, step: { flexGrow: 1, flexBasis: 140, flexDirection: 'row', alignItems: 'center', gap: 9 }, dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.surfaceSunken, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }, dotActive: { backgroundColor: c.teal, borderColor: c.teal }, dotText: { color: c.muted, fontSize: 11, fontWeight: '700' }, dotTextActive: { color: c.surface }, stepText: { color: c.muted, fontSize: 11, fontWeight: '600' }, stepTextActive: { color: c.cream }, error: { color: c.danger, fontSize: 13, lineHeight: 21, padding: 14, backgroundColor: c.copperTint, borderRadius: 12 },
});
