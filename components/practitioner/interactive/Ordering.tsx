import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { GripVertical, Check, X, ArrowUp, ArrowDown } from 'lucide-react-native'
import { colors } from '@/lib/theme'

interface OrderingProps {
  content: string
  items: string[]
  correctOrder?: number[]
  value: unknown
  onChange: (val: unknown) => void
  readOnly?: boolean
}

export function Ordering({ content, items, correctOrder, value, onChange, readOnly }: OrderingProps) {
  // Initialize with shuffled order if no value yet
  const currentOrder = (value as number[]) || (() => {
    // Fisher-Yates shuffle of indices
    const indices = items.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  })()

  const [checked, setChecked] = useState(false)

  const moveItem = (fromIdx: number, direction: 'up' | 'down') => {
    if (readOnly) return
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1
    if (toIdx < 0 || toIdx >= currentOrder.length) return

    const newOrder = [...currentOrder]
    ;[newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]]
    onChange(newOrder)
    setChecked(false)
  }

  const handleCheck = () => {
    setChecked(true)
  }

  const isItemCorrect = (position: number, itemIndex: number): boolean | null => {
    if (!checked || !correctOrder) return null
    return correctOrder[position] === itemIndex
  }

  const allCorrect = correctOrder && checked
    ? currentOrder.every((itemIdx, pos) => correctOrder[pos] === itemIdx)
    : false

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 }}>{content}</Text>

      <View style={{ gap: 8 }}>
        {currentOrder.map((itemIndex, position) => {
          const correct = isItemCorrect(position, itemIndex)
          return (
            <View
              key={`${itemIndex}-${position}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: correct === true ? '#F0FDF4' : correct === false ? '#FEF2F2' : '#fff',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: correct === true ? '#10B981' : correct === false ? '#EF4444' : '#E5E7EB',
                paddingVertical: 12,
                paddingHorizontal: 8,
              }}
            >
              {/* Position number */}
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: correct === true ? '#10B981' : correct === false ? '#EF4444' : '#F3F4F6',
                justifyContent: 'center', alignItems: 'center', marginRight: 8,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: correct !== null ? '#fff' : '#6B7280' }}>
                  {position + 1}
                </Text>
              </View>

              {/* Item text */}
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#111' }}>
                {items[itemIndex]}
              </Text>

              {/* Feedback icon */}
              {correct !== null && (
                correct
                  ? <Check size={16} color="#10B981" style={{ marginRight: 4 }} />
                  : <X size={16} color="#EF4444" style={{ marginRight: 4 }} />
              )}

              {/* Move buttons */}
              {!readOnly && !checked && (
                <View style={{ flexDirection: 'column', gap: 2 }}>
                  <TouchableOpacity
                    disabled={position === 0}
                    onPress={() => moveItem(position, 'up')}
                    style={{ padding: 4, opacity: position === 0 ? 0.2 : 1 }}
                  >
                    <ArrowUp size={14} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={position === currentOrder.length - 1}
                    onPress={() => moveItem(position, 'down')}
                    style={{ padding: 4, opacity: position === currentOrder.length - 1 ? 0.2 : 1 }}
                  >
                    <ArrowDown size={14} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })}
      </View>

      {/* Check button */}
      {correctOrder && !readOnly && !checked && (
        <TouchableOpacity
          onPress={handleCheck}
          style={{
            marginTop: 16,
            backgroundColor: colors.bloom,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Check order</Text>
        </TouchableOpacity>
      )}

      {/* Result */}
      {checked && correctOrder && (
        <View style={{
          marginTop: 12, padding: 12, borderRadius: 12, alignItems: 'center',
          backgroundColor: allCorrect ? '#F0FDF4' : '#FEF2F2',
        }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: allCorrect ? '#10B981' : '#EF4444' }}>
            {allCorrect ? 'Perfect order!' : `${currentOrder.filter((idx, pos) => correctOrder[pos] === idx).length}/${items.length} in correct position`}
          </Text>
          {!allCorrect && !readOnly && (
            <TouchableOpacity onPress={() => setChecked(false)} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}
