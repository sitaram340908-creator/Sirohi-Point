import { spacing, type ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthPanel } from '@/components/auth-panel';
import { useThemedStyles } from '@/theme/theme-context';

export default function AdminLoginScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')}><Text style={styles.brand}>SIROHI POINT</Text></Pressable>
        <Text style={styles.adminLabel}>ADMINISTRATION</Text>
      </View>
      <View style={styles.page}><AuthPanel mode="admin" /></View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary },
  brand: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  adminLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  page: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl },
});

