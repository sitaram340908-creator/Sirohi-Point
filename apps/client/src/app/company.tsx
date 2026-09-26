import type { ThemeColors } from '@/shared/design-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { useCustomerStyles } from '@/theme/customer-theme';

export default function CompanyScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const styles = useCustomerStyles(createStyles);
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const requestedSection = Array.isArray(section) ? section[0] : section;
  const focusedSection = requestedSection === 'about-us' || requestedSection === 'contact-us' || requestedSection === 'store-locator' ? requestedSection : undefined;
  const focusedTitle = focusedSection === 'about-us' ? 'About Us' : focusedSection === 'contact-us' ? 'Contact Us' : 'Store Locator';

  return (
    <AppShell>
      <View style={[styles.pageContent, compact && styles.pageContentCompact]}>
        {focusedSection ? (
          <View style={styles.focusHeader}>
            <Text style={styles.eyebrow}>SIROHI POINT / COMPANY</Text>
            <Text accessibilityRole="header" style={styles.focusTitle}>{focusedTitle}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/company')}><Text style={styles.focusBack}>View all company details  ↗</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>SIROHI POINT / COMPANY</Text>
                <Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Built on quality.<Text style={styles.heroAccent}> Ready for every project.</Text></Text>
                <Text style={styles.heroText}>Learn about our company, find our contact details, browse the full catalog, or visit our store.</Text>
              </View>
              <View style={styles.heroMark}><Image source={require('../../assets/images/logo_sirohi.png')} style={styles.heroLogo} resizeMode="contain" /><Text style={styles.heroMarkText}>WHOLESALE · RETAIL</Text></View>
            </View>

            <View style={styles.quickNav}>
              <Pressable onPress={() => router.push({ pathname: '/company', params: { section: 'about-us' } })}><Text style={styles.quickNavText}>About Us</Text></Pressable>
              <Pressable onPress={() => router.push({ pathname: '/company', params: { section: 'contact-us' } })}><Text style={styles.quickNavText}>Contact Us</Text></Pressable>
              <Pressable onPress={() => router.push('/catalog')}><Text style={styles.quickNavText}>All Products</Text></Pressable>
              <Pressable onPress={() => router.push({ pathname: '/company', params: { section: 'store-locator' } })}><Text style={styles.quickNavText}>Store Locator</Text></Pressable>
            </View>
          </>
        )}

        {(!focusedSection || focusedSection === 'about-us') ? <View nativeID="about-us" style={[styles.card, compact && styles.cardCompact]}>
          <Text style={styles.cardNumber}>01 / OUR STORY</Text>
          <View style={styles.cardBody}>
            <Text accessibilityRole="header" style={styles.cardTitle}>About Us</Text>
            <Text style={styles.copy}>Sirohi Point is a wholesale retail company started in October 2022. Registering continuous growth year after year, the company has since then worked directly with all the major brands in all items of PVC pipe fittings, electrical wires, switches, sockets, paint and has worked to deliver the best quality.</Text>
            <Text style={styles.copy}>The basic objective of Sirohi Point is to provide better services to our customer with best quality products and ontime delivery commitments.</Text>
          </View>
        </View> : null}

        {(!focusedSection || focusedSection === 'contact-us') ? <View nativeID="contact-us" style={[styles.card, compact && styles.cardCompact]}>
          <Text style={styles.cardNumber}>02 / GET IN TOUCH</Text>
          <View style={styles.cardBody}>
            <Text accessibilityRole="header" style={styles.cardTitle}>Contact Us</Text>
            <View style={styles.contactList}>
              <View><Text style={styles.detailLabel}>ADDRESS</Text><Text style={styles.detailText}>SHYAMPUR JATT, SALARPUR ROAD,{`\n`}SHYAMPUR JATT, HAPUR, UTTAR PRADESH 245205</Text></View>
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('tel:+919058036895')}><Text style={styles.detailLabel}>PHONE</Text><Text style={styles.detailLink}>+91 9058036895</Text></Pressable>
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('mailto:info@sirohipoint.com')}><Text style={styles.detailLabel}>EMAIL</Text><Text style={styles.detailLink}>info@sirohipoint.com</Text></Pressable>
            </View>
          </View>
        </View> : null}

        {!focusedSection ? <View nativeID="all-products" style={[styles.card, styles.actionCard, compact && styles.cardCompact]}>
          <Text style={styles.cardNumber}>03 / PRODUCT CATALOG</Text>
          <View style={styles.cardBody}>
            <Text accessibilityRole="header" style={styles.cardTitle}>All Products</Text>
            <Text style={styles.copy}>Explore electrical, electronic, hardware, paint, PVC pipe and sanitary products in the Sirohi Point catalog.</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/catalog')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Browse all categories  ↗</Text></Pressable>
          </View>
        </View> : null}

        {(!focusedSection || focusedSection === 'store-locator') ? <View nativeID="store-locator" style={[styles.card, styles.locationCard, compact && styles.cardCompact]}>
          <Text style={styles.cardNumber}>04 / FIND US</Text>
          <View style={styles.cardBody}>
            <Text accessibilityRole="header" style={styles.cardTitle}>Store Locator</Text>
            <Text style={styles.detailLabel}>VISIT US</Text>
            <Text style={styles.detailText}>Shyampur Jatt, SALARPUR ROAD,{`\n`}Shyampur Jatt, Hapur, Uttar Pradesh, 245207</Text>
          </View>
        </View> : null}
      </View>
    </AppShell>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  pageContent: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 42, gap: 20 },
  pageContentCompact: { paddingHorizontal: 16, paddingVertical: 24 },
  focusHeader: { backgroundColor: c.primaryDark, borderRadius: 16, padding: 24, gap: 8 },
  focusTitle: { color: '#FFFFFF', fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: -0.8 },
  focusBack: { color: '#FFAA86', fontSize: 14, fontWeight: '800', marginTop: 8 },
  hero: { backgroundColor: c.primaryDark, borderRadius: 18, padding: 32, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 28 },
  heroCopy: { flex: 1, minWidth: 260 },
  eyebrow: { color: c.copperBright, fontSize: 11, fontWeight: '900', letterSpacing: 1.8, marginBottom: 14 },
  heroTitle: { color: '#FFFFFF', fontSize: 45, lineHeight: 50, letterSpacing: -1.4, fontWeight: '900', maxWidth: 760 },
  heroTitleCompact: { fontSize: 31, lineHeight: 36 },
  heroAccent: { color: '#FFAA86' },
  heroText: { color: '#C7D6E4', fontSize: 15, lineHeight: 23, marginTop: 18, maxWidth: 600 },
  heroMark: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, minWidth: 154 },
  heroLogo: { width: 120, height: 70 },
  heroMarkText: { color: '#182D45', fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 5 },
  quickNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 19 },
  quickNavText: { color: c.teal, fontSize: 14, fontWeight: '800', paddingHorizontal: 4, paddingVertical: 6 },
  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 28, flexDirection: 'row', gap: 24 },
  cardCompact: { flexDirection: 'column', gap: 12, padding: 20 },
  actionCard: { backgroundColor: c.surfaceRaised },
  locationCard: { backgroundColor: c.surfaceSunken },
  cardNumber: { color: c.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, width: 142, paddingTop: 5 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { color: c.cream, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.8, marginBottom: 13 },
  copy: { color: c.muted, fontSize: 15, lineHeight: 25, marginBottom: 12 },
  contactList: { gap: 18 },
  detailLabel: { color: c.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  detailText: { color: c.cream, fontSize: 15, lineHeight: 23 },
  detailLink: { color: c.copperBright, fontSize: 16, lineHeight: 23, fontWeight: '800' },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: c.cta, borderRadius: 8, marginTop: 4, paddingHorizontal: 17, paddingVertical: 13 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});

