import type { Product } from '@/shared/contracts';
import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
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

const AUTOPLAY_MS = 5200;
const RESUME_DELAY_MS = 4000;

export interface MarketplaceHeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  product: Product;
  ctaLabel?: string;
  backgroundColor: string;
  imageUrl?: string;
}

export function MarketplaceHeroSlider({ slides, onProductPress }: { slides: MarketplaceHeroSlide[]; onProductPress?(product: Product): void }) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const compact = containerWidth > 0 && containerWidth < 720;
  const slideWidth = containerWidth || ('100%' as const);

  function openProduct(product: Product) {
    if (onProductPress) onProductPress(product);
    else router.push(`/product/${product.id}`);
  }

  const goTo = useCallback((nextIndex: number, animated = true) => {
    if (!containerWidth || !slides.length) return;
    const normalizedIndex = ((nextIndex % slides.length) + slides.length) % slides.length;
    scrollRef.current?.scrollTo({ x: normalizedIndex * containerWidth, animated });
    activeIndexRef.current = normalizedIndex;
    setActiveIndex(normalizedIndex);
  }, [containerWidth, slides.length]);

  useEffect(() => {
    if (!containerWidth) return;
    scrollRef.current?.scrollTo({ x: activeIndexRef.current * containerWidth, animated: false });
  }, [containerWidth]);

  useEffect(() => {
    if (!containerWidth || slides.length <= 1) return undefined;
    const interval = setInterval(() => {
      if (!pausedRef.current) goTo(activeIndexRef.current + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [containerWidth, goTo, slides.length]);

  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  function pauseAutoplay() {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }

  function resumeAutoplaySoon() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_DELAY_MS);
  }

  function finishSwipe(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!containerWidth) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / containerWidth);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  }

  if (!slides.length) return null;

  return (
    <View
      style={styles.shell}
      onLayout={(event) => setContainerWidth(Math.round(event.nativeEvent.layout.width))}
      accessibilityRole="adjustable"
      accessibilityLabel="Featured products"
      accessibilityValue={{ min: 1, max: slides.length, now: activeIndex + 1 }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={finishSwipe}
        onScrollBeginDrag={pauseAutoplay}
        onScrollEndDrag={resumeAutoplaySoon}
        onTouchStart={pauseAutoplay}
        onTouchEnd={resumeAutoplaySoon}
      >
        {slides.map((slide) => {
          const visualProduct = slide.imageUrl
            ? { ...slide.product, imageUrl: slide.imageUrl }
            : slide.product;
          return (
            <View key={slide.id} style={[styles.slide, { width: slideWidth, backgroundColor: slide.backgroundColor }]}>
              <View style={[styles.slideInner, compact && styles.slideInnerCompact]}>
                <View style={[styles.copyPanel, compact && styles.copyPanelCompact]}>
                  {slide.badge ? <Text style={styles.badge}>{slide.badge}</Text> : null}
                  <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{slide.title}</Text>
                  {slide.subtitle ? <Text style={styles.subtitle}>{slide.subtitle}</Text> : null}
                  {slide.ctaLabel ? (
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                      onPress={() => openProduct(slide.product)}
                    >
                      <Text style={styles.primaryButtonText}>{slide.ctaLabel}</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`View ${slide.product.name}`}
                  onPress={() => openProduct(slide.product)}
                  style={({ pressed }) => [styles.productPanel, compact && styles.productPanelCompact, pressed && styles.pressed]}
                >
                  <ProductVisual product={visualProduct} style={[styles.productVisual, compact && styles.productVisualCompact]} />
                  <View style={styles.productCaption}>
                    <Text style={styles.productBrand}>{slide.product.brand}</Text>
                    <Text style={styles.productName} numberOfLines={1}>{slide.product.name}</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {slides.length > 1 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous featured product"
            onPress={() => { pauseAutoplay(); goTo(activeIndex - 1); resumeAutoplaySoon(); }}
            style={({ pressed }) => [styles.arrow, compact && styles.arrowCompact, styles.arrowLeft, compact && styles.arrowLeftCompact, pressed && styles.pressed]}
          >
            <View pointerEvents="none" style={[styles.chevron, compact && styles.chevronCompact]}>
              <View style={[styles.chevronArm, styles.chevronLeftTop, compact && styles.chevronArmCompact]} />
              <View style={[styles.chevronArm, styles.chevronLeftBottom, compact && styles.chevronArmCompact]} />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next featured product"
            onPress={() => { pauseAutoplay(); goTo(activeIndex + 1); resumeAutoplaySoon(); }}
            style={({ pressed }) => [styles.arrow, compact && styles.arrowCompact, styles.arrowRight, compact && styles.arrowRightCompact, pressed && styles.pressed]}
          >
            <View pointerEvents="none" style={[styles.chevron, compact && styles.chevronCompact]}>
              <View style={[styles.chevronArm, styles.chevronRightTop, compact && styles.chevronArmCompact]} />
              <View style={[styles.chevronArm, styles.chevronRightBottom, compact && styles.chevronArmCompact]} />
            </View>
          </Pressable>
          <View style={styles.pagination}>
            {slides.map((slide, index) => (
              <Pressable
                key={slide.id}
                accessibilityRole="button"
                accessibilityLabel={`Show featured product ${index + 1}: ${slide.title}`}
                accessibilityState={{ selected: index === activeIndex }}
                hitSlop={8}
                onPress={() => { pauseAutoplay(); goTo(index); resumeAutoplaySoon(); }}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  shell: {
    width: '100%',
    minHeight: 360,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  slide: { minHeight: 360 },
  slideInner: {
    width: '100%',
    maxWidth: 1500,
    minHeight: 360,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 74,
    paddingVertical: spacing.xl,
    gap: spacing.xxl,
  },
  slideInnerCompact: {
    minHeight: 540,
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 52,
    paddingTop: spacing.xl,
    paddingBottom: 52,
    gap: spacing.lg,
  },
  copyPanel: { flex: 1.05, minWidth: 0, maxWidth: 620 },
  copyPanelCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%', maxWidth: '100%' },
  badge: { color: '#D8E7F5', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 40, lineHeight: 45, fontWeight: '900', letterSpacing: -1, marginTop: spacing.sm },
  titleCompact: { fontSize: 29, lineHeight: 34, letterSpacing: -0.6 },
  subtitle: { color: '#D8E7F5', fontSize: 15, lineHeight: 22, maxWidth: 560, marginTop: spacing.sm },
  primaryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  productPanel: {
    flex: 0.9,
    minWidth: 300,
    maxWidth: 520,
    minHeight: 300,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 7,
  },
  productPanelCompact: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    minHeight: 230,
  },
  productVisual: { width: '100%', height: 230, minHeight: 230, backgroundColor: '#FFFFFF' },
  productVisualCompact: { height: 160, minHeight: 160 },
  productCaption: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#FFFFFF' },
  productBrand: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  productName: { color: '#17202A', fontSize: 16, fontWeight: '900', marginTop: 3 },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -23,
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  arrowCompact: { width: 38, height: 38, borderRadius: radius.md, marginTop: -19 },
  arrowLeft: { left: spacing.md },
  arrowRight: { right: spacing.md },
  arrowLeftCompact: { left: 7 },
  arrowRightCompact: { right: 7 },
  chevron: { width: 36, height: 44, position: 'relative' },
  chevronCompact: { width: 32, height: 38, transform: [{ scale: 0.86 }] },
  chevronArm: { position: 'absolute', left: 0, width: 36, height: 5, borderRadius: radius.pill, backgroundColor: colors.cta },
  chevronArmCompact: { width: 32, height: 4 },
  chevronLeftTop: { top: 9, transform: [{ rotate: '-35deg' }] },
  chevronLeftBottom: { top: 30, transform: [{ rotate: '35deg' }] },
  chevronRightTop: { top: 9, transform: [{ rotate: '35deg' }] },
  chevronRightBottom: { top: 30, transform: [{ rotate: '-35deg' }] },
  pagination: { position: 'absolute', left: 0, right: 0, bottom: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, zIndex: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.48)' },
  dotActive: { width: 28, backgroundColor: '#FFFFFF' },
  pressed: { opacity: 0.78 },
});

