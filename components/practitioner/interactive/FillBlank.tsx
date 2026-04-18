import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Check, X } from 'lucide-react-native'
import { colors } from '@/lib/theme'

interface Blank {
  index: number
  answer?: string
  options: string[]
}

interface FillBlankProps {
  content: string
  sentence: string
  blanks: Blank[]
  value: unknown
  onChange: (val: unknown) => void
  readOnly?: boolean
}

export function FillBlank({ content, sentence, blanks, value, onChange, readOnly }: FillBlankProps) {
  const filled = (value as Record<string, string>) || {}
  const [activeBlank, setActiveBlank] = useState<number | null>(null)

  // Parse sentence: split by {0}, {1}, etc.
  const parts: Array<{ type: 'text' | 'blank'; text?: string; index?: number }> = []
  let remaining = sentence
  const regex = /\{(\d+)\}/g
  let match
  let lastIndex = 0

  while ((match = regex.exec(sentence)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: remaining.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'blank', index: parseInt(match[1]) })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < sentence.length) {
    parts.push({ type: 'text', text: sentence.slice(lastIndex) })
  }

  const handleOptionSelect = (blankIndex: number, option: string) => {
    if (readOnly) return
    const newFilled = { ...filled, [String(blankIndex)]: option }
    onChange(newFilled)
    setActiveBlank(null)
  }

  const getBlankStatus = (blankIndex: number): 'empty' | 'correct' | 'incorrect' | 'filled' => {
    const val = filled[String(blankIndex)]
    if (!val) return 'empty'
    const blank = blanks.find(b => b.index === blankIndex)
    if (!blank?.answer) return 'filled' // no correct answer defined
    return val === blank.answer ? 'correct' : 'incorrect'
  }

  const allFilled = blanks.every(b => filled[String(b.index)])

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 }}>{content}</Text>

      {/* Sentence with blanks */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: '#E5E7EB' }}>
        <Text style={{ fontSize: 16, lineHeight: 28, color: '#111' }}>
          {parts.map((part, i) => {
            if (part.type === 'text') {
              return <Text key={i}>{part.text}</Text>
            }
            const blankIdx = part.index!
            const val = filled[String(blankIdx)]
            const status = getBlankStatus(blankIdx)
            const isActive = activeBlank === blankIdx

            return (
              <Text
                key={i}
                onPress={() => !readOnly && setActiveBlank(isActive ? null : blankIdx)}
                style={{
                  fontWeight: '700',
                  paddingHorizontal: 4,
                  borderBottomWidth: 2,
                  borderBottomColor: status === 'correct' ? '#10B981'
                    : status === 'incorrect' ? '#EF4444'
                    : isActive ? colors.bloom
                    : '#D1D5DB',
                  color: status === 'correct' ? '#10B981'
                    : status === 'incorrect' ? '#EF4444'
                    : val ? '#111'
                    : '#9CA3AF',
                }}
              >
                {val || '______'}
              </Text>
            )
          })}
        </Text>
      </View>

      {/* Options for active blank */}
      {activeBlank !== null && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 }}>
            Choose:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {blanks.find(b => b.index === activeBlank)?.options.map((option) => {
              const isSelected = filled[String(activeBlank)] === option
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => handleOptionSelect(activeBlank, option)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isSelected ? colors.bloom : '#F3F4F6',
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.bloom : '#E5E7EB',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isSelected ? '#fff' : '#374151' }}>{option}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* Score */}
      {allFilled && blanks.some(b => b.answer) && (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>
            {blanks.filter(b => b.answer && filled[String(b.index)] === b.answer).length}/{blanks.length} correct
          </Text>
        </View>
      )}
    </View>
  )
}
