import type { Product } from '@/shared/contracts';
import type { ThemeColors } from '@/shared/design-tokens';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppState } from '@/state/app-context';
import { useBusinessStyles } from '@/theme/business-theme';

export function CartQuantity({ product, quantity }: { product: Product; quantity: number; business?: boolean }) {
  const { setQuantity, removeItem } = useAppState();
  const styles = useBusinessStyles(createStyles);
  const [draft, setDraft] = useState(String(quantity));
  useEffect(() => setDraft(String(quantity)), [quantity]);
  const minimum = product.minimumB2BQuantity ?? 1;
  return <View style={styles.wrap}><View style={styles.control}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Decrease quantity for ${product.name}`} accessibilityState={{ disabled: quantity <= minimum }} disabled={quantity <= minimum} onPress={() => setQuantity(product, quantity - 1)} style={[styles.button, quantity <= minimum && { opacity: 0.4 }]}><Text style={styles.symbol}>−</Text></Pressable>
    <TextInput accessibilityLabel={`Quantity for ${product.name}`} value={draft} onChangeText={setDraft} keyboardType="number-pad" selectTextOnFocus style={styles.input} onBlur={() => { setQuantity(product, Number(draft)); setDraft(String(quantity)); }} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity for ${product.name}`} onPress={() => setQuantity(product, quantity + 1)} style={styles.button}><Text style={styles.symbol}>+</Text></Pressable>
  </View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${product.name} from cart`} onPress={() => removeItem(product.id)} style={styles.remove}><Text style={styles.removeText}>Remove</Text></Pressable></View>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, control: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surfaceRaised }, button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, symbol: { color: c.cream, fontSize: 21 }, input: { width: 54, height: 44, color: c.cream, fontSize: 14, fontWeight: '700', textAlign: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.line }, remove: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }, removeText: { color: c.danger, fontSize: 12, fontWeight: '600' },
});

