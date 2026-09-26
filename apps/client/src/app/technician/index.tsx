import type { ThemeColors } from '@/shared/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PortalButton, PortalCard, PortalMetric, PortalShell, StatusBadge } from '@/components/portal-ui';
import { TechnicianAccessGate } from '@/components/technician-access-gate';
import { getContractorBookings, getContractorProfile } from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useThemedStyles } from '@/theme/theme-context';

export default function TechnicianHomeScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { token, user } = useAuth();
  const profileQuery = useQuery({ queryKey: ['services', 'contractor', 'profile', user?.id ?? 'anonymous'], queryFn: () => getContractorProfile(token!), enabled: user?.role === 'CONTRACTOR' && Boolean(token), refetchInterval: 5000 });
  const bookingsQuery = useQuery({ queryKey: ['services', 'contractor', 'bookings', user?.id ?? 'anonymous'], queryFn: () => getContractorBookings(token!), enabled: user?.role === 'CONTRACTOR' && Boolean(token), refetchInterval: 5000 });
  const profile = profileQuery.data;
  const bookings = bookingsQuery.data ?? [];
  const pendingCount = bookings.filter((booking) => booking.technicianResponse === 'PENDING').length;
  const acceptedCount = bookings.filter((booking) => booking.technicianResponse === 'ACCEPTED').length;
  return <TechnicianAccessGate><PortalShell eyebrow="TECHNICIAN WORKSPACE" title="Manage your service work." copy="Build your service profile, receive admin-approved requests, and update each job until completion." actions={<><PortalButton label="View my requests" onPress={() => router.push('/technician/bookings' as never)} /><PortalButton label="View my registration" secondary onPress={() => router.push('/technician/application' as never)} /><PortalButton label="Edit profile" secondary onPress={() => router.push('/technician/profile' as never)} /></>}>
    {profile ? <PortalCard title={profile.name} copy={profile.bio ?? 'Your professional profile'}><Text style={styles.value}>{profile.email}{profile.phone ? ` · ${profile.phone}` : ''}</Text><Text style={styles.label}>{profile.skills.join(', ')} · {profile.serviceArea ?? 'Area not set'}</Text></PortalCard> : null}
    <View style={styles.metrics}><PortalMetric value={String(pendingCount)} label="Pending requests" /><PortalMetric value={profile ? profile.rating.toFixed(1) : '—'} label="Customer rating" /><PortalMetric value={profile ? `${profile.serviceRadiusKm} km` : '—'} label="Service radius" /><PortalMetric value={profile?.availability ?? '—'} label="Current status" /></View>
    <View style={styles.columns}><PortalCard title="Current workload" copy="Only approved customer requests appear in the technician queue."><View style={styles.row}><Text style={styles.label}>Pending decisions</Text><Text style={styles.value}>{pendingCount} {pendingCount === 1 ? 'request' : 'requests'}</Text></View><View style={styles.row}><Text style={styles.label}>Accepted visits</Text><Text style={styles.value}>{acceptedCount} {acceptedCount === 1 ? 'visit' : 'visits'}</Text></View><View style={styles.row}><Text style={styles.label}>Service area</Text><Text style={styles.value}>{profile?.serviceArea ?? 'Not set'}{profile ? ` · ${profile.serviceRadiusKm} km` : ''}</Text></View><StatusBadge label={profile?.verified ? 'Profile visible to nearby customers' : 'Profile visibility is pending'} tone={profile?.verified ? 'success' : 'warning'} /></PortalCard><PortalCard title="Request lifecycle"><Step number="01" title="Admin approves" copy="The platform checks the customer request." active /><Step number="02" title="You accept or reject" copy="Choose whether you can take the visit." active /><Step number="03" title="Complete the job" copy="Mark accepted work as completed." active={false} /></PortalCard></View>
    {profileQuery.isError || bookingsQuery.isError ? <Text style={styles.error}>Some technician data could not be loaded from the backend.</Text> : null}
    <View style={styles.note}><Text style={styles.noteTitle}>Registration and approval</Text><Text style={styles.noteCopy}>New technicians submit their profile from the technician sign-in page. Their account stays pending until an admin approves the registration request.</Text></View>
  </PortalShell></TechnicianAccessGate>;
}

function Step({ number, title, copy, active }: { number: string; title: string; copy: string; active: boolean }) { const styles = useThemedStyles(createStyles); return <View style={styles.step}><View style={[styles.number, active && styles.numberActive]}><Text style={[styles.numberText, active && styles.numberTextActive]}>{number}</Text></View><View style={styles.stepBody}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepCopy}>{copy}</Text></View></View>; }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.cream, fontSize: 12, fontWeight: '900' },
  step: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.line },
  numberActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  numberText: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  numberTextActive: { color: colors.teal },
  stepBody: { flex: 1, gap: 3 },
  stepTitle: { color: colors.cream, fontSize: 13, fontWeight: '900' },
  stepCopy: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  note: { padding: 16, borderRadius: 8, backgroundColor: colors.copperTint, borderWidth: 1, borderColor: colors.copper, gap: 4 },
  noteTitle: { color: colors.copper, fontSize: 12, fontWeight: '900' },
  noteCopy: { color: colors.cream, fontSize: 12, lineHeight: 18 },
  error: { color: colors.copper, fontSize: 11, fontWeight: '800' },
});

