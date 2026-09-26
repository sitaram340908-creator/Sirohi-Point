import { formatMoney, priceIncludingGstInPaise } from '@/shared/domain';
import type { ThemeColors } from '@/shared/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/business/business-ui';
import { ProductVisual } from '@/components/business/business-products';
import { getB2BProduct } from '@/lib/api';
import { useAppState } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useBusinessStyles } from '@/theme/business-theme';

export default function BusinessProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useBusinessStyles(createStyles);
  const { addToCart, startBuyNow } = useAppState();
  const { token, user } = useAuth();
  const liveProduct = useQuery({ queryKey: ['catalog', 'b2b', id], queryFn: () => getB2BProduct(token ?? undefined, id), enabled: Boolean(id) && (!user || (user.role === 'BUSINESS' && Boolean(token))) });
  const product = liveProduct.data;
  const minimum = product?.minimumB2BQuantity ?? 1;
  const priceVisible = user?.role === 'BUSINESS' && Boolean(token) && product?.priceVisible !== false;
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(minimum);
  }, [minimum, id]);

  if (liveProduct.isLoading) return <PortalShell eyebrow="B2B CATALOGUE" title="Loading product details…" copy="Getting the latest wholesale price, buying terms, and availability."><PortalCard title="Loading product data…" /></PortalShell>;
  if (!product) return <PortalShell eyebrow="B2B CATALOGUE" title={liveProduct.isError ? 'Product details unavailable' : 'Product not found'} copy={liveProduct.isError && liveProduct.error instanceof Error ? liveProduct.error.message : 'Return to the business catalogue to choose another product.'}><PortalButton label="Back to B2B catalogue" onPress={() => router.replace('/business/catalog' as never)} /></PortalShell>;

  const b2bPrice = product.b2bPriceInPaise ?? product.priceInPaise;
  const displayPrice = priceIncludingGstInPaise(b2bPrice, product.gstRate);
  const total = displayPrice * quantity;
  return <PortalShell eyebrow="A CLOSER LOOK" title={product.name} copy={`${product.brand} · ${product.category}`} actions={<PortalButton label="Back to catalogue" secondary onPress={() => router.push('/business/catalog')} />}>
    <View style={styles.columns}>
      <PortalCard style={styles.productCard}><ProductVisual product={product} /><View style={styles.productInfo}><Text style={styles.brand}>{product.brand}</Text><Text style={styles.name}>{product.name}</Text><Text style={styles.description}>{product.description}</Text></View></PortalCard>
      <PortalCard style={styles.buyCard} title="Make it part of your next order" copy="Your business price, with clear quantities and availability.">
        {priceVisible ? <View style={styles.priceBlock}><Text style={styles.price}>{formatMoney(displayPrice)}</Text><Text style={styles.priceLabel}>B2B unit price · GST {product.gstRate ?? 18}% included</Text></View> : <View style={styles.priceBlock}><PortalButton label="Reveal Price" onPress={() => router.push('/business/login' as never)} /><Text style={styles.priceLabel}>Sign in to see business pricing</Text></View>}
        <View style={styles.termRow}><Text style={styles.termLabel}>Minimum order quantity</Text><Text style={styles.termValue}>{minimum} units</Text></View>
        <View style={styles.termRow}><Text style={styles.termLabel}>Available quantity</Text><Text style={styles.termValue}>{product.stock} units</Text></View>
        <StatusBadge label={product.allowB2BBackorder ? 'More than stock can be requested' : 'Order within available stock'} tone={product.allowB2BBackorder ? 'warning' : 'success'} />
        <View style={styles.quantityRow}><Text style={styles.termLabel}>Order quantity</Text><View style={styles.quantityControls}><Pressable accessibilityRole="button" accessibilityLabel="Decrease order quantity" disabled={quantity <= minimum} accessibilityState={{ disabled: quantity <= minimum }} onPress={() => setQuantity((value) => Math.max(minimum, value - 1))} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantityValue}>{quantity}</Text><Pressable accessibilityRole="button" accessibilityLabel="Increase order quantity" onPress={() => setQuantity((value) => value + 1)} style={styles.quantityButton}><Text style={styles.quantityText}>+</Text></Pressable></View></View>
        {priceVisible ? <View style={styles.totalRow}><Text style={styles.termLabel}>Estimated subtotal</Text><Text style={styles.total}>{formatMoney(total)}</Text></View> : null}
        {priceVisible ? <View style={styles.actionRow}><View style={styles.actionButton}><PortalButton label="Buy now" disabled={!product.allowB2BBackorder && quantity > product.stock} onPress={() => { startBuyNow(product, quantity); router.push('/business/cart' as never); }} /></View><View style={styles.actionButton}><PortalButton label={!product.allowB2BBackorder && product.stock < minimum ? 'Insufficient stock' : 'Add to bulk cart'} disabled={!product.allowB2BBackorder && quantity > product.stock} onPress={() => addToCart(product, quantity)} /></View></View> : null}
        <PortalButton label="Open bulk cart" secondary onPress={() => router.push('/business/cart' as never)} />
      </PortalCard>
    </View>
    <PortalCard title="Product specifications"><View style={styles.specList}>{Object.entries(product.specifications ?? {}).length ? Object.entries(product.specifications ?? {}).map(([key, value]) => <View key={key} style={styles.specRow}><Text style={styles.termLabel}>{key}</Text><Text style={styles.termValue}>{String(value)}</Text></View>) : <Text style={styles.description}>Additional specifications are not available for this product yet.</Text>}</View></PortalCard>
  </PortalShell>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  columns: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 },
  productCard: { flexGrow: 1.3, flexShrink: 1, flexBasis: 460 },
  buyCard: { flexGrow: 1, flexShrink: 1, flexBasis: 360 },
  productInfo: { gap: 5 },
  brand: { color: colors.teal, fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  name: { color: colors.cream, fontSize: 22, fontWeight: '900' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  priceBlock: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  price: { color: colors.cream, fontSize: 38, fontWeight: '900' },
  priceLabel: { color: colors.muted, fontSize: 13, marginTop: 3 },
  termRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  termLabel: { color: colors.muted, fontSize: 14, flexShrink: 1 },
  termValue: { color: colors.cream, fontSize: 14, fontWeight: '900', textAlign: 'right', flexShrink: 1 },
  quantityRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSunken },
  quantityText: { color: colors.cream, fontSize: 20, lineHeight: 22 },
  quantityValue: { minWidth: 28, color: colors.cream, textAlign: 'center', fontSize: 15, fontWeight: '900' },
  totalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
  total: { color: colors.cream, fontSize: 18, fontWeight: '900' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: { flex: 1, minWidth: 150 },
  specList: { gap: 12 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
