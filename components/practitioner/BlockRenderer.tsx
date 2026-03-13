import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

function extractLocalized(val: any, locale?: string): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (locale && val[locale]) return val[locale]
  return val.fr || val.en || Object.values(val)[0] || ''
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<\/?(p|div|br)\b[^>]*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function CollapsibleInstructions({ text }: { text: string }) {
  const plain = stripHtmlTags(text)
  const [expanded, setExpanded] = useState(false)
  const needsTruncate = plain.length > 120
  const display = !expanded && needsTruncate ? plain.slice(0, 120).trimEnd() + '...' : plain

  return (
    <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <Text style={{ fontSize: 13, color: colors.primary, lineHeight: 19 }}>{display}</Text>
      {needsTruncate && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.bloom }}>{expanded ? 'View less' : 'View more'}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const LABEL = { fontSize: 16, fontWeight: '700' as const, color: colors.primary, marginBottom: 10 }
const INPUT_BG = '#F3F4F6'
const INPUT_BORDER = '#E0E0E0'
const SELECTED_BG = colors.surface1
const SELECTED_BORDER = colors.primary
const MUTED = '#6B7280'
const PLACEHOLDER = '#9CA3AF'

function TableExerciseRenderer({ block, content, blockValue, onBlockChange, onReviewStateChange }: {
  block: any; content: string; blockValue: unknown; onBlockChange: (v: unknown) => void; onReviewStateChange?: (inReview: boolean) => void
}) {
  const { t, locale } = useI18n()
  const columns: any[] = Array.isArray(block.columns) ? block.columns : []
  const instr = extractLocalized(block.instructions, locale) || null
  // Decide row count once on mount (stable during editing)
  const [rowCount] = useState(() => {
    const raw: any[] = Array.isArray(blockValue) && (blockValue as any[]).length > 0 ? (blockValue as any[]) : []
    const isComplete = (r: any) => columns.every((c: any) => (r[c.id] || '').trim().length > 0)
    const needsNew = raw.length === 0 || isComplete(raw[raw.length - 1])
    return needsNew ? raw.length + 1 : raw.length
  })

  // Live rows from blockValue, padded to rowCount
  const rawRows: any[] = Array.isArray(blockValue) && (blockValue as any[]).length > 0 ? (blockValue as any[]) : []
  const rows: any[] = []
  for (let i = 0; i < rowCount; i++) {
    rows.push(rawRows[i] || {})
  }

  // The editable entry is always the last one
  const editableIdx = rowCount - 1

  const [currentEntry, setCurrentEntry] = useState(editableIdx)
  const [currentCol, setCurrentCol] = useState(0)
  const [expandedView, setExpandedView] = useState(false)
  const [returnToCol, setReturnToCol] = useState<number | null>(null)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    onReviewStateChange?.(showReview)
  }, [showReview])

  if (columns.length === 0) return <Text style={{ color: MUTED }}>{t.blocks.noColumns}</Text>

  const safeEntry = Math.min(currentEntry, rows.length - 1)
  const safeCol = Math.min(currentCol, columns.length - 1)
  const row = rows[safeEntry] || {}
  const col = columns[safeCol]
  const updateCell = (ri: number, colId: string, text: string) => {
    const nr = [...rows]
    nr[ri] = { ...nr[ri], [colId]: text }
    onBlockChange(nr)
  }

  const filledCount = columns.filter((c: any) => (row[c.id] || '').trim()).length

  // Expanded / Form view
  if (expandedView) {
    return (
      <View>
        {content ? <Text style={LABEL}>{content}</Text> : null}
        {instr && <CollapsibleInstructions text={instr} />}

        {/* Toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 10, padding: 2, alignSelf: 'flex-end', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setExpandedView(false)} style={{
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: MUTED }}>{t.blocks.guided}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setExpandedView(true)} style={{
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
            backgroundColor: '#fff',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{t.blocks.form}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 16 }}>
          {rows.map((r: any, ri: number) => (
            <View key={ri} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#EBEBEB' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{t.blocks.entry.replace('{n}', String(ri + 1))}</Text>
                {rows.length > 1 && (
                  <TouchableOpacity onPress={() => {
                    onBlockChange(rows.filter((_: any, i: number) => i !== ri))
                    if (safeEntry >= rows.length - 1) setCurrentEntry(Math.max(0, rows.length - 2))
                  }}>
                    <Text style={{ fontSize: 16, color: MUTED }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {columns.map((c: any) => (
                <View key={c.id} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>{extractLocalized(c.header, locale)}</Text>
                  {c.description && <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4, fontStyle: 'italic' }}>{extractLocalized(c.description, locale)}</Text>}
                  <TextInput
                    value={r[c.id] || ''}
                    onChangeText={(t) => updateCell(ri, c.id, t)}
                    placeholder={t.blocks.typeHere}
                    placeholderTextColor={PLACEHOLDER}
                    multiline
                    style={{
                      backgroundColor: INPUT_BG, borderRadius: 12, padding: 12, fontSize: 14,
                      color: colors.primary, minHeight: 60, textAlignVertical: 'top',
                      borderWidth: 1.5, borderColor: INPUT_BORDER,
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
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t.blocks.addEntry}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Review / Preview view
  if (showReview) {
    return (
      <View>
        {content ? <Text style={LABEL}>{content}</Text> : null}

        {/* Review header */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>{t.blocks.reviewAnswers}</Text>
          <TouchableOpacity onPress={() => setShowReview(false)} style={{
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface2,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: MUTED }}>{t.blocks.edit}</Text>
          </TouchableOpacity>
        </View>

        {/* Current entry only */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 18, padding: 16,
          borderWidth: 1, borderColor: '#EBEBEB',
        }}>
          {columns.map((c: any, ci: number) => {
            const val = (rows[editableIdx]?.[c.id] || '').trim()
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => { setShowReview(false); setCurrentCol(ci) }}
                activeOpacity={0.7}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: ci < columns.length - 1 ? 1 : 0,
                  borderBottomColor: '#F0F0F0',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 4 }}>
                  {extractLocalized(c.header, locale)}
                </Text>
                {val ? (
                  <Text style={{ fontSize: 15, color: colors.primary, lineHeight: 21 }}>{val}</Text>
                ) : (
                  <Text style={{ fontSize: 14, color: '#CCC', fontStyle: 'italic' }}>{t.blocks.notAnswered}</Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 12 }}>
          {t.blocks.tapToEdit}
        </Text>
      </View>
    )
  }

  // Guided stepper view
  return (
    <View>
      {content ? <Text style={LABEL}>{content}</Text> : null}
      {instr && <CollapsibleInstructions text={instr} />}

      {/* Entry selector */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {rows.map((_: any, i: number) => {
          const isSaved = i < rows.length - 1
          return (
            <TouchableOpacity
              key={i}
              onPress={() => { setCurrentEntry(i); setCurrentCol(0); setShowReview(false) }}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: i === safeEntry ? colors.primary : isSaved ? colors.primary + '20' : colors.surface2,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: i === safeEntry ? '#fff' : isSaved ? colors.primary : MUTED }}>
                {i + 1}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Read-only view for previous entries, editable stepper for last entry */}
      {safeEntry < rows.length - 1 ? (
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#EBEBEB',
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 12 }}>
            {t.blocks.entry.replace('{n}', String(safeEntry + 1))}
          </Text>
          {columns.map((c: any, ci: number) => {
            const val = (rows[safeEntry]?.[c.id] || '').trim()
            return (
              <View key={c.id} style={{
                paddingVertical: 8,
                borderBottomWidth: ci < columns.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 2 }}>
                  {extractLocalized(c.header, locale)}
                </Text>
                <Text style={{ fontSize: 15, color: val ? colors.primary : '#CCC', lineHeight: 21 }}>
                  {val || '—'}
                </Text>
              </View>
            )
          })}
        </View>
      ) : (
      <>

      {/* Progress dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
        {columns.map((_: any, i: number) => {
          const isFilled = (row[columns[i].id] || '').trim().length > 0
          return (
            <TouchableOpacity key={i} onPress={() => { setCurrentCol(i); setReturnToCol(null) }}>
              <View style={{
                width: i === safeCol ? 20 : 8, height: 8, borderRadius: 4,
                backgroundColor: i === safeCol ? colors.primary : isFilled ? colors.primary + '40' : '#E0E0E0',
              }} />
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Progress text */}
      <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 12 }}>
        {t.blocks.completed.replace('{count}', String(filledCount)).replace('{total}', String(columns.length))}
      </Text>

      {/* Previous answers in current entry — compact summary */}
      {safeCol > 0 && columns.slice(0, safeCol).some((c: any) => (row[c.id] || '').trim()) && (
        <View style={{
          backgroundColor: colors.surface2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
          marginBottom: 12,
        }}>
          {columns.slice(0, safeCol).map((prevCol: any, i: number) => {
            const val = (row[prevCol.id] || '').trim()
            if (!val) return null
            return (
              <TouchableOpacity key={prevCol.id} onPress={() => { setReturnToCol(safeCol); setCurrentCol(i) }} style={{
                flexDirection: 'row', paddingVertical: 5,
                borderBottomWidth: i < safeCol - 1 ? 1 : 0, borderBottomColor: '#E8E8E8',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, width: '35%' }} numberOfLines={1}>
                  {prevCol.header}
                </Text>
                <Text style={{ fontSize: 12, color: colors.primary, flex: 1 }} numberOfLines={1}>
                  {val}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Current column card */}
      <View style={{
        backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#EBEBEB',
        minHeight: 200,
      }}>
        {/* Column header */}
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
          {extractLocalized(col.header, locale)}
        </Text>
        {col.description && (
          <Text style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 18 }}>
            {extractLocalized(col.description, locale)}
          </Text>
        )}

        {/* Input */}
        <TextInput
          value={row[col.id] || ''}
          onChangeText={(t) => updateCell(safeEntry, col.id, t)}
          placeholder={t.blocks.typeHere}
          placeholderTextColor={PLACEHOLDER}
          multiline
          style={{
            backgroundColor: INPUT_BG, borderRadius: 14, padding: 14, fontSize: 15,
            color: colors.primary, minHeight: 100, textAlignVertical: 'top', flex: 1,
            borderWidth: 1.5, borderColor: INPUT_BORDER,
          }}
        />
      </View>

      {/* Navigation */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        {returnToCol !== null ? (
          <TouchableOpacity
            onPress={() => { setCurrentCol(returnToCol); setReturnToCol(null) }}
            style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.primary + '10' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t.blocks.backToCurrent}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setCurrentCol(Math.max(0, safeCol - 1))}
            disabled={safeCol === 0}
            style={{
              paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
              backgroundColor: safeCol === 0 ? colors.surface2 : colors.primary + '10',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: safeCol === 0 ? '#CCC' : colors.primary }}>← Back</Text>
          </TouchableOpacity>
        )}

        {returnToCol !== null ? (
          <TouchableOpacity
            onPress={() => { setCurrentCol(returnToCol); setReturnToCol(null) }}
            style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.primary }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t.blocks.doneEditing}</Text>
          </TouchableOpacity>
        ) : safeCol < columns.length - 1 ? (
          <TouchableOpacity
            onPress={() => setCurrentCol(safeCol + 1)}
            style={{
              paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t.blocks.nextArrow}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setShowReview(true)}
            style={{
              paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t.blocks.continueArrow}</Text>
          </TouchableOpacity>
        )}
      </View>
      </>
      )}
    </View>
  )
}

