import { technicianServiceTypes } from '@/shared/contracts';
import { formatMoney } from '@/shared/domain';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell } from '@/components/portal-ui';
import { getCustomerAddresses, getNearbyContractors } from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useAppTheme } from '@/theme/theme-context';
import type { ThemeColors } from '@/shared/design-tokens';

export default function NearbyServicesScreen() {
  const params = useLocalSearchParams<{ serviceType?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { user, token } = useAuth();
  const [area, setArea] = useState('');
  const [trade, setTrade] = useState(params.serviceType ?? '');
  const [radius, setRadius] = useState('15');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [profileLocationApplied, setProfileLocationApplied] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<{ area?: string; serviceType?: string; latitude?: number; longitude?: number; nearbyOnly: boolean; radiusKm: number }>({ ...(params.serviceType ? { serviceType: params.serviceType } : {}), nearbyOnly: true, radiusKm: 15 });
  const addresses = useQuery({ queryKey: ['customer-addresses', user?.id], queryFn: () => getCustomerAddresses(token!), enabled: user?.role === 'CUSTOMER' && Boolean(token) });
  const nearby = useQuery({ queryKey: ['services', 'nearby', filter], queryFn: () => getNearbyContractors(filter) });
  const selectedAddress = addresses.data?.find((item) => item.id === selectedAddressId);
  const serviceOptions = useMemo(() => Array.from(new Set([...technicianServiceTypes, ...(nearby.data?.flatMap((technician) => technician.services.map((service) => service.serviceType)) ?? [])])), [nearby.data]);

  useEffect(() => {
    const preferred = addresses.data?.find((item) => item.isDefault) ?? addresses.data?.[0];
    if (preferred && !selectedAddressId) useAddress(preferred.id);
  }, [addresses.data, selectedAddressId]);

  useEffect(() => {
    const profileLocation = user?.role === 'CUSTOMER' ? user.customerLocation?.trim() : undefined;
    if (!profileLocation || profileLocationApplied || selectedAddressId || area.trim()) return;
    setArea(profileLocation);
    setFilter((current) => ({ ...current, area: profileLocation }));
    setProfileLocationApplied(true);
  }, [area, profileLocationApplied, selectedAddressId, user?.customerLocation, user?.role]);

  function search(location?: { latitude: number; longitude: number }) {
    const distance = Number(radius);
    if (!Number.isFinite(distance) || distance <= 0 || distance > 500) { setError('Radius must be between 1 and 500 km.'); return; }
    setError('');
    setFilter({ ...(area.trim() ? { area: area.trim() } : {}), ...(trade.trim() ? { serviceType: trade.trim() } : {}), ...location, nearbyOnly: true, radiusKm: distance });
  }
  function useAddress(id: string) {
    const address = addresses.data?.find((item) => item.id === id);
    if (!address) return;
    const distance = Number(radius);
    if (!Number.isFinite(distance) || distance <= 0 || distance > 500) { setError('Radius must be between 1 and 500 km.'); return; }
    setSelectedAddressId(id); setArea(address.city); setError('');
    setFilter({ ...(trade.trim() ? { serviceType: trade.trim() } : {}), area: address.city, ...(address.latitude !== undefined && address.longitude !== undefined ? { latitude: address.latitude, longitude: address.longitude } : {}), nearbyOnly: true, radiusKm: distance });
  }
  function selectService(serviceType: string) {
    setTrade(serviceType);
    setFilter((current) => ({ ...current, serviceType, nearbyOnly: true }));
  }
  function clearService() {
    setTrade('');
    setFilter((current) => {
      const { serviceType: _serviceType, ...withoutService } = current;
      return withoutService;
    });
  }
  function locate() {
    if (Platform.OS !== 'web' || !navigator.geolocation) { setError('Location is unavailable here. Use your saved address or search by area.'); return; }
    navigator.geolocation.getCurrentPosition((position) => search({ latitude: position.coords.latitude, longitude: position.coords.longitude }), () => setError('Location permission was not available. You can search by area.'), { timeout: 10000 });
  }
  return <PortalShell eyebrow="NEARBY TECHNICIANS" title="Find a nearby specialist for your service." copy="Choose a service, then combine it with your saved address, area, or current location. Results must provide that service and match the selected location." includeSignOut={false} actions={<><PortalButton label="Explore all technicians" secondary onPress={() => router.push('/services')} /><PortalButton label="View my request" onPress={() => router.push('/services/bookings')} /></>}>
    {user?.role === 'CUSTOMER' ? <PortalCard title="Search from a saved address" copy="Your signup location is used first. A saved address can give the service search a more precise priority."><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{addresses.isLoading ? <Text style={{ color: colors.muted }}>Loading saved addresses…</Text> : addresses.data?.length ? addresses.data.map((address) => <PortalButton key={address.id} label={`${address.label}: ${address.city}${address.isDefault ? ' (default)' : ''}`} secondary={selectedAddressId !== address.id} onPress={() => useAddress(address.id)} />) : <Text style={{ color: colors.muted }}>{user.customerLocation ? `Using your signup location: ${user.customerLocation}. Add an address when booking for more precise results.` : 'No address saved yet. You can add one in the service request form.'}</Text>}</View>{selectedAddress ? <Text style={{ color: colors.cream }}>Using {selectedAddress.line1}, {selectedAddress.city}</Text> : null}</PortalCard> : null}
    <PortalCard title="Choose a service" copy="Only technicians who provide the selected service appear in these nearby results."><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><PortalButton label="All services" secondary={Boolean(trade)} onPress={clearService} />{serviceOptions.map((serviceType) => <Pressable key={serviceType} accessibilityRole="radio" accessibilityState={{ checked: trade.toLowerCase() === serviceType.toLowerCase() }} onPress={() => selectService(serviceType)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 6, borderColor: trade.toLowerCase() === serviceType.toLowerCase() ? colors.teal : colors.line, backgroundColor: trade.toLowerCase() === serviceType.toLowerCase() ? colors.tealTint : colors.surfaceSunken }}><Text style={{ color: trade.toLowerCase() === serviceType.toLowerCase() ? colors.teal : colors.cream, fontWeight: '800' }}>{serviceType}</Text></Pressable>)}</View></PortalCard>
    <PortalCard title="Search technicians"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{[['Area or city', area, setArea], ['Service type (custom)', trade, setTrade], ['Radius (km)', radius, setRadius]].map(([label, value, setter]) => <TextInput key={String(label)} accessibilityLabel={String(label)} placeholder={String(label)} placeholderTextColor={colors.muted} value={String(value)} onChangeText={setter as (value: string) => void} style={{ padding: 12, borderWidth: 1, borderColor: colors.line, color: colors.cream, minWidth: 180 }} />)}</View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><PortalButton label="Search area" onPress={() => search()} />{Platform.OS === 'web' ? <PortalButton label="Use my location" secondary onPress={locate} /> : null}</View>{error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}</PortalCard>
    {nearby.isLoading ? <PortalCard copy="Searching technicians…" /> : nearby.isError ? <PortalCard copy={nearby.error.message}><PortalButton label="Retry search" onPress={() => void nearby.refetch()} /></PortalCard> : !nearby.data?.length ? <PortalCard title="No specialists found" copy="Try another area, a different service, or a wider radius." /> : null}
    {nearby.data?.map((technician) => {
      const matchingServices = technician.services.filter((service) => !filter.serviceType || matchesRequestedService(service.serviceType, filter.serviceType));
      // The API already applies the electrician-family match. Keep its returned
      // service visible if a legacy label differs from the client-side alias list.
      const services = matchingServices.length || !filter.serviceType?.toLowerCase().includes('electrician') ? matchingServices : technician.services;
      const initials = technician.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
      const availabilityStyle = technician.availability === 'AVAILABLE' ? styles.availabilityAvailable : technician.availability === 'BUSY' ? styles.availabilityBusy : styles.availabilityOffline;
      return <View key={technician.id} style={styles.technicianCard}>
        <View style={styles.cardAccent} />
        <View style={styles.technicianHeader}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.identity}>
            <Text style={styles.technicianName}>{technician.name}</Text>
            <Text style={styles.verifiedLabel}>Verified service professional</Text>
          </View>
          <View style={[styles.availability, availabilityStyle]}><View style={[styles.availabilityDot, technician.availability === 'BUSY' ? styles.availabilityDotBusy : technician.availability === 'OFFLINE' ? styles.availabilityDotOffline : styles.availabilityDotAvailable]} /><Text style={[styles.availabilityText, technician.availability === 'BUSY' ? styles.availabilityTextBusy : technician.availability === 'OFFLINE' ? styles.availabilityTextOffline : styles.availabilityTextAvailable]}>{technician.availability === 'AVAILABLE' ? 'Available' : technician.availability.toLowerCase()}</Text></View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}><Text style={styles.metaChipIcon}>⌖</Text><Text style={styles.metaChipText}>{technician.serviceArea ?? 'Service area not set'}</Text></View>
          <View style={styles.metaChip}><Text style={styles.metaChipIcon}>◌</Text><Text style={styles.metaChipText}>{technician.distanceKm === undefined ? 'Distance unavailable' : `${technician.distanceKm} km away`}</Text></View>
          {technician.experienceYears !== undefined ? <View style={styles.metaChip}><Text style={styles.metaChipIcon}>★</Text><Text style={styles.metaChipText}>{technician.experienceYears} years experience</Text></View> : null}
        </View>

        <View style={styles.matchBanner}><Text style={styles.matchBannerIcon}>✓</Text><Text style={styles.matchBannerText}>{filter.latitude !== undefined || filter.area ? 'Nearby service match' : 'Available service match'}</Text></View>

        <View style={styles.servicesList}>
          {services.length ? services.map((service) => <View key={service.id} style={styles.serviceItem}>
            <View style={styles.serviceDetails}>
              <View style={styles.serviceIcon}><Text style={styles.serviceIconText}>⚒</Text></View>
              <View style={styles.serviceCopy}>
                <Text style={styles.serviceName}>{service.serviceType}</Text>
                <Text style={styles.serviceDescription}>{service.description ?? 'Professional service for your project'}</Text>
              </View>
              <View style={styles.visitPrice}><Text style={styles.visitLabel}>VISIT FROM</Text><Text style={styles.visitAmount}>{formatMoney(service.visitChargeInPaise)}</Text></View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Request ${service.serviceType} from ${technician.name}`}
              onPress={() => user?.role === 'CUSTOMER' ? router.push({ pathname: '/services/booking', params: { contractorId: technician.id, serviceType: service.serviceType } }) : router.push('/customer/login')}
              style={({ pressed }) => [styles.requestButton, pressed && styles.pressed]}
            >
              <Text style={styles.requestButtonText}>Request this service</Text>
              <Text style={styles.requestButtonArrow}>→</Text>
            </Pressable>
          </View>) : <Text style={styles.noServiceText}>No details available for this service yet.</Text>}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View profile and prices for ${technician.name}`}
          onPress={() => router.push({ pathname: '/services/booking', params: { contractorId: technician.id } })}
          style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
        >
          <Text style={styles.profileButtonText}>View profile and prices</Text>
          <Text style={styles.profileButtonArrow}>↗</Text>
        </Pressable>
      </View>;
    })}
  </PortalShell>;
}

