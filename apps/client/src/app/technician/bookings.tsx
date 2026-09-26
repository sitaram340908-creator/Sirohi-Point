import type { ThemeColors } from '@/shared/design-tokens';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/portal-ui';
import { TechnicianAccessGate } from '@/components/technician-access-gate';
import { acceptServiceBooking, completeServiceBooking, getContractorBookings, rejectServiceBookingAsTechnician, type ServiceBookingRecord } from '@/lib/api';
import { useAppState } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useThemedStyles } from '@/theme/theme-context';

type RequestStatus = 'PENDING' | 'ACCEPTED' | 'CUSTOMER_CONFIRMED' | 'REJECTED' | 'COMPLETED';
export default function TechnicianBookingsScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { showNotice } = useAppState();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const bookingsQuery = useQuery({ queryKey: ['services', 'contractor', 'bookings', user?.id ?? 'anonymous'], queryFn: () => getContractorBookings(token!), enabled: user?.role === 'CONTRACTOR' && Boolean(token), refetchInterval: 5000 });

  const requests = (bookingsQuery.data ?? []).map(toRequestView);

  async function update(id: string, status: RequestStatus) {
    if (user?.role === 'CONTRACTOR' && token && bookingsQuery.data) {
      try {
        if (status === 'ACCEPTED') await acceptServiceBooking(token, id);
        else if (status === 'REJECTED') await rejectServiceBookingAsTechnician(token, id);
        else if (status === 'COMPLETED') await completeServiceBooking(token, id);
        await queryClient.invalidateQueries({ queryKey: ['services', 'contractor', 'bookings', user.id] });
      } catch (reason) { showNotice(reason instanceof Error ? reason.message : 'Unable to update this service request.'); return; }
    }

    showNotice(`Request ${id} marked ${status.toLowerCase()}.`);
  }

  return <TechnicianAccessGate><PortalShell eyebrow="TECHNICIAN REQUESTS" title="Respond to approved customer visits." copy="Only requests approved by the admin should enter this queue. Accept, reject, or complete the work from here." actions={<PortalButton label="Main panel" secondary onPress={() => router.push('/technician' as never)} />}><View style={styles.list}>{bookingsQuery.isLoading ? <Text style={styles.meta}>Loading requests from the backend…</Text> : null}{bookingsQuery.isError ? <Text style={styles.error}>Unable to load technician requests: {bookingsQuery.error instanceof Error ? bookingsQuery.error.message : 'Unknown error'}</Text> : null}{!bookingsQuery.isLoading && !bookingsQuery.isError && !requests.length ? <PortalCard title="No approved requests" copy="Admin-approved customer service requests will appear here." /> : null}{requests.map((request) => <PortalCard key={request.id}><View style={styles.top}><View><Text style={styles.id}>{request.id}</Text><Text style={styles.title}>{request.service} · {request.customer}</Text></View><StatusBadge label={request.status === 'PENDING' ? 'Needs response' : request.status === 'CUSTOMER_CONFIRMED' ? 'Customer confirmed completion' : request.status} tone={request.status === 'ACCEPTED' || request.status === 'CUSTOMER_CONFIRMED' || request.status === 'COMPLETED' ? 'success' : request.status === 'REJECTED' ? 'danger' : 'warning'} /></View><Text style={styles.meta}>{request.address}</Text><Text style={styles.meta}>{request.when}</Text><View style={styles.actions}>{request.status === 'PENDING' ? <><PortalButton label="Accept visit" onPress={() => void update(request.id, 'ACCEPTED')} /><PortalButton label="Reject" danger onPress={() => void update(request.id, 'REJECTED')} /></> : request.status === 'ACCEPTED' ? <PortalButton label="Mark completed" disabled onPress={() => undefined} /> : request.status === 'CUSTOMER_CONFIRMED' ? <PortalButton label="Mark completed" onPress={() => void update(request.id, 'COMPLETED')} /> : null}</View></PortalCard>)}</View><View style={styles.note}><Text style={styles.noteTitle}>Approval workflow</Text><Text style={styles.noteCopy}>Technicians can mark work completed only after the customer confirms completion.</Text></View></PortalShell></TechnicianAccessGate>;
}

function toRequestView(booking: ServiceBookingRecord) {
  return { id: booking.id, customer: booking.customer?.name ?? 'Customer', service: booking.serviceType, address: booking.address, when: booking.scheduledFor ? new Date(booking.scheduledFor).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Time to be confirmed', status: booking.status === 'COMPLETED' ? 'COMPLETED' as RequestStatus : booking.status === 'IN_PROGRESS' ? 'CUSTOMER_CONFIRMED' as RequestStatus : booking.technicianResponse === 'ACCEPTED' ? 'ACCEPTED' as RequestStatus : booking.technicianResponse === 'REJECTED' || booking.status === 'CANCELLED' ? 'REJECTED' as RequestStatus : 'PENDING' as RequestStatus };
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  list: { gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  id: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  title: { color: colors.cream, fontSize: 15, fontWeight: '900', marginTop: 4 },
  meta: { color: colors.muted, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 5 },
  note: { padding: 16, borderRadius: 8, backgroundColor: colors.tealTint, borderWidth: 1, borderColor: colors.teal, gap: 4 },
  noteTitle: { color: colors.teal, fontSize: 12, fontWeight: '900' },
  noteCopy: { color: colors.cream, fontSize: 12, lineHeight: 18 },
  error: { color: colors.copper, fontSize: 11, fontWeight: '800' },
});

