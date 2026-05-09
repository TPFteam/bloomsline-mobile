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
          opacity: 0.75,
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
  // 1 → 0 over 400ms when refresh ends. Web uses pullY-driven opacity
  // (defined further down) so it tracks the gesture instead.
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

  // Web: custom pull-to-refresh
  const pullY = useRef(new Animated.Value(0)).current
  const startY = useRef(0)
  const pulling = useRef(false)

  const onTouchStart = (e: any) => {
    const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent
    startY.current = touch?.pageY || 0
  }

  const onTouchMove = (e: any) => {
    if (refreshing) return
    const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent
    const y = (touch?.pageY || 0) - startY.current
    if (y > 0 && y < 120) {
      // Lazy-pick a message so it appears as soon as the pull begins,
      // matching the Slack feel (text shows during pull, not just after).
      if (!pulling.current && !message) {
        setMessage(pickAffirmation(locale))
      }
      pulling.current = true
      pullY.setValue(y)
    }
  }

  const onTouchEnd = async () => {
    if (!pulling.current || refreshing) {
      Animated.spring(pullY, { toValue: 0, useNativeDriver: true }).start()
      pulling.current = false
      return
    }

    const currentValue = (pullY as any).__getValue?.() || 0
    if (currentValue > 60) {
      Animated.timing(pullY, { toValue: 50, duration: 200, useNativeDriver: true }).start()
      await handleRefresh()
    }
    Animated.spring(pullY, { toValue: 0, useNativeDriver: true }).start()
    pulling.current = false
    // Clear after the spring settles so the next pull picks a fresh phrase.
    setTimeout(() => { if (!pulling.current) setMessage('') }, 600)
  }

  const spin = pullY.interpolate({
    inputRange: [0, 60, 120],
    outputRange: ['0deg', '360deg', '720deg'],
  })

  const indicatorOpacity = pullY.interpolate({
    inputRange: [0, 30, 60],
    outputRange: [0, 0.5, 1],
  })

  // Affirmation fades in faster than the indicator — already legible by
  // the time the spinner appears.
  const messageOpacity = pullY.interpolate({
    inputRange: [0, 20, 60],
    outputRange: [0, 0.7, 1],
  })

  return (
    <View style={{ flex: 1 }}>
      {/* Affirmation text */}
      <AffirmationLine
        message={message}
        opacity={refreshing ? nativeFade : messageOpacity}
        top={20}
      />

      {/* Pull indicator */}
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        alignItems: 'center',
        zIndex: 10,
        transform: [{ translateY: Animated.subtract(pullY, new Animated.Value(40)) }],
        opacity: indicatorOpacity,
      }}>
        <Animated.View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: '#4A9A86',
          transform: [{ rotate: spin }],
          opacity: refreshing ? 0.6 : 1,
        }}>
          {refreshing && (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
            </View>
          )}
        </Animated.View>
      </Animated.View>

      <ScrollView
        {...scrollProps}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </View>
  )
}
