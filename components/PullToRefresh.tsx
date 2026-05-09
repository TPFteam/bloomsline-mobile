import { useState, useRef, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Animated, Platform, RefreshControl, ScrollViewProps, Dimensions } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { pickAffirmation } from '@/lib/affirmations'

interface Props extends ScrollViewProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

// On web we use `position: 'fixed'` so the affirmation + progress bar pin
// to the viewport top regardless of where this scroll view sits in the
// layout (some screens like Stories have a fixed header above us).
// react-native-web supports `'fixed'` even though RN typings don't.
const TOP_PIN_STYLE: any = Platform.OS === 'web'
  ? { position: 'fixed' }
  : { position: 'absolute' }

/**
 * Slim teal progress strip at the very top of the screen. Grows during
 * the pull (gives the user a "you're getting close to triggering"
 * signal), then runs an indeterminate slide while the refresh is
 * actually happening, then fades.
 */
function ProgressBar({ pullValue, pullTrigger, refreshing }: {
  pullValue: Animated.Value
  pullTrigger: number
  refreshing: boolean
}) {
  // Indeterminate slide for the refreshing phase: a 35%-wide segment
  // slides from -35% to 100% and loops.
  const slide = useRef(new Animated.Value(-0.35)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (refreshing) {
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: false }).start()
      const loop = Animated.loop(
        Animated.timing(slide, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: false,
        }),
        { resetBeforeIteration: true },
      )
      loop.start()
      return () => loop.stop()
    } else {
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: false }).start()
      slide.setValue(-0.35)
    }
  }, [refreshing, slide, fade])

  const screenW = Dimensions.get('window').width

  // While pulling: fixed-width fill that grows with pullValue.
  const pullFillWidth = pullValue.interpolate({
    inputRange: [0, pullTrigger],
    outputRange: [0, screenW],
    extrapolate: 'clamp',
  })

  // While refreshing: indeterminate segment that slides across.
  const slideX = slide.interpolate({
    inputRange: [-0.35, 1],
    outputRange: [-screenW * 0.35, screenW],
  })

  return (
    <View
      pointerEvents="none"
      style={{
        ...TOP_PIN_STYLE,
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(74, 154, 134, 0.12)',
        overflow: 'hidden',
        zIndex: 7,
      }}
    >
      {/* Pull-progress fill (visible only when not refreshing) */}
      {!refreshing && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 2,
            width: pullFillWidth,
            backgroundColor: '#4A9A86',
          }}
        />
      )}
      {/* Indeterminate slide (visible only while refreshing) */}
      {refreshing && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            height: 2,
            width: screenW * 0.35,
            backgroundColor: '#4A9A86',
            opacity: fade,
            transform: [{ translateX: slideX }],
          }}
        />
      )}
    </View>
  )
}

/**
 * Tiny gentle one-liner shown below the progress strip while pulling /
 * refreshing, a la Slack's "If anyone can, it's you". Stays muted on
 * purpose so it never competes with the screen's actual content.
 */
function AffirmationLine({ message, opacity, top }: {
  message: string
  opacity: Animated.AnimatedInterpolation<number> | Animated.Value | number
  top: number
}) {
  if (!message) return null
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        ...TOP_PIN_STYLE,
        top,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 24,
        zIndex: 8,
        opacity,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: '#4A9A86',
          opacity: 0.9,
          letterSpacing: 0.1,
        }}
      >
        {message}
      </Text>
    </Animated.View>
  )
}

export function PullToRefreshScrollView({ onRefresh, children, ...scrollProps }: Props) {
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<string>('')
  const { locale } = useI18n()

  // Native fade for the affirmation: 0 → 1 over 250ms when refresh starts,
  // 1 → 0 over 400ms when refresh ends.
  const nativeFade = useRef(new Animated.Value(0)).current

  // pullY drives both the content slide AND the progress-bar growth.
  // Defined here so both web and native handlers + the ProgressBar share
  // the same underlying animated value.
  const pullY = useRef(new Animated.Value(0)).current
  const PULL_TRIGGER = 70
  const PULL_MAX = 120

  const handleRefresh = useCallback(async () => {
    setMessage(pickAffirmation(locale))
    setRefreshing(true)
    await Promise.all([onRefresh(), new Promise(r => setTimeout(r, 800))])
    setRefreshing(false)
  }, [onRefresh, locale])

  useEffect(() => {
    Animated.timing(nativeFade, {
      toValue: refreshing ? 1 : 0,
      duration: refreshing ? 250 : 400,
      useNativeDriver: true,
    }).start()
  }, [refreshing, nativeFade])

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1 }}>
        <ProgressBar pullValue={pullY} pullTrigger={PULL_TRIGGER} refreshing={refreshing} />
        <AffirmationLine message={message} opacity={nativeFade} top={56} />
        <ScrollView
          {...scrollProps}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#4A9A86"
              colors={['#4A9A86']}
            />
          }
        >
          {children}
        </ScrollView>
      </View>
    )
  }

  // ── Web: Slack-style pull-to-refresh ──────────────────────────────────
  // Whole content slides down with the pull. The affirmation appears at
  // the viewport top (position: fixed), with a slim progress strip just
  // above it. Browser's native pull-refresh is suppressed in
  // app/_layout.tsx via overscroll-behavior: contain.

  const startY = useRef(0)
  const pulling = useRef(false)
  const scrollAtTop = useRef(true)

  const onScroll = (e: any) => {
    scrollAtTop.current = (e?.nativeEvent?.contentOffset?.y ?? 0) <= 0
    scrollProps.onScroll?.(e)
  }

  const onTouchStart = (e: any) => {
    const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent
    startY.current = touch?.pageY || 0
  }

  const onTouchMove = (e: any) => {
    if (refreshing) return
    if (!scrollAtTop.current) return
    const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent
    const y = (touch?.pageY || 0) - startY.current
    if (y > 0 && y < PULL_MAX) {
      if (!pulling.current && !message) {
        setMessage(pickAffirmation(locale))
      }
      pulling.current = true
      const eased = Math.min(PULL_MAX, y * 0.6)
      pullY.setValue(eased)
    }
  }

  const onTouchEnd = async () => {
    if (!pulling.current || refreshing) {
      Animated.spring(pullY, { toValue: 0, useNativeDriver: true }).start()
      pulling.current = false
      return
    }

    const currentValue = (pullY as any).__getValue?.() || 0
    if (currentValue >= PULL_TRIGGER) {
      Animated.timing(pullY, { toValue: PULL_TRIGGER, duration: 160, useNativeDriver: true }).start()
      await handleRefresh()
    }
    Animated.spring(pullY, { toValue: 0, useNativeDriver: true, friction: 8 }).start()
    pulling.current = false
    setTimeout(() => { if (!pulling.current) setMessage('') }, 600)
  }

  // Affirmation fades in early in the pull so it's already legible by the
  // time the trigger threshold is reached. While refreshing it sticks at
  // full opacity (driven by nativeFade).
  const pullOpacity = pullY.interpolate({
    inputRange: [0, 18, PULL_TRIGGER],
    outputRange: [0, 0.7, 1],
  })

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <ProgressBar pullValue={pullY} pullTrigger={PULL_TRIGGER} refreshing={refreshing} />
      <AffirmationLine
        message={message}
        opacity={refreshing ? nativeFade : pullOpacity}
        top={12}
      />
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateY: pullY }],
        }}
      >
        <ScrollView
          {...scrollProps}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  )
}
