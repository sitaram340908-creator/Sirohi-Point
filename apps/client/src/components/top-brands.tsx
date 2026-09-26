import type { ThemeColors } from '@/shared/design-tokens';
import { useCallback, useEffect, useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useCustomerStyles } from '@/theme/customer-theme';

type Brand = { name: string; mark: string; color: string; image?: number };

const brands: Brand[] = [
  { name: 'CERA', mark: 'CERA', color: '#0B315A', image: require('../../assets/images/brands/cera.png') },
  { name: 'Dulux', mark: 'Dulux', color: '#0B315A', image: require('../../assets/images/brands/dulux.png') },
  { name: 'Elephant', mark: 'ELEPHANT', color: '#5C8E20', image: require('../../assets/images/brands/elephant.png') },
  { name: 'EROS', mark: 'EROS', color: '#1F2937', image: require('../../assets/images/brands/eros.png') },
  { name: 'Hitachi', mark: 'HITACHI', color: '#0B315A', image: require('../../assets/images/brands/hitachi.png') },
  { name: 'Padmavati', mark: 'PADMAVATI', color: '#2E647A', image: require('../../assets/images/brands/padmavati logo.png') },
  { name: 'Samsung', mark: 'SAMSUNG', color: '#0B315A', image: require('../../assets/images/brands/samsung logo.png') },
  { name: 'Wrenchers', mark: 'WRENCHERS', color: '#4F46E5', image: require('../../assets/images/brands/wrenchers logo.png') },
  { name: 'Yuvraj', mark: 'YUVRAJ', color: '#C33B2C', image: require('../../assets/images/brands/yuvrajlogo.png') },
  { name: 'APL Apollo', mark: 'AP', color: '#0B315A' },
  { name: 'Diamond', mark: 'DIAMOND', color: '#2E647A' },
  { name: 'JWS Paints', mark: 'JWS', color: '#C33B2C' },
  { name: 'Berger', mark: 'BERGER', color: '#E14D2A' },
  { name: 'Nerolac', mark: 'NEROLAC', color: '#D22F2F' },
  { name: 'Havells', mark: 'havells', color: '#E1372C' },
  { name: 'Polycab', mark: 'POLYCAB', color: '#D8212D' },
  { name: 'Finolex', mark: 'FINOLEX', color: '#174A83' },
  { name: 'Crompton', mark: 'CROMPTON', color: '#D72F2F' },
  { name: 'Astral', mark: 'ASTRAL', color: '#1C5794' },
  { name: 'Jaquar', mark: 'jaquar', color: '#263E6A' },
  { name: 'Supreme', mark: 'SUPREME', color: '#D8342B' },
  { name: 'Prince', mark: 'PRINCE', color: '#19744D' },
] as const;

function BrandLogo({ brand }: { brand: Brand }) {
  return brand.image ? <Image accessibilityLabel={`${brand.name} logo`} source={brand.image} style={styles.logoImage} resizeMode="contain" /> : <Text accessibilityLabel={`${brand.name} logo`} style={[styles.logoMark, { color: brand.color }, brand.name === 'Asian Paints' && styles.asianPaintsMark, brand.name === 'CERA' && styles.ceraMark, brand.name === 'Samsung' && styles.samsungMark]}>{brand.mark}</Text>;
}

export function TopBrands() {
  const styles = useCustomerStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const cardWidth = compact ? Math.min(320, Math.max(0, width - 96)) : 214;
  const gap = compact ? 12 : 18;
  const viewportWidth = Math.max(0, width - (compact ? 32 : 56));
  const trackPadding = compact ? Math.max(2, (viewportWidth - cardWidth) / 2) : 2;
  const maxOffset = Math.max(0, brands.length * (cardWidth + gap) - gap + trackPadding * 2 - viewportWidth);

  const move = useCallback((direction: 1 | -1, animated = true) => {
    const step = cardWidth + gap;
    const next = offsetRef.current + direction * step;
    const normalized = next > maxOffset ? 0 : next < 0 ? maxOffset : next;
    offsetRef.current = normalized;
    scrollRef.current?.scrollTo({ x: normalized, animated });
  }, [cardWidth, gap, maxOffset]);

  useEffect(() => {
    offsetRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [cardWidth, gap]);

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>Top Brands</Text>
      <View style={styles.titleRule} />
      <View style={styles.carousel}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.track, { gap, paddingHorizontal: trackPadding }]}
          accessibilityLabel="Top brands"
        >
          {brands.map((brand) => (
            <View key={brand.name} style={[styles.card, { width: cardWidth }]}>
              <View style={[styles.logoFrame, { borderColor: `${brand.color}32` }]}>
                <BrandLogo brand={brand} />
              </View>
            </View>
          ))}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous brands" onPress={() => move(-1)} style={({ pressed }) => [styles.arrow, styles.arrowLeft, pressed && styles.pressed]}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next brands" onPress={() => move(1)} style={({ pressed }) => [styles.arrow, styles.arrowRight, pressed && styles.pressed]}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoImage: { width: '88%', height: 74 },
});

const createStyles = (c: ThemeColors) => StyleSheet.create({
  section: { backgroundColor: c.surfaceSunken, paddingHorizontal: 28, paddingTop: 58, paddingBottom: 42 },
  title: { color: c.cream, fontSize: 44, lineHeight: 52, fontWeight: '900', textAlign: 'center', letterSpacing: -1.1 },
  titleCompact: { fontSize: 31, lineHeight: 38 },
  titleRule: { width: 144, height: 4, borderRadius: 2, backgroundColor: c.teal, alignSelf: 'center', marginTop: 24, marginBottom: 36 },
  carousel: { position: 'relative', maxWidth: 1500, width: '100%', alignSelf: 'center' },
  track: { paddingHorizontal: 2, paddingVertical: 2 },
  card: { height: 168, borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  logoFrame: { width: '100%', height: 86, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  logoMark: { fontSize: 25, lineHeight: 29, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  asianPaintsMark: { fontSize: 19, lineHeight: 19, fontWeight: '900', letterSpacing: 0 },
  ceraMark: { fontSize: 30, fontWeight: '900', letterSpacing: 2.4 },
  samsungMark: { fontSize: 16, letterSpacing: 1.1 },
  arrow: { position: 'absolute', top: '50%', marginTop: -23, width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', shadowColor: c.shadow, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  arrowLeft: { left: -1 },
  arrowRight: { right: -1 },
  arrowText: { color: c.cream, fontSize: 33, lineHeight: 36, fontWeight: '400', marginTop: -3 },
  pressed: { opacity: 0.7 },
});

