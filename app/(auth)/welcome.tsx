import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

// Emotion states the dots cycle through
const EMOTIONS = [
  { name: 'calm',    color: '#4A9A86', glowColor: '#4A9A8620', spread: 0,  scale: 1,    rotation: 0,   glowScale: 1,    word: { en: 'calm', fr: 'calme' }       },
  { name: 'joy',     color: '#5BBE6E', glowColor: '#5BBE6E25', spread: 10, scale: 1.2,  rotation: 15,  glowScale: 1.3,  word: { en: 'joy', fr: 'joie' }          },
  { name: 'wonder',  color: '#5A9ECF', glowColor: '#5A9ECF20', spread: 7,  scale: 1.08, rotation: -10, glowScale: 1.15, word: { en: 'wonder', fr: 'émerveillement' } },
  { name: 'warmth',  color: '#E8956A', glowColor: '#E8956A25', spread: 5,  scale: 1.15, rotation: 8,   glowScale: 1.25, word: { en: 'warmth', fr: 'chaleur' }    },
  { name: 'tender',  color: '#C47DB5', glowColor: '#C47DB520', spread: 3,  scale: 0.95, rotation: -5,  glowScale: 1.1,  word: { en: 'tenderness', fr: 'tendresse' } },
  { name: 'peace',   color: '#4A9A86', glowColor: '#4A9A8620', spread: 0,  scale: 1,    rotation: 0,   glowScale: 1,    word: { en: 'peace', fr: 'paix' }        },
]

const CYCLE_DURATION = 2800
const DOT_SIZE = 18
const DOT_RADIUS = DOT_SIZE / 2
const DOT_GAP = 22

export default function Welcome() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t, locale } = useI18n()

  // Entrance animations
  const fadeIn = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(30)).current
  const logoScale = useRef(new Animated.Value(0.6)).current

  // Dot animations
  const dotAnims = useRef(
    [0, 1, 2, 3].map(() => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(1),
    }))
  ).current

  // Glow animation
  const glowScale = useRef(new Animated.Value(1)).current
  const glowOpacity = useRef(new Animated.Value(0.15)).current

  // Overall rotation
  const rotation = useRef(new Animated.Value(0)).current

  // Emotion word fade
  const wordOpacity = useRef(new Animated.Value(0.8)).current
  const wordSlide = useRef(new Animated.Value(0)).current

  // Color + word state
  const [dotColor, setDotColor] = useState(EMOTIONS[0].color)
  const [glowColor, setGlowColor] = useState(EMOTIONS[0].glowColor)
  const [emotionWord, setEmotionWord] = useState(EMOTIONS[0].word)
  const emotionIndex = useRef(0)

  // Base positions (cross pattern, wider spacing)
  const dotPositions = [
    { x: 0, y: -DOT_GAP },   // top
    { x: -DOT_GAP, y: 0 },   // left
    { x: DOT_GAP, y: 0 },    // right
    { x: 0, y: DOT_GAP },    // bottom
  ]

  useEffect(() => {
    // Entrance — logo blooms in from small
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 30, useNativeDriver: true }),
    ]).start()

    // Gentle breathing glow from the start
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()

    // Start emotion cycle after entrance
    const timeout = setTimeout(() => runEmotionCycle(), 1400)
    return () => clearTimeout(timeout)
  }, [])

  function runEmotionCycle() {
    const nextIdx = (emotionIndex.current + 1) % EMOTIONS.length
    emotionIndex.current = nextIdx
    const emotion = EMOTIONS[nextIdx]

    setDotColor(emotion.color)
    setGlowColor(emotion.glowColor)

    // Fade out old word, swap, fade in new word
    Animated.timing(wordOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setEmotionWord(emotion.word)
      wordSlide.setValue(6)
      Animated.parallel([
        Animated.timing(wordOpacity, { toValue: 0.8, duration: 400, useNativeDriver: true }),
        Animated.spring(wordSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start()
    })

    // Animate each dot with stagger
    const dotAnimations = dotAnims.map((anim, i) => {
      const basePos = dotPositions[i]
      const spreadX = basePos.x !== 0 ? (basePos.x > 0 ? emotion.spread : -emotion.spread) : 0
      const spreadY = basePos.y !== 0 ? (basePos.y > 0 ? emotion.spread : -emotion.spread) : 0
      const staggerDelay = i * 100

      return Animated.sequence([
        Animated.delay(staggerDelay),
        Animated.parallel([
          Animated.spring(anim.translateX, { toValue: spreadX, friction: 6, tension: 30, useNativeDriver: true }),
          Animated.spring(anim.translateY, { toValue: spreadY, friction: 6, tension: 30, useNativeDriver: true }),
          Animated.spring(anim.scale, {
            toValue: emotion.scale + (i % 2 === 0 ? 0.08 : -0.04),
            friction: 5,
            tension: 35,
            useNativeDriver: true,
          }),
        ]),
      ])
    })

    // Rotation + glow scale
    const rotationAnim = Animated.timing(rotation, {
      toValue: emotion.rotation,
      duration: CYCLE_DURATION * 0.7,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    })

    const glowAnim = Animated.spring(glowScale, {
      toValue: emotion.glowScale,
      friction: 6,
      tension: 25,
      useNativeDriver: true,
    })

    Animated.parallel([...dotAnimations, rotationAnim, glowAnim]).start()

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
          marginBottom: 48,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Ambient glow behind dots */}
          <Animated.View style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: glowColor,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }} />

          <Animated.View style={{
            width: 80,
            height: 80,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ rotate: rotateInterpolation }],
          }}>
            {dotAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: DOT_RADIUS,
                  backgroundColor: dotColor,
                  shadowColor: dotColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
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

        {/* Emotion word — cycles with the dots */}
        <Animated.View style={{
          marginBottom: 24,
          opacity: wordOpacity,
          transform: [{ translateY: wordSlide }],
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: dotColor,
            textAlign: 'center',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {emotionWord[locale] || emotionWord.en}
          </Text>
        </Animated.View>

        {/* Headline */}
        <Text style={{
          fontSize: 30,
          fontWeight: '700',
          color: colors.primary,
          textAlign: 'center',
          letterSpacing: -0.6,
          lineHeight: 38,
          paddingHorizontal: 8,
        }}>
          {t.auth.welcomeHeadline}
        </Text>

        {/* Subtitle */}
        <Text style={{
          fontSize: 15,
          color: '#AAAAAA',
          textAlign: 'center',
          marginTop: 16,
          lineHeight: 22,
          letterSpacing: 0.3,
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
