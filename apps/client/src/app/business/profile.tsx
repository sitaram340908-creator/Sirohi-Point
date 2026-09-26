import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ThemeColors } from '@/shared/design-tokens';
import { StyleSheet, Text, View } from 'react-native';
import { BusinessAddressManager } from '@/components/business/business-address-manager';
import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/business/business-ui';
import { getBusinessProfile, getCustomerAddresses } from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useBusinessStyles } from '@/theme/business-theme';

export default function BusinessProfileScreen() {
  const router = useRouter();
  const styles = useBusinessStyles(createStyles);
  const { token, user } = useAuth();
  const profile = useQuery({ queryKey: ['auth', 'business-profile', user?.id], queryFn: () => getBusinessProfile(token!), enabled: user?.role === 'BUSINESS' && Boolean(token) });
  const addresses = useQuery({ queryKey: ['business-addresses', user?.id], queryFn: () => getCustomerAddresses(token!), enabled: user?.role === 'BUSINESS' && Boolean(token) });
  return <PortalShell eyebrow="YOUR BUSINESS ACCOUNT" title="All your details, in one place." copy="Your business identity, billing details, and delivery information." actions={<PortalButton label="Continue shopping →" onPress={() => router.push('/business/catalog')} />}>
    {profile.isLoading ? <PortalCard title="Getting your account ready…" copy="Loading your business details." /> : null}
    {profile.isError ? <PortalCard title="Your details could not be loaded" copy="Please try again to view your business account."><PortalButton label="Try again" onPress={() => void profile.refetch()} /></PortalCard> : null}
    {profile.data ? <><View style={styles.identity}><View style={styles.avatar}><Text style={styles.initial}>{profile.data.businessName.trim().charAt(0).toUpperCase() || 'B'}</Text></View><View style={styles.identityBody}><Text style={styles.eyebrow}>SIROHI POINT BUSINESS</Text><Text style={styles.businessName}>{profile.data.businessName}</Text><Text style={styles.owner}>{user?.name} · {user?.email}</Text></View><StatusBadge label={profile.data.approvalStatus} tone={profile.data.approvalStatus === 'APPROVED' ? 'success' : profile.data.approvalStatus === 'REJECTED' ? 'danger' : 'warning'} /></View>
      <View style={styles.columns}><PortalCard style={styles.detailCard} title="Business details" copy="The identity linked to your wholesale account."><Detail label="Registered business" value={profile.data.businessName} /><Detail label="Business type" value={profile.data.businessType ?? 'Not provided'} /><Detail label="GSTIN" value={profile.data.gstin ?? 'Not provided'} /><Detail label="Account holder" value={user?.name ?? 'Not provided'} /><Detail label="Email address" value={user?.email ?? 'Not provided'} /></PortalCard></View>
      {user && token ? <BusinessAddressManager user={user} token={token} addresses={addresses.data ?? []} loading={addresses.isLoading} onChanged={() => addresses.refetch()} /> : null}
      <View style={styles.next}><View style={{ flex: 1, minWidth: 200, gap: 6 }}><Text style={styles.nextTitle}>Ready for your next restock?</Text><Text style={styles.nextCopy}>Your wholesale store is just a click away.</Text></View><PortalButton label="Shop wholesale →" onPress={() => router.push('/business/catalog')} /><PortalButton label="View my orders" secondary onPress={() => router.push('/business/orders')} /></View></> : null}
  </PortalShell>;
}
function Detail({ label, value }: { label: string; value: string }) { const styles = useBusinessStyles(createStyles); return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
const createStyles = (c: ThemeColors) => StyleSheet.create({
  identity: { padding: 28, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 }, avatar: { width: 76, height: 76, borderRadius: 22, backgroundColor: c.tealTint, alignItems: 'center', justifyContent: 'center' }, initial: { color: c.teal, fontSize: 32, fontWeight: '800' }, identityBody: { flex: 1, minWidth: 200, gap: 8 }, eyebrow: { color: c.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, businessName: { color: c.cream, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 }, owner: { color: c.muted, fontSize: 13, lineHeight: 21 }, columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 }, detailCard: { flexGrow: 1, flexShrink: 1, flexBasis: 400 }, addressColumn: { flexGrow: 1, flexShrink: 1, flexBasis: 400, gap: 24 }, detail: { paddingVertical: 12, borderTopWidth: 1, borderColor: c.line, gap: 8 }, detailLabel: { color: c.muted, fontSize: 12 }, detailValue: { color: c.cream, fontSize: 15, fontWeight: '600', lineHeight: 23 }, address: { color: c.cream, fontSize: 16, lineHeight: 27 }, helper: { color: c.muted, fontSize: 12, lineHeight: 20 }, next: { padding: 26, borderRadius: 20, backgroundColor: c.tealTint, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }, nextTitle: { color: c.cream, fontSize: 22, fontWeight: '700' }, nextCopy: { color: c.muted, fontSize: 13, lineHeight: 21 },
});

