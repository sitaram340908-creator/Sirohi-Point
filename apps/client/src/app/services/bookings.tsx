import { formatMoney } from '@/shared/domain';
import type { ThemeColors } from '@/shared/design-tokens';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/portal-ui';
import { confirmServiceBookingCompletion, getServiceBookings, type ServiceBookingRecord } from '@/lib/api';
import { useAppState } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useThemedStyles } from '@/theme/theme-context';

export default function ServiceBookingsScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { token, user } = useAuth();
  const { showNotice } = useAppState();
  const queryClient = useQueryClient();
  const bookingsQuery = useQuery({ queryKey: ['services', 'bookings', user?.id], queryFn: () => getServiceBookings(token!), enabled: Boolean(token) && user?.role === 'CUSTOMER', refetchInterval: 5000 });
  const bookings = bookingsQuery.data?.map(toBookingView) ?? [];
  async function confirmCompletion(id: string) {
    if (!token || user?.role !== 'CUSTOMER') return;
    try {
      await confirmServiceBookingCompletion(token, id);
      await queryClient.invalidateQueries({ queryKey: ['services', 'bookings', user.id] });
      showNotice('Completion confirmed. The technician can now mark the request completed.');
    } catch (reason) {
      showNotice(reason instanceof Error ? reason.message : 'Unable to confirm completion.');
    }
  }
  return <PortalShell eyebrow="MY SERVICE REQUESTS" title="Track every service request." copy="A clear customer timeline: request, admin approval, technician response, and completion." actions={<PortalButton label="Request another service" onPress={() => router.push('/services/nearby' as never)} />}>
    {!user ? <PortalCard title="Explore the store first" copy="Sign in when you are ready to submit or view service requests. You can continue exploring products from the home page."><PortalButton label="Browse products" onPress={() => router.replace('/' as never)} /></PortalCard> : null}
    {bookingsQuery.isLoading ? <Text style={styles.meta}>Loading service requests from the backend…</Text> : null}
    {bookingsQuery.isError ? <Text style={styles.error}>Unable to load service requests: {bookingsQuery.error instanceof Error ? bookingsQuery.error.message : 'Unknown error'}</Text> : null}
    {!bookingsQuery.isLoading && !bookingsQuery.isError && !bookings.length ? <PortalCard title="No service requests yet" copy="Requests submitted by this account will appear here after they are saved by the backend." /> : null}
    <View style={styles.list}>{bookings.map((booking) => <PortalCard key={booking.id}><View style={styles.top}><View><Text style={styles.id}>{booking.id}</Text><Text style={styles.title}>{booking.serviceType} · {booking.technician}</Text></View><StatusBadge label={booking.statusLabel} tone={booking.status === 'ADMIN_APPROVED' || booking.status === 'TECHNICIAN_ACCEPTED' || booking.status === 'CUSTOMER_CONFIRMED' || booking.status === 'COMPLETED' ? 'success' : booking.status === 'REJECTED' ? 'danger' : 'warning'} /></View><Text style={styles.meta}>{booking.address}</Text><Text style={styles.meta}>{booking.priceSummary}</Text><Text style={styles.meta}>{booking.scheduledFor}</Text><View style={styles.timeline}><Step label="Requested" active /><Step label="Admin approval" active={booking.status !== 'PENDING_ADMIN' && booking.status !== 'REJECTED'} /><Step label="Technician" active={booking.status === 'TECHNICIAN_ACCEPTED' || booking.status === 'CUSTOMER_CONFIRMED' || booking.status === 'COMPLETED'} /><Step label="Customer confirmed" active={booking.status === 'CUSTOMER_CONFIRMED' || booking.status === 'COMPLETED'} /><Step label="Completed" active={booking.status === 'COMPLETED'} /></View>{booking.status === 'TECHNICIAN_ACCEPTED' ? <PortalButton label="Mark this request completed" onPress={() => void confirmCompletion(booking.id)} /> : null}</PortalCard>)}</View>
  </PortalShell>;
}

type BookingView = { id: string; serviceType: string; technician: string; address: string; scheduledFor: string; status: 'PENDING_ADMIN' | 'ADMIN_APPROVED' | 'TECHNICIAN_ACCEPTED' | 'CUSTOMER_CONFIRMED' | 'COMPLETED' | 'REJECTED'; statusLabel: string; priceSummary: string };

function toBookingView(booking: ServiceBookingRecord): BookingView {
  const status = booking.approvalStatus === 'REJECTED' || booking.technicianResponse === 'REJECTED' || booking.status === 'CANCELLED' ? 'REJECTED' : booking.status === 'COMPLETED' ? 'COMPLETED' : booking.status === 'IN_PROGRESS' ? 'CUSTOMER_CONFIRMED' : booking.technicianResponse === 'ACCEPTED' ? 'TECHNICIAN_ACCEPTED' : booking.approvalStatus === 'APPROVED' ? 'ADMIN_APPROVED' : 'PENDING_ADMIN';
  const statusLabel = status === 'PENDING_ADMIN' ? 'Waiting for admin approval' : status === 'ADMIN_APPROVED' ? 'Admin approved · waiting for technician' : status === 'TECHNICIAN_ACCEPTED' ? 'Technician accepted · mark work completed when finished' : status === 'CUSTOMER_CONFIRMED' ? 'Completion confirmed · waiting for technician' : status === 'COMPLETED' ? 'Work completed' : 'Request rejected';
  return { priceSummary: booking.finalPriceInPaise == null ? 'Visit charge not recorded' : `Visit charge: ${formatMoney(booking.finalPriceInPaise)}${booking.discountInPaise ? ` · Saved ${formatMoney(booking.discountInPaise)} (${booking.offerTitle})` : ''}`, id: booking.id, serviceType: booking.serviceType, technician: booking.contractor?.user?.name ?? 'Waiting for assignment', address: booking.address, scheduledFor: booking.scheduledFor ? new Date(booking.scheduledFor).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Time to be confirmed', status, statusLabel };
}

function Step({ label, active }: { label: string; active: boolean }) { const styles = useThemedStyles(createStyles); return <View style={styles.step}><View style={[styles.dot, active && styles.dotActive]} /><Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text></View>; }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  list: { gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  id: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  title: { color: colors.cream, fontSize: 15, fontWeight: '900', marginTop: 4 },
  meta: { color: colors.muted, fontSize: 12 },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  step: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.track },
  dotActive: { backgroundColor: colors.teal },
  stepLabel: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  stepLabelActive: { color: colors.cream },
  error: { color: colors.copper, fontSize: 11, fontWeight: '800' },
});

