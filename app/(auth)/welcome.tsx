import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

// Emotion states the dots cycle through
const EMOTIONS = [
  { name: 'calm',    color: '#4A9A86', spread: 0, scale: 1,    rotation: 0   },
  { name: 'joy',     color: '#5BBE6E', spread: 6, scale: 1.15, rotation: 15  },
  { name: 'wonder',  color: '#5A9ECF', spread: 4, scale: 1.05, rotation: -10 },
  { name: 'warmth',  color: '#E8956A', spread: 3, scale: 1.1,  rotation: 8   },
  { name: 'tender',  color: '#C47DB5', spread: 2, scale: 0.95, rotation: -5  },
  { name: 'peace',   color: '#4A9A86', spread: 0, scale: 1,    rotation: 0   },
]

const CYCLE_DURATION = 2800

export default function Welcome() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useI18n()

  // Entrance animations
  const fadeIn = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(30)).current
  const logoScale = useRef(new Animated.Value(0.8)).current

  // Dot animations — each dot has its own position, scale, color, and opacity
  const dotAnims = useRef(
    [0, 1, 2, 3].map(() => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
    }))
  ).current

  // Overall rotation for the cross pattern
  const rotation = useRef(new Animated.Value(0)).current

  // Color state (can't animate colors with native driver, so we use state)
  const [dotColor, setDotColor] = useState(EMOTIONS[0].color)
  const emotionIndex = useRef(0)

  // Base positions for each dot (cross pattern)
  const dotPositions = [
    { x: 0, y: -17 },  // top
    { x: -17, y: 0 },  // left
    { x: 17, y: 0 },   // right
    { x: 0, y: 17 },   // bottom
  ]

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start()

    // Start emotion cycle after entrance
    const timeout = setTimeout(() => runEmotionCycle(), 1200)
    return () => clearTimeout(timeout)
  }, [])

  function runEmotionCycle() {
    const nextIdx = (emotionIndex.current + 1) % EMOTIONS.length
    emotionIndex.current = nextIdx
    const emotion = EMOTIONS[nextIdx]

    setDotColor(emotion.color)

    // Animate each dot
    const dotAnimations = dotAnims.map((anim, i) => {
      const basePos = dotPositions[i]
      // Spread: move dots outward from center
      const spreadX = basePos.x !== 0 ? (basePos.x > 0 ? emotion.spread : -emotion.spread) : 0
      const spreadY = basePos.y !== 0 ? (basePos.y > 0 ? emotion.spread : -emotion.spread) : 0

      // Stagger: each dot starts slightly offset for organic feel
      const staggerDelay = i * 80

      return Animated.sequence([
        Animated.delay(staggerDelay),
        Animated.parallel([
          Animated.spring(anim.translateX, {
            toValue: spreadX,
            friction: 7,
            tension: 35,
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateY, {
            toValue: spreadY,
            friction: 7,
            tension: 35,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: emotion.scale + (i % 2 === 0 ? 0.05 : -0.03),
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ])
    })

    // Gentle rotation of the whole group
    const rotationAnim = Animated.timing(rotation, {
      toValue: emotion.rotation,
      duration: CYCLE_DURATION * 0.7,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    })

    Animated.parallel([...dotAnimations, rotationAnim]).start()

    // Schedule next emotion
    setTimeout(() => runEmotionCycle(), CYCLE_DURATION)
  }

  const rotateInterpolation = rotation.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: ['-15deg', '0deg', '15deg'],
  })

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
        {/* Emotional blooming logo */}
        <Animated.View style={{
          marginBottom: 56,
          transform: [{ scale: logoScale }],
        }}>
          <Animated.View style={{
            width: 64,
            height: 64,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ rotate: rotateInterpolation }],
          }}>
            {dotAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: dotColor,
                  transform: [
                    { translateX: Animated.add(new Animated.Value(dotPositions[i].x), anim.translateX) },
                    { translateY: Animated.add(new Animated.Value(dotPositions[i].y), anim.translateY) },
                    { scale: anim.scale },
                  ],
                }}
              />
            ))}
          </Animated.View>
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
