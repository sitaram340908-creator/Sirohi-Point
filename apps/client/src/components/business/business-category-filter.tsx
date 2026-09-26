import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCatalogCategories } from '@/lib/api';
import { useBusinessStyles } from '@/theme/business-theme';

type BusinessCategoryFilterProps = {
  initialCategory?: string;
  selectedCategoryIds: string[];
  selectedSubcategoryIds: string[];
  onCategoryIdsChange: (ids: string[]) => void;
  onSubcategoryIdsChange: (ids: string[]) => void;
  onClearAll: () => void;
};

export function BusinessCategoryFilter({
  initialCategory,
  selectedCategoryIds,
  selectedSubcategoryIds,
  onCategoryIdsChange,
  onSubcategoryIdsChange,
  onClearAll,
}: BusinessCategoryFilterProps) {
  const styles = useBusinessStyles(createStyles);
  const initialised = useRef(false);
  const categories = useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: getCatalogCategories,
    staleTime: 5 * 60_000,
  });
  const categoryData = categories.data ?? [];
  const availableSubcategories = useMemo(
    () => categoryData
      .filter((category) => selectedCategoryIds.includes(category.id))
      .flatMap((category) => category.subcategories),
    [categoryData, selectedCategoryIds],
  );

  useEffect(() => {
    if (initialised.current || !initialCategory || !categoryData.length) return;
    const normalizedInitialCategory = initialCategory === 'PVC & Plumbing' || initialCategory === 'PVC PIPE' ? 'plumbing' : initialCategory;
    const match = categoryData.find((category) => category.name === initialCategory || category.slug === normalizedInitialCategory);
    if (match) onCategoryIdsChange([match.id]);
    initialised.current = true;
  }, [categoryData, initialCategory, onCategoryIdsChange]);

  function toggleCategory(id: string) {
    const nextCategoryIds = selectedCategoryIds.includes(id)
      ? selectedCategoryIds.filter((currentId) => currentId !== id)
      : [...selectedCategoryIds, id];
    onCategoryIdsChange(nextCategoryIds);

    const validSubcategoryIds = new Set(
      categoryData
        .filter((category) => nextCategoryIds.includes(category.id))
        .flatMap((category) => category.subcategories.map((subcategory) => subcategory.id)),
    );
    onSubcategoryIdsChange(selectedSubcategoryIds.filter((subcategoryId) => validSubcategoryIds.has(subcategoryId)));
  }

  function toggleSubcategory(id: string) {
    onSubcategoryIdsChange(
      selectedSubcategoryIds.includes(id)
        ? selectedSubcategoryIds.filter((currentId) => currentId !== id)
        : [...selectedSubcategoryIds, id],
    );
  }

  const selectedCount = selectedCategoryIds.length + selectedSubcategoryIds.length;
  const selectedCategories = categoryData.filter((category) => selectedCategoryIds.includes(category.id));
  const selectedSubcategories = categoryData
    .flatMap((category) => category.subcategories)
    .filter((subcategory) => selectedSubcategoryIds.includes(subcategory.id));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Filter by category</Text>
          <Text style={styles.summary}>{selectedCount ? `${selectedCount} selected` : 'All categories'}</Text>
        </View>
        {selectedCount ? (
          <Pressable accessibilityRole="button" onPress={onClearAll} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear all filters</Text>
          </Pressable>
        ) : null}
      </View>

      {categories.isLoading ? <Text style={styles.status}>Loading categories…</Text> : null}
      {categories.isError ? (
        <View style={styles.statusRow}>
          <Text style={styles.error}>Categories could not be loaded.</Text>
          <Pressable accessibilityRole="button" onPress={() => void categories.refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {selectedCount ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Active filters</Text>
          <View style={styles.summaryChips}>
            {selectedCategories.map((category) => (
              <View key={`category-${category.id}`} style={styles.summaryChip}>
                <Text style={styles.summaryChipText}>{category.name}</Text>
              </View>
            ))}
            {selectedSubcategories.map((subcategory) => (
              <View key={`subcategory-${subcategory.id}`} style={styles.summaryChip}>
                <Text style={styles.summaryChipText}>{subcategory.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.optionGrid}>
          <FilterOption
            label="All categories"
            selected={!selectedCategoryIds.length && !selectedSubcategoryIds.length}
            onPress={onClearAll}
            styles={styles}
          />
          {categoryData.map((category) => (
            <FilterOption
              key={category.id}
              label={category.name}
              selected={selectedCategoryIds.includes(category.id)}
              onPress={() => toggleCategory(category.id)}
              styles={styles}
            />
          ))}
        </View>

        {selectedCategoryIds.length ? (
          <>
            <Text style={styles.sectionLabel}>Subcategories</Text>
            {availableSubcategories.length ? (
              <View style={styles.optionGrid}>
                {availableSubcategories.map((subcategory) => (
                  <FilterOption
                    key={subcategory.id}
                    label={subcategory.name}
                    selected={selectedSubcategoryIds.includes(subcategory.id)}
                    onPress={() => toggleSubcategory(subcategory.id)}
                    styles={styles}
                  />
                ))}
              </View>
            ) : <Text style={styles.helper}>No fixed subcategories for the selected category.</Text>}
          </>
        ) : null}
      </View>
    </View>
  );
}

function FilterOption({
  label,
  selected,
  onPress,
  styles,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface },
  header: { minHeight: 54, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.cream, fontSize: 13, fontWeight: '900' },
  summary: { color: colors.muted, fontSize: 11, marginTop: 2 },
  clearButton: { minHeight: 30, justifyContent: 'center' },
  clearText: { color: colors.copper, fontSize: 12, fontWeight: '900' },
  status: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, color: colors.muted, fontSize: 12 },
  statusRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  retryText: { color: colors.cta, fontSize: 12, fontWeight: '900' },
  summaryRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  summaryChip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.sm, backgroundColor: colors.copperTint, borderWidth: 1, borderColor: colors.cta },
  summaryChipText: { color: colors.cream, fontSize: 12, fontWeight: '800' },
  body: { borderTopWidth: 1, borderTopColor: colors.line, padding: spacing.md, gap: spacing.sm },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.xs },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: { minHeight: 34, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionSelected: { borderColor: colors.cta, backgroundColor: colors.copperTint },
  checkbox: { width: 15, height: 15, borderWidth: 1, borderColor: colors.muted, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.cta, backgroundColor: colors.cta },
  checkmark: { color: '#FFFFFF', fontSize: 11, lineHeight: 13, fontWeight: '900' },
  optionText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  optionTextSelected: { color: colors.cream },
  helper: { color: colors.muted, fontSize: 12 },
  error: { color: colors.copper, fontSize: 12, fontWeight: '800' },
});