export function renderBlock(
  block: any,
  blockValue: unknown,
  onBlockChange: (v: unknown) => void,
  onReviewStateChange?: (inReview: boolean) => void,
  readOnly?: boolean,
  t?: any,
  locale?: string,
) {
  const content = typeof block.content === 'string' ? block.content : extractLocalized(block.content, locale)
  const isRequired = !!block.required
  const Star = isRequired ? <Text style={{ color: colors.error }}> *</Text> : null
  const onChange = readOnly ? () => {} : onBlockChange

  switch (block.type) {
    case 'heading':
      return (
        <View style={{ paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: colors.bloom + '40', marginBottom: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: -0.5, lineHeight: 28 }}>{content}</Text>
        </View>
      )

    case 'paragraph':
      return <Text style={{ fontSize: 16, color: '#374151', lineHeight: 25 }}>{content}</Text>

    case 'quote':
      return (
        <View style={{
          paddingHorizontal: 16, paddingVertical: 14,
          backgroundColor: '#F0F4F8', borderRadius: 14,
          borderLeftWidth: 3, borderLeftColor: colors.bloom,
        }}>
          <Text style={{ fontSize: 16, color: '#1F2937', fontStyle: 'italic', lineHeight: 24, fontWeight: '500' }}>{content}</Text>
        </View>
      )

    case 'tip':
      return (
        <View style={{
          padding: 16, backgroundColor: '#FFF8E1', borderRadius: 16,
          borderWidth: 1, borderColor: '#FFE082',
        }}>
          <Text style={{ fontSize: 15, color: '#5D4037', lineHeight: 22 }}>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>{'💡 '}</Text>{content}
          </Text>
        </View>
      )

    case 'divider':
      return <View style={{ height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 }} />

    case 'key_points': {
      const points: string[] = Array.isArray(block.points) ? block.points : []
      return (
        <View style={{ backgroundColor: '#F5FAF8', borderRadius: 16, padding: 16 }}>
          {content ? (
            <Text style={{ fontWeight: '700', color: colors.primary, marginBottom: 12, fontSize: 16 }}>{content}</Text>
          ) : null}
          {points.map((pt, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: i < points.length - 1 ? 10 : 0,
            }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bloom + '15',
                alignItems: 'center', justifyContent: 'center', marginTop: 1,
              }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.bloom }} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: '#3A3A3A', lineHeight: 22 }}>{typeof pt === 'string' ? pt : ''}</Text>
            </View>
          ))}
        </View>
      )
    }

    case 'callout': {
      const ct = block.calloutType || 'info'
      const cs: Record<string, { bg: string; border: string }> = {
        info: { bg: '#F0F4F8', border: '#94A3B8' },
        warning: { bg: '#FFFBEB', border: '#D97706' },
        success: { bg: '#F0FAF6', border: colors.bloom },
        tip: { bg: '#F0FAF6', border: colors.bloom },
        example: { bg: '#F5F5F5', border: '#9CA3AF' },
      }
      const s = cs[ct] || cs.info
      return (
        <View style={{
          padding: 16, backgroundColor: s.bg, borderRadius: 14,
        }}>
          <Text style={{ fontSize: 15, color: '#2D2D2D', lineHeight: 23 }}>{content}</Text>
        </View>
      )
    }

    case 'prompt':
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          {readOnly ? (
            <View style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, minHeight: 60, borderWidth: 1, borderColor: INPUT_BORDER }}>
              <Text style={{ fontSize: 15, color: colors.primary, lineHeight: 22 }}>{(blockValue as string) || '—'}</Text>
            </View>
          ) : (
            <TextInput
              value={(blockValue as string) || ''}
              editable={!readOnly} onChangeText={(t) => onChange(t)}
              placeholder={t?.blocks?.shareThoughts || "Share your thoughts..."}
              placeholderTextColor={PLACEHOLDER}
              multiline
              style={{
                backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, fontSize: 15,
                color: colors.primary, minHeight: 120, textAlignVertical: 'top',
                borderWidth: 1.5, borderColor: INPUT_BORDER,
              }}
            />
          )}
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
                <TouchableOpacity key={i} onPress={() => onChange(i)} activeOpacity={readOnly ? 1 : 0.7} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16,
                  backgroundColor: sel ? SELECTED_BG : colors.surface2,
                  borderWidth: 2, borderColor: sel ? SELECTED_BORDER : 'transparent',
                  opacity: readOnly && !sel ? 0.5 : 1,
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
                <TouchableOpacity key={val} onPress={() => onChange(val)} activeOpacity={readOnly ? 1 : 0.7} style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  padding: 16, borderRadius: 16,
                  backgroundColor: sel ? SELECTED_BG : colors.surface2,
                  borderWidth: 2, borderColor: sel ? SELECTED_BORDER : 'transparent',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? colors.primary : MUTED }}>
                    {val === 'yes' ? (t?.common?.yes || 'Yes') : (t?.common?.no || 'No')}
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
                <TouchableOpacity key={i} onPress={() => onChange(on ? checked.filter((x) => x !== i) : [...checked, i])} activeOpacity={readOnly ? 1 : 0.7} style={{
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
                <TouchableOpacity key={n} onPress={() => onChange(n)} style={{
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
                  <TouchableOpacity key={m.value} onPress={() => onChange(m.value)} style={{
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
                <TouchableOpacity key={n} onPress={() => onChange(n)}>
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
                <TouchableOpacity key={n} onPress={() => onChange(n)} style={{
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
                <TouchableOpacity key={i} onPress={() => onChange(val)} style={{
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
                  <TouchableOpacity key={n} onPress={() => onChange(n)} style={{
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
              editable={!readOnly} onChangeText={(t) => { const n = Number(t); if (!isNaN(n)) onChange(n) }}
              keyboardType="numeric"
              placeholder={`${sMin} – ${sMax}`}
              placeholderTextColor={PLACEHOLDER}
              style={{
                flex: 1, backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 16,
                color: colors.primary, textAlign: 'center', borderWidth: 1.5, borderColor: INPUT_BORDER,
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
            editable={!readOnly} onChangeText={(v) => { if (v === '') onChange(undefined); else { const n = Number(v); if (!isNaN(n)) onChange(n) } }}
            keyboardType="numeric"
            placeholder={t?.blocks?.enterNumber || "Enter a number..."}
            placeholderTextColor={PLACEHOLDER}
            style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 16, color: colors.primary, borderWidth: 1.5, borderColor: INPUT_BORDER }}
          />
        </View>
      )

    case 'date_picker':
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <TextInput
            value={(blockValue as string) || ''} editable={!readOnly} onChangeText={(t) => onChange(t)}
            placeholder="YYYY-MM-DD" placeholderTextColor={PLACEHOLDER}
            style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 15, color: colors.primary, borderWidth: 1.5, borderColor: INPUT_BORDER }}
          />
        </View>
      )

    case 'time_input':
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <TextInput
            value={(blockValue as string) || ''} editable={!readOnly} onChangeText={(t) => onChange(t)}
            placeholder="HH:MM" placeholderTextColor={PLACEHOLDER}
            style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 15, color: colors.primary, borderWidth: 1.5, borderColor: INPUT_BORDER }}
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
                  editable={!readOnly} onChangeText={(t) => { const a = [...listItems]; a[i] = t; onChange(a) }}
                  placeholder={(t?.blocks?.itemPlaceholder || 'Item {n}...').replace('{n}', String(i + 1))}
                  placeholderTextColor={PLACEHOLDER}
                  style={{ flex: 1, backgroundColor: INPUT_BG, borderRadius: 14, padding: 12, fontSize: 15, color: colors.primary, borderWidth: 1.5, borderColor: INPUT_BORDER }}
                />
                {listItems.length > 1 && (
                  <TouchableOpacity onPress={() => !readOnly && onChange(listItems.filter((_: any, idx: number) => idx !== i))} style={{ padding: 6 }}>
                    <Text style={{ fontSize: 16, color: MUTED }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => !readOnly && onChange([...listItems, ''])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: '300', color: colors.primary }}>+</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t?.blocks?.addItem || 'Add item'}</Text>
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
                  <TouchableOpacity key={n} onPress={() => onChange({ ...ratings, '0': n })} activeOpacity={readOnly ? 1 : 0.7} style={{
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
                      <TouchableOpacity key={n} onPress={() => onChange({ ...ratings, [idx.toString()]: n })} activeOpacity={readOnly ? 1 : 0.7} style={{
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
      return (
        <TableExerciseRenderer
          block={block}
          content={content}
          blockValue={blockValue}
          onBlockChange={onBlockChange}
          onReviewStateChange={onReviewStateChange}
        />
      )
    }

    default:
      return (
        <View style={{ padding: 12, backgroundColor: colors.surface2, borderRadius: 12 }}>
          <Text style={{ fontSize: 13, color: MUTED }}>{(t?.blocks?.unsupported || 'Unsupported: {type}').replace('{type}', block.type)}</Text>
        </View>
      )
  }
}
