import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

export default function Welcome() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const fadeIn = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(30)).current
  const logoScale = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Main content */}
      <Animated.View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        opacity: fadeIn,
        transform: [{ translateY: slideUp }],
      }}>
        {/* Logo with ambient glow */}
        <Animated.View style={{
          marginBottom: 56,
          transform: [{ scale: logoScale }],
        }}>
          {/* 4-petal cross logo in teal */}
          <View style={{ width: 48, height: 48, position: 'relative' }}>
            <View style={{ position: 'absolute', top: 0, left: 16, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bloom }} />
            <View style={{ position: 'absolute', top: 17, left: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bloom }} />
            <View style={{ position: 'absolute', top: 17, left: 34, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bloom }} />
            <View style={{ position: 'absolute', top: 34, left: 16, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bloom }} />
          </View>
        </Animated.View>

        {/* Headline */}
        <Text style={{
          fontSize: 34,
          fontWeight: '700',
          color: colors.primary,
          textAlign: 'center',
          letterSpacing: -0.8,
          lineHeight: 42,
        }}>
          {t.auth.welcomeHeadline}
        </Text>

        {/* Subtitle */}
        <Text style={{
          fontSize: 17,
          color: '#8A8A8A',
          textAlign: 'center',
          marginTop: 20,
          lineHeight: 26,
          letterSpacing: 0.2,
        }}>
          {t.auth.welcomeSubtitle}
        </Text>
      </Animated.View>

      {/* Bottom CTAs */}
      <Animated.View style={{
        paddingHorizontal: 24,
        gap: 12,
        paddingBottom: 16,
        opacity: fadeIn,
      }}>
        {/* Primary: Get started */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-up')}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.primary,
            height: 58,
            borderRadius: 29,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', letterSpacing: 0.2 }}>{t.auth.getStarted}</Text>
        </TouchableOpacity>

        {/* Secondary: Sign in */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-in')}
          activeOpacity={0.7}
          style={{
            backgroundColor: '#EFEFED',
            height: 58,
            borderRadius: 29,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#666', fontSize: 17, fontWeight: '600', letterSpacing: 0.2 }}>{t.auth.haveAccount}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}
