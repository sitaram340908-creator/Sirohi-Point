import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { useCustomerStyles } from '@/theme/customer-theme';
import { useLanguage } from '@/state/language-context';

const shades = [
  { name: 'Warm Sandstone', color: '#E8D8BE' },
  { name: 'Sage Mist', color: '#A5BCAF' },
  { name: 'Terracotta Clay', color: '#C56E54' },
  { name: 'Slate Blue', color: '#3D5D7D' },
  { name: 'Sunlit Ochre', color: '#E9B546' },
  { name: 'Soft Linen', color: '#EEECE6' },
] as const;

const paintTypes = [
  { label: 'Interior emulsion · ₹42/sqft coverage', coverage: 130, pricePerLitre: 2580 },
  { label: 'Premium washable · ₹55/sqft coverage', coverage: 120, pricePerLitre: 3280 },
  { label: 'Exterior weatherproof · ₹68/sqft coverage', coverage: 110, pricePerLitre: 2980 },
] as const;

export function CustomerPaintCalculator({ compact = false }: { compact?: boolean }) {
  const styles = useCustomerStyles(createStyles);
  const { t } = useLanguage();
  const router = useRouter();
  const [length, setLength] = useState('14');
  const [height, setHeight] = useState('10');
  const [walls, setWalls] = useState('4');
  const [coats, setCoats] = useState(2);
  const [paintTypeIndex, setPaintTypeIndex] = useState(0);
  const [paintTypeOpen, setPaintTypeOpen] = useState(false);
  const [shadeIndex, setShadeIndex] = useState(0);
  const paintType = paintTypes[paintTypeIndex];
  const shade = shades[shadeIndex];
  const estimate = useMemo(() => {
    const wallLength = Math.max(0, Number(length) || 0);
    const wallHeight = Math.max(0, Number(height) || 0);
    const numberOfWalls = Math.max(1, Number(walls) || 1);
    const area = wallLength * wallHeight * numberOfWalls;
    const litres = (area * coats) / paintType.coverage;
    const packs = Math.max(1, Math.ceil(litres / 10));
    const costInPaise = Math.round((litres * paintType.pricePerLitre + 2100) * 100);
    return { area, litres, packs, costInPaise };
  }, [coats, height, length, paintType, walls]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionIntro}>
        <Text style={styles.eyebrow}>{t('SMART PAINT TOOLS')}</Text>
        <Text style={styles.sectionTitle}>{t('Estimate it. Preview it. Then buy it.')}</Text>
        <Text style={styles.sectionCopy}>{t('Know exactly how much paint you need, then preview a shade on your wall before you buy.')}</Text>
      </View>
      <View style={[styles.grid, compact && styles.gridCompact]}>
        <View style={[styles.calculatorCard, compact && styles.calculatorCardCompact]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{t('Paint calculator')}</Text>
            <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
          </View>
          <Text style={styles.cardCopy}>{t('Enter your wall size — we work out litres, product list and cost.')}</Text>
          <View style={styles.formGrid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('Wall length (ft)')}</Text>
              <TextInput accessibilityLabel="Wall length in feet" value={length} onChangeText={setLength} keyboardType="decimal-pad" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('Wall height (ft)')}</Text>
              <TextInput accessibilityLabel="Wall height in feet" value={height} onChangeText={setHeight} keyboardType="decimal-pad" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('Number of walls')}</Text>
              <TextInput accessibilityLabel="Number of walls" value={walls} onChangeText={setWalls} keyboardType="number-pad" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('Coats')}</Text>
              <View style={styles.coatRow}>
                {[1, 2, 3].map((value) => (
                  <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: coats === value }} onPress={() => setCoats(value)} style={({ pressed }) => [styles.coatButton, coats === value && styles.coatButtonActive, pressed && styles.pressed]}>
                    <Text style={[styles.coatText, coats === value && styles.coatTextActive]}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <Text style={styles.fieldLabel}>{t('Paint type')}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: paintTypeOpen }} onPress={() => setPaintTypeOpen((open) => !open)} style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={styles.selectText}>{paintType.label}</Text>
            <Text style={styles.selectArrow}>{paintTypeOpen ? '⌃' : '⌄'}</Text>
          </Pressable>
          {paintTypeOpen ? (
            <View style={styles.selectOptions}>
              {paintTypes.map((type, index) => (
                <Pressable key={type.label} accessibilityRole="radio" accessibilityState={{ checked: paintTypeIndex === index }} onPress={() => { setPaintTypeIndex(index); setPaintTypeOpen(false); }} style={[styles.selectOption, paintTypeIndex === index && styles.selectOptionActive]}>
                  <Text style={[styles.selectOptionText, paintTypeIndex === index && styles.selectOptionTextActive]}>{type.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.resultPanel}>
            <ResultRow label="Total paintable area" value={`${Math.round(estimate.area).toLocaleString('en-IN')} sqft`} styles={styles} />
            <ResultRow label="Paint required" value={`${estimate.litres.toFixed(1)} L`} styles={styles} />
            <ResultRow label="Recommended packs" value={`${estimate.packs} × 10L`} styles={styles} />
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/catalog', params: { category: 'Paint' } } as never)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>{t('Add materials to cart')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.previewCard, compact && styles.previewCardCompact]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{t('Virtual paint preview')}</Text>
            <View style={styles.betaBadge}><Text style={styles.betaBadgeText}>BETA</Text></View>
          </View>
          <Text style={styles.cardCopy}>{t('Tap a shade to preview it on the wall before a single can is bought.')}</Text>
          <View style={[styles.room, { backgroundColor: shade.color }]}>
            <View style={styles.roomLowerHalf} />
            <View style={styles.roomLabel}><Text style={styles.roomLabelText}>{t('Your living room wall')}</Text></View>
          </View>
          <View style={styles.swatchRow}>
            {shades.map((item, index) => (
              <Pressable key={item.name} accessibilityRole="radio" accessibilityLabel={item.name} accessibilityState={{ checked: shadeIndex === index }} onPress={() => setShadeIndex(index)} style={({ pressed }) => [styles.swatchOuter, shadeIndex === index && styles.swatchSelected, pressed && styles.pressed]}>
                <View style={[styles.swatch, { backgroundColor: item.color }]} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.selectedLabel}>{t('Selected shade')}</Text>
          <Text style={styles.selectedShade}>{shade.name}</Text>
        </View>
      </View>
    </View>
  );
}

function ResultRow({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.resultRow}><Text style={styles.resultLabel}>{label}</Text><Text style={styles.resultValue}>{value}</Text></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.section, backgroundColor: colors.background },
  sectionIntro: { width: '100%', maxWidth: 1240, alignSelf: 'center', marginBottom: spacing.xl },
  eyebrow: { color: colors.copper, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { color: colors.cream, fontSize: 29, lineHeight: 35, fontWeight: '900', marginTop: 8 },
  sectionCopy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 640 },
  grid: { width: '100%', maxWidth: 1240, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, alignItems: 'stretch' },
  gridCompact: { flexDirection: 'column', alignItems: 'stretch' },
  calculatorCard: { flexGrow: 1, flexBasis: 460, minWidth: 0, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, gap: spacing.md, shadowColor: colors.shadow, shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  calculatorCardCompact: { width: '100%', flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  previewCard: { flexGrow: 1, flexBasis: 420, minWidth: 0, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, gap: spacing.md, shadowColor: colors.shadow, shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  previewCardCompact: { width: '100%', flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.cream, fontSize: 21, fontWeight: '900', flexShrink: 1 },
  cardCopy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  liveBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.success },
  liveBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  betaBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.teal },
  betaBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { flexGrow: 1, flexBasis: 180, minWidth: 0, gap: spacing.xs },
  fieldLabel: { color: colors.cream, fontSize: 11, fontWeight: '800', marginTop: spacing.sm },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, color: colors.cream, fontSize: 14 },
  coatRow: { flexDirection: 'row', gap: spacing.xs },
  coatButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  coatButtonActive: { backgroundColor: colors.copper, borderColor: colors.copper },
  coatText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  coatTextActive: { color: '#FFFFFF' },
  selectButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  selectText: { flex: 1, color: colors.cream, fontSize: 13 },
  selectArrow: { color: colors.cream, fontSize: 18, fontWeight: '900' },
  selectOptions: { gap: 4, padding: 4, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  selectOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  selectOptionActive: { backgroundColor: colors.copperTint },
  selectOptionText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  selectOptionTextActive: { color: colors.copper, fontWeight: '800' },
  resultPanel: { marginTop: spacing.sm, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primaryDark },
  resultRow: { minHeight: 41, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.09)' },
  resultLabel: { color: '#AEB6C4', fontSize: 12, flexShrink: 1 },
  resultValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: 'rgba(255,255,255,0.2)' },
  totalLabel: { color: '#AEB6C4', fontSize: 11 },
  totalNote: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginTop: 3 },
  totalValue: { color: '#FF7A4D', fontSize: 25, fontWeight: '900' },
  primaryButton: { minHeight: 44, marginTop: spacing.md, borderRadius: radius.md, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  previewCardInner: { flex: 1 },
  room: { minHeight: 330, marginTop: spacing.sm, borderRadius: radius.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  roomLowerHalf: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '44%', backgroundColor: 'rgba(84,64,46,0.10)' },
  roomLabel: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.92)' },
  roomLabelText: { color: '#1C2430', fontSize: 12, fontWeight: '800' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  swatchOuter: { width: 42, height: 42, padding: 3, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 2, borderColor: colors.primaryDark },
  swatch: { width: '100%', height: '100%', borderRadius: 7 },
  selectedLabel: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  selectedShade: { color: colors.cream, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.78 },
});

