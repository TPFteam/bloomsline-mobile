import { useState, useRef, useCallback } from 'react'
import { View, ScrollView, Animated, Platform, RefreshControl, ScrollViewProps } from 'react-native'

interface Props extends ScrollViewProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export function PullToRefreshScrollView({ onRefresh, children, ...scrollProps }: Props) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([onRefresh(), new Promise(r => setTimeout(r, 800))])
    setRefreshing(false)
  }, [onRefresh])

  if (Platform.OS !== 'web') {
    return (
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
  }

  const spin = pullY.interpolate({
    inputRange: [0, 60, 120],
    outputRange: ['0deg', '360deg', '720deg'],
  })

  const opacity = pullY.interpolate({
    inputRange: [0, 30, 60],
    outputRange: [0, 0.5, 1],
  })

  return (
    <View style={{ flex: 1 }}>
      {/* Pull indicator */}
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        alignItems: 'center',
        zIndex: 10,
        transform: [{ translateY: Animated.subtract(pullY, new Animated.Value(40)) }],
        opacity,
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
