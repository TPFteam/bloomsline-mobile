import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, Easing, Linking } from 'react-native'
import { Lock } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'

// Emotion states the dots cycle through
const EMOTIONS = [
  { name: 'calm',    color: '#4A9A86', glowColor: '#4A9A8620', spread: 0,  scale: 1,    rotation: 0,   glowScale: 1    },
  { name: 'joy',     color: '#5BBE6E', glowColor: '#5BBE6E25', spread: 10, scale: 1.2,  rotation: 15,  glowScale: 1.3  },
  { name: 'wonder',  color: '#5A9ECF', glowColor: '#5A9ECF20', spread: 7,  scale: 1.08, rotation: -10, glowScale: 1.15 },
  { name: 'warmth',  color: '#E8956A', glowColor: '#E8956A25', spread: 5,  scale: 1.15, rotation: 8,   glowScale: 1.25 },
  { name: 'tender',  color: '#C47DB5', glowColor: '#C47DB520', spread: 3,  scale: 0.95, rotation: -5,  glowScale: 1.1  },
  { name: 'peace',   color: '#4A9A86', glowColor: '#4A9A8620', spread: 0,  scale: 1,    rotation: 0,   glowScale: 1    },
]

const CYCLE_DURATION = 2800
const DOT_SIZE = 18
const DOT_RADIUS = DOT_SIZE / 2
const DOT_GAP = 22

