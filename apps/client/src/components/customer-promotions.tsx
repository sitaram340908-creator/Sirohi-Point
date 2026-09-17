import type { Banner, Product } from '@sirohi/contracts';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '@/theme/theme-context';

export const customerCollections = [
  { category: 'Paint', title: 'A fresh colour.\nA fresh beginning.', copy: 'Give your favourite spaces a little more personality.', label: 'THE HOME REFRESH', color: '#312E81', gradient: '#1E3A8A', accent: '#C4B5FD', image: require('../../assets/images/products/paint-interior-emulsion.png') },
  { category: 'Sanitary', title: 'Small details.\nBeautiful spaces.', copy: 'Finishing touches that make your bathroom feel complete.', label: 'EVERYDAY ELEVATED', color: '#0F766E', gradient: '#164E63', accent: '#99F6E4', image: require('../../assets/images/products/sanitary-basin-mixer.png') },
  { category: 'Electrical', title: 'Make the switch\nto something better.', copy: 'Discover electrical essentials for every corner of your home.', label: 'SMART LITTLE UPGRADES', color: '#3730A3', gradient: '#172554', accent: '#A5B4FC', image: require('../../assets/images/products/electrical-modular-switch.png') },
  { category: 'Hardware', title: 'Big ideas.\nStrong foundations.', copy: 'Everyday hardware that keeps every project together.', label: 'READY FOR YOUR NEXT PROJECT', color: '#1E293B', gradient: '#0F172A', accent: '#93C5FD', image: require('../../assets/images/products/hardware-pata-bolt.png') },
  { category: 'Electronics', title: 'A brighter way\nto come home.', copy: 'Explore lighting and electronics for spaces you love.', label: 'LIGHT UP THE EVERYDAY', color: '#0C4A6E', gradient: '#164E63', accent: '#7DD3FC', image: require('../../assets/images/products/electronics-led-panel.png') },
  { category: 'PVC & Plumbing', title: 'Keep your plans\nflowing smoothly.', copy: 'Find the right fittings for repairs, upgrades and new beginnings.', label: 'THE PRACTICAL PICKS', color: '#155E75', gradient: '#164E63', accent: '#67E8F9', image: require('../../assets/images/products/pvc-elbow.png') },
];

const offerSlides = [
  { offer: '20% OFF', kicker: 'PAINT & FINISHES', title: 'Fresh walls. Better moods.', copy: 'Paints, primers and waterproofing for your next room refresh.', service: 'Wall paints · Primers · Waterproofing', delivery: 'Fast delivery on local stock' },
  { offer: 'SAVE MORE', kicker: 'BATHROOM ESSENTIALS', title: 'Small details. Big difference.', copy: 'Reliable sanitaryware and fittings for a cleaner everyday space.', service: 'Faucets · Basins · Bathroom fittings', delivery: 'Fast delivery, project-ready picks' },
  { offer: 'BUY 1 GET 1', kicker: 'ELECTRICAL PICKS', title: 'Make the switch to better.', copy: 'Trusted switches, wires and essentials for every corner of home.', service: 'Switches · Wires · Lighting', delivery: 'Fast delivery on everyday essentials' },
  { offer: 'PROJECT VALUE', kicker: 'HARDWARE & TOOLS', title: 'Build it strong from the start.', copy: 'The practical hardware that keeps every repair and project moving.', service: 'Tools · Fasteners · Hardware', delivery: 'Fast delivery for urgent fixes' },
  { offer: 'UP TO 25% OFF', kicker: 'LIGHTING & ELECTRONICS', title: 'A brighter way to come home.', copy: 'Useful lighting and electronics with value built into every pick.', service: 'LEDs · Fixtures · Electronics', delivery: 'Fast delivery on selected products' },
  { offer: 'PROJECT READY', kicker: 'PVC & PLUMBING', title: 'Keep every plan flowing.', copy: 'Durable fittings for repairs, upgrades and new beginnings.', service: 'Pipes · Fittings · Plumbing', delivery: 'Fast delivery for your next job' },
] as const;

