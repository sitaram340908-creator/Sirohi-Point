import { type ThemeColors } from '@/shared/design-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/theme/theme-context';

export function StarRating({
  rating,
  reviewCount,
  size = 12,
  showCount = true,
}: {
  rating: number;
  reviewCount?: number;
  size?: number;
  showCount?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const filled = Math.round(rating);

  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {Array.from({ length: 5 }, (_, index) => (
          <Text key={index} style={[styles.star, { fontSize: size, color: index < filled ? styles.starFilled.color : styles.starEmpty.color }]}>★</Text>
        ))}
      </View>
      <Text style={[styles.ratingValue, { fontSize: size - 1 }]}>{rating.toFixed(1)}</Text>
      {showCount && typeof reviewCount === 'number' ? (
        <Text style={[styles.count, { fontSize: size - 1 }]}>({reviewCount.toLocaleString('en-IN')})</Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stars: { flexDirection: 'row' },
  star: { marginRight: 1, fontWeight: '900' },
  starFilled: { color: colors.star },
  starEmpty: { color: colors.starMuted },
  ratingValue: { color: colors.muted, fontWeight: '800' },
  count: { color: colors.teal, fontWeight: '700' },
});

