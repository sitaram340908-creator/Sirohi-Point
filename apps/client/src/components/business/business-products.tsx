import type { Product } from '@/shared/contracts';
import type { ThemeColors } from '@/shared/design-tokens';
import { formatMoney, priceIncludingGstInPaise } from '@/shared/domain';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useAppState } from '@/state/app-context';
import { useBusinessStyles } from '@/theme/business-theme';
import { useAuth } from '@/state/auth-context';
import { PortalButton, StatusBadge } from './business-ui';

export const businessCollections = [
  { name: 'Hardware', caption: 'Made for the hard work', image: require('../../../assets/images/products/hardware-pata-bolt.png') },
  { name: 'Electrical', caption: 'Power every project', image: require('../../../assets/images/products/electrical-copper-wire.png') },
  { name: 'Electronics', caption: 'Everyday bright ideas', image: require('../../../assets/images/products/electronics-led-panel.png') },
  { name: 'Paint', caption: 'A better finish', image: require('../../../assets/images/products/paint-interior-emulsion.png') },
  { name: 'PVC & Plumbing', caption: 'Keep things flowing', image: require('../../../assets/images/products/pvc-elbow.png') },
  { name: 'Sanitary', caption: 'Details that deliver', image: require('../../../assets/images/products/sanitary-basin-mixer.png') },
];

