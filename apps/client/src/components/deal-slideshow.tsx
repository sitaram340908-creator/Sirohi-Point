import type { Product } from '@/shared/contracts';
import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { formatMoney, priceIncludingGstInPaise } from '@/shared/domain';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ProductVisual } from '@/components/product-visual';
import { useThemedStyles } from '@/theme/theme-context';

const AUTOPLAY_MS = 4500;
const RESUME_DELAY_MS = 3500;

export function DealSlideshow({ products, title = "Today's deals", priceSegment = 'B2C', onProductPress }: { products: Product[]; title?: string; priceSegment?: 'B2C' | 'B2B'; onProductPress?(product: Product): void }) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = products.length;
  const compact = containerWidth > 0 && containerWidth < 640;
  const height = compact ? 246 : Math.round(Math.min(340, Math.max(220, containerWidth * 0.34)));

  const goTo = useCallback((next: number, animated = true) => {
    if (!containerWidth || count === 0) return;
    const clamped = ((next % count) + count) % count;
    scrollRef.current?.scrollTo({ x: clamped * containerWidth, animated });
    indexRef.current = clamped;
    setIndex(clamped);
  }, [containerWidth, count]);

  useEffect(() => {
    if (!containerWidth || count <= 1) return undefined;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      goTo(indexRef.current + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [containerWidth, count, goTo]);

  function pauseAutoplay() {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }

  function scheduleResume() {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, RESUME_DELAY_MS);
  }

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!containerWidth) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / containerWidth);
    indexRef.current = next;
    setIndex(next);
  }

  if (!count) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Swipe for more offers</Text>
      </View>
      <View style={[styles.frame, { height }]} onLayout={(e) => setContainerWidth(Math.round(e.nativeEvent.layout.width))}>
        {containerWidth ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            onScrollBeginDrag={pauseAutoplay}
            onScrollEndDrag={scheduleResume}
            onTouchStart={pauseAutoplay}
            onTouchEnd={scheduleResume}
            accessibilityRole="adjustable"
            accessibilityLabel="Deals slideshow, swipe to browse"
          >
            {products.map((product) => (
              <Slide
                key={product.id}
                product={product}
                width={containerWidth}
                height={height}
                compact={compact}
                onPress={() => onProductPress ? onProductPress(product) : router.push(`/product/${product.id}`)}
                priceSegment={priceSegment}
                styles={styles}
              />
            ))}
          </ScrollView>
        ) : null}

        {!compact && count > 1 ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous deal" onPress={() => { pauseAutoplay(); goTo(index - 1); scheduleResume(); }} style={[styles.arrow, styles.arrowLeft]}>
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next deal" onPress={() => { pauseAutoplay(); goTo(index + 1); scheduleResume(); }} style={[styles.arrow, styles.arrowRight]}>
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {count > 1 ? (
        <View style={styles.dots}>
          {products.map((product, i) => (
            <Pressable
              key={product.id}
              accessibilityRole="button"
              accessibilityLabel={`Go to deal ${i + 1}`}
              hitSlop={8}
              onPress={() => { pauseAutoplay(); goTo(i); scheduleResume(); }}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

type SlideshowStyles = ReturnType<typeof createStyles>;

function Slide({ product, width, height, compact, onPress, styles, priceSegment }: { product: Product; width: number; height: number; compact: boolean; onPress(): void; styles: SlideshowStyles; priceSegment: 'B2C' | 'B2B' }) {
  const price = priceSegment === 'B2B' ? product.b2bPriceInPaise ?? product.priceInPaise : product.priceInPaise;
  const comparePrice = priceSegment === 'B2B' ? product.b2cPriceInPaise : product.compareAtPriceInPaise;
  const displayPrice = priceIncludingGstInPaise(price, product.gstRate);
  const displayComparePrice = comparePrice ? priceIncludingGstInPaise(comparePrice, product.gstRate) : undefined;
  const discount = comparePrice && comparePrice > price
    ? Math.round((1 - price / comparePrice) * 100)
    : 0;

  return (
    <Pressable onPress={onPress} style={[styles.slide, { width, height }, { backgroundColor: `${product.tone}17` }]} accessibilityRole="link" accessibilityLabel={`${product.name} deal, ${discount}% off`}>
      <View style={[styles.slideInner, compact && styles.slideInnerCompact]}>
        <View style={[styles.visualBox, compact && styles.visualBoxCompact]}>
          {discount ? <Text style={styles.badge}>{discount}% OFF</Text> : null}
          <ProductVisual product={product} style={styles.visual} />
        </View>
        <View style={[styles.copy, compact && styles.copyCompact]}>
          <Text style={styles.eyebrow}>DEAL OF THE DAY</Text>
          <Text style={styles.name} numberOfLines={2}>{product.brand} {product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatMoney(displayPrice)}</Text>
            {displayComparePrice && comparePrice && comparePrice > price ? <Text style={styles.compare}>{formatMoney(displayComparePrice)}</Text> : null}
          </View>
          <View style={styles.ctaButton}><Text style={styles.ctaText}>Shop now →</Text></View>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: colors.cream, fontSize: 19, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  frame: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  slide: { height: '100%' },
  slideInner: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.xl },
  slideInnerCompact: { flex: 1, flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  visualBox: { flex: 0.9, minWidth: 0, height: '78%', alignItems: 'center', justifyContent: 'center' },
  visualBoxCompact: { flexGrow: 0, flexShrink: 0, flexBasis: '42%', width: '42%', height: '100%', minHeight: 0, alignSelf: 'stretch', overflow: 'hidden', borderRadius: radius.sm, backgroundColor: '#FFFFFF' },
  visual: { width: '100%', height: '100%', minHeight: 0, backgroundColor: '#FFFFFF' },
  badge: { position: 'absolute', left: 0, top: 0, zIndex: 2, color: '#FFFFFF', backgroundColor: colors.cta, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.xs, fontSize: 11, fontWeight: '900' },
  copy: { flex: 1.1, minWidth: 0, gap: 4 },
  copyCompact: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, width: undefined, alignItems: 'flex-start', justifyContent: 'center' },
  eyebrow: { color: colors.danger, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  name: { color: colors.cream, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: 2 },
  price: { color: colors.cream, fontSize: 24, fontWeight: '900' },
  compare: { color: colors.muted, fontSize: 14, textDecorationLine: 'line-through' },
  ctaButton: { marginTop: spacing.sm, minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  ctaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  arrow: { position: 'absolute', top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  arrowLeft: { left: spacing.md },
  arrowRight: { right: spacing.md },
  arrowText: { color: colors.cream, fontSize: 22, fontWeight: '900', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { width: 20, backgroundColor: colors.cta },
});
