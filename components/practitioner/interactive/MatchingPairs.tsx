import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Check, X, RotateCcw } from 'lucide-react-native'
import { colors } from '@/lib/theme'

interface Pair {
  left: string
  right: string
}

interface MatchingPairsProps {
  content: string
  pairs: Pair[]
  value: unknown
  onChange: (val: unknown) => void
  readOnly?: boolean
}

export function MatchingPairs({ content, pairs, value, onChange, readOnly }: MatchingPairsProps) {
  const matched = (value as { left: string; right: string }[]) || []
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)

  // Shuffle right side once (deterministic from pairs)
  const shuffledRight = [...pairs].sort((a, b) => a.right.localeCompare(b.right)).map(p => p.right)
  const leftItems = pairs.map(p => p.left)

  const isLeftMatched = (left: string) => matched.some(m => m.left === left)
  const isRightMatched = (right: string) => matched.some(m => m.right === right)
  const getMatchForLeft = (left: string) => matched.find(m => m.left === left)

  const handleLeftTap = (left: string) => {
    if (readOnly || isLeftMatched(left)) return
    setSelectedLeft(selectedLeft === left ? null : left)
  }

  const handleRightTap = (right: string) => {
    if (readOnly || isRightMatched(right) || !selectedLeft) return
    const newMatched = [...matched, { left: selectedLeft, right }]
    onChange(newMatched)
    setSelectedLeft(null)
  }

  const handleReset = () => {
    if (readOnly) return
    onChange([])
    setSelectedLeft(null)
  }

  const isCorrect = (left: string, right: string) => {
    return pairs.some(p => p.left === left && p.right === right)
  }

  const allMatched = matched.length === pairs.length

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 }}>{content}</Text>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Left column */}
        <View style={{ flex: 1, gap: 8 }}>
          {leftItems.map((left) => {
            const isMatched = isLeftMatched(left)
            const match = getMatchForLeft(left)
            const correct = match ? isCorrect(match.left, match.right) : null
            const isSelected = selectedLeft === left

            return (
              <TouchableOpacity
                key={left}
                onPress={() => handleLeftTap(left)}
                disabled={readOnly || isMatched}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.bloom : isMatched ? (correct ? '#10B981' : '#EF4444') : '#E5E7EB',
                  backgroundColor: isSelected ? `${colors.bloom}15` : isMatched ? (correct ? '#F0FDF4' : '#FEF2F2') : '#fff',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111', textAlign: 'center' }}>{left}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Right column */}
        <View style={{ flex: 1, gap: 8 }}>
          {shuffledRight.map((right) => {
            const isMatched = isRightMatched(right)
            const match = matched.find(m => m.right === right)
            const correct = match ? isCorrect(match.left, match.right) : null

            return (
              <TouchableOpacity
                key={right}
                onPress={() => handleRightTap(right)}
                disabled={readOnly || isMatched || !selectedLeft}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isMatched ? (correct ? '#10B981' : '#EF4444') : selectedLeft ? colors.bloom : '#E5E7EB',
                  backgroundColor: isMatched ? (correct ? '#F0FDF4' : '#FEF2F2') : '#fff',
                  opacity: !selectedLeft && !isMatched ? 0.5 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {isMatched && correct !== null && (
                    correct ? <Check size={14} color="#10B981" /> : <X size={14} color="#EF4444" />
                  )}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111', textAlign: 'center' }}>{right}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Reset button */}
      {matched.length > 0 && !readOnly && (
        <TouchableOpacity
          onPress={handleReset}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, padding: 10 }}
        >
          <RotateCcw size={14} color="#9CA3AF" />
          <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: '500' }}>Reset</Text>
        </TouchableOpacity>
      )}

      {/* Completion */}
      {allMatched && (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>
            {matched.filter(m => isCorrect(m.left, m.right)).length}/{pairs.length} correct
          </Text>
        </View>
      )}
    </View>
  )
}
