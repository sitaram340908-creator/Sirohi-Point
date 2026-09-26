import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { useThemedStyles } from '@/theme/theme-context';

type RoleSelectionIntent = 'welcome' | 'login' | 'signup';

const roles = [
  {
    key: 'customer',
    eyebrow: 'B2C CUSTOMER',
    title: 'Buy products for your project',
    copy: 'Explore products and services. Sign in to buy products or book a technician.',
    accent: 'teal',
  },
  {
    key: 'business',
    eyebrow: 'B2B BUSINESS',
    title: 'Buy products in bulk',
    copy: 'Buy in bulk at business prices with minimum order quantities. New accounts need admin approval; review normally takes up to 48 working hours.',
    accent: 'copper',
  },
  {
    key: 'technician',
    eyebrow: 'TECHNICIAN',
    title: 'Provide services and earn',
    copy: 'Register your services and area. After admin approval, manage your profile and customer requests. Review takes up to 48 working hours.',
    accent: 'blue',
  },
] as const;

export function RoleSelection({ intent }: { intent: RoleSelectionIntent }) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  function openRole(role: (typeof roles)[number]['key'], action: 'login' | 'signup') {
    const path = action === 'login'
      ? role === 'customer' ? '/customer/login' : role === 'business' ? '/business/login' : '/technician/login'
      : role === 'customer' ? '/customer/signup' : role === 'business' ? '/business/signup' : '/technician/signup';
    router.push(path as never);
  }

  return (
    <AppShell entry>
      <View style={styles.page}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.eyebrow}>CHOOSE YOUR SPACE</Text>
          <Text style={styles.title}>{intent === 'login' ? 'How do you want to sign in?' : 'How will you use Sirohi Point?'}</Text>
          <Text style={styles.copy}>Choose one role to open the correct account and experience.</Text>
        </View>
        <View style={styles.grid}>
          {roles.map((role) => (
            <RoleCard key={role.key} role={role} intent={intent} onLogin={() => openRole(role.key, 'login')} onSignup={() => openRole(role.key, 'signup')} styles={styles} />
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.browseButton}>
          <Text style={styles.browseText}>Explore customer products and services as a guest →</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

function RoleCard({ role, intent, onLogin, onSignup, styles }: { role: (typeof roles)[number]; intent: RoleSelectionIntent; onLogin(): void; onSignup(): void; styles: ReturnType<typeof createStyles> }) {
  const accentText = role.accent === 'teal' ? styles.accentTealText : role.accent === 'copper' ? styles.accentCopperText : styles.accentBlueText;
  const accentButton = role.accent === 'teal' ? styles.accentTealButton : role.accent === 'copper' ? styles.accentCopperButton : styles.accentBlueButton;
  return (
    <View style={styles.card}>
      <Text style={[styles.cardEyebrow, accentText]}>{role.eyebrow}</Text>
      <Text style={styles.cardTitle}>{role.title}</Text>
      <Text style={styles.cardCopy}>{role.copy}</Text>
      {intent !== 'signup' ? <Pressable accessibilityRole="button" accessibilityLabel={`${role.eyebrow}: Sign in`} onPress={onLogin} style={({ pressed }) => [styles.button, accentButton, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable> : null}
      {intent !== 'login' ? <Pressable accessibilityRole="button" accessibilityLabel={`${role.eyebrow}: Create account`} onPress={onSignup} style={({ pressed }) => [styles.button, intent === 'welcome' ? styles.secondaryButton : accentButton, pressed && styles.pressed]}>
        <Text style={[styles.buttonText, intent === 'welcome' && styles.secondaryText]}>Create account</Text>
      </Pressable> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center', padding: spacing.xl, gap: spacing.xl },
  heading: { maxWidth: 680, gap: spacing.sm },
  eyebrow: { color: colors.teal, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.cream, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { flexGrow: 1, flexBasis: 260, minHeight: 250, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: spacing.md },
  cardEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  cardTitle: { color: colors.cream, fontSize: 19, fontWeight: '900', lineHeight: 24 },
  cardCopy: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 20 },
  button: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken },
  secondaryText: { color: colors.cream },
  browseButton: { minHeight: 44, paddingVertical: spacing.sm, justifyContent: 'center', alignSelf: 'flex-start' },
  browseText: { color: colors.teal, fontSize: 13, lineHeight: 20, fontWeight: '800' },
  accentTealText: { color: colors.teal },
  accentCopperText: { color: colors.copper },
  accentBlueText: { color: colors.accent },
  accentTealButton: { backgroundColor: colors.teal },
  accentCopperButton: { backgroundColor: colors.copper },
  accentBlueButton: { backgroundColor: colors.accent },
  pressed: { opacity: 0.72 },
});

