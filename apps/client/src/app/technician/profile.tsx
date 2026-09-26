import type { ThemeColors } from '@/shared/design-tokens';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/portal-ui';
import { TechnicianAccessGate } from '@/components/technician-access-gate';
import { getContractorProfile, saveContractorProfile } from '@/lib/api';
import { useAppState } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useThemedStyles } from '@/theme/theme-context';

const emptyProfileForm = {
  skills: '', serviceType: '', visitCharge: '', priceFrom: '', priceTo: '',
  serviceArea: '', latitude: '', longitude: '', radius: '', experience: '', bio: '',
};

export default function TechnicianProfileScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { showNotice } = useAppState();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ['services', 'contractor', 'profile', user?.id ?? 'anonymous'], queryFn: () => getContractorProfile(token!), enabled: user?.role === 'CONTRACTOR' && Boolean(token) });
  const [availability, setAvailability] = useState<'AVAILABLE' | 'BUSY' | 'OFFLINE'>('OFFLINE');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyProfileForm);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) {
      setForm(emptyProfileForm);
      setAvailability('OFFLINE');
      return;
    }
    const service = profile.services[0];
    setForm({
      skills: profile.skills.join(', '),
      serviceType: service?.serviceType ?? '',
      visitCharge: service ? String(service.visitChargeInPaise / 100) : '',
      priceFrom: service?.priceFromInPaise === undefined ? '' : String(service.priceFromInPaise / 100),
      priceTo: service?.priceToInPaise === undefined ? '' : String(service.priceToInPaise / 100),
      serviceArea: profile.serviceArea ?? '',
      latitude: profile.latitude === null || profile.latitude === undefined ? '' : String(profile.latitude),
      longitude: profile.longitude === null || profile.longitude === undefined ? '' : String(profile.longitude),
      radius: String(profile.serviceRadiusKm),
      experience: profile.experienceYears === null || profile.experienceYears === undefined ? '' : String(profile.experienceYears),
      bio: profile.bio ?? '',
    });
    setAvailability(profile.availability);
  }, [profileQuery.data]);

  async function save() {
    if (submitting || !profileQuery.data) return;
    if (!user || !token || user.role !== 'CONTRACTOR') { showNotice('Sign in with a technician account before saving your profile.'); return; }
    const numbers = [Number(form.visitCharge), Number(form.priceFrom), Number(form.priceTo), Number(form.radius), Number(form.experience), Number(form.latitude), Number(form.longitude)];
    if (!form.serviceType.trim() || numbers.some((value) => !Number.isFinite(value))) { showNotice('Complete the service profile with valid numbers.'); return; }
    setSubmitting(true);
    try {
      await saveContractorProfile(token, {
        skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        serviceArea: form.serviceArea.trim(), ...(form.latitude.trim() && form.longitude.trim() ? { latitude: Number(form.latitude), longitude: Number(form.longitude) } : {}), serviceRadiusKm: Number(form.radius), ...(form.experience.trim() ? { experienceYears: Number(form.experience) } : {}), bio: form.bio.trim(), availability,
        services: [{ serviceType: form.serviceType.trim(), visitChargeInPaise: Math.round(Number(form.visitCharge) * 100), ...(form.priceFrom.trim() ? { priceFromInPaise: Math.round(Number(form.priceFrom) * 100) } : {}), ...(form.priceTo.trim() ? { priceToInPaise: Math.round(Number(form.priceTo) * 100) } : {}), active: true }, ...profileQuery.data.services.slice(1).map((service) => ({ ...service, active: true }))],
      });
      await queryClient.invalidateQueries({ queryKey: ['services', 'contractor', 'profile', user.id] });
      showNotice('Technician profile saved to the backend.');
    } catch (reason) { showNotice(reason instanceof Error ? reason.message : 'Unable to save technician profile.'); } finally { setSubmitting(false); }
  }

  return <TechnicianAccessGate><PortalShell eyebrow="TECHNICIAN PROFILE" title="Make your service profile discoverable." copy="The profile fields mirror the contractor profile API: skills, area, coordinates, radius, experience, bio, availability, and service prices." actions={<PortalButton label="Main panel" secondary onPress={() => router.push('/technician' as never)} />}>
    <PortalCard title={profileQuery.data?.name ?? 'Professional details'} copy="These values are loaded from your contractor profile in the backend and saved back to the same record.">
      {profileQuery.isLoading ? <Text style={styles.status}>Loading your saved technician profile…</Text> : null}
      {profileQuery.isError ? <Text style={styles.error}>Unable to load your saved profile: {profileQuery.error instanceof Error ? profileQuery.error.message : 'Unknown error'}</Text> : null}
      <Field label="Skills (comma separated)" value={form.skills} onChangeText={(value) => set('skills', value)} styles={styles} />
      <View style={styles.grid}>
        <Field label="Primary service" value={form.serviceType} onChangeText={(value) => set('serviceType', value)} styles={styles} />
        <Field label="Visit charge (₹)" value={form.visitCharge} onChangeText={(value) => set('visitCharge', value)} styles={styles} keyboardType="number-pad" />
        <Field label="Typical price from (₹)" value={form.priceFrom} onChangeText={(value) => set('priceFrom', value)} styles={styles} keyboardType="number-pad" />
        <Field label="Typical price to (₹)" value={form.priceTo} onChangeText={(value) => set('priceTo', value)} styles={styles} keyboardType="number-pad" />
        <Field label="Service area" value={form.serviceArea} onChangeText={(value) => set('serviceArea', value)} styles={styles} />
        <Field label="Service radius (km)" value={form.radius} onChangeText={(value) => set('radius', value)} styles={styles} keyboardType="number-pad" />
        <Field label="Latitude" value={form.latitude} onChangeText={(value) => set('latitude', value)} styles={styles} keyboardType="decimal-pad" />
        <Field label="Longitude" value={form.longitude} onChangeText={(value) => set('longitude', value)} styles={styles} keyboardType="decimal-pad" />
        <Field label="Experience (years)" value={form.experience} onChangeText={(value) => set('experience', value)} styles={styles} keyboardType="number-pad" />
      </View>
      <Field label="Short bio" value={form.bio} onChangeText={(value) => set('bio', value)} styles={styles} multiline />
      <Text style={styles.label}>AVAILABILITY</Text>
      <View style={styles.choiceRow}>{(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((value) => <Pressable key={value} onPress={() => setAvailability(value)} style={[styles.availabilityButton, availability === value && styles.availabilityActive]}><StatusBadge label={value} tone={value === 'AVAILABLE' ? 'success' : value === 'BUSY' ? 'warning' : 'neutral'} /></Pressable>)}</View>
      <PortalButton disabled={submitting || !profileQuery.data || profileQuery.isError} label={submitting ? 'Saving…' : 'Save technician profile'} onPress={() => void save()} />
      {submitting ? <ActivityIndicator color={styles.spinner.color} /> : null}
    </PortalCard>
  </PortalShell></TechnicianAccessGate>;
}

function Field({ label, styles, ...props }: { label: string; styles: ReturnType<typeof createStyles> } & ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} {...props} placeholderTextColor={styles.placeholder.color} style={[styles.input, props.multiline && styles.multiline]} /></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  field: { flexGrow: 1, flexBasis: 220, gap: 6 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  input: { minHeight: 46, paddingHorizontal: 13, borderRadius: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 13 },
  multiline: { minHeight: 94, paddingVertical: 12, textAlignVertical: 'top' },
  placeholder: { color: colors.muted },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  availabilityButton: { borderRadius: 20, borderWidth: 1, borderColor: colors.line },
  availabilityActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  spinner: { color: colors.teal },
  status: { color: colors.muted, fontSize: 12 },
  error: { color: colors.copper, fontSize: 11, fontWeight: '800' },
});

