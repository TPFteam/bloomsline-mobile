import { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react-native'
import { colors } from '@/lib/theme'

interface Card {
  front: string
  back: string
}

interface FlashcardProps {
  content: string
  cards: Card[]
  value: unknown
  onChange: (val: unknown) => void
  readOnly?: boolean
}

export function Flashcard({ content, cards, value, onChange }: FlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const flipAnim = useRef(new Animated.Value(0)).current
  const viewed = (value as number[]) || []

  const card = cards[currentIndex]
  if (!card) return null

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 1
    Animated.spring(flipAnim, { toValue, useNativeDriver: true, friction: 8, tension: 40 }).start()
    setIsFlipped(!isFlipped)

    // Track viewed cards
    if (!viewed.includes(currentIndex)) {
      const newViewed = [...viewed, currentIndex]
      onChange(newViewed)
    }
  }

  const goTo = (index: number) => {
    // Reset flip
    flipAnim.setValue(0)
    setIsFlipped(false)
    setCurrentIndex(index)
  }

  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] })
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] })

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 }}>{content}</Text>

      {/* Card */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={{ minHeight: 180 }}>
        {/* Front */}
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 24,
          minHeight: 180,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: colors.bloom,
          opacity: frontOpacity,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 }}>FRONT</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center', lineHeight: 28 }}>{card.front}</Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>tap to flip</Text>
        </Animated.View>

        {/* Back */}
        <Animated.View style={{
          backgroundColor: colors.bloom,
          borderRadius: 20,
          padding: 24,
          minHeight: 180,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: backOpacity,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 12 }}>BACK</Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff', textAlign: 'center', lineHeight: 24 }}>{card.back}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>tap to flip back</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 16 }}>
        <TouchableOpacity
          disabled={currentIndex <= 0}
          onPress={() => goTo(currentIndex - 1)}
          style={{ padding: 8, opacity: currentIndex > 0 ? 1 : 0.3 }}
        >
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>
          {currentIndex + 1} / {cards.length}
        </Text>

        <TouchableOpacity
          disabled={currentIndex >= cards.length - 1}
          onPress={() => goTo(currentIndex + 1)}
          style={{ padding: 8, opacity: currentIndex < cards.length - 1 ? 1 : 0.3 }}
        >
          <ChevronRight size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Progress dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        {cards.map((_, i) => (
          <View key={i} style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: i === currentIndex ? colors.bloom : viewed.includes(i) ? `${colors.bloom}50` : '#E5E7EB',
          }} />
        ))}
      </View>
    </View>
  )
}