export function CustomerPromotions({ products, banners }: { products: Product[]; banners: Banner[] }) {
  const router = useRouter();
  const { resolvedTheme } = useAppTheme();
  const { height: viewportHeight } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const compact = containerWidth < 720;
  const small = containerWidth < 400;
  const spacious = containerWidth >= 1100;
  const heroHeight = Math.round(Math.max(compact ? 320 : 350, Math.min(620, viewportHeight * 0.52)));
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const lastWheelAt = useRef(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const slideCount = customerCollections.length;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setActive(value => (value + 1) % slideCount), 4000);
    return () => clearInterval(timer);
  }, [reduceMotion, slideCount]);

  const collection = customerCollections[active];
  const offer = offerSlides[active % offerSlides.length];
  const activeBanners = banners.filter(item => item.active && products.some(product => product.id === item.productId));
  const banner = activeBanners[active];
  const linkedProduct = banner ? products.find(product => product.id === banner.productId) : undefined;
  const category = linkedProduct?.category ?? collection.category;
  const imageUrl = banner?.imageUrl || linkedProduct?.imageUrl;
  // Banner uploads are returned by our API as data URIs. Ignore third-party
  // URLs and retain the bundled hero if an uploaded image cannot be rendered.
  const hasUploadedImage = Boolean(imageUrl?.startsWith('data:image/')) && failedImageUrl !== imageUrl;
  const savingsProducts = linkedProduct ? [linkedProduct] : products.filter(product => product.category === category && product.stock > 0);
  const savings = Math.max(0, ...savingsProducts.map(product => product.compareAtPriceInPaise && product.compareAtPriceInPaise > product.priceInPaise ? Math.floor((1 - product.priceInPaise / product.compareAtPriceInPaise) * 100) : 0));
  const title = banner?.title || offer.title;
  const copy = banner?.subtitle || offer.copy;
  const ctaLabel = banner?.ctaLabel || (linkedProduct ? 'View product' : 'Shop ' + (category === 'PVC & Plumbing' ? 'pvc pipe' : category.toLowerCase()));

  function openCollection() {
    if (linkedProduct) router.push('/product/' + linkedProduct.id);
    else router.push({ pathname: '/catalog', params: { category: collection.category } });
  }
  function changeSlide(index: number) { setActive((index + slideCount) % slideCount); }
  function handleWheel(event: unknown) {
    const deltaY = (event as { nativeEvent?: { deltaY?: number } }).nativeEvent?.deltaY ?? 0;
    const now = Date.now();
    if (!deltaY || now - lastWheelAt.current < 2000) return;
    lastWheelAt.current = now;
    setActive(value => (value + (deltaY > 0 ? 1 : -1) + slideCount) % slideCount);
  }
  function getTouchPoint(event: unknown) {
    const nativeEvent = (event as {
      nativeEvent?: {
        pageX?: number;
        pageY?: number;
        touches?: Array<{ pageX?: number; pageY?: number }>;
        changedTouches?: Array<{ pageX?: number; pageY?: number }>;
      };
    }).nativeEvent;
    const touch = nativeEvent?.touches?.[0] || nativeEvent?.changedTouches?.[0];
    const x = touch?.pageX ?? nativeEvent?.pageX;
    const y = touch?.pageY ?? nativeEvent?.pageY;
    return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
  }
  function handleTouchStart(event: unknown) {
    swipeStart.current = getTouchPoint(event);
  }
  function handleTouchEnd(event: unknown) {
    const start = swipeStart.current;
    const end = getTouchPoint(event);
    swipeStart.current = null;
    if (!start || !end) return;
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    setActive(value => (value + (deltaX < 0 ? 1 : -1) + slideCount) % slideCount);
  }

  return (
    <View style={styles.bannerWrap}>
      <ImageBackground
        onLayout={event => setContainerWidth(Math.round(event.nativeEvent.layout.width))}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        source={hasUploadedImage ? { uri: imageUrl } : require('../../assets/images/sirohi-ecosystem-hero.png')}
        imageStyle={styles.heroBackgroundImage}
        resizeMode="cover"
        onError={() => { if (imageUrl) setFailedImageUrl(imageUrl); }}
        style={[styles.hero, { backgroundColor: collection.color, minHeight: heroHeight }, small && styles.heroSmall]}
      >
        <View pointerEvents="none" style={styles.heroGradient} />
        <View style={[styles.main, spacious && styles.mainSpacious, compact && styles.mainCompact, { minHeight: heroHeight }]}>
          <View style={[styles.copyBlock, compact && styles.copyBlockCompact]}>
            <View style={styles.eyebrowRow}>
              <View style={[styles.eyebrowMark, { backgroundColor: collection.accent }]} />
              <Text style={[styles.eyebrow, { color: collection.accent }]}>{banner?.badge || offer.kicker}</Text>
            </View>
            <View style={styles.offerBadge}><Text style={styles.offerBadgeText}>{savings > 0 ? savings + '% OFF' : offer.offer}</Text></View>
            <Text accessibilityRole="header" style={[styles.title, spacious && styles.titleSpacious, compact && styles.titleCompact, small && styles.titleSmall]}>{title}</Text>
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{copy}</Text>
            <Pressable
              accessibilityRole="link"
              onPress={openCollection}
              style={({ pressed }) => [styles.button, compact && styles.buttonCompact, small && styles.buttonSmall, pressed && styles.pressed]}
            >
              <Text style={styles.buttonText}>{ctaLabel}</Text>
              <Text accessible={false} style={styles.buttonArrow}>↗</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel={'Explore ' + category}
            onPress={openCollection}
            style={({ pressed }) => [styles.offerPanel, compact && styles.offerPanelCompact, pressed && styles.pressed]}
          >
            <Text style={styles.panelKicker}>WHAT WE OFFER</Text>
            <Text style={styles.panelCategory}>{category === 'PVC & Plumbing' ? 'PVC PIPE essentials' : category + ' essentials'}</Text>
            <Text style={styles.panelServices}>{offer.service}</Text>
            <View style={styles.deliveryPill}><Text style={styles.deliveryPillText}>FAST DELIVERY</Text></View>
            <Text style={styles.deliveryCopy}>{offer.delivery}</Text>
          </Pressable>
        </View>
      </ImageBackground>

      <View style={[styles.controls, compact && styles.controlsCompact]}>
        <View style={styles.pagination}>
          {customerCollections.map((item, index) => (
            <Pressable
              key={item.category}
              accessibilityRole="button"
              accessibilityLabel={'Show banner ' + (index + 1) + ': ' + (activeBanners[index]?.title || item.category)}
              accessibilityState={{ selected: active === index }}
              onPress={() => changeSlide(index)}
              style={styles.dotHit}
            >
              <View style={[styles.dot, resolvedTheme === 'light' && styles.dotLight, active === index && styles.activeDot, active === index && resolvedTheme === 'light' && styles.activeDotLight]} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { width: '100%', marginTop: 18 },
  hero: { width: '100%', borderRadius: 24, overflow: 'hidden' },
  heroSmall: { borderRadius: 16 },
  heroBackgroundImage: { borderRadius: 24 },
  heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7, 15, 27, 0.68)' },
  main: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 34, gap: 28, position: 'relative' },
  mainSpacious: { paddingHorizontal: 54, paddingVertical: 44, gap: 60 },
  mainCompact: { flexDirection: 'column', alignItems: 'stretch', padding: 16, gap: 18 },
  copyBlock: { flex: 1, minWidth: 0, maxWidth: 650, justifyContent: 'center', paddingVertical: 8, zIndex: 1 },
  copyBlockCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', maxWidth: '100%', paddingVertical: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  eyebrowMark: { width: 8, height: 8, borderRadius: 4 },
  eyebrow: { flexShrink: 1, fontSize: 11, lineHeight: 17, fontWeight: '900', letterSpacing: 1.6 },
  offerBadge: { alignSelf: 'flex-start', marginTop: 20, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FF6B2C' },
  offerBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
  title: { fontSize: 42, lineHeight: 46, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.4, marginTop: 14, maxWidth: 620 },
  titleSpacious: { fontSize: 56, lineHeight: 59, letterSpacing: -2 },
  titleCompact: { fontSize: 29, lineHeight: 33, letterSpacing: -0.8, marginTop: 12 },
  titleSmall: { fontSize: 25, lineHeight: 29, letterSpacing: -0.6 },
  subtitle: { fontSize: 16, lineHeight: 24, color: '#EAF1F7', maxWidth: 510, marginTop: 14 },
  subtitleCompact: { fontSize: 13, lineHeight: 19, maxWidth: '100%', marginTop: 10 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24, backgroundColor: '#FFFFFF', paddingHorizontal: 21, paddingVertical: 13, minHeight: 50, borderRadius: 10, alignSelf: 'flex-start', marginTop: 24 },
  buttonCompact: { gap: 14, paddingHorizontal: 16, paddingVertical: 9, minHeight: 43, borderRadius: 9, marginTop: 16 },
  buttonSmall: { alignSelf: 'stretch' },
  buttonText: { flexShrink: 1, color: '#182D45', fontSize: 14, lineHeight: 21, fontWeight: '900' },
  buttonArrow: { color: '#182D45', fontSize: 22, lineHeight: 25 },
  offerPanel: { width: 285, minHeight: 205, padding: 22, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', backgroundColor: 'rgba(7, 15, 27, 0.58)', justifyContent: 'center', zIndex: 1 },
  offerPanelCompact: { width: '100%', minHeight: 0, padding: 16, borderRadius: 14, justifyContent: 'flex-start' },
  panelKicker: { color: '#FFB08E', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  panelCategory: { color: '#FFFFFF', fontSize: 21, lineHeight: 27, fontWeight: '900', marginTop: 10 },
  panelServices: { color: '#D8E5F0', fontSize: 13, lineHeight: 20, marginTop: 8 },
  deliveryPill: { alignSelf: 'flex-start', marginTop: 18, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: '#D1FAE5' },
  deliveryPillText: { color: '#047857', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  deliveryCopy: { color: '#C7D6E4', fontSize: 11, lineHeight: 17, marginTop: 7 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 5, paddingBottom: 1, gap: 12 },
  controlsCompact: { paddingHorizontal: 0, paddingTop: 3, paddingBottom: 0, gap: 6 },
  pagination: { flexDirection: 'row', alignItems: 'center' },
  dotHit: { width: 22, minHeight: 34, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotLight: { backgroundColor: 'rgba(24,45,69,0.35)' },
  activeDot: { width: 22, backgroundColor: '#FFFFFF' },
  activeDotLight: { backgroundColor: '#182D45' },
  pressed: { opacity: 0.84 },
});
