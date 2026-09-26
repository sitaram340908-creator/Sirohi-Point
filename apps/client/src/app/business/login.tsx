import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { ThemeColors } from '@/shared/design-tokens';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PortalButton, PortalShell } from '@/components/business/business-ui';
import { useAuth } from '@/state/auth-context';
import { useBusinessStyles } from '@/theme/business-theme';

export default function BusinessLoginScreen() {
  const router = useRouter();
  const styles = useBusinessStyles(createStyles);
  const { login, logout, busy } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (busy) return;
    setError(null);
    try {
      const user = await login({ email: email.trim(), password });
      if (user.role !== 'BUSINESS') { await logout(); setError('This account does not have business buying access.'); return; }
      router.replace('/business');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in. Please try again.'); }
  }
  return <PortalShell eyebrow="WELCOME TO SIROHI POINT BUSINESS" title="Your next big thing starts here." copy="Sign in to your wholesale store and get back to building, stocking, and growing." includeSignOut={false}>
    <View style={styles.layout}><View style={styles.form}><Text style={styles.eyebrow}>YOUR BUSINESS ACCOUNT</Text><Text accessibilityRole="header" style={styles.title}>Welcome back.</Text><Text style={styles.copy}>Sign in with your approved business account.</Text>
        <View style={styles.field}><Text style={styles.label}>Email address</Text><TextInput accessibilityLabel="Business email address" value={email} onChangeText={setEmail} placeholder="you@business.com" placeholderTextColor={styles.copy.color} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={styles.input} /></View>
        <View style={styles.field}><Text style={styles.label}>Password</Text><View style={styles.passwordRow}><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor={styles.copy.color} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" onSubmitEditing={() => void submit()} style={styles.passwordInput} /><Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} style={styles.reveal}><Text style={styles.revealText}>{visible ? 'Hide' : 'Show'}</Text></Pressable></View></View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <PortalButton label={busy ? 'Signing in…' : 'Sign in to your business  →'} disabled={busy} onPress={() => void submit()} />{busy ? <ActivityIndicator color={styles.eyebrow.color} /> : null}
        <View style={styles.register}><Text style={styles.copy}>New to Sirohi Point Business?</Text><PortalButton label="Create a business account" secondary onPress={() => router.push('/business/signup')} /></View>
        <Pressable accessibilityRole="link" onPress={() => router.replace('/')} style={styles.back}><Text style={styles.backText}>← Back to Sirohi Point</Text></Pressable>
      </View>
    </View>
  </PortalShell>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  layout: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  form: { width: '100%', padding: 36, borderRadius: 24, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, gap: 20, justifyContent: 'center' },
  eyebrow: { color: c.copper, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },
  title: { color: c.cream, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  copy: { color: c.muted, fontSize: 14, lineHeight: 22 },
  field: { gap: 9 },
  label: { color: c.cream, fontSize: 13, fontWeight: '700' },
  input: { height: 52, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 16, backgroundColor: c.surfaceRaised, color: c.cream, fontSize: 14 },
  passwordRow: { flexDirection: 'row', height: 52, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.surfaceRaised, overflow: 'hidden' },
  passwordInput: { flex: 1, minWidth: 0, paddingHorizontal: 16, color: c.cream, fontSize: 14 },
  reveal: { minWidth: 58, alignItems: 'center', justifyContent: 'center' },
  revealText: { color: c.teal, fontSize: 12, fontWeight: '700' },
  error: { backgroundColor: c.copperTint, color: c.danger, fontSize: 13, lineHeight: 21, padding: 14, borderRadius: 12 },
  register: { gap: 14, paddingTop: 20, borderTopWidth: 1, borderColor: c.line },
  back: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { color: c.teal, fontSize: 13, fontWeight: '600' },
});

