import type { Product } from '@/shared/contracts';
import { radius, type ThemeColors } from '@/shared/design-tokens';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/theme/theme-context';

export function ProductVisual({
  product,
  compact = false,
  style,
}: {
  product: Product;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(createStyles);
  const [remoteImageFailed, setRemoteImageFailed] = useState(false);
  const imageUrl = product.imageUrl?.trim();

  useEffect(() => {
    setRemoteImageFailed(false);
  }, [imageUrl]);

  // Product images can be served by the store API or a secure CDN. If an image
  // fails, use a bundled category image instead of leaving the card blank.
  const source: ImageSourcePropType = imageUrl && !remoteImageFailed && isSupportedImageUrl(imageUrl)
    ? { uri: imageUrl }
    : fallbackImageFor(product);
  return (
    <View style={[styles.visual, compact && styles.visualCompact, style]}>
      <Image source={source} resizeMode="contain" style={styles.image} onError={() => setRemoteImageFailed(true)} />
    </View>
  );
}

function isSupportedImageUrl(value: string) {
  return value.startsWith('https://') || value.startsWith('http://') || value.startsWith('data:image/');
}

function fallbackImageFor(product: Product): ImageSourcePropType {
  switch (product.category) {
    case 'Paint':
      return require('../../assets/images/products/paint-interior-emulsion.png');
    case 'Sanitary':
      return require('../../assets/images/products/sanitary-basin-mixer.png');
    case 'Electrical':
      return require('../../assets/images/products/electrical-modular-switch.png');
    case 'Electronics':
      return require('../../assets/images/products/electronics-led-panel.png');
    case 'Hardware':
      return require('../../assets/images/products/hardware-pata-bolt.png');
    case 'PVC & Plumbing':
    case 'Plumbing':
    case 'PVC PIPE':
      return require('../../assets/images/products/pvc-elbow.png');
    default:
      return require('../../assets/images/products/paint-wall-primer.png');
  }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  visual: {
    width: '100%',
    height: 200,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
  },
  visualCompact: {
    minHeight: 0,
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  // Do not use absolute-fill for product artwork. On Android it can resolve
  // against the wrong layout box in a clipped card, leaving only part of the
  // image visible. A normal 100%-sized image respects this wrapper's bounds.
  image: { width: '100%', height: '100%', borderRadius: radius.md },
});

