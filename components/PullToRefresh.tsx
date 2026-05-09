import { useState, useRef, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Animated, Platform, RefreshControl, ScrollViewProps, Dimensions } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { pickAffirmation } from '@/lib/affirmations'

interface Props extends ScrollViewProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

// position: 'fixed' on web pins the affirmation to the viewport top
// regardless of the scroll view's position in the layout. Native uses
// the standard absolute fallback.
const TOP_PIN_STYLE: any = Platform.OS === 'web'
  ? { position: 'fixed' }
  : { position: 'absolute' }

const TEAL = '#4A9A86'

/**
 * Affirmation text rendered on top of the teal pull-band. Stays centered
 * inside the band, so the white text reads against the teal as the band
 * grows.
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
          fontWeight: '600',
          color: '#fff',
          letterSpacing: 0.2,
        }}
      >
        {message}
      </Text>
    </Animated.View>
  )
}

/**
 * Shimmer band that slides across the teal pull-area while refresh is in
 * flight. Gives the user a clear "yes, something is happening" signal
 * beyond the static affirmation.
 */
function RefreshShimmer({ refreshing, height }: {
  refreshing: boolean
  height: number
}) {
  const slide = useRef(new Animated.Value(-0.4)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (refreshing) {
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: false }).start()
      const loop = Animated.loop(
        Animated.timing(slide, { toValue: 1, duration: 1100, useNativeDriver: false }),
        { resetBeforeIteration: true },
      )
      loop.start()
      return () => loop.stop()
    }
    Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: false }).start()
    slide.setValue(-0.4)
  }, [refreshing, slide, fade])

  if (!refreshing && (fade as any).__getValue?.() === 0) return null

  const screenW = Dimensions.get('window').width
  const segW = screenW * 0.4
  const x = slide.interpolate({
    inputRange: [-0.4, 1],
    outputRange: [-segW, screenW],
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        ...TOP_PIN_STYLE,
        top: 0,
        left: 0,
        height,
        width: segW,
        backgroundColor: 'rgba(255,255,255,0.25)',
        opacity: fade,
        zIndex: 7,
        transform: [{ translateX: x }],
      }}
    />
  )
}

export function PullToRefreshScrollView({ onRefresh, children, ...scrollProps }: Props) {
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<string>('')
  const { locale } = useI18n()

  const nativeFade = useRef(new Animated.Value(0)).current
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
        <AffirmationLine message={message} opacity={nativeFade} top={56} />
        <ScrollView
          {...scrollProps}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={TEAL}
              colors={[TEAL]}
            />
          }
        >
          {children}
        </ScrollView>
      </View>
    )
  }

  // ── Web: Slack-style pull-to-refresh ──────────────────────────────────
  // The wrapper has a teal background. The Animated.View (white) sits on
  // top of it and translates downward as the user pulls — revealing the
  // teal "gap" underneath. The teal area itself is the progress signal:
  // bigger the pull, more teal visible. Affirmation is white text on top
  // of the teal. While refresh is running, a faint white shimmer slides
  // across the teal area.

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

  // Affirmation reads in early — already legible by the time the trigger
  // is reached, so the user knows what they're going to release into.
  const pullOpacity = pullY.interpolate({
    inputRange: [0, 18, PULL_TRIGGER],
    outputRange: [0, 0.7, 1],
  })

  // The affirmation should sit in the middle of the visible teal gap.
  // While pulling, gap height = pullY → place text at pullY/2 - half of
  // the line height so it's vertically centered. Clamp so it never goes
  // negative (otherwise it would render above the viewport).
  const affirmationTop = pullY.interpolate({
    inputRange: [0, PULL_TRIGGER, PULL_MAX],
    outputRange: [PULL_TRIGGER / 2 - 10, PULL_TRIGGER / 2 - 10, PULL_TRIGGER / 2 - 10],
  })

  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: TEAL }}>
      {/* The teal background of this View IS the progress band. As the
          inner Animated.View (white) translates down, the gap exposes
          the teal. Bigger pull = more teal = clearer "you're triggering
          a refresh" cue. */}

      <RefreshShimmer refreshing={refreshing} height={PULL_TRIGGER} />

      {/* Affirmation centered in the visible teal band (~PULL_TRIGGER tall
          during refresh; smaller while pulling, but the text stays at
          the same screen position so it doesn't jump as the gap grows). */}
      <AffirmationLine
        message={message}
        opacity={refreshing ? nativeFade : pullOpacity}
        top={Math.round(PULL_TRIGGER / 2 - 10)}
      />

      <Animated.View
        style={{
          flex: 1,
          backgroundColor: '#fff',
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
