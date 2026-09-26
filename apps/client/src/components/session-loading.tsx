import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '@/shared/design-tokens';

import { useThemedStyles } from '@/theme/theme-context';

export function SessionLoading() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.page} accessibilityLabel="Loading your account">
    <ActivityIndicator color={styles.text.color} />
    <Text style={styles.text}>Loading your account…</Text>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  page: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.ink },
  text: { color: colors.muted, fontSize: 13 },
});

