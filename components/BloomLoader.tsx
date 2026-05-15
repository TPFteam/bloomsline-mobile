import { useEffect, useRef, useState } from 'react'
import { View, Text, Animated, Easing, Platform } from 'react-native'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

// Full-screen loading state used while we resolve auth/session, the
// member record, and OAuth-callback session-setting. Replaces the bare
// ActivityIndicator that left users staring at a blank white screen —
// the breathing dot + rotating subtitle matches the brand's calming
// tone and signals "we're working, not frozen."
//
// Pass `subtitle` to pin a specific message; omit it to cycle through
// the i18n'd "calmness phrases" every 3 seconds.
export function BloomLoader({ subtitle }: { subtitle?: string } = {}) {
  const { t } = useI18n()
  const scale = useRef(new Animated.Value(0.85)).current
  const opacity = useRef(new Animated.Value(0.35)).current
  const [phraseIdx, setPhraseIdx] = useState(0)

  // The native driver doesn't work for layout-affecting props on web,
  // and the JS-driven path is fine here (one loop, low cost).
  const useNative = Platform.OS !== 'web'

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.15, duration: 2400,
            easing: Easing.inOut(Easing.quad), useNativeDriver: useNative,
          }),
          Animated.timing(opacity, {
            toValue: 0.9, duration: 2400,
            easing: Easing.inOut(Easing.quad), useNativeDriver: useNative,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.85, duration: 2400,
            easing: Easing.inOut(Easing.quad), useNativeDriver: useNative,
          }),
          Animated.timing(opacity, {
            toValue: 0.35, duration: 2400,
            easing: Easing.inOut(Easing.quad), useNativeDriver: useNative,
          }),
        ]),
      ])
    )
    breathe.start()
    return () => breathe.stop()
  }, [scale, opacity, useNative])

  // Pull calming phrases out of i18n. Fallback to a sensible default
  // if a translation slot is missing so we never render an empty line.
  const phrases: string[] = [
    t.loader?.phrase1 || 'Setting up your space…',
    t.loader?.phrase2 || 'Gathering your moments…',
    t.loader?.phrase3 || 'Almost there…',
    t.loader?.phrase4 || 'Take a breath.',
  ]

  useEffect(() => {
    if (subtitle) return
    const id = setInterval(() => {
      setPhraseIdx(i => (i + 1) % phrases.length)
    }, 3000)
    return () => clearInterval(id)
  }, [subtitle, phrases.length])

  return (
    <View style={{
      flex: 1, justifyContent: 'center', alignItems: 'center',
      backgroundColor: '#fff', paddingHorizontal: 32,
    }}>
      <View style={{ width: 112, height: 112, justifyContent: 'center', alignItems: 'center' }}>
        {/* Soft halo — wider, fainter ring breathing in sync with the
            inner dot. Adds depth so the loader doesn't read as a flat
            disc on the white background. */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 112, height: 112, borderRadius: 56,
            backgroundColor: colors.bloom,
            opacity: 0.1,
            transform: [{ scale }],
          }}
        />
        {/* Inner breathing dot. */}
        <Animated.View
          style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.bloom,
            opacity,
            transform: [{ scale }],
          }}
        />
      </View>
      <Text style={{
        marginTop: 32, fontSize: 17, fontWeight: '600',
        color: '#1f1f1f', letterSpacing: -0.2,
      }}>
        Bloomsline
      </Text>
      <Text style={{
        marginTop: 6, fontSize: 14, color: '#7d7d7d',
        textAlign: 'center', letterSpacing: -0.1,
        minHeight: 20, // reserve space so the layout doesn't jitter
      }}>
        {subtitle ?? phrases[phraseIdx]}
      </Text>
    </View>
  )
}
