import { spacing, type ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthPanel } from '@/components/auth-panel';
import { useThemedStyles } from '@/theme/theme-context';

export default function TechnicianLoginScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.page}><View style={styles.topbar}><Pressable onPress={() => router.replace('/' as never)}><Text style={styles.brand}>SIROHI POINT <Text style={styles.brandAccent}>TECHNICIAN</Text></Text></Pressable><Text style={styles.label}>SERVICE NETWORK</Text></View><View style={styles.body}><AuthPanel mode="technician" /></View></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ink },
  topbar: { minHeight: 68, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: colors.line },
  brand: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.4 },
  brandAccent: { color: colors.copper },
  label: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  body: { flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
});

