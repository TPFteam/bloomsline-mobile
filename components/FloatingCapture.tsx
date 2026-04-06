import { useState, useRef } from 'react'
import { View, TouchableOpacity, Pressable, Animated, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera, Video, Mic, PenLine, Plus } from 'lucide-react-native'
import { colors, CAPTURE_TYPE_COLORS } from '@/lib/theme'

const CAPTURE_TYPES = [
  { key: 'photo', Icon: Camera, label: 'Photo', color: CAPTURE_TYPE_COLORS.photo },
  { key: 'write', Icon: PenLine, label: 'Write', color: CAPTURE_TYPE_COLORS.write },
  { key: 'voice', Icon: Mic, label: 'Voice', color: CAPTURE_TYPE_COLORS.voice },
  { key: 'video', Icon: Video, label: 'Video', color: CAPTURE_TYPE_COLORS.video },
]

interface FloatingCaptureProps {
  inline?: boolean
}

export function FloatingCapture({ inline }: FloatingCaptureProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current

  const toggle = () => {
    if (!open) {
      setOpen(true)
      Animated.spring(expandAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start()
    } else {
      Animated.timing(expandAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setOpen(false)
      })
    }
  }

  const handleType = (type: string) => {
    setOpen(false)
    expandAnim.setValue(0)
    router.push({ pathname: '/(main)/capture', params: { type } })
  }

  const button = (
    <TouchableOpacity
      onPress={toggle}
      activeOpacity={0.8}
      style={{
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: open ? colors.primary : '#fff',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1,
        borderColor: open ? colors.primary : '#EBEBEB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <Plus size={24} color={open ? '#fff' : colors.primary} strokeWidth={2} />
    </TouchableOpacity>
  )

  if (inline) {
    return (
      <View style={{ zIndex: 20 }}>
        {/* Full-screen modal overlay for pills */}
        <Modal visible={open} transparent animationType="none" onRequestClose={toggle}>
          <Pressable onPress={toggle} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <View style={{
              position: 'absolute',
              bottom: insets.bottom + 90,
              right: 20,
              alignItems: 'flex-end',
              gap: 8,
            }}>
              {CAPTURE_TYPES.slice().reverse().map((type, i) => (
                <Animated.View
                  key={type.key}
                  style={{
                    opacity: expandAnim,
                    transform: [{
                      translateY: expandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20 + i * 8, 0],
                      }),
                    }, {
                      scale: expandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    }],
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleType(type.key)}
                    activeOpacity={0.85}
                    style={{
                      width: 52, height: 52, borderRadius: 16,
                      backgroundColor: '#fff',
                      justifyContent: 'center', alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 8,
                      elevation: 4,
                      borderWidth: 1,
                      borderColor: '#F0F0F0',
                    }}
                  >
                    <type.Icon size={22} color={type.color} strokeWidth={1.8} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Pressable>
        </Modal>
        {button}
      </View>
    )
  }

  return null
}
