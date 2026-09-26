import type { Product } from '@/shared/contracts';
import type { ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type ViewStyle } from 'react-native';

import { customerCollections } from '@/components/customer-promotions';
import { useCustomerStyles } from '@/theme/customer-theme';
import { useLanguage } from '@/state/language-context';

type Flyer = {
  key: string;
  eyebrow: string;
  offer: string;
  title: string;
  copy: string;
  cta: string;
  category: string;
  product?: Product;
  image: ImageSourcePropType;
  color: string;
  gradient: string;
};

export function CustomerOfferFlyers({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  const styles = useCustomerStyles(createStyles);
  const { t } = useLanguage();
  const router = useRouter();
  const available = products.filter(product => product.stock > 0);
  const firstProduct = available.find(product => product.category === 'Paint') ?? available[0];
  const secondProduct = available.find(product => product.category === 'Electrical' || product.category === 'Sanitary') ?? available[1] ?? available[0];
  const firstCollection = customerCollections.find(collection => collection.category === firstProduct?.category) ?? customerCollections[0];
  const secondCollection = customerCollections.find(collection => collection.category === secondProduct?.category) ?? customerCollections[1];
  const flyers: Flyer[] = [
    {
      key: 'project-savings',
      eyebrow: 'LIMITED-TIME SAVINGS',
      offer: '20% OFF',
      title: 'Make room for a fresh new look.',
      copy: 'Save on selected project essentials and start your next upgrade today.',
      cta: 'Shop the offer',
      category: firstProduct?.category ?? 'Paint',
      product: firstProduct,
      image: firstProduct?.imageUrl ? { uri: firstProduct.imageUrl } : firstCollection.image,
      color: '#EA580C',
      gradient: '#7C2D12',
    },
    {
      key: 'bundle-favourite',
      eyebrow: 'EVERYDAY FAVOURITES',
      offer: 'BUY 1 GET 1 FREE',
      title: 'Double the good stuff.',
      copy: 'Pick your everyday favourites and get more value for every project.',
      cta: 'Explore favourites',
      category: secondProduct?.category ?? 'Electrical',
      product: secondProduct,
      image: secondProduct?.imageUrl ? { uri: secondProduct.imageUrl } : secondCollection.image,
      color: '#0F766E',
      gradient: '#164E63',
    },
  ];

  function openFlyer(flyer: Flyer) {
    if (flyer.product) {
      router.push('/product/' + flyer.product.id);
      return;
    }
    router.push({ pathname: '/catalog', params: { category: flyer.category } });
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>{t('FRESH OFFERS FOR YOUR NEXT PROJECT')}</Text>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{t('Little extras. Lovely savings.')}</Text>
        </View>
        <Text style={styles.sectionHint}>{t('Tap a flyer to explore')}</Text>
      </View>
      <View style={[styles.grid, compact && styles.gridCompact]}>
        {flyers.map(flyer => {
          const gradient = {
            backgroundImage: 'linear-gradient(115deg, ' + flyer.color + ' 0%, ' + flyer.gradient + ' 100%)',
          } as unknown as ViewStyle;
          return (
            <ImageBackground
              key={flyer.key}
              source={flyer.image}
              resizeMode="cover"
              imageStyle={styles.flyerImage}
              style={[styles.flyerBackground, compact && styles.flyerBackgroundCompact, { backgroundColor: flyer.color }]}
            >
              <View pointerEvents="none" style={[styles.flyerGradient, gradient]} />
              <View pointerEvents="none" style={styles.flyerShade} />
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={flyer.title}
                onPress={() => openFlyer(flyer)}
                style={({ pressed }) => [styles.flyer, compact && styles.flyerCompact, pressed && styles.pressed]}
              >
              <View style={[styles.flyerContent, compact && styles.flyerContentCompact]}>
                <View style={styles.flyerTopline}>
                  <Text style={styles.flyerEyebrow}>{t(flyer.eyebrow)}</Text>
                  <View style={styles.offerPill}><Text style={styles.offerText}>{t(flyer.offer)}</Text></View>
                </View>
                <Text style={styles.flyerTitle}>{t(flyer.title)}</Text>
                <Text style={styles.flyerCopy}>{t(flyer.copy)}</Text>
                <Text style={styles.flyerCta}>{t(flyer.cta)}  ↗</Text>
              </View>
              </Pressable>
            </ImageBackground>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { paddingTop: 44, gap: 20 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: colors.cta, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.textPrimary, fontSize: 31, lineHeight: 38, letterSpacing: -0.8, fontWeight: '900' },
  titleCompact: { fontSize: 25, lineHeight: 32 },
  sectionHint: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  gridCompact: { flexDirection: 'column' },
  flyerBackground: { flexGrow: 1, flexBasis: 360, minHeight: 272, borderRadius: 22, overflow: 'hidden', position: 'relative' },
  flyerBackgroundCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', height: 244, minHeight: 244 },
  flyer: { flex: 1, minHeight: 272, borderRadius: 22, overflow: 'hidden', position: 'relative' },
  flyerCompact: { flexGrow: 0, flexShrink: 0, height: 244, minHeight: 244 },
  flyerImage: { borderRadius: 22, opacity: 0.72 },
  flyerGradient: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  flyerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7, 15, 27, 0.28)', zIndex: 1 },
  flyerContent: { flex: 1, minHeight: 272, padding: 24, justifyContent: 'space-between', zIndex: 2, elevation: 2 },
  flyerContentCompact: { minHeight: 244, padding: 20 },
  flyerTopline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flyerEyebrow: { color: '#FFEDD5', fontSize: 10, fontWeight: '900', letterSpacing: 1.35 },
  offerPill: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  offerText: { color: '#C2410C', fontSize: 11, fontWeight: '900', letterSpacing: 0.2 },
  flyerTitle: { color: '#FFFFFF', maxWidth: 310, fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -0.8, marginTop: 22 },
  flyerCopy: { color: '#F8FAFC', maxWidth: 330, fontSize: 13, lineHeight: 20, marginTop: 10 },
  flyerCta: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 18 },
  pressed: { opacity: 0.84, transform: [{ translateY: 1 }] },
});