export function ProductVisual({ product, compact = false, style }: { product: Product; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const styles = useBusinessStyles(createStyles);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasImage = Boolean(product.imageUrl) && failedUrl !== product.imageUrl;
  return <View style={[styles.visual, compact && styles.compactVisual, style]}>{hasImage ? <Image accessibilityLabel={product.name} source={{ uri: product.imageUrl! }} onError={() => setFailedUrl(product.imageUrl ?? null)} resizeMode="contain" style={styles.image} /> : <View style={styles.placeholder}><Text style={styles.placeholderIcon}>▧</Text><Text style={styles.placeholderText}>Image coming soon</Text></View>}</View>;
}

export function BusinessProductCard({ product, style }: { product: Product; style?: StyleProp<ViewStyle> }) {
  const styles = useBusinessStyles(createStyles);
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const router = useRouter();
  const { addToCart, startBuyNow } = useAppState();
  const { user, token } = useAuth();
  const priceVisible = user?.role === 'BUSINESS' && Boolean(token) && product.priceVisible !== false;
  const price = product.b2bPriceInPaise ?? product.priceInPaise;
  const displayPrice = priceIncludingGstInPaise(price, product.gstRate);
  const minimum = product.minimumB2BQuantity ?? 1;
  const unavailable = !product.allowB2BBackorder && product.stock < minimum;
  const compare = product.b2cPriceInPaise;
  const displayCompare = compare ? priceIncludingGstInPaise(compare, product.gstRate) : undefined;
  const saving = priceVisible && compare && compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [entrance]);
  return <Animated.View style={[styles.productCard, compact && styles.productCardCompact, style, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
    <Pressable accessibilityRole="link" accessibilityLabel={`View ${product.name}`} onPress={() => router.push(`/business/product/${product.id}` as never)} style={({ pressed }) => [styles.productLink, pressed && { opacity: 0.8 }]}>
      <View style={[styles.imageArea, compact && styles.imageAreaCompact]}><ProductVisual product={product} style={[styles.cardVisual, compact && styles.cardVisualCompact]} /><View style={styles.imageBadge}><StatusBadge label={saving ? `${saving}% below retail` : 'BUSINESS ESSENTIAL'} tone={saving ? 'warning' : 'neutral'} /></View></View>
      <View style={[styles.productInfo, compact && styles.productInfoCompact]}><Text style={[styles.brand, compact && styles.brandCompact]}>{product.brand}</Text><Text numberOfLines={2} style={[styles.productName, compact && styles.productNameCompact]}>{product.name}</Text><Text style={[styles.category, compact && styles.categoryCompact]}>{product.category}</Text><View style={styles.priceRow}>{priceVisible ? <><Text style={[styles.price, compact && styles.priceCompact]}>{formatMoney(displayPrice)}</Text>{saving ? <Text style={styles.oldPrice}>{formatMoney(displayCompare!)}</Text> : null}</> : <PortalButton label="Reveal Price" compact={compact} onPress={() => router.push('/business/login' as never)} />}</View>{priceVisible ? <Text numberOfLines={1} style={[styles.priceNote, compact && styles.priceNoteCompact]}>per unit · GST {product.gstRate ?? 18}% included</Text> : <Text numberOfLines={1} style={[styles.priceNote, compact && styles.priceNoteCompact]}>Sign in to see business pricing</Text>}</View>
    </Pressable>
    <View style={[styles.buyArea, compact && styles.buyAreaCompact]}><View style={[styles.terms, compact && styles.termsCompact]}><Text style={[styles.minimum, compact && styles.minimumCompact]}>MOQ {minimum} units</Text><Text style={[styles.stock, compact && styles.stockCompact, unavailable && styles.unavailable]}>{unavailable ? 'Unavailable' : product.stock >= minimum ? '● In stock' : 'Backorder'}</Text></View><View style={styles.actionRow}><View style={styles.actionButton}><PortalButton label="Buy now" compact={compact} disabled={unavailable} onPress={() => { startBuyNow(product, minimum); router.push('/business/cart' as never); }} /></View><View style={styles.actionButton}><PortalButton label={unavailable ? 'Insufficient stock' : compact ? 'Add to cart +' : `Add ${minimum} to cart  +`} compact={compact} disabled={unavailable} onPress={() => addToCart(product, minimum)} /></View></View></View>
  </Animated.View>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  visual: { width: '100%', height: 330, borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, compactVisual: { width: '100%', height: '100%', borderRadius: 12 }, image: { width: '100%', height: '100%' }, placeholder: { padding: 12, alignItems: 'center', gap: 8 }, placeholderIcon: { color: '#718397', fontSize: 30 }, placeholderText: { color: '#627185', fontSize: 11, textAlign: 'center' }, actionRow: { flexDirection: 'row', gap: 8 }, actionButton: { flex: 1 },
  productCard: { borderWidth: 1, borderColor: c.line, borderRadius: 18, backgroundColor: c.surface, overflow: 'hidden' }, productCardCompact: { borderRadius: 12 }, productLink: { flex: 1 }, imageArea: { backgroundColor: '#FFFFFF', padding: 18, paddingTop: 42 }, imageAreaCompact: { padding: 8, paddingTop: 28 }, cardVisual: { height: 185, borderRadius: 0 }, cardVisualCompact: { height: 108 }, imageBadge: { position: 'absolute', top: 12, left: 12 }, productInfo: { paddingHorizontal: 18, paddingTop: 18, gap: 7 }, productInfoCompact: { paddingHorizontal: 9, paddingTop: 9, gap: 4 }, brand: { color: c.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }, brandCompact: { fontSize: 8, letterSpacing: 0.6 }, productName: { color: c.cream, fontSize: 16, lineHeight: 23, minHeight: 46, fontWeight: '700' }, productNameCompact: { fontSize: 11.5, lineHeight: 15, minHeight: 30 }, category: { color: c.muted, fontSize: 12 }, categoryCompact: { fontSize: 9 }, priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 7 }, price: { color: c.cream, fontSize: 25, fontWeight: '800', letterSpacing: -0.8 }, priceCompact: { fontSize: 18 }, oldPrice: { color: c.muted, fontSize: 12, textDecorationLine: 'line-through' }, priceNote: { color: c.muted, fontSize: 10, lineHeight: 16 }, priceNoteCompact: { fontSize: 8.5, lineHeight: 12 }, buyArea: { padding: 18, gap: 14 }, buyAreaCompact: { padding: 9, gap: 7 }, terms: { borderTopWidth: 1, borderColor: c.line, paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }, termsCompact: { paddingTop: 7, gap: 3 }, minimum: { color: c.cream, fontSize: 11, fontWeight: '700' }, minimumCompact: { fontSize: 9 }, stock: { color: c.success, fontSize: 11, fontWeight: '600' }, stockCompact: { fontSize: 9 }, unavailable: { color: c.copper },
});
