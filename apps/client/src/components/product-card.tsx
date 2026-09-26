import { technicianServiceTypes, type Product } from '@/shared/contracts';
import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { formatMoney, priceIncludingGstInPaise } from '@/shared/domain';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ProductVisual } from '@/components/product-visual';
import { StarRating } from '@/components/star-rating';
import { useAppState } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useCustomerStyles as useThemedStyles } from '@/theme/customer-theme';
import { useLanguage } from '@/state/language-context';

export function ProductCard({ product, width }: { product: Product; width: number | `${number}%` }) {
  const router = useRouter();
  const { cart, addToCart, startBuyNow, decrement, toggleWishlist, wishlist, showNotice } = useAppState();
  const { user } = useAuth();
  const styles = useThemedStyles(createStyles);
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const compact = screenWidth < 560;
  const saved = wishlist.includes(product.id);
  const quantity = cart[product.id] ?? 0;
  const compareAtPrice = getCompareAtPrice(product);
  const displayPrice = priceIncludingGstInPaise(product.priceInPaise, product.gstRate);
  const displayCompareAtPrice = compareAtPrice ? priceIncludingGstInPaise(compareAtPrice, product.gstRate) : undefined;
  const discount = compareAtPrice
    ? Math.round((1 - product.priceInPaise / compareAtPrice) * 100)
    : 0;
  const lowStock = product.stock > 0 && product.stock <= 10;
  const technicianService = getTechnicianService(product);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [entrance]);

  function requireCustomer() {
    if (!user || user.role === 'CUSTOMER') return true;
    showNotice(t('Sign in as a customer to buy products.'));
    router.replace('/customer/login' as never);
    return false;
  }

  function buyNow() {
    if (!requireCustomer()) return;
    startBuyNow(product, 1);
    router.push('/cart');
  }

  return (
    <Animated.View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { width },
        {
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      <Pressable
        onPress={() => router.push(`/product/${product.id}`)}
        style={({ pressed }) => [styles.visualLink, compact && styles.visualLinkCompact, pressed && styles.pressed]}
        accessibilityRole="link"
        accessibilityLabel={`View ${product.name}`}
      >
        <ProductVisual product={product} compact={compact} />
        {product.badge ? <Text style={[styles.badge, compact && styles.badgeCompact]}>{product.badge}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={(event) => { event.stopPropagation(); toggleWishlist(product.id); }}
          hitSlop={8}
          style={[styles.heart, compact && styles.heartCompact, saved && styles.heartSaved]}
          accessibilityLabel={`${saved ? 'Remove' : 'Add'} ${product.name} ${saved ? 'from' : 'to'} wishlist`}
        >
          <Text style={[styles.heartText, saved && styles.heartTextSaved]}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      </Pressable>
      <View style={[styles.info, compact && styles.infoCompact]}>
        <View style={styles.metaRow}>
          <Text style={[styles.category, compact && styles.categoryCompact]}>{t(product.category)}</Text>
          {product.serviceAvailable ? <View style={styles.servicePill}><Text style={styles.servicePillText}>{t('INSTALLATION')}</Text></View> : null}
        </View>
        <Pressable onPress={() => router.push(`/product/${product.id}`)}>
          <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={2}>
            <Text style={[styles.brand, compact && styles.brandCompact]}>{product.brand}</Text> {product.name}
          </Text>
        </Pressable>
        <StarRating rating={product.rating} reviewCount={product.reviewCount} />
        <View style={styles.priceRow}>
          <Text style={[styles.price, compact && styles.priceCompact]}>{formatMoney(displayPrice)}</Text>
          {displayCompareAtPrice ? <Text style={styles.compare}>{formatMoney(displayCompareAtPrice)}</Text> : null}
          {discount ? <Text style={styles.discount}>{discount}% off</Text> : null}
        </View>
        <Text style={[styles.stock, compact && styles.stockCompact, lowStock && styles.stockLow]}>{lowStock ? `${t('Only')} ${product.stock} ${t('left')}` : t('In stock')} · GST {product.gstRate ?? 18}% included</Text>

        {quantity > 0 ? (
          <>
            <View style={styles.quantityControl} accessibilityLabel={`${quantity} ${product.name} in cart`}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${product.name} quantity`}
                style={({ pressed }) => [styles.quantityButton, pressed && styles.pressed]}
                onPress={() => decrement(product.id)}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </Pressable>
              <Text style={styles.quantityNumber}>{quantity} {t('in cart')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Increase ${product.name} quantity`}
                style={({ pressed }) => [styles.quantityButton, pressed && styles.pressed]}
                onPress={() => { if (requireCustomer()) addToCart(product); }}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Buy ${product.name} now`}
              style={({ pressed }) => [styles.buyButton, compact && styles.buyButtonCompact, pressed && styles.pressed]}
              onPress={buyNow}
            >
              <Text style={[styles.buyButtonText, compact && styles.buyButtonTextCompact]}>Buy now</Text>
            </Pressable>
          </>
        ) : (
          <View style={[styles.buttonRow, compact && styles.buttonRowCompact]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Buy ${product.name} now`}
              style={({ pressed }) => [styles.buyButton, compact && styles.buyButtonCompact, pressed && styles.pressed]}
              onPress={buyNow}
            >
              <Text style={[styles.buyButtonText, compact && styles.buyButtonTextCompact]}>Buy now</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add ${product.name} to cart`}
              style={({ pressed }) => [styles.addButton, compact && styles.addButtonCompact, pressed && styles.pressed]}
              onPress={() => { if (requireCustomer()) addToCart(product); }}
            >
              <Text style={[styles.addButtonText, compact && styles.addButtonTextCompact]}>{t('Add to cart')}</Text>
            </Pressable>
          </View>
        )}
        {technicianService ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${technicianService.label} for ${product.name}`}
            onPress={() => router.push({ pathname: '/services/nearby', params: { serviceType: technicianService.serviceType } })}
            style={({ pressed }) => [styles.technicianLink, compact && styles.technicianLinkCompact, pressed && styles.pressed]}
          >
            <View style={[styles.technicianDetails, compact && styles.technicianDetailsCompact]}>
              <View style={[styles.technicianIcon, compact && styles.technicianIconCompact]}><Text style={[styles.technicianIconText, compact && styles.technicianIconTextCompact]}>⚒</Text></View>
              <View style={styles.technicianCopy}>
                <Text style={[styles.technicianTitle, compact && styles.technicianTitleCompact]}>+ {technicianService.label}</Text>
                <Text style={[styles.technicianSubtitle, compact && styles.technicianSubtitleCompact]} numberOfLines={compact ? 2 : undefined}>{t('Add the matching pro')}</Text>
              </View>
            </View>
            <Text style={[styles.technicianPrice, compact && styles.technicianPriceCompact]}>₹399</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

function getTechnicianService(product: Product) {
  if (product.category === 'Electrical' || product.category === 'Electronics') {
    return { label: 'Electrician visit', serviceType: technicianServiceTypes[0] };
  }
  if (product.category === 'Paint') {
    return { label: 'Painter visit', serviceType: technicianServiceTypes[5] };
  }
  if (product.category === 'Plumbing' || product.category === 'PVC & Plumbing' || product.category === 'PVC PIPE' || product.category === 'Sanitary') {
    return { label: 'Plumber visit', serviceType: technicianServiceTypes[11] };
  }
  if (product.category === 'Hardware') {
    return { label: 'Hardware installation', serviceType: technicianServiceTypes[10] };
  }
  return { label: 'Installation visit', serviceType: technicianServiceTypes[1] };
}

function getCompareAtPrice(product: Product) {
  if (product.compareAtPriceInPaise && product.compareAtPriceInPaise > product.priceInPaise) {
    return product.compareAtPriceInPaise;
  }
  const discountLabel = product.specifications?.sourceDiscountLabel;
  if (typeof discountLabel !== 'string') return undefined;
  const match = discountLabel.match(/(\d+(?:\.\d+)?)\s*%/);
  const discountPercent = match ? Number(match[1]) : 0;
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) return undefined;
  return Math.round(product.priceInPaise / (1 - discountPercent / 100));
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    minWidth: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  cardCompact: { borderRadius: radius.md },
  visualLink: { height: 224, minHeight: 224, maxHeight: 224, flexGrow: 0, flexShrink: 0, padding: spacing.sm, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  visualLinkCompact: { height: 124, minHeight: 124, maxHeight: 124, padding: 5 },
  badge: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    color: '#FFFFFF',
    backgroundColor: colors.cta,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    overflow: 'hidden',
  },
  badgeCompact: { left: 8, top: 8, paddingHorizontal: 7, paddingVertical: 4, fontSize: 8 },
  heart: {
    position: 'absolute', right: spacing.md, top: spacing.md, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  heartCompact: { right: 8, top: 8, width: 29, height: 29, borderRadius: 15 },
  heartSaved: { borderColor: colors.cta, backgroundColor: colors.copperTint },
  heartText: { color: colors.muted, fontSize: 19, lineHeight: 21 },
  heartTextSaved: { color: colors.cta },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  category: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 1 },
  categoryCompact: { fontSize: 8, letterSpacing: 0.55 },
  servicePill: { backgroundColor: colors.tealTint, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  servicePillText: { color: colors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.45 },
  info: { padding: spacing.lg, paddingTop: spacing.md, marginTop: 15, gap: 8, flex: 1 },
  infoCompact: { padding: spacing.sm, paddingTop: spacing.sm, marginTop: 0, gap: 5 },
  brand: { color: colors.teal, fontSize: 14.5, fontWeight: '900' },
  brandCompact: { fontSize: 11 },
  name: { color: colors.cream, fontSize: 14.5, lineHeight: 20, fontWeight: '600', minHeight: 40 },
  nameCompact: { fontSize: 11.5, lineHeight: 15, minHeight: 30 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  price: { color: colors.cream, fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  priceCompact: { fontSize: 18 },
  compare: { color: colors.muted, fontSize: 15, textDecorationLine: 'line-through' },
  discount: { color: colors.success, fontSize: 15, fontWeight: '900' },
  stock: { color: colors.success, fontSize: 11.5, fontWeight: '800', marginTop: 1 },
  stockCompact: { fontSize: 9.5 },
  stockLow: { color: colors.danger },
  buttonRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 5 },
  buttonRowCompact: { gap: 5, marginTop: 2 },
  buyButton: { flex: 1, minHeight: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, backgroundColor: colors.cta, borderWidth: 1, borderColor: colors.cta, shadowColor: colors.cta, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 2 },
  buyButtonCompact: { minHeight: 34, borderRadius: radius.sm, paddingHorizontal: 4 },
  buyButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  buyButtonTextCompact: { fontSize: 9.5 },
  addButton: { flex: 1, marginTop: 0, minHeight: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, backgroundColor: colors.cta, shadowColor: colors.cta, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 2 },
  addButtonCompact: { marginTop: 2, minHeight: 34, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  addButtonTextCompact: { fontSize: 10.5 },
  technicianLink: { marginTop: 4, minHeight: 66, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  technicianLinkCompact: { marginTop: 2, minHeight: 50, gap: 5, padding: 6, borderRadius: radius.sm },
  technicianDetails: { flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  technicianDetailsCompact: { flexBasis: 96, minWidth: 96, gap: 6 },
  technicianIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line },
  technicianIconCompact: { width: 30, height: 30, borderRadius: 7 },
  technicianIconText: { color: colors.cta, fontSize: 20, lineHeight: 22 },
  technicianIconTextCompact: { fontSize: 15, lineHeight: 17 },
  technicianCopy: { flex: 1, minWidth: 0, gap: 2 },
  technicianTitle: { color: colors.cream, fontSize: 13, lineHeight: 17, fontWeight: '800' },
  technicianTitleCompact: { fontSize: 10.5, lineHeight: 12.5 },
  technicianSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  technicianSubtitleCompact: { fontSize: 9, lineHeight: 11 },
  technicianPrice: { color: colors.cta, fontSize: 14, fontWeight: '900', marginLeft: 'auto' },
  technicianPriceCompact: { fontSize: 12, lineHeight: 14 },
  quantityControl: { marginTop: 5, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.cta, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.copperTint, paddingHorizontal: 4 },
  quantityButton: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cta },
  quantityButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', lineHeight: 18 },
  quantityNumber: { color: colors.cream, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
