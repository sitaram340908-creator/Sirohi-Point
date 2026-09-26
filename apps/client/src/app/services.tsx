import { technicianServiceTypes } from '@/shared/contracts';
import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { calculatePaintEstimate, formatMoney } from '@/shared/domain';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ScreenHeading } from '@/components/screen-heading';
import { getNearbyContractors } from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useThemedStyles } from '@/theme/theme-context';

export default function ServicesScreen() {
  const params = useLocalSearchParams<{ service?: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const { user } = useAuth();
  const customerLocation = user?.role === 'CUSTOMER' ? user.customerLocation?.trim() : undefined;
  const serviceNetwork = useQuery({
    queryKey: ['services', 'nearby', 'all', customerLocation],
    queryFn: () => getNearbyContractors({ radiusKm: 15, ...(customerLocation ? { area: customerLocation } : {}) }),
  });
  const serviceOptions = useMemo(() => {
    const options = new Map<string, { id: string; name: string; count: number }>(technicianServiceTypes.map((name) => [name.toLowerCase(), { id: name.toLowerCase(), name, count: 0 }]));
    const counts = new Map<string, number>();
    serviceNetwork.data?.forEach((contractor) => {
      const contractorServices = new Set<string>();
      contractor.services.forEach((service) => {
        const name = service.serviceType.trim();
        const id = getServiceOptionId(name);
        if (contractorServices.has(id)) return;
        contractorServices.add(id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
        if (!options.has(id)) options.set(id, { id, name, count: 0 });
      });
    });
    counts.forEach((count, id) => {
      const service = options.get(id);
      if (service) options.set(id, { ...service, count });
    });
    return Array.from(options.values());
  }, [serviceNetwork.data]);
  const [selectedService, setSelectedService] = useState(params.service?.toLowerCase() ?? '');
  const selectedServiceName = serviceOptions.find((service) => service.id === selectedService)?.name ?? selectedService;
  const showPaintCalculator = /paint|painter|waterproof|texture|color/.test(selectedServiceName.toLowerCase());
  const exploreResults = useQuery({
    queryKey: ['services', 'explore', selectedServiceName],
    queryFn: () => getNearbyContractors({ serviceType: selectedServiceName, radiusKm: 15 }),
    enabled: Boolean(selectedServiceName),
  });

  useEffect(() => {
    if (!selectedService && serviceOptions[0]) setSelectedService(serviceOptions[0].id);
  }, [selectedService, serviceOptions]);

  return (
    <AppShell>
      <View style={styles.nearbyHero}>
        <View style={styles.nearbyHeroInner}>
          <View style={[styles.nearbyHeroTop, compact && styles.heroTopCompact]}>
            <ScreenHeading
              eyebrow="NEARBY TECHNICIANS"
              title="Find a nearby specialist for your service."
              copy="Choose a service, then combine it with your saved address, area, or current location. Results must provide that service and match the selected location."
              inverse
            />
            <View style={[styles.nearbyHeroActions, compact && styles.nearbyHeroActionsCompact]}>
              <Pressable style={styles.nearbyHeroButton} onPress={() => router.push('/services/nearby')}>
                <Text style={styles.nearbyHeroButtonText}>Explore technicians by location →</Text>
              </Pressable>
              <Pressable style={styles.nearbyHeroButton} onPress={() => router.push('/services/bookings')}>
                <Text style={styles.nearbyHeroButtonText}>View my request</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroInner}>
          <View style={[styles.heroTop, compact && styles.heroTopCompact]}>
            <ScreenHeading
              eyebrow="VERIFIED SERVICE NETWORK"
              title="Book the expert who completes the job."
              copy="Choose the trade, confirm the requirement, select an available visit, and track the work from one service order."
            />
            <View style={styles.networkBadge}>
              <View style={styles.liveDot} />
              <View><Text style={styles.networkLabel}>NETWORK ONLINE</Text><Text style={styles.networkValue}>{serviceNetwork.data?.length ?? 0} approved specialists available</Text></View>
            </View>
          </View>
          <View style={styles.serviceGrid}>
            {serviceNetwork.isLoading ? <Text style={styles.contractorMeta}>Loading service types from approved contractor profiles…</Text> : null}
            {serviceNetwork.isError ? <Text style={styles.contractorMeta}>Unable to load service types from the backend.</Text> : null}
            {!serviceNetwork.isLoading && !serviceNetwork.isError && !serviceOptions.length ? <Text style={styles.contractorMeta}>No approved service types are available yet.</Text> : null}
            {serviceOptions.map((service) => (
              <Pressable
                key={service.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedService === service.id }}
                onPress={() => {
                  setSelectedService(service.id);
                }}
                style={({ pressed }) => [
                  styles.serviceCard,
                  compact && styles.serviceCardCompact,
                  selectedService === service.id && styles.serviceCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceCopy}>{service.count} approved specialist{service.count === 1 ? '' : 's'} in the network</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {showPaintCalculator ? <PaintCalculator compact={compact} styles={styles} /> : null}
        <View style={styles.discoveryResults}>
          <Text style={styles.discoveryTitle}>Explore technicians{selectedServiceName ? ` for ${selectedServiceName}` : ''}</Text>
          <Text style={styles.contractorMeta}>Every result below is an approved, available technician who provides the selected service.</Text>
          {exploreResults.isLoading ? <Text style={styles.contractorMeta}>Finding technicians for this service…</Text> : null}
          {exploreResults.isError ? <Text style={styles.contractorMeta}>Technicians could not be loaded. Please try again.</Text> : null}
          {!exploreResults.isLoading && !exploreResults.isError && !exploreResults.data?.length ? <Text style={styles.contractorMeta}>No available technicians currently provide this service. Choose another service or check nearby options later.</Text> : null}
          <View style={styles.technicianList}>{exploreResults.data?.map((technician) => {
            const matchingServices = technician.services.filter((service) => matchesServiceOption(service.serviceType, selectedServiceName));
            const initials = technician.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
            return   <View key={technician.id} style={styles.technicianCard}>
  {/* Header */}
  <View style={styles.technicianHeader}>
    <View style={styles.technicianAvatarRing}>
      <View style={styles.technicianAvatar}>
        <Text style={styles.technicianAvatarText}>{initials}</Text>
      </View>
    </View>

    <View style={styles.technicianIdentity}>
      <Text style={styles.technicianName} numberOfLines={1}>{technician.name}</Text>
      <Text style={styles.technicianArea} numberOfLines={1}>
        {technician.serviceArea || 'Service area shared on request'}
      </Text>
    </View>

    <View style={styles.technicianOnline}>
      <View style={styles.technicianOnlineDot} />
      <Text style={styles.technicianOnlineText}>AVAILABLE</Text>
    </View>
  </View>

  {/* Stats */}
  <View style={styles.technicianStats}>
    <View style={styles.technicianStat}>
      <Text style={styles.technicianStatValue}>★ {technician.rating.toFixed(1)}</Text>
      <Text style={styles.technicianStatLabel}>RATING</Text>
    </View>
    <View style={styles.technicianStatDivider} />
    <View style={styles.technicianStat}>
      <Text style={styles.technicianStatValue}>
        {technician.experienceYears === undefined ? '—' : `${technician.experienceYears}y`}
      </Text>
      <Text style={styles.technicianStatLabel}>EXPERIENCE</Text>
    </View>
    <View style={styles.technicianStatDivider} />
    <View style={styles.technicianStat}>
      <Text style={styles.technicianStatValue}>{matchingServices.length}</Text>
      <Text style={styles.technicianStatLabel}>SERVICE MATCH</Text>
    </View>
  </View>

  {/* Matching services */}
  {matchingServices.map((service) => (
    <View key={service.id} style={styles.technicianService}>
      <View style={styles.technicianServiceHeader}>
        <Text style={styles.technicianServiceName}>{service.serviceType}</Text>
        <View style={styles.technicianPriceChip}>
          <Text style={styles.technicianServicePrice}>Visit {formatMoney(service.visitChargeInPaise)}</Text>
        </View>
      </View>

      {service.description ? (
        <Text style={styles.technicianDescription}>{service.description}</Text>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.technicianButton, pressed && styles.technicianButtonPressed]}
        onPress={() =>
          router.push({
            pathname: '/services/booking' as never,
            params: { contractorId: technician.id, serviceType: service.serviceType },
          })
        }
      >
        <Text style={styles.technicianButtonText}>Request this service</Text>
      </Pressable>
    </View>
  ))}

  {/* Profile CTA */}
  <Pressable
    style={({ pressed }) => [styles.profileButton, pressed && styles.profileButtonPressed]}
    onPress={() => router.push({ pathname: '/services/booking' as never, params: { contractorId: technician.id } })}
  >
    <Text style={styles.profileButtonText}>View full profile and prices →</Text>
  </Pressable>
</View>






            // <View key={technician.id} style={styles.technicianCard}>
            //   <View style={styles.technicianHeader}>
            //     <View style={styles.technicianAvatar}><Text style={styles.technicianAvatarText}>{initials}</Text></View>
            //     <View style={styles.technicianIdentity}><Text style={styles.technicianName}>{technician.name}</Text><Text style={styles.technicianArea} numberOfLines={1}>{technician.serviceArea || 'Service area shared on request'}</Text></View>
            //     <View style={styles.technicianOnline}><View style={styles.technicianOnlineDot} /><Text style={styles.technicianOnlineText}>AVAILABLE</Text></View>
            //   </View>
            //   <View style={styles.technicianStats}><View style={styles.technicianStat}><Text style={styles.technicianStatValue}>★ {technician.rating.toFixed(1)}</Text><Text style={styles.technicianStatLabel}>RATING</Text></View><View style={styles.technicianStatDivider} /><View style={styles.technicianStat}><Text style={styles.technicianStatValue}>{technician.experienceYears === undefined ? '—' : `${technician.experienceYears}y`}</Text><Text style={styles.technicianStatLabel}>EXPERIENCE</Text></View><View style={styles.technicianStatDivider} /><View style={styles.technicianStat}><Text style={styles.technicianStatValue}>{matchingServices.length}</Text><Text style={styles.technicianStatLabel}>SERVICE MATCH</Text></View></View>
            //   {matchingServices.map((service) => <View key={service.id} style={styles.technicianService}><View style={styles.technicianServiceHeader}><Text style={styles.technicianServiceName}>{service.serviceType}</Text><Text style={styles.technicianServicePrice}>Visit {formatMoney(service.visitChargeInPaise)}</Text></View>{service.description ? <Text style={styles.technicianDescription}>{service.description}</Text> : null}<Pressable style={styles.technicianButton} onPress={() => router.push({ pathname: '/services/booking' as never, params: { contractorId: technician.id, serviceType: service.serviceType } })}><Text style={styles.technicianButtonText}>Request this service</Text></Pressable></View>)}
            //   <Pressable style={styles.profileButton} onPress={() => router.push({ pathname: '/services/booking' as never, params: { contractorId: technician.id } })}><Text style={styles.profileButtonText}>View full profile and prices →</Text></Pressable>
            // </View>


            ;
          })}</View>
        </View>
      </View>
    </AppShell>
  );
}

function getServiceOptionId(serviceType: string) {
  const normalized = serviceType.trim().toLowerCase();
  return ['electrician', 'electrical', 'wiring'].some((term) => normalized.includes(term))
    ? technicianServiceTypes[0].toLowerCase()
    : normalized;
}

function matchesServiceOption(serviceType: string, selectedServiceType: string) {
  return getServiceOptionId(serviceType) === getServiceOptionId(selectedServiceType);
}

function PaintCalculator({ compact, styles }: { compact: boolean; styles: ReturnType<typeof createStyles> }) {
  const [widthFeet, setWidthFeet] = useState('12');
  const [heightFeet, setHeightFeet] = useState('10');
  const [coats, setCoats] = useState(2);
  const estimate = useMemo(() => calculatePaintEstimate({
    widthFeet: Number(widthFeet) || 0,
    heightFeet: Number(heightFeet) || 0,
    coats,
  }), [coats, heightFeet, widthFeet]);

  return (
    <View style={styles.calculatorCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}><Text style={styles.cardIconText}>P</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardEyebrow}>PAINT PLANNER</Text>
          <Text style={[styles.cardTitle, compact && { fontSize: 23, lineHeight: 28 }]}>Estimate your paint</Text>
        </View>
      </View>
      <Text style={styles.cardCopy}>Enter the wall size and number of coats to estimate coverage, litres, and an indicative paint cost.</Text>
      <View style={styles.formRow}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Width (ft)</Text>
          <TextInput accessibilityLabel="Wall width in feet" value={widthFeet} onChangeText={setWidthFeet} keyboardType="decimal-pad" placeholder="12" placeholderTextColor={styles.contractorMeta.color} style={styles.input} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Height (ft)</Text>
          <TextInput accessibilityLabel="Wall height in feet" value={heightFeet} onChangeText={setHeightFeet} keyboardType="decimal-pad" placeholder="10" placeholderTextColor={styles.contractorMeta.color} style={styles.input} />
        </View>
      </View>
      <View>
        <Text style={styles.fieldLabel}>Number of coats</Text>
        <View style={styles.coatRow}>
          {[1, 2, 3].map((value) => (
            <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: coats === value }} onPress={() => setCoats(value)} style={[styles.coatButton, coats === value && styles.coatActive]}>
              <Text style={[styles.coatText, coats === value && styles.coatTextActive]}>{value} coat{value > 1 ? 's' : ''}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.results}>
        <View style={styles.result}><Text style={styles.resultValue}>{estimate.areaSquareFeet.toLocaleString('en-IN')}</Text><Text style={styles.resultLabel}>Area (sq ft)</Text></View>
        <View style={styles.result}><Text style={styles.resultValue}>{estimate.litres} L</Text><Text style={styles.resultLabel}>Paint needed</Text></View>
        <View style={styles.result}><Text style={styles.resultValue}>{formatMoney(estimate.estimatedCostInPaise)}</Text><Text style={styles.resultLabel}>Estimated cost</Text></View>
      </View>
      <View style={styles.estimateNote}><Text style={styles.estimateNoteIcon}>i</Text><Text style={styles.estimateNoteText}>Based on 95 sq ft per litre with 10% extra for touch-ups. Actual coverage varies by surface and paint.</Text></View>
    </View>
  );
}


const COLORS = {
  card: '#FFFFFF',
  surfaceMuted: '#F6F7FB',
  border: '#EDEEF3',
  divider: '#E5E7EE',
  textPrimary: '#12141A',
  textSecondary: '#666B78',
  textMuted: '#9AA1AC',
  accent: '#4F46E5',
  accentSoft: '#EEF0FE',
  accentBorder: '#D9DBFB',
  success: '#16A34A',
  successSoft: '#E9F9EE',
};

const styles = StyleSheet.create({

});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  nearbyHero: { paddingHorizontal: spacing.lg, backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: colors.line },
  nearbyHeroInner: { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingVertical: spacing.xl },
  nearbyHeroTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  heroTopCompact: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: spacing.md },
  nearbyHeroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  nearbyHeroActionsCompact: { width: '100%', flexDirection: 'column', alignItems: 'stretch' },
  nearbyHeroButton: { minHeight: 46, minWidth: 0, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.copper, alignItems: 'center', justifyContent: 'center' },
  nearbyHeroButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  hero: { paddingHorizontal: spacing.lg, paddingVertical: spacing.section, backgroundColor: colors.surfaceSunken, borderBottomWidth: 1, borderBottomColor: colors.line },
  heroInner: { width: '100%', maxWidth: 1240, alignSelf: 'center', gap: spacing.xxl },
  heroTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing.xl },
  networkBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  networkLabel: { color: colors.success, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  networkValue: { color: colors.cream, fontSize: 14, fontWeight: '900', marginTop: 3 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md },
  serviceCard: { alignSelf: 'flex-start', minWidth: 180, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  serviceCardCompact: { width: '48%', minWidth: 0 },
  serviceCardActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  serviceName: { color: colors.cream, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  serviceCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.section },
  columns: { gap: spacing.xl },
  columnsDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  calculatorCard: { flex: 1.05, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, gap: spacing.md },
  bookingCard: { flex: 0.95, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, gap: spacing.lg, shadowColor: colors.shadow, shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  cardIconText: { color: colors.teal, fontSize: 23 },
  cardEyebrow: { color: colors.teal, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  cardTitle: { color: colors.cream, fontSize: 27, lineHeight: 31, fontWeight: '900', marginTop: 3 },
  cardCopy: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  formRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  field: { flexGrow: 1, flexBasis: 180, gap: spacing.sm },
  fieldLabel: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '900', marginBottom: spacing.sm },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 16, fontWeight: '900', paddingHorizontal: spacing.md },
  coatRow: { flexDirection: 'row', gap: spacing.sm },
  coatButton: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  coatActive: { backgroundColor: colors.copper, borderColor: colors.copper },
  coatText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  coatTextActive: { color: '#FFFFFF' },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  result: { flexGrow: 1, flexBasis: 130, minHeight: 96, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.line, padding: spacing.md, justifyContent: 'center' },
  resultValue: { color: colors.brass, fontSize: 19, fontWeight: '900' },
  resultLabel: { color: colors.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
  estimateNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tealTint },
  estimateNoteIcon: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', textAlignVertical: 'center', color: colors.teal, borderWidth: 1, borderColor: colors.teal, fontSize: 10, fontWeight: '900' },
  estimateNoteText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  outlineButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.brass },
  outlineButtonText: { color: colors.brass, fontSize: 13, fontWeight: '900' },
  primaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.copper, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bookedButton: { backgroundColor: colors.success },
  availability: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  availabilityText: { color: colors.success, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  contractor: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.tealTint, borderWidth: 1, borderColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.teal, fontSize: 18, fontWeight: '900' },
  contractorBody: { flex: 1 },
  contractorName: { color: colors.cream, fontSize: 18, fontWeight: '900' },
  contractorMeta: { color: colors.muted, fontSize: 13, marginTop: 3 },
  noSpecialist: { padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, gap: spacing.xs },
  ratingRow: { flexDirection: 'row', marginTop: 6 },
  rating: { color: colors.brass, fontSize: 11, fontWeight: '900' },
  ratingMeta: { color: colors.muted, fontSize: 11 },
  verified: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.successTint, alignItems: 'center', justifyContent: 'center' },
  verifiedText: { color: colors.success, fontSize: 11, fontWeight: '900' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choiceButton: { flexGrow: 1, minHeight: 42, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  choiceActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  choiceText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  choiceTextActive: { color: colors.teal },
  timeline: { gap: spacing.md },
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  timelineNumber: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  timelineNumberActive: { backgroundColor: colors.successTint, borderColor: colors.success },
  timelineNumberText: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  timelineNumberTextActive: { color: colors.success },
  timelineBody: { flex: 1 },
  timelineTitle: { color: colors.cream, fontSize: 14, fontWeight: '900' },
  timelineCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  bookingSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md },
  bookingSummaryLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  bookingSummaryValue: { color: colors.cream, fontSize: 22, fontWeight: '900', marginTop: 3 },
  bookingSummaryMeta: { color: colors.muted, fontSize: 11 },
  bookingNote: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  discoveryResults: { gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  discoveryTitle: { color: colors.cream, fontSize: 22, fontWeight: '900' },
  technicianList: { gap: spacing.md },
  // technicianCard: { gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  // technicianName: { color: colors.cream, fontSize: 16, fontWeight: '900' },
  // technicianService: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
  technicianServiceText: { color: colors.cream, fontSize: 13, fontWeight: '800' },
  // technicianDescription: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  // technicianButton: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.cta },
  // technicianButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  // profileButton: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  // profileButtonText: { color: colors.cream, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.72 },







  technicianCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  technicianHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  technicianAvatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 3,
    backgroundColor: colors.copperTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  technicianAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  technicianAvatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  technicianIdentity: {
    flex: 1,
    marginRight: 10,
  },
  technicianName: {
    fontSize: 16.5,
    fontWeight: '700',
    color: colors.cream,
    marginBottom: 3,
  },
  technicianArea: {
    fontSize: 12.5,
    color: colors.muted,
  },
  technicianOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  technicianOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  technicianOnlineText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.success,
  },
  technicianStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  technicianStat: {
    flex: 1,
    alignItems: 'center',
  },
  technicianStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cream,
    marginBottom: 3,
  },
  technicianStatLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.muted,
  },
  technicianStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.line,
  },
  technicianService: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  technicianServiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  technicianServiceName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.cream,
    flexShrink: 1,
    marginRight: 8,
  },
  technicianPriceChip: {
    backgroundColor: colors.copperTint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  technicianServicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cta,
  },
  technicianDescription: {
    fontSize: 12.5,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  technicianButton: {
    backgroundColor: colors.cta,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  technicianButtonPressed: {
    opacity: 0.85,
  },
  technicianButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  profileButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  profileButtonPressed: {
    backgroundColor: colors.copperTint,
  },
  profileButtonText: {
    color: colors.cta,
    fontSize: 13.5,
    fontWeight: '700',
  },


});

