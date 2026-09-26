import type { ThemeColors } from '@/shared/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppShell } from '@/components/app-shell';
import { CustomerPromotions, customerCollections } from '@/components/customer-promotions';
import { CustomerOfferFlyers } from '@/components/customer-offer-flyers';
import { ProductCard } from '@/components/product-card';
import { ServiceOffers } from '@/components/service-offers';
import { getBanners, getCatalog } from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useCustomerStyles } from '@/theme/customer-theme';
import { useLanguage } from '@/state/language-context';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const styles = useCustomerStyles(createStyles);
  const { t } = useLanguage();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const cardWidth = width >= 1200 ? '23.8%' : width >= 760 ? '31.8%' : '47%';
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: getCatalog });
  const banners = useQuery({ queryKey: ['banners'], queryFn: getBanners });
  const products = catalog.data ?? [];
  const deals = products.filter(product => product.compareAtPriceInPaise && product.compareAtPriceInPaise > product.priceInPaise).sort((a, b) => (1 - b.priceInPaise / b.compareAtPriceInPaise!) - (1 - a.priceInPaise / a.compareAtPriceInPaise!)).slice(0, 6);
  const featured = [...deals, ...products.filter(product => !deals.some(deal => deal.id === product.id))].slice(0, 6);
  const bestSellers = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8);
  const categoryRails = [...customerCollections.map((collection) => collection.category), 'Others']
    .map((category) => ({
      category,
      products: products.filter((product) => category === 'PVC & Plumbing'
        ? product.category === 'PVC & Plumbing' || product.category === 'PVC PIPE'
        : product.category === category),
    }))
    .filter((section) => section.products.length > 0);
  function shop(category?: string) { router.push(category ? { pathname: '/catalog', params: { category } } : '/catalog'); }
  function header(kicker: string, title: string, action = 'View all products', onPress = () => shop()) { return <View style={styles.sectionHeader}><View style={styles.headingCopy}><Text style={styles.eyebrow}>{t(kicker)}</Text><Text accessibilityRole="header" style={[styles.title, compact && { fontSize: 25, lineHeight: 32 }]}>{t(title)}</Text></View><Pressable accessibilityRole="link" onPress={onPress} style={styles.allLink}><Text style={styles.allLinkText}>{t(action)}  ↗</Text></Pressable></View>; }
  return <AppShell><View style={[styles.content, compact && { paddingHorizontal: 16 }]}>
    {/* <View style={styles.welcome}><Text style={styles.welcomeText}>{user?.role === 'CUSTOMER' ? `Welcome back, ${user.name.split(' ')[0]}. What’s your next project?` : 'Your home . Your kind of store.'}</Text><Text style={styles.welcomeMeta}>THE SIROHI EDIT</Text></View> */}
    <CustomerPromotions products={products} banners={banners.data ?? []} />
    <View style={styles.benefits}>{[['✓', 'Shop with confidence', 'Clear prices & stock'], ['▤', 'Easy checkout', 'GST-ready orders'], ['⌂', 'Made for your project', 'Materials + expert help'], ['↗', 'More ways to save', 'Discover current offers']].map(([icon, title, copy]) => <View key={title} style={styles.benefit}><Text style={styles.benefitIcon}>{icon}</Text><View><Text style={styles.benefitTitle}>{t(title)}</Text><Text style={styles.benefitCopy}>{t(copy)}</Text></View></View>)}</View>
    <View style={styles.section}>{header('FIND YOUR EVERYDAY ESSENTIALS', 'Good things, by category', 'Explore all categories')}<View style={styles.categories}>{customerCollections.map(collection => <Pressable accessibilityRole="link" key={collection.category} onPress={() => shop(collection.category)} style={({ pressed }) => [styles.category, { width: width >= 1000 ? '15.5%' : width >= 520 ? '31%' : '47%' }, pressed && { opacity: 0.7 }]}><View style={styles.categoryImage}><Image source={collection.image} style={styles.categoryPhoto} resizeMode="cover" /></View><Text style={styles.categoryName}>{t(collection.category === 'PVC & Plumbing' ? 'PVC PIPE' : collection.category)}</Text><Text style={styles.categoryExplore}>{t('Explore collection  →')}</Text></Pressable>)}</View></View>
    <CustomerOfferFlyers products={products} compact={compact} />
    <View style={[styles.section, styles.dealSection]}>{header('LITTLE PRICES. BIG POSSIBILITIES.', 'Today’s deals & great finds', 'Shop current deals', () => router.push({ pathname: '/catalog', params: { deals: '1' } }))}<Text style={styles.sectionCopy}>{t('Fresh inspiration for your next upgrade. Explore savings and handpicked essentials.')}</Text>
      {catalog.isLoading ? <View style={styles.status}><Text style={styles.statusText}>{t('Finding good things for your project…')}</Text></View> : null}
      {catalog.isError ? <View style={styles.status}><Text style={styles.statusText}>{t('We couldn’t load the products. Please try again.')}</Text><Pressable accessibilityRole="button" onPress={() => void catalog.refetch()} style={styles.retry}><Text style={styles.retryText}>{t('Retry products')}</Text></Pressable></View> : null}
      {!catalog.isLoading && !catalog.isError && !products.length ? <Text style={styles.statusText}>{t('New finds are on their way. Browse our collections in the meantime.')}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealRail}>{featured.map(product => <ProductCard key={product.id} product={product} width={compact ? 156 : 280} />)}</ScrollView>
    </View>
    {categoryRails.map(({ category, products: categoryProducts }) => <View key={`category-rail-${category}`} style={styles.section}>{header('SHOP BY CATEGORY', category === 'PVC & Plumbing' ? 'PVC PIPE' : category, `View all ${category === 'PVC & Plumbing' ? 'PVC PIPE' : category}`, () => shop(category))}<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealRail}>{categoryProducts.map(product => <ProductCard key={product.id} product={product} width={compact ? 156 : 280} />)}</ScrollView></View>)}
    <View style={styles.editorialRow}><Pressable accessibilityRole="link" onPress={() => shop('Paint')} style={[styles.editorial, styles.editorialWarm]}><View style={styles.editorialCopy}><Text style={styles.editorialLabel}>{t('THE WEEKEND PROJECT')}</Text><Text style={styles.editorialTitle}>{t('New mood.\nOne fresh coat.')}</Text><Text style={styles.editorialLink}>{t('Explore paints  →')}</Text></View><Image source={customerCollections[0].image} resizeMode="contain" style={styles.editorialImage} /></Pressable><Pressable accessibilityRole="link" onPress={() => shop('Sanitary')} style={[styles.editorial, styles.editorialCool]}><View style={styles.editorialCopy}><Text style={styles.editorialLabel}>{t('DETAILS THAT DO MORE')}</Text><Text style={styles.editorialTitle}>{t('Everyday essentials.\nExtraordinary feel.')}</Text><Text style={styles.editorialLink}>{t('Shop sanitaryware  →')}</Text></View><Image source={customerCollections[1].image} resizeMode="contain" style={styles.editorialImage} /></Pressable></View>
    <View style={styles.section}>{header('WORTH A CLOSER LOOK', 'Find your next favourite')}<View style={styles.grid}>{bestSellers.map(product => <ProductCard key={product.id} product={product} width={cardWidth} />)}</View></View>
    <View style={styles.service}><View style={styles.serviceCopy}><Text style={styles.serviceEyebrow}>{t('A HELPING HAND, WHEN YOU NEED ONE')}</Text><Text style={styles.serviceTitle}>{t('The right materials.\nThe right person for the job.')}</Text><Text style={styles.serviceDescription}>{t('Find a technician for your repairs, installations and finishing touches.')}</Text></View><Pressable accessibilityRole="link" style={styles.serviceButton} onPress={() => router.push('/services/nearby')}><Text style={styles.serviceButtonText}>{t('Find a technician  ↗')}</Text></Pressable></View>
    <View style={styles.serviceOffers}><ServiceOffers /></View>
  </View></AppShell>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: 28, paddingBottom: 20 }, welcome: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', paddingVertical: 19 }, welcomeText: { color: c.muted, fontSize: 14 }, welcomeMeta: { color: c.muted, fontSize: 11, letterSpacing: 2 }, benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', paddingVertical: 27, borderBottomWidth: 1, borderColor: c.line }, benefit: { flexDirection: 'row', gap: 12, alignItems: 'center', flexBasis: 230, flexGrow: 1 }, benefitIcon: { fontSize: 25, color: c.cta, width: 36, textAlign: 'center' }, benefitTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary }, benefitCopy: { color: c.muted, fontSize: 12, marginTop: 5 }, section: { paddingTop: 40, gap: 22 }, sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }, headingCopy: { flexShrink: 1 }, eyebrow: { color: c.cta, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 }, title: { color: c.textPrimary, fontSize: 31, lineHeight: 38, letterSpacing: -0.8, fontWeight: '800' }, allLink: { minHeight: 40, justifyContent: 'center' }, allLinkText: { color: c.teal, fontSize: 14, fontWeight: '700' }, categories: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }, category: { alignItems: 'center', paddingBottom: 10 }, categoryImage: { backgroundColor: c.surfaceSunken, width: '100%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden' }, categoryPhoto: { width: '100%', height: '100%' }, categoryName: { color: c.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 15 }, categoryExplore: { color: c.muted, fontSize: 12, marginTop: 7 }, dealSection: { paddingBottom: 8 }, sectionCopy: { color: c.muted, fontSize: 15, lineHeight: 23, marginTop: -10 }, dealRail: { gap: 18, paddingBottom: 18, paddingTop: 2, paddingRight: 4 }, status: { padding: 24, backgroundColor: c.surfaceSunken, borderRadius: 14, gap: 14 }, statusText: { color: c.muted, fontSize: 16, lineHeight: 24 }, retry: { alignSelf: 'flex-start', backgroundColor: c.primary, padding: 14, borderRadius: 8 }, retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }, editorialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 30 }, editorial: { flexGrow: 1, flexBasis: 360, minHeight: 250, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 28 }, editorialWarm: { backgroundColor: '#EEF2FF' }, editorialCool: { backgroundColor: '#E0F2FE' }, editorialCopy: { flex: 1.3, zIndex: 1 }, editorialLabel: { color: '#64748B', fontSize: 10, letterSpacing: 1.3, fontWeight: '700' }, editorialTitle: { fontSize: 27, lineHeight: 34, color: '#172554', fontWeight: '800', letterSpacing: -0.6, marginTop: 16 }, editorialLink: { color: '#1E3A8A', fontSize: 14, fontWeight: '700', marginTop: 24 }, editorialImage: { width: '40%', height: 205 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, service: { backgroundColor: '#172554', borderRadius: 20, padding: 32, marginTop: 46, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 24, justifyContent: 'space-between' }, serviceCopy: { flex: 1, minWidth: 220 }, serviceEyebrow: { color: '#A5B4FC', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 }, serviceTitle: { fontSize: 28, lineHeight: 35, color: '#FFFFFF', fontWeight: '700', marginTop: 12 }, serviceDescription: { color: '#E0E7FF', fontSize: 15, lineHeight: 23, marginTop: 14 }, serviceButton: { backgroundColor: c.cta, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 17 }, serviceButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, serviceOffers: { marginTop: 24 },
});

