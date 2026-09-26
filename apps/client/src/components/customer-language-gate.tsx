import { usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage, type Language } from '@/state/language-context';

export function CustomerLanguageGate() {
  const pathname = usePathname();
  const { language, hydrated, chooseLanguage, t } = useLanguage();
  const isCustomerRoute = !pathname.startsWith('/admin') && !pathname.startsWith('/business') && !pathname.startsWith('/technician');
  if (!hydrated || language || !isCustomerRoute) return null;

  function select(nextLanguage: Language) {
    chooseLanguage(nextLanguage);
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.logo}>SIROHI POINT<Text style={styles.dot}>.</Text></Text>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.copy}>{t('Select the language you want to use on Sirohi Point.')}</Text>
        <View style={styles.options}>
          <Pressable accessibilityRole="button" onPress={() => select('en')} style={styles.option}>
            <Text style={styles.optionTitle}>English</Text>
            <Text style={styles.optionCopy}>Use Sirohi Point in English</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => select('hi')} style={styles.option}>
            <Text style={styles.optionTitle}>हिंदी</Text>
            <Text style={styles.optionCopy}>Sirohi Point हिंदी में इस्तेमाल करें</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', zIndex: 1000, top: 0, right: 0, bottom: 0, left: 0, minHeight: '100%', backgroundColor: 'rgba(7, 15, 27, 0.76)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, borderRadius: 22, padding: 28, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  logo: { color: '#182D45', fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  dot: { color: '#FF6B2C' },
  title: { color: '#182D45', fontSize: 28, fontWeight: '900', marginTop: 22 },
  copy: { color: '#627185', fontSize: 14, lineHeight: 21, marginTop: 8 },
  options: { gap: 12, marginTop: 24 },
  option: { borderWidth: 1, borderColor: '#D8E1EB', borderRadius: 14, padding: 16, backgroundColor: '#F8FAFC' },
  optionTitle: { color: '#182D45', fontSize: 16, fontWeight: '900' },
  optionCopy: { color: '#627185', fontSize: 12, marginTop: 5 },
});
