import type { ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/business/business-ui';
import { useBusinessStyles } from '@/theme/business-theme';

export default function BusinessPendingScreen() {
  const router = useRouter();
  const styles = useBusinessStyles(createStyles);
  return <PortalShell eyebrow="REGISTRATION RECEIVED" title="You’re one step closer." copy="Thank you for choosing Sirohi Point Business. Your wholesale journey is almost ready to begin.">
    <View style={styles.wrap}><PortalCard style={styles.card}><View style={styles.check}><Text style={styles.checkText}>✓</Text></View><Text accessibilityRole="header" style={styles.title}>Your business is under review.</Text><Text style={styles.copy}>Your registration has been received. Our team will review your business details before enabling access to wholesale prices and bulk ordering.</Text><StatusBadge label="Awaiting business approval" tone="warning" />
      <View style={styles.steps}>{[['01', 'Registration received', 'Your details have been submitted.'], ['02', 'Business review', 'Our team is reviewing your account.'], ['03', 'Ready to shop', 'Sign in after your account is approved.']].map(([number, title, copy], index) => <View key={number} style={styles.step}><View style={[styles.number, index === 0 && styles.numberDone]}><Text style={[styles.numberText, index === 0 && styles.numberTextDone]}>{index === 0 ? '✓' : number}</Text></View><View style={styles.stepBody}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepCopy}>{copy}</Text></View></View>)}</View>
      <View style={styles.note}><Text style={styles.noteTitle}>What happens next?</Text><Text style={styles.copy}>Approval normally takes up to 48 working hours. Once approved, sign in with the email and password you used to register.</Text></View><PortalButton label="Go to business sign in →" onPress={() => router.replace('/business/login')} /><PortalButton label="Back to Sirohi Point" secondary onPress={() => router.replace('/')} />
    </PortalCard></View>
  </PortalShell>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { width: '100%', maxWidth: 780, alignSelf: 'center' }, card: { padding: 28, gap: 22 }, check: { width: 64, height: 64, borderRadius: 20, backgroundColor: c.successTint, alignItems: 'center', justifyContent: 'center' }, checkText: { color: c.success, fontSize: 30, fontWeight: '700' }, title: { color: c.cream, fontSize: 29, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8 }, copy: { color: c.muted, fontSize: 14, lineHeight: 23 }, steps: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, gap: 22, paddingVertical: 24 }, step: { flexDirection: 'row', gap: 14, alignItems: 'center' }, number: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceSunken, alignItems: 'center', justifyContent: 'center' }, numberDone: { backgroundColor: c.teal }, numberText: { color: c.muted, fontSize: 12, fontWeight: '700' }, numberTextDone: { color: c.surface }, stepBody: { flex: 1, gap: 5 }, stepTitle: { color: c.cream, fontSize: 14, fontWeight: '700' }, stepCopy: { color: c.muted, fontSize: 12, lineHeight: 20 }, note: { padding: 20, borderRadius: 14, backgroundColor: c.tealTint, gap: 8 }, noteTitle: { color: c.teal, fontSize: 14, fontWeight: '700' },
});

