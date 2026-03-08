import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { colors } from '@/lib/theme'

function extractLocalized(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return val.en || Object.values(val)[0] || ''
}

const LABEL = { fontSize: 15, fontWeight: '600' as const, color: colors.primary, marginBottom: 8 }
const INPUT_BG = colors.surface2
const SELECTED_BG = colors.surface1
const SELECTED_BORDER = colors.primary
const MUTED = '#8A8A8A'
const PLACEHOLDER = '#CCCCCC'

export function renderBlock(
  block: any,
  blockValue: unknown,
  onBlockChange: (v: unknown) => void,
) {
  const content = typeof block.content === 'string' ? block.content : extractLocalized(block.content)
  const isRequired = !!block.required
  const Star = isRequired ? <Text style={{ color: colors.error }}> *</Text> : null

  switch (block.type) {
    case 'heading':
      return <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3 }}>{content}</Text>

    case 'paragraph':
      return <Text style={{ fontSize: 15, color: MUTED, lineHeight: 22 }}>{content}</Text>

    case 'quote':
      return (
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.bloom, paddingLeft: 16, paddingVertical: 8, backgroundColor: colors.surface2, borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
          <Text style={{ fontSize: 15, color: MUTED, fontStyle: 'italic' }}>{content}</Text>
        </View>
      )

    case 'tip':
      return (
        <View style={{ padding: 16, backgroundColor: colors.surface2, borderRadius: 16 }}>
          <Text style={{ fontSize: 15, color: colors.primary }}>
            <Text style={{ fontWeight: '600' }}>{'💡 '}</Text>{content}
          </Text>
        </View>
      )

    case 'divider':
      return <View style={{ height: 1, backgroundColor: '#EBEBEB', marginVertical: 4 }} />

    case 'key_points': {
      const points: string[] = Array.isArray(block.points) ? block.points : []
      return (
        <View>
          {content ? <Text style={{ fontWeight: '600', color: colors.primary, marginBottom: 8, fontSize: 15 }}>{content}</Text> : null}
          {points.map((pt, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 }} />
              <Text style={{ flex: 1, fontSize: 15, color: colors.primary }}>{typeof pt === 'string' ? pt : ''}</Text>
            </View>
          ))}
        </View>
      )
    }

    case 'callout': {
      const ct = block.calloutType || 'info'
      const cs: Record<string, { bg: string; border: string }> = {
        info: { bg: colors.surface2, border: colors.primary },
        warning: { bg: colors.surface2, border: '#F59E0B' },
        success: { bg: colors.surface2, border: colors.bloom },
        tip: { bg: colors.surface2, border: colors.bloom },
        example: { bg: colors.surface2, border: colors.primary },
      }
      const s = cs[ct] || cs.info
      return (
        <View style={{ padding: 16, backgroundColor: s.bg, borderRadius: 16, borderLeftWidth: 3, borderLeftColor: s.border }}>
          <Text style={{ fontSize: 15, color: colors.primary, lineHeight: 22 }}>{content}</Text>
        </View>
      )
    }

    case 'prompt':
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <TextInput
            value={(blockValue as string) || ''}
            onChangeText={(t) => onBlockChange(t)}
            placeholder="Share your thoughts..."
            placeholderTextColor={PLACEHOLDER}
            multiline
            style={{
              backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, fontSize: 15,
              color: colors.primary, minHeight: 120, textAlignVertical: 'top',
            }}
          />
        </View>
      )

    case 'multiple_choice': {
      const opts: any[] = Array.isArray(block.options) ? block.options : Array.isArray(block.choices) ? block.choices : []
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ gap: 8 }}>
            {opts.map((opt, i) => {
              const label = typeof opt === 'string' ? opt : opt.label
              const sel = blockValue === i
              return (
                <TouchableOpacity key={i} onPress={() => onBlockChange(i)} activeOpacity={0.7} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16,
                  backgroundColor: sel ? SELECTED_BG : colors.surface2,
                  borderWidth: 2, borderColor: sel ? SELECTED_BORDER : 'transparent',
                }}>
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                    borderColor: sel ? colors.primary : '#D4D4D4',
                    backgroundColor: sel ? colors.primary : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                  </View>
                  <Text style={{ fontSize: 15, color: colors.primary, fontWeight: sel ? '600' : '400', flex: 1 }}>
                    {label || `Option ${i + 1}`}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    case 'yes_no':
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['yes', 'no'] as const).map((val) => {
              const sel = blockValue === val
              return (
                <TouchableOpacity key={val} onPress={() => onBlockChange(val)} activeOpacity={0.7} style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  padding: 16, borderRadius: 16,
                  backgroundColor: sel ? SELECTED_BG : colors.surface2,
                  borderWidth: 2, borderColor: sel ? SELECTED_BORDER : 'transparent',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? colors.primary : MUTED }}>
                    {val === 'yes' ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )

    case 'checklist': {
      const items: any[] = Array.isArray(block.items) ? block.items : []
      const checked: number[] = Array.isArray(blockValue) ? (blockValue as number[]) : []
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ gap: 8 }}>
            {items.map((item, i) => {
              const txt = typeof item === 'string' ? item : item.text
              const on = checked.includes(i)
              return (
                <TouchableOpacity key={i} onPress={() => onBlockChange(on ? checked.filter((x) => x !== i) : [...checked, i])} activeOpacity={0.7} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16,
                  backgroundColor: on ? SELECTED_BG : colors.surface2,
                  borderWidth: 2, borderColor: on ? SELECTED_BORDER : 'transparent',
                }}>
                  <View style={{
                    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
                    borderColor: on ? colors.primary : '#D4D4D4',
                    backgroundColor: on ? colors.primary : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {on && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, color: colors.primary, fontWeight: on ? '600' : '400' }}>{txt}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    case 'scale': {
      const mn = (block.scaleMin ?? 1) as number
      const mx = (block.scaleMax ?? 10) as number
      const nums = Array.from({ length: mx - mn + 1 }, (_, i) => mn + i)
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {nums.map((n) => {
              const sel = blockValue === n
              return (
                <TouchableOpacity key={n} onPress={() => onBlockChange(n)} style={{
                  width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: sel ? colors.primary : colors.surface2,
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? '#fff' : colors.primary }}>{n}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          {(block.scaleMinLabel || block.scaleMaxLabel) && (
            <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 8 }}>
              {mn} = {block.scaleMinLabel || ''} · {mx} = {block.scaleMaxLabel || ''}
            </Text>
          )}
        </View>
      )
    }

    case 'likert': {
      const scaleType = block.scaleType || 'likert'
      const scale = (block.scaleRange || block.likertScale || 5) as number
      const labels = block.likertLabels || {}
      const scaleLabels: string[] = block.scaleLabels || []

      if (scaleType === 'mood') {
        const moods = [
          { emoji: '😣', label: 'Struggling', value: 1 },
          { emoji: '😔', label: 'Low', value: 2 },
          { emoji: '😐', label: 'Okay', value: 3 },
          { emoji: '😊', label: 'Good', value: 4 },
          { emoji: '😄', label: 'Thriving', value: 5 },
        ]
        return (
          <View>
            <Text style={LABEL}>{content}{Star}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {moods.map((m) => {
                const sel = blockValue === m.value
                return (
                  <TouchableOpacity key={m.value} onPress={() => onBlockChange(m.value)} style={{
                    alignItems: 'center', padding: 10, borderRadius: 16,
                    backgroundColor: sel ? SELECTED_BG : colors.surface2,
                    borderWidth: 2, borderColor: sel ? SELECTED_BORDER : 'transparent',
                  }}>
                    <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                    <Text style={{ fontSize: 10, color: sel ? colors.primary : MUTED, fontWeight: '500', marginTop: 4 }}>{m.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )
      }

      if (scaleType === 'rating') {
        return (
          <View>
            <Text style={LABEL}>{content}{Star}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity key={n} onPress={() => onBlockChange(n)}>
                  <Text style={{ fontSize: 32, color: blockValue !== undefined && n <= (blockValue as number) ? '#000' : '#D4D4D4' }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      }

      const nums = Array.from({ length: scale }, (_, i) => i + 1)
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {nums.map((n) => {
              const sel = blockValue === n
              return (
                <TouchableOpacity key={n} onPress={() => onBlockChange(n)} style={{
                  width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: sel ? colors.primary : colors.surface2,
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? '#fff' : colors.primary }}>{n}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          {(scaleLabels[0] || labels.start || scaleLabels[scaleLabels.length - 1] || labels.end) && (
            <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 8 }}>
              1 = {scaleLabels[0] || labels.start || ''} · {scale} = {scaleLabels[scaleLabels.length - 1] || labels.end || ''}
            </Text>
          )}
        </View>
      )
    }

    case 'mood': {
      const emojiMap: Record<string, string> = { Angry: '😣', Frown: '😔', Meh: '😐', Smile: '😊', Laugh: '😄' }
      const moodOpts: any[] = Array.isArray(block.moodOptions) ? block.moodOptions : [
        { emoji: 'Angry', label: 'Struggling', value: 1 },
        { emoji: 'Frown', label: 'Low', value: 2 },
        { emoji: 'Meh', label: 'Okay', value: 3 },
        { emoji: 'Smile', label: 'Good', value: 4 },
        { emoji: 'Laugh', label: 'Thriving', value: 5 },
      ]
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {moodOpts.map((m, i) => {
              const val = m.value ?? i + 1
              const sel = blockValue === val
              return (
                <TouchableOpacity key={i} onPress={() => onBlockChange(val)} style={{
                  alignItems: 'center', padding: 10, borderRadius: 16,
                  backgroundColor: sel ? SELECTED_BG : colors.surface2,
                  borderWidth: 2, borderColor: sel ? SELECTED_BORDER : 'transparent',
                }}>
                  <Text style={{ fontSize: 28 }}>{emojiMap[m.emoji] || m.emoji}</Text>
                  <Text style={{ fontSize: 10, color: sel ? colors.primary : MUTED, fontWeight: '500', marginTop: 4 }}>{m.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    case 'slider': {
      const sMin = (block.sliderMin ?? 0) as number
      const sMax = (block.sliderMax ?? 100) as number
      const sStep = (block.sliderStep ?? 1) as number
      const sUnit = (block.sliderUnit || '') as string
      const range = (sMax - sMin) / sStep
      if (range <= 20) {
        const nums = Array.from({ length: Math.floor(range) + 1 }, (_, i) => sMin + i * sStep)
        return (
          <View>
            <Text style={LABEL}>{content}{Star}</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', color: colors.primary, marginBottom: 8 }}>
              {blockValue !== undefined ? `${blockValue}${sUnit}` : '-'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {nums.map((n) => {
                const sel = blockValue === n
                return (
                  <TouchableOpacity key={n} onPress={() => onBlockChange(n)} style={{
                    minWidth: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
                    backgroundColor: sel ? colors.primary : colors.surface2,
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#fff' : colors.primary }}>{n}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )
      }
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={blockValue !== undefined ? String(blockValue) : ''}
              onChangeText={(t) => { const n = Number(t); if (!isNaN(n)) onBlockChange(n) }}
              keyboardType="numeric"
              placeholder={`${sMin} – ${sMax}`}
              placeholderTextColor={PLACEHOLDER}
              style={{
                flex: 1, backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 16,
                color: colors.primary, textAlign: 'center',
              }}
            />
            {sUnit ? <Text style={{ fontSize: 14, color: MUTED }}>{sUnit}</Text> : null}
          </View>
          <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 4 }}>{sMin}{sUnit} – {sMax}{sUnit}</Text>
        </View>
      )
    }

    case 'numeric':
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <TextInput
            value={blockValue !== undefined && blockValue !== null ? String(blockValue) : ''}
            onChangeText={(t) => { if (t === '') onBlockChange(undefined); else { const n = Number(t); if (!isNaN(n)) onBlockChange(n) } }}
            keyboardType="numeric"
            placeholder="Enter a number..."
            placeholderTextColor={PLACEHOLDER}
            style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 16, color: colors.primary }}
          />
        </View>
      )

    case 'date_picker':
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <TextInput
            value={(blockValue as string) || ''} onChangeText={(t) => onBlockChange(t)}
            placeholder="YYYY-MM-DD" placeholderTextColor={PLACEHOLDER}
            style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 15, color: colors.primary }}
          />
        </View>
      )

    case 'time_input':
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <TextInput
            value={(blockValue as string) || ''} onChangeText={(t) => onBlockChange(t)}
            placeholder="HH:MM" placeholderTextColor={PLACEHOLDER}
            style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 15, color: colors.primary }}
          />
        </View>
      )

    case 'list_input': {
      const listItems: string[] = Array.isArray(blockValue) ? (blockValue as string[]) : ['']
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ gap: 8 }}>
            {listItems.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>{i + 1}</Text>
                </View>
                <TextInput
                  value={item}
                  onChangeText={(t) => { const a = [...listItems]; a[i] = t; onBlockChange(a) }}
                  placeholder={`Item ${i + 1}...`}
                  placeholderTextColor={PLACEHOLDER}
                  style={{ flex: 1, backgroundColor: INPUT_BG, borderRadius: 14, padding: 12, fontSize: 15, color: colors.primary }}
                />
                {listItems.length > 1 && (
                  <TouchableOpacity onPress={() => onBlockChange(listItems.filter((_: any, idx: number) => idx !== i))} style={{ padding: 6 }}>
                    <Text style={{ fontSize: 16, color: MUTED }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => onBlockChange([...listItems, ''])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: '300', color: colors.primary }}>+</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Add item</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    case 'matrix_rating': {
      const matrixItems: string[] = Array.isArray(block.matrixItems) ? block.matrixItems : []
      const scaleMax = (block.matrixScaleMax ?? 5) as number
      const mLabels = block.matrixScaleLabels || {}
      const ratings = (blockValue as Record<string, number>) || {}

      if (matrixItems.length === 0) {
        const cur = ratings['0'] || 0
        return (
          <View>
            <Text style={LABEL}>{content}{Star}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {Array.from({ length: scaleMax }, (_, i) => i + 1).map((n) => {
                const sel = cur === n
                return (
                  <TouchableOpacity key={n} onPress={() => onBlockChange({ ...ratings, '0': n })} style={{
                    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: sel ? colors.primary : colors.surface2,
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: sel ? '#fff' : colors.primary }}>{n}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {(mLabels.min || mLabels.max) && (
              <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 8 }}>
                1 = {mLabels.min || 'Not at all'} · {scaleMax} = {mLabels.max || 'Completely'}
              </Text>
            )}
          </View>
        )
      }

      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ gap: 12 }}>
            {matrixItems.map((item, idx) => (
              <View key={idx} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EBEBEB' }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 8 }}>{item}</Text>
                <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                  {Array.from({ length: scaleMax }, (_, i) => i + 1).map((n) => {
                    const sel = ratings[idx.toString()] === n
                    return (
                      <TouchableOpacity key={n} onPress={() => onBlockChange({ ...ratings, [idx.toString()]: n })} style={{
                        width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: sel ? colors.primary : colors.surface2,
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#fff' : colors.primary }}>{n}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            ))}
          </View>
          {(mLabels.min || mLabels.max) && (
            <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 8 }}>
              1 = {mLabels.min || ''} · {scaleMax} = {mLabels.max || ''}
            </Text>
          )}
        </View>
      )
    }

    case 'table_exercise': {
      const columns: any[] = Array.isArray(block.columns) ? block.columns : []
      const instr = block.instructions || null
      const rows: any[] = Array.isArray(blockValue) && (blockValue as any[]).length > 0 ? (blockValue as any[]) : [{}]
      if (columns.length === 0) return <Text style={{ color: MUTED }}>No columns defined</Text>
      return (
        <View>
          {content ? <Text style={LABEL}>{content}</Text> : null}
          {instr && (
            <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: colors.primary }}>{instr}</Text>
            </View>
          )}
          <View style={{ gap: 16 }}>
            {rows.map((row: any, ri: number) => (
              <View key={ri} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#EBEBEB' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>Entry {ri + 1}</Text>
                  {rows.length > 1 && (
                    <TouchableOpacity onPress={() => onBlockChange(rows.filter((_: any, i: number) => i !== ri))}>
                      <Text style={{ fontSize: 16, color: MUTED }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {columns.map((col: any) => (
                  <View key={col.id} style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>{col.header}</Text>
                    {col.description && <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4, fontStyle: 'italic' }}>{col.description}</Text>}
                    <TextInput
                      value={row[col.id] || ''}
                      onChangeText={(t) => { const nr = [...rows]; nr[ri] = { ...nr[ri], [col.id]: t }; onBlockChange(nr) }}
                      placeholder="Type here..."
                      placeholderTextColor={PLACEHOLDER}
                      multiline
                      style={{
                        backgroundColor: INPUT_BG, borderRadius: 12, padding: 12, fontSize: 14,
                        color: colors.primary, minHeight: 60, textAlignVertical: 'top',
                      }}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={() => onBlockChange([...rows, {}])} style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 8,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '300', color: colors.primary }}>+</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Add Entry</Text>
          </TouchableOpacity>
        </View>
      )
    }

    default:
      return (
        <View style={{ padding: 12, backgroundColor: colors.surface2, borderRadius: 12 }}>
          <Text style={{ fontSize: 13, color: MUTED }}>Unsupported: {block.type}</Text>
        </View>
      )
  }
}
