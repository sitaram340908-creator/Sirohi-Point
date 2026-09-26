import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import type { ThemeColors } from '@/shared/design-tokens';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell } from '@/components/business/business-ui';
import { useAuth } from '@/state/auth-context';
import { useBusinessStyles } from '@/theme/business-theme';

export default function BusinessSignupScreen() {
  const router = useRouter();
  const styles = useBusinessStyles(createStyles);
  const { registerBusiness, busy } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', businessName: '', businessType: '', gstin: '' });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit() {
    if (busy) return;
    setError(null);
    try {
      await registerBusiness({
        name: form.name.trim(), email: form.email.trim(), password: form.password, businessName: form.businessName.trim(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), ...(form.businessType.trim() ? { businessType: form.businessType.trim() } : {}), ...(form.gstin.trim() ? { gstin: form.gstin.trim() } : {}),
      });
      router.replace('/business/pending' as never);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create business account.'); }
  }
  return <PortalShell eyebrow="BUSINESS ACCOUNT" title="Better buying starts here." copy="Join Sirohi Point Business for wholesale essentials, bulk ordering, and a store built around your work." actions={<PortalButton label="Already registered? Sign in" secondary onPress={() => router.push('/business/login' as never)} />}>
    <View style={styles.registrationIntro}><Text style={styles.introTitle}>A few details. A world of possibilities.</Text><Text style={styles.introCopy}>01  Register your business    /    02  Get approved    /    03  Start buying</Text></View><PortalCard title="Tell us about your business" copy="Complete your account and business details. Our team will review your registration before enabling wholesale access.">
      <Text style={styles.sectionTitle}>01 / Account &amp; business details</Text><View style={styles.grid}><Field label="Your name" value={form.name} onChangeText={(value) => set('name', value)} styles={styles} /><Field label="Business name" value={form.businessName} onChangeText={(value) => set('businessName', value)} styles={styles} /><Field label="Email" value={form.email} onChangeText={(value) => set('email', value)} styles={styles} keyboardType="email-address" /><Field label="Password" value={form.password} onChangeText={(value) => set('password', value)} styles={styles} secureTextEntry /><Field label="Phone" value={form.phone} onChangeText={(value) => set('phone', value)} styles={styles} keyboardType="phone-pad" /><Field label="Business type" value={form.businessType} onChangeText={(value) => set('businessType', value)} styles={styles} /><Field label="GSTIN (optional)" value={form.gstin} onChangeText={(value) => set('gstin', value)} styles={styles} /></View>
      <View style={styles.passwordHint}><Text style={styles.hintTitle}>Business approval</Text><Text style={styles.hintCopy}>After submission, an administrator reviews your details. Approval normally takes up to 48 working hours.</Text></View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} style={[styles.submit, busy && styles.disabled]} onPress={() => void submit()}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Create business account</Text>}</Pressable>
    </PortalCard>
  </PortalShell>;
}

function Field({ label, styles, ...props }: { label: string; styles: ReturnType<typeof createStyles> } & ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} {...props} placeholderTextColor={styles.placeholder.color} style={[styles.input, props.multiline && styles.multiline]} /></View>; }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  registrationIntro: { padding: 28, borderRadius: 20, backgroundColor: colors.tealTint, gap: 12 },
  introTitle: { color: colors.cream, fontSize: 25, lineHeight: 33, fontWeight: '800' },
  introCopy: { color: colors.teal, fontSize: 12, lineHeight: 23 },
  sectionTitle: { color: colors.cream, fontSize: 17, fontWeight: '700', paddingTop: 18, paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  field: { flexGrow: 1, flexShrink: 1, flexBasis: 280, gap: 6 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  input: { minHeight: 52, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 13 },
  multiline: { minHeight: 92, paddingVertical: 12, textAlignVertical: 'top' },
  placeholder: { color: colors.muted },
  passwordHint: { padding: 13, borderRadius: 12, backgroundColor: colors.surfaceSunken, gap: 4 },
  hintTitle: { color: colors.cream, fontSize: 12, fontWeight: '900' },
  hintCopy: { color: colors.muted, fontSize: 13, lineHeight: 17 },
  submit: { minHeight: 52, borderRadius: 12, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  error: { color: colors.danger, backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: 10, fontSize: 12 },
  disabled: { opacity: 0.6 },
});