function matchesRequestedService(serviceType: string, requestedServiceType: string) {
  const service = serviceType.trim().toLowerCase();
  const requested = requestedServiceType.trim().toLowerCase();
  return service === requested || (requested.includes('electrician') && ['electrician', 'electrical', 'wiring'].some((term) => service.includes(term)));
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  technicianCard: { overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 3 },
  cardAccent: { height: 4, backgroundColor: colors.cta },
  technicianHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealTint, borderWidth: 1, borderColor: colors.teal },
  avatarText: { color: colors.teal, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  technicianName: { color: colors.cream, fontSize: 18, fontWeight: '900' },
  verifiedLabel: { color: colors.muted, fontSize: 11.5, fontWeight: '600' },
  availability: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  availabilityAvailable: { borderColor: colors.success, backgroundColor: colors.successTint },
  availabilityBusy: { borderColor: colors.copper, backgroundColor: colors.copperTint },
  availabilityOffline: { borderColor: colors.line, backgroundColor: colors.surfaceSunken },
  availabilityDot: { width: 6, height: 6, borderRadius: 3 },
  availabilityDotAvailable: { backgroundColor: colors.success },
  availabilityDotBusy: { backgroundColor: colors.copper },
  availabilityDotOffline: { backgroundColor: colors.muted },
  availabilityText: { fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  availabilityTextAvailable: { color: colors.success },
  availabilityTextBusy: { color: colors.copper },
  availabilityTextOffline: { color: colors.muted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 20, paddingTop: 16 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceSunken },
  metaChipIcon: { color: colors.teal, fontSize: 12, fontWeight: '900' },
  metaChipText: { color: colors.muted, fontSize: 10.5, fontWeight: '700' },
  matchBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 20, marginTop: 16, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.tealTint },
  matchBannerIcon: { color: colors.teal, fontSize: 14, fontWeight: '900' },
  matchBannerText: { color: colors.teal, fontSize: 11.5, fontWeight: '800' },
  servicesList: { marginHorizontal: 20, marginTop: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' },
  serviceItem: { padding: 14, gap: 12, backgroundColor: colors.surfaceRaised },
  serviceDetails: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.copperTint },
  serviceIconText: { color: colors.cta, fontSize: 18 },
  serviceCopy: { flex: 1, minWidth: 0, gap: 3 },
  serviceName: { color: colors.cream, fontSize: 13.5, fontWeight: '900' },
  serviceDescription: { color: colors.muted, fontSize: 10.5, lineHeight: 15 },
  visitPrice: { alignItems: 'flex-end', gap: 2 },
  visitLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  visitAmount: { color: colors.cta, fontSize: 16, fontWeight: '900' },
  requestButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9, backgroundColor: colors.cta },
  requestButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  requestButtonArrow: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  profileButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 20, marginTop: 14, borderRadius: 9, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  profileButtonText: { color: colors.cream, fontSize: 12, fontWeight: '900' },
  profileButtonArrow: { color: colors.teal, fontSize: 16, fontWeight: '800' },
  noServiceText: { color: colors.muted, fontSize: 12, padding: 14 },
  pressed: { opacity: 0.72 },
});

