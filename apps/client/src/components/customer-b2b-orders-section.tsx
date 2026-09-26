import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCustomerStyles } from '@/theme/customer-theme';
import { useLanguage } from '@/state/language-context';

const benefits = ['Low prices', 'Fixed rates', 'Personal helper', 'Pay later', 'GST bill'];
const steps = [
  { number: '01', title: 'Tell us what you need', copy: 'Write down what you need in the app.' },
  { number: '02', title: 'Sellers will reply', copy: 'Many sellers will send you their best prices.' },
  { number: '03', title: 'Pick the best one', copy: 'See all prices together and pick the cheapest one.' },
  { number: '04', title: 'Order is done', copy: 'Confirm your order, set delivery date, and track it.' },
] as const;

export function CustomerB2BOrdersSection({ compact = false, onPress }: { compact?: boolean; onPress(): void }) {
  const styles = useCustomerStyles(createStyles);
  const { t } = useLanguage();
  return (
    <View style={styles.section}>
      <View style={[styles.panel, compact && styles.panelCompact]}>
        <View style={[styles.intro, compact && styles.introCompact]}>
          <Text style={styles.eyebrow}>{t('BULK ORDERS')}</Text>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{t('Tell us what you need.\nGet the best prices.')}</Text>
          <Text style={styles.copy}>{t('Made for builders, shop owners, and contractors who need material at good prices.')}</Text>
          <View style={styles.benefits}>{benefits.map((benefit) => <View key={benefit} style={styles.benefit}><Text style={styles.benefitText}>{t(benefit)}</Text></View>)}</View>
          <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}><Text style={styles.ctaText}>{t('Explore products in bulk')}</Text></Pressable>
        </View>
        <View style={[styles.steps, compact && styles.stepsCompact]}>
          {steps.map((step) => <View key={step.number} style={[styles.step, compact && styles.stepCompact]}><Text style={styles.stepNumber}>{step.number}</Text><Text style={styles.stepTitle}>{t(step.title)}</Text><Text style={styles.stepCopy}>{t(step.copy)}</Text></View>)}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.section, backgroundColor: colors.background },
  panel: { width: '100%', maxWidth: 1240, alignSelf: 'center', padding: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.primaryDark, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, overflow: 'hidden' },
  panelCompact: { padding: spacing.lg, flexDirection: 'column', gap: spacing.lg },
  intro: { flexGrow: 1, flexShrink: 1, flexBasis: 500, justifyContent: 'center', gap: spacing.md },
  introCompact: { flexBasis: 'auto' },
  eyebrow: { color: colors.copperBright, fontSize: 10, letterSpacing: 1.5, fontWeight: '900' },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: -0.8 },
  titleCompact: { fontSize: 27, lineHeight: 33 },
  copy: { color: '#B9CAE0', fontSize: 14, lineHeight: 23, maxWidth: 520 },
  benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  benefit: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(185,202,224,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' },
  benefitText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  cta: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  ctaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  steps: { flexGrow: 1, flexShrink: 1, flexBasis: 500, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignContent: 'center' },
  stepsCompact: { flexBasis: 'auto', flexDirection: 'column', flexWrap: 'nowrap' },
  step: { flexGrow: 1, flexBasis: 210, minHeight: 132, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(185,202,224,0.18)', backgroundColor: 'rgba(255,255,255,0.06)', gap: spacing.sm },
  stepCompact: { flexBasis: 'auto', minHeight: 0 },
  stepNumber: { color: colors.copperBright, fontSize: 12, fontWeight: '900' },
  stepTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  stepCopy: { color: '#AFC2D9', fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.78, transform: [{ translateY: 1 }] },
});

