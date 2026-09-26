import type { Product } from '@/shared/contracts';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { PortalButton } from './portal-ui';
import { useAppState } from '@/state/app-context';
import { useAppTheme } from '@/theme/theme-context';

export function CartQuantity({ product, quantity, business = false }: { product: Product; quantity: number; business?: boolean }) {
  const { setQuantity, removeItem } = useAppState();
  const { colors } = useAppTheme();
  const [draft, setDraft] = useState(String(quantity));
  useEffect(() => setDraft(String(quantity)), [quantity]);
  const minimum = business ? product.minimumB2BQuantity ?? 1 : 1;
  return <View style={{ gap: 8 }}><View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
    <PortalButton label="−" secondary disabled={quantity <= minimum} onPress={() => setQuantity(product, quantity - 1)} />
    <TextInput accessibilityLabel={`Quantity for ${product.name}`} value={draft} onChangeText={setDraft} keyboardType="number-pad" style={{ width: 80, borderWidth: 1, borderColor: colors.line, color: colors.cream, padding: 8 }} onBlur={() => { setQuantity(product, Number(draft)); setDraft(String(quantity)); }} />
    <PortalButton label="+" secondary onPress={() => setQuantity(product, quantity + 1)} />
    <PortalButton label="Remove" danger onPress={() => removeItem(product.id)} />
  </View></View>;
}

