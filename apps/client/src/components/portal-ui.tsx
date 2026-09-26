import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { ScreenHeading } from '@/components/screen-heading';
import { useAuth } from '@/state/auth-context';
import { useThemedStyles } from '@/theme/theme-context';

export function PortalShell({
  eyebrow,
  title,
  copy,
  children,
  actions,
  includeSignOut = true,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: ReactNode;
  actions?: ReactNode;
  includeSignOut?: boolean;
}) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 560;
  return (
    <AppShell>
      <View style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={[styles.heroTop, compact && styles.heroTopCompact]}>
              <ScreenHeading eyebrow={eyebrow} title={title} copy={copy} inverse />
              {actions || (user && includeSignOut) ? <View style={[styles.heroActions, compact && styles.heroActionsCompact]}>{actions}{user && includeSignOut ? <PortalButton label="Sign out" secondary onPress={() => void logout().then(() => router.replace('/' as never))} /> : null}</View> : null}
            </View>
          </View>
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </AppShell>
  );
}

export function PortalCard({ title, copy, children }: { title?: string; copy?: string; children?: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {copy ? <Text style={styles.cardCopy}>{copy}</Text> : null}
      {children ?? null}
    </View>
  );
}

export function PortalMetric({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const styles = useThemedStyles(createStyles);
  const toneStyle = tone === 'success' ? styles.badgeSuccess : tone === 'warning' ? styles.badgeWarning : tone === 'danger' ? styles.badgeDanger : styles.badgeNeutral;
  return <View style={[styles.badge, toneStyle]}><Text style={[styles.badgeText, tone === 'success' ? styles.badgeTextSuccess : tone === 'warning' ? styles.badgeTextWarning : tone === 'danger' ? styles.badgeTextDanger : styles.badgeTextNeutral]}>{label}</Text></View>;
}

export function PortalButton({ label, onPress, secondary = false, danger = false, disabled = false }: { label: string; onPress(): void; secondary?: boolean; danger?: boolean; disabled?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger, disabled && { opacity: 0.5 }]}><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary, danger && styles.buttonTextDanger]}>{label}</Text></Pressable>;
}

export function PortalDivider() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.divider} />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  page: { backgroundColor: colors.ink },
  hero: { backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: colors.line },
  heroInner: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: spacing.xl },
  heroTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  heroTopCompact: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: spacing.md },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heroActionsCompact: { width: '100%', flexDirection: 'column', alignItems: 'stretch' },
  content: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: spacing.xl, gap: spacing.lg },
  card: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: spacing.md },
  cardTitle: { color: colors.cream, fontSize: 18, fontWeight: '900' },
  cardCopy: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  metric: { flexGrow: 1, flexBasis: 180, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  metricValue: { color: colors.cream, fontSize: 26, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.45 },
  badgeNeutral: { borderColor: colors.line, backgroundColor: colors.surfaceSunken },
  badgeSuccess: { borderColor: colors.success, backgroundColor: colors.successTint },
  badgeWarning: { borderColor: colors.copper, backgroundColor: colors.copperTint },
  badgeDanger: { borderColor: colors.danger, backgroundColor: colors.surfaceSunken },
  badgeTextNeutral: { color: colors.muted },
  badgeTextSuccess: { color: colors.success },
  badgeTextWarning: { color: colors.copper },
  badgeTextDanger: { color: colors.danger },
  button: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  buttonDanger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  buttonTextSecondary: { color: colors.cream },
  buttonTextDanger: { color: colors.danger },
  divider: { height: 1, backgroundColor: colors.line },
});

