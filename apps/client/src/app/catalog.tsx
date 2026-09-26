import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppShell } from '@/components/app-shell';
import { CatalogCategoryFilter } from '@/components/catalog-category-filter';
import { ProductCard } from '@/components/product-card';
import { getCatalog } from '@/lib/api';
import { useAppState } from '@/state/app-context';
import { useCustomerStyles as useThemedStyles } from '@/theme/customer-theme';
import { useLanguage } from '@/state/language-context';

type SortMode = 'recommended' | 'priceAsc' | 'priceDesc' | 'rating';

const sortOptions: [SortMode, string, string][] = [
  ['recommended', 'Recommended', ''],
  ['priceAsc', 'Price: Low', '↑'],
  ['priceDesc', 'Price: High', '↓'],
  ['rating', 'Top Rated', '★'],
];

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ category?: string; saved?: string; q?: string }>();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [search, setSearch] = useState(params.q ?? '');
  const [savedOnly, setSavedOnly] = useState(params.saved === '1');
  const [sort, setSort] = useState<SortMode>('recommended');
  const [priceLow, setPriceLow] = useState('');
  const [priceHigh, setPriceHigh] = useState('');
  const [appliedPriceLow, setAppliedPriceLow] = useState<number | null>(null);
  const [appliedPriceHigh, setAppliedPriceHigh] = useState<number | null>(null);
  const { wishlist } = useAppState();
  const styles = useThemedStyles(createStyles);
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const cardWidth = width >= 1200 ? '19.2%' : width >= 900 ? '24.2%' : width >= 640 ? '32.6%' : '48%';
  const catalog = useQuery({
    queryKey: ['catalog', 'b2c', { categoryIds: selectedCategoryIds, subcategoryIds: selectedSubcategoryIds }],
    queryFn: () => getCatalog({ categoryIds: selectedCategoryIds, subcategoryIds: selectedSubcategoryIds }),
  });

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (catalog.data ?? []).filter((product) => {
      const matchesSearch = !query
        || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query);
      const matchesSaved = !savedOnly || wishlist.includes(product.id);
      const priceInRupees = product.priceInPaise / 100;
      const matchesPriceLow = appliedPriceLow === null || priceInRupees >= appliedPriceLow;
      const matchesPriceHigh = appliedPriceHigh === null || priceInRupees <= appliedPriceHigh;
      return matchesSearch && matchesSaved && matchesPriceLow && matchesPriceHigh;
    });
    if (sort === 'priceAsc') return [...filtered].sort((a, b) => a.priceInPaise - b.priceInPaise);
    if (sort === 'priceDesc') return [...filtered].sort((a, b) => b.priceInPaise - a.priceInPaise);
    if (sort === 'rating') return [...filtered].sort((a, b) => b.rating - a.rating);
    return filtered;
  }, [catalog.data, savedOnly, search, sort, wishlist, appliedPriceLow, appliedPriceHigh]);

  function resetDiscovery() {
    setSearch('');
    setSelectedCategoryIds([]);
    setSelectedSubcategoryIds([]);
    setSavedOnly(false);
    setSort('recommended');
    setPriceLow('');
    setPriceHigh('');
    setAppliedPriceLow(null);
    setAppliedPriceHigh(null);
  }

  function applyPriceFilter() {
    const low = priceLow.trim() ? Number(priceLow.trim()) : null;
    const high = priceHigh.trim() ? Number(priceHigh.trim()) : null;
    setAppliedPriceLow(low && low > 0 ? low : null);
    setAppliedPriceHigh(high && high > 0 ? high : null);
  }

  function clearPriceFilter() {
    setPriceLow('');
    setPriceHigh('');
    setAppliedPriceLow(null);
    setAppliedPriceHigh(null);
  }

  const hasPriceFilter = appliedPriceLow !== null || appliedPriceHigh !== null;

  return (
    <AppShell>
      <View style={styles.content}>
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumb}>
            {savedOnly ? t('Your saved products') : search ? `${t('Results for')} "${search}"` : selectedCategoryIds.length ? t('Filtered products') : t('All products')}
          </Text>
          <View style={styles.breadcrumbRight}>
            <Text style={styles.resultCount}>{products.length} {t('results')}</Text>
            {search.trim() ? (
              <Pressable onPress={() => { setSearch(''); }} style={styles.clearSearchPill}>
                <Text style={styles.clearSearchText}>×</Text>
                <Text style={styles.clearSearchLabel}>{t('Clear search')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.toolRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: savedOnly }}
            onPress={() => setSavedOnly((current) => !current)}
            style={[styles.savedFilter, savedOnly && styles.savedFilterActive]}
          >
            <Text style={[styles.savedFilterIcon, savedOnly && styles.savedFilterTextActive]}>
              {savedOnly ? '♥' : '♡'}
            </Text>
            <Text style={[styles.savedFilterText, savedOnly && styles.savedFilterTextActive]}>
              {t('Saved')} ({wishlist.length})
            </Text>
          </Pressable>
        </View>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>{t('Sort by')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
            {sortOptions.map(([value, label, icon]) => (
              <Pressable key={value} onPress={() => setSort(value)} style={[styles.sortPill, sort === value && styles.sortPillActive]}>
                {icon ? <Text style={[styles.sortIcon, sort === value && styles.sortIconActive]}>{icon}</Text> : null}
                <Text style={[styles.sortPillText, sort === value && styles.sortPillTextActive]}>{t(label)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.priceFilter}>
          <View style={styles.priceFilterHeader}>
            <Text style={styles.priceFilterLabel}>{t('Filter by price')}</Text>
            {hasPriceFilter ? (
              <Pressable onPress={clearPriceFilter} style={styles.priceFilterClear}>
                <Text style={styles.priceFilterClearText}>{t('Clear')}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.priceInputRow}>
            <View style={styles.priceInputGroup}>
              <Text style={styles.priceInputPrefix}>₹</Text>
              <TextInput
                style={styles.priceInput}
                placeholder={t('Min')}
                placeholderTextColor="#8899AA"
                keyboardType="numeric"
                value={priceLow}
                onChangeText={setPriceLow}
                returnKeyType="done"
              />
            </View>
            <Text style={styles.priceDash}>—</Text>
            <View style={styles.priceInputGroup}>
              <Text style={styles.priceInputPrefix}>₹</Text>
              <TextInput
                style={styles.priceInput}
                placeholder={t('Max')}
                placeholderTextColor="#8899AA"
                keyboardType="numeric"
                value={priceHigh}
                onChangeText={setPriceHigh}
                returnKeyType="done"
              />
            </View>
            <Pressable onPress={applyPriceFilter} style={styles.priceApplyBtn}>
              <Text style={styles.priceApplyBtnText}>{t('Apply')}</Text>
            </Pressable>
          </View>
          {hasPriceFilter ? (
            <Text style={styles.priceFilterSummary}>
              {t('Showing')} ₹{appliedPriceLow ?? '0'} — ₹{appliedPriceHigh ? `${appliedPriceHigh}+` : t('any')}
            </Text>
          ) : null}
        </View>

        <CatalogCategoryFilter
          initialCategory={params.category}
          selectedCategoryIds={selectedCategoryIds}
          selectedSubcategoryIds={selectedSubcategoryIds}
          onCategoryIdsChange={setSelectedCategoryIds}
          onSubcategoryIdsChange={setSelectedSubcategoryIds}
          onClearAll={resetDiscovery}
        />

        {catalog.isLoading ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>{t('Loading products…')}</Text></View>
        ) : null}

        {catalog.isError ? <Text style={styles.error}>{t('Unable to load products from the backend')}: {catalog.error instanceof Error ? catalog.error.message : t('Unknown error')}</Text> : null}

        {!catalog.isLoading && products.length ? (
          <View style={styles.grid}>
            {products.map((product) => <ProductCard key={product.id} product={product} width={cardWidth} />)}
          </View>
        ) : null}

        {!catalog.isLoading && !products.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{catalog.isError ? t('Products are unavailable.') : savedOnly ? t('No saved products yet.') : t('No products match this search.')}</Text>
            <Text style={styles.emptyCopy}>{catalog.isError ? t('Check the API connection and try again.') : t('Try another category or clear your current filters.')}</Text>
            <Pressable onPress={resetDiscovery} style={styles.resetButton}>
              <Text style={styles.reset}>{t('Clear filters')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </AppShell>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: 1500, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.md },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  breadcrumb: { color: colors.cream, fontSize: 22, fontWeight: '900' },
  breadcrumbRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultCount: { color: colors.muted, fontSize: 12.5, fontWeight: '700' },
  clearSearchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.copperTint, borderWidth: 1, borderColor: colors.cta },
  clearSearchText: { color: colors.cta, fontSize: 14, fontWeight: '900', lineHeight: 16 },
  clearSearchLabel: { color: colors.cta, fontSize: 11, fontWeight: '800' },
  error: { color: colors.copper, fontSize: 11, fontWeight: '800' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  savedFilter: { minHeight: 34, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedFilterActive: { borderColor: colors.cta, backgroundColor: colors.copperTint },
  savedFilterIcon: { color: colors.muted, fontSize: 14 },
  savedFilterText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  savedFilterTextActive: { color: colors.cta },
  sortContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  sortLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sortScroll: { gap: 6 },
  sortPill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 30, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  sortPillActive: { borderColor: colors.cta, backgroundColor: colors.copperTint },
  sortIcon: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  sortIconActive: { color: colors.cta },
  sortPillText: { color: colors.muted, fontSize: 11.5, fontWeight: '700' },
  sortPillTextActive: { color: colors.cta, fontWeight: '900' },
  priceFilter: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
  priceFilterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceFilterLabel: { color: colors.cream, fontSize: 13, fontWeight: '800' },
  priceFilterClear: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  priceFilterClearText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInputGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, minHeight: 40 },
  priceInputPrefix: { color: colors.muted, fontSize: 14, fontWeight: '800', marginRight: 4 },
  priceInput: { flex: 1, color: colors.cream, fontSize: 14, paddingVertical: 8 },
  priceDash: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  priceApplyBtn: { minHeight: 40, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  priceApplyBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  priceFilterSummary: { color: colors.cta, fontSize: 11, fontWeight: '700', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { minHeight: 240, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { color: colors.cream, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  resetButton: { minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.primary, justifyContent: 'center', marginTop: spacing.xs },
  reset: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});


