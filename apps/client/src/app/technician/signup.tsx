import { technicianServiceTypes, type ContractorProfileInput, type ContractorRegisterInput } from '@/shared/contracts';
import type { ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/portal-ui';
import { useAuth } from '@/state/auth-context';
import { useThemedStyles } from '@/theme/theme-context';

const technicianServiceOptions = technicianServiceTypes;

export default function TechnicianSignupScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { registerTechnician: registerTechnicianSession, busy } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', skills: '', serviceType: '', visitCharge: '', priceFrom: '', priceTo: '',
    serviceArea: '', latitude: '', longitude: '', radius: '15', experience: '', bio: '', availability: 'AVAILABLE' as 'AVAILABLE' | 'BUSY' | 'OFFLINE',
  });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    setError(null);
    if (!form.serviceType) { setError('Select the primary service you provide.'); return; }
    const skills = form.skills.split(',').map((skill) => skill.trim()).filter(Boolean);
    const profile: ContractorProfileInput = {
      skills,
      ...(form.serviceArea.trim() ? { serviceArea: form.serviceArea.trim() } : {}),
      ...(form.latitude.trim() ? { latitude: Number(form.latitude) } : {}),
      ...(form.longitude.trim() ? { longitude: Number(form.longitude) } : {}),
      serviceRadiusKm: Number(form.radius),
      ...(form.experience.trim() ? { experienceYears: Number(form.experience) } : {}),
      ...(form.bio.trim() ? { bio: form.bio.trim() } : {}),
      availability: form.availability,
      services: [{
        serviceType: form.serviceType.trim(),
        visitChargeInPaise: Math.round(Number(form.visitCharge) * 100),
        ...(form.priceFrom.trim() ? { priceFromInPaise: Math.round(Number(form.priceFrom) * 100) } : {}),
        ...(form.priceTo.trim() ? { priceToInPaise: Math.round(Number(form.priceTo) * 100) } : {}),
        active: true,
      }],
    };
    const input: ContractorRegisterInput = {
      name: form.name.trim(), email: form.email.trim(), password: form.password,
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), ...profile,
    };
    try {
      await registerTechnicianSession(input);
      router.replace('/technician/pending' as never);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit technician registration.');
    }
  }

  return <PortalShell eyebrow="TECHNICIAN REGISTRATION" title="Join the verified service network." copy="Submit your professional details once. An administrator reviews the request before your profile becomes visible to nearby customers." actions={<PortalButton label="Back to technician login" secondary onPress={() => router.push('/technician/login' as never)} />}>
    <PortalCard title="Registration request" copy="Your account and service profile will be marked PENDING until an admin approves them.">
      <View style={styles.grid}>
        <Field label="Full name" value={form.name} onChangeText={(value) => set('name', value)} styles={styles} />
        <Field label="Email" value={form.email} onChangeText={(value) => set('email', value)} styles={styles} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" value={form.password} onChangeText={(value) => set('password', value)} styles={styles} secureTextEntry />
        <Field label="Phone" value={form.phone} onChangeText={(value) => set('phone', value)} styles={styles} keyboardType="phone-pad" />
      </View>
      <View style={styles.grid}>
        <Field label="Skills (comma separated)" value={form.skills} onChangeText={(value) => set('skills', value)} styles={styles} />
        <ServiceSelect value={form.serviceType} open={serviceMenuOpen} onToggle={() => setServiceMenuOpen((current) => !current)} onChange={(value) => { set('serviceType', value); setServiceMenuOpen(false); }} options={technicianServiceOptions} styles={styles} />
        <Field label="Visit charge (₹)" value={form.visitCharge} onChangeText={(value) => set('visitCharge', value)} styles={styles} keyboardType="decimal-pad" />
        <Field label="Typical price from (₹)" value={form.priceFrom} onChangeText={(value) => set('priceFrom', value)} styles={styles} keyboardType="decimal-pad" />
        <Field label="Typical price to (₹)" value={form.priceTo} onChangeText={(value) => set('priceTo', value)} styles={styles} keyboardType="decimal-pad" />
        <Field label="Service area" value={form.serviceArea} onChangeText={(value) => set('serviceArea', value)} styles={styles} />
        <Field label="Service radius (km)" value={form.radius} onChangeText={(value) => set('radius', value)} styles={styles} keyboardType="number-pad" />
        <Field label="Experience (years)" value={form.experience} onChangeText={(value) => set('experience', value)} styles={styles} keyboardType="number-pad" />
      </View>
      <View style={styles.grid}>
        <Field label="Latitude (optional)" value={form.latitude} onChangeText={(value) => set('latitude', value)} styles={styles} keyboardType="decimal-pad" />
        <Field label="Longitude (optional)" value={form.longitude} onChangeText={(value) => set('longitude', value)} styles={styles} keyboardType="decimal-pad" />
      </View>
      <Field label="Professional bio (optional)" value={form.bio} onChangeText={(value) => set('bio', value)} styles={styles} multiline />
      <Text style={styles.label}>CURRENT AVAILABILITY</Text>
      <View style={styles.choiceRow}>{(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((value) => <Pressable key={value} onPress={() => set('availability', value)} style={[styles.availabilityButton, form.availability === value && styles.availabilityActive]}><StatusBadge label={value} tone={value === 'AVAILABLE' ? 'success' : value === 'BUSY' ? 'warning' : 'neutral'} /></Pressable>)}</View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable disabled={busy} onPress={() => void submit()} style={[styles.submit, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Submit registration request</Text>}</Pressable>
    </PortalCard>
  </PortalShell>;
}

function Field({ label, styles, ...props }: { label: string; styles: ReturnType<typeof createStyles> } & ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={styles.placeholder.color} style={[styles.input, props.multiline && styles.multiline]} /></View>;
}

function ServiceSelect({ value, open, options, onToggle, onChange, styles }: { value: string; open: boolean; options: readonly string[]; onToggle(): void; onChange(value: string): void; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.field}>
    <Text style={styles.label}>Primary service</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Primary service" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.select}>
      <Text style={styles.selectText}>{value || 'Select a service'}</Text>
      <Text style={styles.selectChevron}>{open ? '⌃' : '⌄'}</Text>
    </Pressable>
    {open ? <View accessibilityRole="radiogroup" style={styles.selectOptions}>{options.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option }} onPress={() => onChange(option)} style={[styles.selectOption, value === option && styles.selectOptionActive]}><Text style={[styles.selectOptionText, value === option && styles.selectOptionTextActive]}>{value === option ? '✓ ' : ''}{option}</Text></Pressable>)}</View> : null}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  field: { flexGrow: 1, flexBasis: 240, gap: 6 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  input: { minHeight: 46, paddingHorizontal: 13, borderRadius: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 13 },
  select: { minHeight: 46, paddingHorizontal: 13, borderRadius: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  selectText: { flex: 1, color: colors.cream, fontSize: 13 },
  selectChevron: { color: colors.teal, fontSize: 18, fontWeight: '900' },
  selectOptions: { maxHeight: 280, borderRadius: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden' },
  selectOption: { paddingHorizontal: 13, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  selectOptionActive: { backgroundColor: colors.tealTint },
  selectOptionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  selectOptionTextActive: { color: colors.cream, fontWeight: '900' },
  multiline: { minHeight: 92, paddingVertical: 12, textAlignVertical: 'top' },
  placeholder: { color: colors.muted },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  availabilityButton: { borderRadius: 20, borderWidth: 1, borderColor: colors.line },
  availabilityActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  error: { color: colors.danger, backgroundColor: colors.surfaceSunken, borderRadius: 6, padding: 10, fontSize: 12, lineHeight: 18 },
  submit: { minHeight: 46, borderRadius: 6, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.6 },
});

