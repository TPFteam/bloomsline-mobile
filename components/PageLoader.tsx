import { useEffect, useRef } from 'react'
import { View, Animated } from 'react-native'

export function PageLoader() {
  const pulse = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Animated.View style={{
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#4A9A86',
        opacity: pulse,
      }} />
    </View>
  )
}
