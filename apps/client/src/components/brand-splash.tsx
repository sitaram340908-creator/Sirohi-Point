import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const mark = require('../../assets/images/splash-mark.png');
const wordmark = require('../../assets/images/splash-wordmark.png');
const tagline = require('../../assets/images/splash-tagline.png');

/** The supplied opening logo animation, shared by web and native entry points. */
export function BrandSplash() {
  const [visible, setVisible] = useState(true);
  const glow = useRef(new Animated.Value(0)).current;
  const markIn = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const nameIn = useRef(new Animated.Value(0)).current;
  const taglineIn = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const ease = Easing.bezier(0.22, 0.7, 0.3, 1);
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(glow, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(markIn, { toValue: 1, duration: 1300, easing: ease, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(shine, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(nameIn, { toValue: 1, duration: 1100, easing: ease, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(2700),
        Animated.timing(taglineIn, { toValue: 1, duration: 1000, easing: ease, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    const timer = setTimeout(() => {
      Animated.timing(exit, { toValue: 0, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start(() => setVisible(false));
    }, 4000);
    return () => { animation.stop(); clearTimeout(timer); };
  }, [exit, glow, markIn, nameIn, shine, taglineIn]);

  if (!visible) return null;

  const markStyle = { opacity: markIn, transform: [{ translateY: markIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: markIn.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] };
  const fadeUp = (value: Animated.Value, distance: number) => ({ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] });

  return <Animated.View pointerEvents="auto" style={[styles.screen, { opacity: exit }]}>
    <View style={styles.texture} pointerEvents="none" />
    <View style={styles.content}>
      <View style={styles.markWrap}>
        <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glow.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1, 0] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.25] }) }] }]} />
        <View style={styles.markClip}>
          <Animated.Image source={mark} accessibilityLabel="Sirohi Point" resizeMode="contain" style={[styles.mark, markStyle]} />
          <Animated.View pointerEvents="none" style={[styles.shine, { opacity: shine.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }), transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-260, 260] }) }, { rotate: '18deg' }] }]} />
        </View>
      </View>
      <Animated.Image source={wordmark} accessibilityLabel="Sirohi Point" resizeMode="contain" style={[styles.wordmark, fadeUp(nameIn, 14)]} />
      <Animated.Image source={tagline} accessibilityLabel="Hardware, electronics, paint" resizeMode="contain" style={[styles.tagline, fadeUp(taglineIn, 10)]} />
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#F8F4EC', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0, zIndex: 10000 },
  texture: { backgroundColor: '#EEE6D3', bottom: 0, left: 0, opacity: 0.34, position: 'absolute', right: 0, top: 0 },
  content: { alignItems: 'center', width: '90%' },
  markWrap: { height: 220, marginBottom: 14, position: 'relative', width: 220 },
  markClip: { height: 220, overflow: 'hidden', width: 220 },
  glow: { backgroundColor: '#C9A24A', borderRadius: 170, height: 330, left: -55, opacity: 0, position: 'absolute', top: -55, width: 330 },
  mark: { height: 220, width: 220 },
  shine: { backgroundColor: 'rgba(255,255,255,0.82)', height: 320, position: 'absolute', top: -45, width: 38 },
  wordmark: { height: 77, marginBottom: 10, maxWidth: 400, width: '100%' },
  tagline: { height: 34, maxWidth: 320, width: '80%' },
});
