import { useState, useRef, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Animated, Platform, RefreshControl, ScrollViewProps } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { pickAffirmation } from '@/lib/affirmations'

interface Props extends ScrollViewProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

/**
 * Tiny gentle one-liner shown at the top while pulling / refreshing,
 * a la Slack's "If anyone can, it's you". Stays muted on purpose so
 * it never competes with the screen's actual content.
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
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 24,
        zIndex: 5,
        opacity,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: '#4A9A86',
          opacity: 0.85,
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
  // Whole content slides down with the pull, only the muted affirmation
  // shows at the top (no spinner, no dot). On release past the threshold
  // we fire the refresh, hold the slid-down position briefly, then snap
  // back. Browser's native pull-refresh is suppressed via
  // overscroll-behavior set in app/_layout.tsx.

  const pullY = useRef(new Animated.Value(0)).current
  const startY = useRef(0)
  const pulling = useRef(false)
  const scrollAtTop = useRef(true)

  const PULL_TRIGGER = 70 // px to release a refresh
  const PULL_MAX = 120     // visual cap on how far content slides

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
    if (!scrollAtTop.current) return  // Only pull when the list is at the top.
    const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent
    const y = (touch?.pageY || 0) - startY.current
    if (y > 0 && y < PULL_MAX) {
      if (!pulling.current && !message) {
        setMessage(pickAffirmation(locale))
      }
      pulling.current = true
      // Light rubber-banding so longer pulls feel softer than 1:1.
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
      // Hold the slid-down position briefly so the affirmation reads,
      // then run the refresh, then snap back.
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
      <AffirmationLine
        message={message}
        opacity={refreshing ? nativeFade : pullOpacity}
        top={20}
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