export default function Welcome() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t, locale } = useI18n()
  const { notEligible, clearNotEligible } = useAuth()

  // Entrance cascade
  const logoFade = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.6)).current
  const line1Fade = useRef(new Animated.Value(0)).current
  const line1Slide = useRef(new Animated.Value(12)).current
  const line2Fade = useRef(new Animated.Value(0)).current
  const line2Slide = useRef(new Animated.Value(12)).current
  const line3Fade = useRef(new Animated.Value(0)).current
  const line3Slide = useRef(new Animated.Value(12)).current
  const subtitleFade = useRef(new Animated.Value(0)).current
  const subtitleSlide = useRef(new Animated.Value(14)).current
  const bottomFade = useRef(new Animated.Value(0)).current
  const bottomSlide = useRef(new Animated.Value(10)).current

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

  // Color state
  const dotColorRef = useRef(EMOTIONS[0].color)
  const glowColorRef = useRef(EMOTIONS[0].glowColor)
  const emotionIndex = useRef(0)
  const forceUpdate = useRef(new Animated.Value(0)).current

  // Base positions (cross pattern)
  const dotPositions = [
    { x: 0, y: -DOT_GAP },
    { x: -DOT_GAP, y: 0 },
    { x: DOT_GAP, y: 0 },
    { x: 0, y: DOT_GAP },
  ]

  function runEmotionCycle() {
    const nextIdx = (emotionIndex.current + 1) % EMOTIONS.length
    emotionIndex.current = nextIdx
    const emotion = EMOTIONS[nextIdx]

    dotColorRef.current = emotion.color
    glowColorRef.current = emotion.glowColor
    Animated.timing(forceUpdate, { toValue: nextIdx, duration: 0, useNativeDriver: true }).start()

    const dotAnimations = dotAnims.map((anim, i) => {
      const basePos = dotPositions[i]
      const spreadX = basePos.x !== 0 ? (basePos.x > 0 ? emotion.spread : -emotion.spread) : 0
      const spreadY = basePos.y !== 0 ? (basePos.y > 0 ? emotion.spread : -emotion.spread) : 0
      return Animated.sequence([
        Animated.delay(i * 100),
        Animated.parallel([
          Animated.spring(anim.translateX, { toValue: spreadX, friction: 6, tension: 30, useNativeDriver: true }),
          Animated.spring(anim.translateY, { toValue: spreadY, friction: 6, tension: 30, useNativeDriver: true }),
          Animated.spring(anim.scale, {
            toValue: emotion.scale + (i % 2 === 0 ? 0.08 : -0.04),
            friction: 5, tension: 35, useNativeDriver: true,
          }),
        ]),
      ])
    })

    Animated.parallel([
      ...dotAnimations,
      Animated.timing(rotation, { toValue: emotion.rotation, duration: CYCLE_DURATION * 0.7, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.spring(glowScale, { toValue: emotion.glowScale, friction: 6, tension: 25, useNativeDriver: true }),
    ]).start()

    setTimeout(() => runEmotionCycle(), CYCLE_DURATION)
  }

  useEffect(() => {
    // 1. Logo blooms in
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 30, useNativeDriver: true }),
    ]).start()

    // 2. Breathing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()

    // 3. Line-by-line headline reveal
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(line1Fade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(line1Slide, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start()
    }, 500)

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(line2Fade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(line2Slide, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start()
    }, 800)

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(line3Fade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(line3Slide, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start()
    }, 1100)

    // 4. Subtitle
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(subtitleSlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start()
    }, 1500)

    // 5. Bottom
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(bottomFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(bottomSlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start()
    }, 1700)

    // 4. Start emotion cycle
    const timeout = setTimeout(() => runEmotionCycle(), 1400)
    return () => clearTimeout(timeout)
  }, [])

  const rotateInterpolation = rotation.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: ['-15deg', '0deg', '15deg'],
  })

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Main content — centered */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36 }}>

        {/* Emotional blooming logo */}
        <Animated.View style={{
          marginBottom: 64,
          opacity: logoFade,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Ambient glow */}
          <Animated.View style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: glowColorRef.current,
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
                  backgroundColor: dotColorRef.current,
                  shadowColor: dotColorRef.current,
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

        {/* Headline — line by line */}
        <View style={{ alignItems: 'center' }}>
          <Animated.Text style={{
            fontSize: 32,
            fontWeight: '300',
            fontStyle: 'italic',
            color: '#1A1A1A',
            textAlign: 'center',
            letterSpacing: -0.5,
            lineHeight: 42,
            opacity: line1Fade,
            transform: [{ translateY: line1Slide }],
          }}>
            {locale === 'fr' ? 'Certaines réponses apparaissent' : 'Some answers appear'}
          </Animated.Text>
          <Animated.Text style={{
            fontSize: 32,
            fontWeight: '300',
            fontStyle: 'italic',
            color: '#1A1A1A',
            textAlign: 'center',
            letterSpacing: -0.5,
            lineHeight: 42,
            opacity: line2Fade,
            transform: [{ translateY: line2Slide }],
          }}>
            {locale === 'fr' ? 'quand vos pensées' : 'when your thoughts'}
          </Animated.Text>
          <Animated.Text style={{
            fontSize: 32,
            fontWeight: '700',
            fontStyle: 'italic',
            color: '#4A9A86',
            textAlign: 'center',
            letterSpacing: -0.5,
            lineHeight: 42,
            opacity: line3Fade,
            transform: [{ translateY: line3Slide }],
          }}>
            {locale === 'fr' ? 'ont une place pour exister.' : 'have a place to exist.'}
          </Animated.Text>
        </View>

        {/* Subtitle */}
        <Animated.View style={{
          opacity: subtitleFade,
          transform: [{ translateY: subtitleSlide }],
          marginTop: 20,
        }}>
          <Text style={{
            fontSize: 16,
            color: '#AAAAAA',
            textAlign: 'center',
            lineHeight: 24,
          }}>
            {t.auth.welcomeSubtitle}
          </Text>
        </Animated.View>
      </View>

      {/* Not eligible banner */}
      {notEligible && (
        <TouchableOpacity
          onPress={clearNotEligible}
          activeOpacity={0.9}
          style={{
            marginHorizontal: 24,
            marginBottom: 12,
            backgroundColor: '#FFF8F0',
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: '#F0E0D0',
          }}
        >
          <Text style={{ fontSize: 15, color: '#8B6914', lineHeight: 22, textAlign: 'center' }}>
            {notEligible === 'not_eligible' || notEligible === 'missing_token' || notEligible === 'invalid_token' || notEligible === 'no_email'
              ? (locale === 'fr'
                ? 'Nous sommes actuellement en accès anticipé. Demandez une invitation pour nous rejoindre.'
                : 'We\'re currently in early access. Request an invite to join us.')
              : notEligible}
          </Text>
          <Text style={{ fontSize: 12, color: '#B8A070', textAlign: 'center', marginTop: 8 }}>
            {locale === 'fr' ? 'Appuyez pour fermer' : 'Tap to dismiss'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Bottom section */}
      <Animated.View style={{
        paddingHorizontal: 24,
        paddingBottom: 12,
        opacity: bottomFade,
        transform: [{ translateY: bottomSlide }],
      }}>
        {/* Primary CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-up')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#1A1A1A',
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
            {t.auth.getStarted}
          </Text>
        </TouchableOpacity>

        {/* Secondary — text link */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-in')}
          activeOpacity={0.7}
          style={{
            height: 48,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ color: '#888', fontSize: 15, fontWeight: '500' }}>
            {t.auth.haveAccount}
          </Text>
        </TouchableOpacity>

        {/* Private and secure */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <Lock size={12} color="#BBB" />
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#BBB', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {locale === 'fr' ? 'Privé et sécurisé' : 'Private and secure'}
          </Text>
        </View>

        {/* Footer links */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32, marginTop: 16, paddingBottom: 4 }}>
          <TouchableOpacity onPress={() => Linking.openURL('https://bloomsline.com/privacy')} activeOpacity={0.6}>
            <Text style={{ fontSize: 10, fontWeight: '500', color: '#CCC', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {locale === 'fr' ? 'Confidentialité' : 'Privacy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://bloomsline.com/terms')} activeOpacity={0.6}>
            <Text style={{ fontSize: 10, fontWeight: '500', color: '#CCC', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {locale === 'fr' ? 'Conditions' : 'Terms'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}
