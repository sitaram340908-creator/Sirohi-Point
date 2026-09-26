import { spacing, type ThemeColors } from '@/shared/design-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/theme/theme-context';

export function ScreenHeading({
  eyebrow,
  title,
  copy,
  center = false,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  center?: boolean;
  inverse?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.wrap, center && styles.center]}>
      <View style={styles.eyebrowRow}>
        <View style={[styles.eyebrowLine, inverse && styles.eyebrowLineInverse]} />
        <Text style={[styles.eyebrow, inverse && styles.eyebrowInverse]}>{eyebrow}</Text>
      </View>
      <Text accessibilityRole="header" style={[styles.title, center && styles.centerText, inverse && styles.titleInverse]}>{title}</Text>
      <Text style={[styles.copy, center && styles.centerText, inverse && styles.copyInverse]}>{copy}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { gap: spacing.sm, maxWidth: 730, minWidth: 0, flexShrink: 1 },
  center: { alignSelf: 'center', alignItems: 'center' },
  centerText: { textAlign: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrowLine: { width: 24, height: 2, borderRadius: 1, backgroundColor: colors.copper },
  eyebrowLineInverse: { backgroundColor: colors.copper },
  eyebrow: { color: colors.teal, fontSize: 12, letterSpacing: 1.6, fontWeight: '900' },
  eyebrowInverse: { color: colors.footerMuted },
  title: { color: colors.cream, fontSize: 40, lineHeight: 45, fontWeight: '900', letterSpacing: -1.1, flexShrink: 1 },
  titleInverse: { color: colors.heroText },
  copy: { color: colors.muted, fontSize: 17, lineHeight: 27, maxWidth: 680, flexShrink: 1 },
  copyInverse: { color: colors.heroMuted },
});

