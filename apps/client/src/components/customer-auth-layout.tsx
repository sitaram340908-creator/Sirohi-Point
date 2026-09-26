import type { ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthPanel } from '@/components/auth-panel';
import { useCustomerStyles } from '@/theme/customer-theme';
import { useLanguage } from '@/state/language-context';

export function CustomerAuthLayout({ mode, returnToCart = false }: { mode: 'login' | 'signup'; returnToCart?: boolean }) {
  const router = useRouter();
  const styles = useCustomerStyles(createStyles);
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const compact = width < 780;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable accessibilityRole="link" accessibilityLabel="Back to Sirohi Point customer home" onPress={() => router.replace('/' as never)} style={styles.brand}>
            <Image source={require('../../assets/images/logo_sirohi.png')} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>SIROHI POINT<Text style={styles.orange}>.</Text></Text>
              <Text style={styles.brandCaption}>EVERY PROJECT STARTS HERE</Text>
            </View>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/' as never)} style={styles.backButton}>
            <Text style={styles.backText}>{t('Back to shop  ↗')}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]} keyboardShouldPersistTaps="handled">
        <View style={[styles.main, compact && styles.mainCompact]}>
          <View style={styles.formColumn}>
            <AuthPanel mode={mode} returnToCart={returnToCart} variant="customer" />
            <Text style={styles.formNote}>{t('By continuing, you agree to shop with Sirohi Point securely.')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ink },
  header: { backgroundColor: c.header, borderBottomWidth: 1, borderBottomColor: c.line },
  headerInner: { width: '100%', maxWidth: 1440, minHeight: 78, alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#FFFFFF' },
  brandName: { color: c.cream, fontSize: 19, fontWeight: '900', letterSpacing: -0.6 },
  orange: { color: c.copperBright },
  brandCaption: { color: c.muted, fontSize: 9, letterSpacing: 1.3, marginTop: 3 },
  backButton: { minHeight: 42, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: c.line, justifyContent: 'center' },
  backText: { color: c.cream, fontSize: 13, fontWeight: '800' },
  scroll: { flexGrow: 1 },
  scrollCompact: { paddingBottom: 20 },
  main: { width: '100%', maxWidth: 820, alignSelf: 'center', flex: 1, padding: 28, justifyContent: 'center' },
  mainCompact: { padding: 16 },
  formColumn: { width: '100%', justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  formNote: { color: c.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 480, marginTop: 14 },
});

