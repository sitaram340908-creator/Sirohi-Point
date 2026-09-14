import type { ThemeColors } from '@sirohi/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { BusinessCategoryFilter } from '@/components/business/business-category-filter';
import { BusinessProductCard, businessCollections } from '@/components/business/business-products';
import { PortalButton, PortalCard, PortalShell } from '@/components/business/business-ui';
import { getB2BBanners, getB2BCatalog } from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useBusinessStyles } from '@/theme/business-theme';

export default function BusinessCatalogScreen() {
  const router = useRouter();
  const styles = useBusinessStyles(createStyles);
  const { width } = useWindowDimensions();
  const desktop = width >= 1050;
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const { token, user } = useAuth();
  const [search, setSearch] = useState(params.q ?? '');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [inStock, setInStock] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => { setSearch(params.q ?? ''); setPage(0); }, [params.q]);

  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const liveCatalog = useQuery({
    queryKey: ['catalog', 'b2b', user?.id, debouncedSearch, selectedCategoryIds, selectedSubcategoryIds, page, sort, inStock],
    queryFn: () => getB2BCatalog(token ?? undefined, { search: debouncedSearch, categoryIds: selectedCategoryIds, subcategoryIds: selectedSubcategoryIds, limit: 24, offset: page * 24, sort, inStock: String(inStock) }),
    enabled: !user || (user.role === 'BUSINESS' && Boolean(token)),
  });
  const bannerQuery = useQuery({ queryKey: ['banners', 'b2b'], queryFn: getB2BBanners });
  const products = liveCatalog.data ?? [];
  const offers = products.filter(product => product.b2cPriceInPaise && (product.b2bPriceInPaise ?? product.priceInPaise) < product.b2cPriceInPaise);
  const banners = (bannerQuery.data ?? []).filter(banner => banner.active);
  function clearFilters() { setSelectedCategoryIds([]); setSelectedSubcategoryIds([]); setSearch(''); setInStock(false); setSort('newest'); setPage(0); }
  const cardWidth = width >= 1200 ? 'calc((100% - 48px) / 4)' : width >= 900 ? 'calc((100% - 32px) / 3)' : 'calc((100% - 16px) / 2)';

  return <PortalShell eyebrow="THE BUSINESS STORE" title="Good supplies. Great business." copy="Everything for your next order, with wholesale prices and minimum quantities upfront." actions={<PortalButton label="Review bulk cart →" onPress={() => router.push('/business/cart')} />}>
    <View style={styles.promo}><View style={styles.promoBody}><Text style={styles.promoEyebrow}>BUY WELL. BUILD MORE.</Text><Text style={styles.promoTitle}>Your next project starts here.</Text><Text style={styles.promoCopy}>Explore materials, fittings, and everyday essentials, all in one wholesale store.</Text></View><Image source={businessCollections[5].image} resizeMode="contain" style={[styles.promoImage, width < 600 && { display: 'none' }]} /></View>
    {banners.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bannerRail}>{banners.map((banner, index) => { const product = products.find(item => item.id === banner.productId) ?? products[index % Math.max(products.length, 1)]; return <View key={banner.id} style={[styles.banner, { width: Math.min(width - 64, 470) }]}>{banner.imageUrl ? <Image source={{ uri: banner.imageUrl }} resizeMode="cover" style={styles.bannerImage} /> : null}<Text style={styles.eyebrow}>{banner.badge || 'THE WHOLESALE SELECTION'}</Text><Text style={styles.bannerTitle}>{banner.title}</Text><Text style={styles.description}>{banner.subtitle}</Text>{product ? <PortalButton label={banner.ctaLabel || 'Explore product'} secondary onPress={() => router.push(`/business/product/${product.id}` as never)} /> : null}</View>; })}</ScrollView> : null}
    {offers.length ? <View style={styles.offerSection}><View><Text style={styles.eyebrow}>MORE VALUE FOR YOUR BUSINESS</Text><Text style={styles.sectionTitle}>Wholesale finds, worth a look.</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bannerRail}>{offers.slice(0, 8).map(product => <BusinessProductCard key={product.id} product={product} style={{ width: 260 }} />)}</ScrollView></View> : null}
    <View style={styles.catalogLayout}>
      <View style={[styles.filters, desktop ? { width: 260 } : { width: '100%' }]}><BusinessCategoryFilter key={params.category ?? 'all'} initialCategory={params.category} selectedCategoryIds={selectedCategoryIds} selectedSubcategoryIds={selectedSubcategoryIds} onCategoryIdsChange={ids => { setSelectedCategoryIds(ids); setPage(0); }} onSubcategoryIdsChange={ids => { setSelectedSubcategoryIds(ids); setPage(0); }} onClearAll={clearFilters} />{desktop ? <View style={styles.filterNote}><Text style={styles.filterNoteTitle}>A little buying tip</Text><Text style={styles.description}>Check the minimum order quantity on each card. Add what you need and review everything together in your bulk cart.</Text></View> : null}</View>
      <View style={styles.catalogBody}><View style={styles.resultsHeader}><View><Text accessibilityRole="header" style={styles.sectionTitle}>Find your essentials</Text><Text style={styles.description}>{liveCatalog.isFetching ? 'Refreshing your selection…' : `${products.length} products on this page`}</Text></View><PortalButton label="Reset filters" secondary onPress={clearFilters} /></View>
        <TextInput accessibilityLabel="Search this wholesale catalogue" value={search} onChangeText={setSearch} placeholder="Search products, brands, or categories…" placeholderTextColor={styles.description.color} style={styles.search} autoCapitalize="none" returnKeyType="search" />
        <View style={styles.sortRow}>{(['newest', 'price-asc', 'price-desc'] as const).map(value => <PortalButton key={value} label={value === 'newest' ? 'Newest arrivals' : value === 'price-asc' ? 'Price: low to high' : 'Price: high to low'} secondary={sort !== value} onPress={() => { setSort(value); setPage(0); }} />)}<PortalButton label={inStock ? '✓ In stock only' : 'In stock only'} secondary={!inStock} onPress={() => { setInStock(!inStock); setPage(0); }} /></View>
        {liveCatalog.isLoading ? <View style={styles.grid}>{Array.from({ length: 6 }, (_, index) => <View key={index} accessibilityLabel="Loading product" style={[styles.skeleton, { width: cardWidth }]}><View style={styles.skeletonImage} /><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, { width: '60%' }]} /></View>)}</View> : null}
        {liveCatalog.isError ? <PortalCard title="We couldn’t load your selection" copy={liveCatalog.error instanceof Error ? liveCatalog.error.message : 'Please try again.'}><PortalButton label="Try again" onPress={() => void liveCatalog.refetch()} /></PortalCard> : null}
        {!liveCatalog.isLoading && !liveCatalog.isError && !products.length ? <PortalCard title="No matching essentials just yet" copy="Try a different search or clear your filters to explore more products."><PortalButton label="Clear filters" secondary onPress={clearFilters} /></PortalCard> : null}
        <View style={styles.grid}>{products.map(product => <BusinessProductCard key={product.id} product={product} style={{ width: cardWidth }} />)}</View>
        <View style={styles.pagination}><PortalButton label="← Previous" secondary disabled={page === 0 || liveCatalog.isFetching} onPress={() => setPage(page - 1)} /><Text style={styles.description}>Page {page + 1}</Text><PortalButton label="Next →" secondary disabled={products.length < 24 || liveCatalog.isFetching} onPress={() => setPage(page + 1)} /></View>
      </View>
    </View>
  </PortalShell>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  promo: { backgroundColor: '#EAF0F5', borderRadius: 20, padding: 28, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', gap: 20 }, promoBody: { flex: 1, gap: 12 }, promoEyebrow: { color: '#345B7C', fontSize: 10, letterSpacing: 1.6, fontWeight: '800' }, promoTitle: { color: '#182D45', fontSize: 31, lineHeight: 39, fontWeight: '800', letterSpacing: -0.8 }, promoCopy: { color: '#627185', fontSize: 14, lineHeight: 22, maxWidth: 630 }, promoImage: { width: 200, height: 140 }, catalogLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }, filters: { gap: 20 }, catalogBody: { flex: 1, minWidth: 0, gap: 20 }, resultsHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, sectionTitle: { color: c.cream, fontSize: 24, lineHeight: 32, fontWeight: '800', letterSpacing: -0.6 }, description: { color: c.muted, fontSize: 12, lineHeight: 21 }, search: { minHeight: 50, paddingHorizontal: 16, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.surface, color: c.cream, fontSize: 14 }, sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, pagination: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 }, filterNote: { padding: 20, borderRadius: 16, backgroundColor: c.tealTint, gap: 10 }, filterNoteTitle: { color: c.teal, fontSize: 14, fontWeight: '700' }, offerSection: { gap: 20 }, eyebrow: { color: c.copper, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 7 }, bannerRail: { gap: 16, paddingBottom: 8 }, banner: { padding: 22, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, gap: 12 }, bannerImage: { width: '100%', height: 150, borderRadius: 12 }, bannerTitle: { color: c.cream, fontSize: 22, fontWeight: '800' }, skeleton: { borderRadius: 18, backgroundColor: c.surface, padding: 16, gap: 16 }, skeletonImage: { height: 200, borderRadius: 12, backgroundColor: c.surfaceSunken }, skeletonLine: { height: 18, borderRadius: 8, backgroundColor: c.surfaceSunken },
});
