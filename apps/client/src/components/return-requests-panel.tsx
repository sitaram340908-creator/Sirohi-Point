import type { CustomerAddress, OrderDetails, ReturnRequest } from '@sirohi/contracts';
import type { ThemeColors } from '@sirohi/design-tokens';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createReturnRequest } from '@/lib/api';
import { useBusinessStyles } from '@/theme/business-theme';
import { useCustomerStyles } from '@/theme/customer-theme';

type ReturnRequestsPanelProps = {
  token: string;
  orders: OrderDetails[];
  addresses: CustomerAddress[];
  requests: ReturnRequest[];
  loading: boolean;
  addressesLoading?: boolean;
  variant?: 'customer' | 'business';
  onChanged(): Promise<unknown>;
  showNotice(message: string): void;
};

const activeStatuses: ReturnRequest['status'][] = ['PENDING', 'APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED'];

export function ReturnRequestsPanel({ token, orders, addresses, requests, loading, addressesLoading = false, variant = 'customer', onChanged, showNotice }: ReturnRequestsPanelProps) {
  const customerStyles = useCustomerStyles(createStyles);
  const businessStyles = useBusinessStyles(createStyles);
  const styles = variant === 'business' ? businessStyles : customerStyles;
  const [formOpen, setFormOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});
  const [addressId, setAddressId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const eligibleOrders = orders.filter((order) => order.status === 'DELIVERED' && returnWindowOpen(order) && order.items.some((item) => remainingQuantity(order, item, requests) > 0));
  const selectedOrder = eligibleOrders.find((order) => order.id === orderId);
  const availableItems = selectedOrder?.items.filter((item) => remainingQuantity(selectedOrder, item, requests) > 0) ?? [];

  function startForm() {
    const firstOrder = eligibleOrders[0];
    const firstItem = firstOrder?.items.find((item) => remainingQuantity(firstOrder, item, requests) > 0);
    setOrderId(firstOrder?.id ?? '');
    setSelectedItems(firstItem ? { [firstItem.id]: '1' } : {});
    setAddressId(addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '');
    setReason('');
    setFormOpen(true);
  }

  async function submit() {
    const items = Object.entries(selectedItems).map(([orderItemId, itemQuantity]) => ({ orderItemId, quantity: Number(itemQuantity) }));
    if (!orderId || !items.length) { showNotice('Select at least one product from a delivered order.'); return; }
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) { showNotice('Enter a valid quantity for every selected product.'); return; }
    if (!addressId) { showNotice('Select a saved address for the return pickup.'); return; }
    setSaving(true);
    try {
      await createReturnRequest(token, { orderId, items, addressId, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      await onChanged();
      setFormOpen(false);
      showNotice('Return request submitted. You can track its status here.');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Unable to submit the return request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.headingCopy}><Text style={styles.eyebrow}>RETURNS &amp; REFUNDS</Text><Text accessibilityRole="header" style={styles.title}>Return requests</Text><Text style={styles.copy}>Raise a request for a delivered product and follow every update from review to refund.</Text></View>
          {!formOpen ? <Pressable accessibilityRole="button" accessibilityLabel="Start a return request" disabled={!eligibleOrders.length || !addresses.length} onPress={startForm} style={[styles.primaryButton, (!eligibleOrders.length || !addresses.length) && styles.disabled]}><Text style={styles.primaryButtonText}>Start a return</Text></Pressable> : null}
        </View>
        {formOpen ? <View style={styles.form}>
          <Text style={styles.formTitle}>Choose what you want to return · within 7 days of ordering</Text>
          <Text style={styles.fieldLabel}>DELIVERED ORDER</Text>
          <View style={styles.choiceRow}>{eligibleOrders.map((order) => <Pressable key={order.id} accessibilityRole="button" accessibilityState={{ selected: order.id === orderId }} onPress={() => { setOrderId(order.id); setSelectedItems({}); }} style={[styles.choice, order.id === orderId && styles.choiceActive]}><Text style={[styles.choiceText, order.id === orderId && styles.choiceTextActive]}>{order.id}</Text></Pressable>)}</View>
          <Text style={styles.fieldLabel}>PRODUCT</Text>
          <View style={styles.itemChoices}>{availableItems.map((item) => { const remaining = selectedOrder ? remainingQuantity(selectedOrder, item, requests) : 0; const selected = selectedItems[item.id] !== undefined; return <View key={item.id} style={[styles.itemChoice, selected && styles.choiceActive]}><Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedItems((current) => { const next = { ...current }; if (next[item.id] === undefined) next[item.id] = '1'; else delete next[item.id]; return next; })}><Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{selected ? '✓ ' : ''}{item.productName}</Text><Text style={styles.itemMeta}>Up to {remaining} unit{remaining === 1 ? '' : 's'}</Text></Pressable>{selected ? <TextInput accessibilityLabel={`Return quantity for ${item.productName}`} value={selectedItems[item.id]} onChangeText={(value) => setSelectedItems((current) => ({ ...current, [item.id]: value }))} keyboardType="number-pad" style={styles.input} /> : null}</View>; })}</View>
          <View style={styles.field}><Text style={styles.fieldLabel}>PICKUP ADDRESS</Text><View style={styles.choiceRow}>{addresses.map((address) => <Pressable key={address.id} accessibilityRole="button" accessibilityState={{ selected: address.id === addressId }} onPress={() => setAddressId(address.id)} style={[styles.choice, address.id === addressId && styles.choiceActive]}><Text style={[styles.choiceText, address.id === addressId && styles.choiceTextActive]}>{address.label}</Text><Text style={styles.itemMeta}>{[address.city, address.postalCode].filter(Boolean).join(' · ')}</Text></Pressable>)}</View></View>
          <View style={styles.field}><Text style={styles.fieldLabel}>REASON (OPTIONAL)</Text><TextInput accessibilityLabel="Return reason" value={reason} onChangeText={setReason} placeholder="Tell us why you are returning this item" placeholderTextColor={styles.placeholder.color} multiline style={[styles.input, styles.textArea]} /></View>
          {addressesLoading ? <Text style={styles.muted}>Loading saved addresses…</Text> : null}
          {!addresses.length && !addressesLoading ? <Text style={styles.error}>Add a saved address before submitting a return request.</Text> : null}
          <View style={styles.actions}><Pressable accessibilityRole="button" disabled={saving} onPress={() => setFormOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={() => void submit()} style={[styles.primaryButton, saving && styles.disabled]}><Text style={styles.primaryButtonText}>{saving ? 'Submitting…' : 'Submit return request'}</Text></Pressable></View>
        </View> : null}
        {!formOpen && !loading && !eligibleOrders.length ? <Text style={styles.muted}>Return requests are available only for delivered orders within 7 days of ordering. If you already have an active return for all ordered units, its status is shown below.</Text> : null}
      </View>
      <View style={styles.panel}>
        <View style={styles.panelHeader}><View><Text style={styles.eyebrow}>TRACKING</Text><Text style={styles.title}>Your return history</Text></View></View>
        {loading ? <Text style={styles.muted}>Loading return requests…</Text> : requests.length ? requests.map((request) => <View key={request.id} style={styles.requestCard}><View style={styles.requestTop}><View style={styles.requestCopy}><Text style={styles.requestTitle}>Return request {request.id}</Text><Text style={styles.muted}>Order {request.orderId} · {request.items.length} product{request.items.length === 1 ? '' : 's'}</Text></View><StatusPill status={request.status} styles={styles} /></View><View style={styles.requestItems}>{request.items.map((item) => <Text key={item.id} style={styles.muted}>{item.quantity} × {item.productName} (ordered {item.orderedQuantity})</Text>)}</View><Text style={styles.muted}>Pickup address · {request.address}</Text><Text style={styles.muted}>Submitted {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>{request.reason ? <Text style={styles.reason}>Reason: {request.reason}</Text> : null}{request.adminNote ? <Text style={styles.note}>Admin update: {request.adminNote}</Text> : null}</View>) : <Text style={styles.muted}>No return requests yet. Start one from a delivered order above.</Text>}
      </View>
    </View>
  );
}

function remainingQuantity(order: OrderDetails, item: OrderDetails['items'][number], requests: ReturnRequest[]) {
  const used = requests.filter((request) => request.orderId === order.id && activeStatuses.includes(request.status)).reduce((sum, request) => sum + (request.items.find((returnItem) => returnItem.orderItemId === item.id)?.quantity ?? 0), 0);
  return Math.max(0, item.quantity - used);
}

function returnWindowOpen(order: OrderDetails) {
  return Date.now() - new Date(order.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
}

function StatusPill({ status, styles }: { status: ReturnRequest['status']; styles: ReturnStyles }) {
  const warm = status === 'PENDING' || status === 'PICKUP_SCHEDULED';
  const danger = status === 'REJECTED' || status === 'CANCELLED';
  const success = status === 'APPROVED' || status === 'RECEIVED' || status === 'REFUNDED';
  return <View style={[styles.statusPill, warm && styles.statusWarm, danger && styles.statusDanger, success && styles.statusSuccess]}><Text style={[styles.statusText, warm && styles.statusWarmText, danger && styles.statusDangerText, success && styles.statusSuccessText]}>{status.replace(/_/g, ' ')}</Text></View>;
}

type ReturnStyles = ReturnType<typeof createStyles>;
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  stack: { gap: 18 }, panel: { padding: 22, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: 16 }, panelHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }, headingCopy: { flex: 1, minWidth: 220, gap: 6 }, eyebrow: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.cream, fontSize: 21, fontWeight: '900' }, copy: { color: colors.muted, fontSize: 13, lineHeight: 20, maxWidth: 680 }, form: { gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }, formTitle: { color: colors.cream, fontSize: 16, fontWeight: '800' }, fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: .5 }, field: { flex: 1, minWidth: 220, gap: 7 }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, gap: 2 }, choiceActive: { borderColor: colors.teal, backgroundColor: colors.tealTint }, choiceText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, choiceTextActive: { color: colors.teal }, itemChoices: { gap: 8 }, itemChoice: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, gap: 8 }, itemMeta: { color: colors.muted, fontSize: 10 }, input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 13 }, textArea: { minHeight: 74, paddingVertical: 10, textAlignVertical: 'top' }, placeholder: { color: colors.muted }, actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }, primaryButton: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' }, primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, secondaryButton: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, secondaryButtonText: { color: colors.cream, fontSize: 12, fontWeight: '800' }, disabled: { opacity: .45 }, muted: { color: colors.muted, fontSize: 12, lineHeight: 19 }, error: { color: colors.danger, fontSize: 12, lineHeight: 18 }, requestCard: { padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, gap: 7 }, requestTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }, requestCopy: { flex: 1, minWidth: 180, gap: 3 }, requestTitle: { color: colors.cream, fontSize: 14, fontWeight: '900' }, requestItems: { gap: 3 }, statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surfaceRaised }, statusText: { color: colors.muted, fontSize: 10, fontWeight: '900' }, statusWarm: { backgroundColor: colors.copperTint }, statusWarmText: { color: colors.copper }, statusDanger: { backgroundColor: colors.dangerTint }, statusDangerText: { color: colors.danger }, statusSuccess: { backgroundColor: colors.successTint }, statusSuccessText: { color: colors.success }, reason: { color: colors.muted, fontSize: 12, fontStyle: 'italic' }, note: { color: colors.teal, fontSize: 12, lineHeight: 18 },
});
