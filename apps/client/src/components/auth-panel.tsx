import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/state/auth-context';
import { getRoleHomePath } from '@/lib/role-navigation';
import { useCustomerStyles } from '@/theme/customer-theme';
import { useThemedStyles } from '@/theme/theme-context';
import { useLanguage } from '@/state/language-context';

export function AuthPanel({ mode, returnToCart = false, variant = 'default' }: { mode: 'login' | 'signup' | 'admin' | 'business' | 'technician'; returnToCart?: boolean; variant?: 'default' | 'customer' }) {
  const router = useRouter();
  const defaultStyles = useThemedStyles(createStyles);
  const customerStyles = useCustomerStyles(createCustomerStyles);
  const styles = variant === 'customer' ? customerStyles : defaultStyles;
  const { login, register, logout, busy } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const signup = mode === 'signup';
  const admin = mode === 'admin';
  const business = mode === 'business';
  const technician = mode === 'technician';

  async function submit() {
    setError(null);
    try {
      const user = signup
        ? await register({
          name: name.trim(),
          email: email.trim(),
          password,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        })
        : await login({ email: email.trim(), password });

      if (admin && user.role !== 'SUPER_ADMIN' && user.role !== 'SUB_ADMIN') {
        await logout();
        setError('This account does not have administrator access.');
        return;
      }
      if (business && user.role !== 'BUSINESS') {
        await logout();
        setError('This account does not have business buying access.');
        return;
      }
      if (technician && user.role !== 'CONTRACTOR') {
        await logout();
        setError('This account does not have technician access.');
        return;
      }
      if (!signup && !admin && !business && !technician && user.role !== 'CUSTOMER') {
        await logout();
        setError('This account does not have customer shopping access. Use the correct role sign-in page.');
        return;
      }
      router.replace(returnToCart && user.role === 'CUSTOMER' ? '/cart' : getRoleHomePath(user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in');
    }
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {signup ? (variant === 'customer' ? t('Create your account') : 'Create your customer account') : admin ? 'Admin sign in' : business ? 'Business sign in' : technician ? 'Technician sign in' : (variant === 'customer' ? t('Welcome back') : 'Customer sign in')}
      </Text>
      <Text style={styles.copy}>
        {signup
          ? variant === 'customer' ? t('Save your details for faster checkout, easy order tracking, and a better way to shop.') : 'Use your email, city or area, and a secure password.'
          : admin
            ? 'Authorised Sirohi Point administrators only.'
            : business
              ? 'Access wholesale pricing, bulk orders and business services.'
              : technician
                ? 'Review admin-approved service requests and update job status.'
              : variant === 'customer' ? t('Shop products, access orders, and checkout.') : 'Shop products, access orders, and checkout.'}
      </Text>

      {variant === 'customer' ? <View style={styles.customerTrust}><Text style={styles.customerTrustText}>{t('SECURE CUSTOMER ACCOUNT')}</Text><Text style={styles.customerTrustDot}>•</Text><Text style={styles.customerTrustText}>{t('QUICK CHECKOUT')}</Text></View> : null}

      {signup ? (
        <>
          <Field label={variant === 'customer' ? t('FULL NAME') : 'FULL NAME'} value={name} onChangeText={setName} placeholder={variant === 'customer' ? t('Your name') : 'Your name'} styles={styles as ReturnType<typeof createStyles>} />
          <Field label={variant === 'customer' ? t('PHONE (OPTIONAL)') : 'PHONE (OPTIONAL)'} value={phone} onChangeText={setPhone} placeholder="+91" keyboardType="phone-pad" styles={styles as ReturnType<typeof createStyles>} />
        </>
      ) : null}
      <Field label={variant === 'customer' ? t('EMAIL') : 'EMAIL'} value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" styles={styles as ReturnType<typeof createStyles>} />
      <Field label={variant === 'customer' ? t('PASSWORD') : 'PASSWORD'} value={password} onChangeText={setPassword} placeholder={variant === 'customer' ? t('At least 8 characters') : 'At least 8 characters'} secureTextEntry autoCapitalize="none" styles={styles as ReturnType<typeof createStyles>} />

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void submit()}
        style={({ pressed }) => [styles.submit, pressed && styles.pressed, busy && styles.disabled]}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{signup ? t('Create account') : t('Sign in')}</Text>}
      </Pressable>

      {!admin ? (
        <Pressable
          onPress={() => {
            const path = signup ? '/customer/login' : business ? '/business/signup' : technician ? '/technician/signup' : '/customer/signup';
            router.replace(((returnToCart && !business && !technician)
              ? { pathname: path, params: { returnTo: 'cart' } }
              : path) as never);
          }}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>{signup ? (variant === 'customer' ? t('Already registered? Sign in') : 'Already registered? Sign in') : business ? 'Need a business account? Register' : technician ? 'New technician? Submit a registration request' : variant === 'customer' ? t('New customer? Create account') : 'New customer? Create account'}</Text>
        </Pressable>
      ) : null}
      {!admin ? <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.switchButton}>
        <Text style={styles.switchText}>{variant === 'customer' ? t('Choose a different role') : 'Choose a different role'}</Text>
      </Pressable> : null}
    </View>
  );
}

function Field({
  label,
  styles,
  ...props
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={styles.placeholder.color}
        style={styles.input}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  title: { color: colors.cream, fontSize: 28, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.xs },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6 },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    color: colors.cream,
    fontSize: 14,
  },
  placeholder: { color: colors.muted },
  error: {
    color: colors.danger,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
  },
  submit: {
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  switchButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  switchText: { color: colors.teal, fontSize: 12.5, fontWeight: '800' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.62 },
});

const createCustomerStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: spacing.md,
    shadowColor: '#102237',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  title: { color: colors.cream, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: spacing.xs },
  field: { gap: 7 },
  label: { color: colors.muted, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.9 },
  input: { minHeight: 52, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 15 },
  placeholder: { color: colors.muted },
  error: { color: colors.danger, backgroundColor: colors.copperTint, borderRadius: 10, padding: spacing.sm, fontSize: 12, lineHeight: 18 },
  submit: { minHeight: 54, borderRadius: 12, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  switchButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  switchText: { color: colors.teal, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.62 },
  customerTrust: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  customerTrustText: { color: colors.copper, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  customerTrustDot: { color: colors.line, fontSize: 13 },
});
