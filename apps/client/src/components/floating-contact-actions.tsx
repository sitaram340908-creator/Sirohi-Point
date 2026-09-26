import { useEffect, useRef } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { useThemedStyles } from '@/theme/theme-context';

const whatsappIcon = require('../../assets/images/whatsapp-icon.png');

const phoneNumber = '+919058036895';

export function FloatingContactActions() {
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const mobile = width < 1100;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -7, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(bob, { toValue: 0, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [bob]);

  return <View pointerEvents="box-none" style={[styles.container, mobile ? styles.containerMobile : styles.containerDesktop]}>
    <Animated.View style={[styles.actionWrap, styles.callWrap, { transform: [{ translateY: bob }] }]}>
      <Pressable accessibilityRole="link" accessibilityLabel="Call Sirohi Point" onPress={() => void Linking.openURL(`tel:${phoneNumber}`)} style={({ pressed }) => [styles.action, styles.call, pressed && styles.pressed]}>
        <SymbolView name={{ ios: 'phone.fill', android: 'phone', web: 'phone' }} tintColor="#FFFFFF" size={27} />
      </Pressable>
      <Text style={styles.label}>Call us</Text>
    </Animated.View>
    <Animated.View style={[styles.actionWrap, styles.whatsappWrap, { transform: [{ translateY: bob }] }]}>
      <Pressable accessibilityRole="link" accessibilityLabel="Chat with Sirohi Point on WhatsApp" onPress={() => void Linking.openURL(`https://wa.me/${phoneNumber.slice(1)}`)} style={({ pressed }) => [styles.action, styles.whatsapp, pressed && styles.pressed]}>
        <Image accessibilityLabel="WhatsApp" source={whatsappIcon} contentFit="contain" style={styles.whatsappIcon} />
      </Pressable>
      <Text style={styles.label}>WhatsApp</Text>
    </Animated.View>
  </View>;
}

const createStyles = (c: { surface: string; line: string; textPrimary: string; shadow: string }) => StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, zIndex: 200, pointerEvents: 'box-none' },
  containerMobile: { bottom: 166 },
  containerDesktop: { bottom: 88 },
  actionWrap: { position: 'absolute', alignItems: 'center', gap: 5 },
  callWrap: { left: 18 },
  whatsappWrap: { right: 18 },
  action: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', borderWidth: 7, borderColor: 'rgba(255,255,255,0.55)', shadowColor: c.shadow, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  call: { backgroundColor: '#1477F8' },
  whatsapp: { backgroundColor: '#20C86B' },
  whatsappIcon: { width: 31, height: 31 },
  label: { color: c.textPrimary, fontSize: 10, fontWeight: '800', backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.line, paddingHorizontal: 7, paddingVertical: 3 },
  pressed: { opacity: 0.7 },
});
