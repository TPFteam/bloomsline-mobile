import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native'
import { Video as VideoIcon, Mic, FileUp, ExternalLink, Play, Wind, Eye, Activity, BookOpen, PenLine, Lightbulb, Info, Target, BookMarked, Copy } from 'lucide-react-native'
import { Video as ExpoVideo, ResizeMode } from 'expo-av'
import { supabase } from '@/lib/supabase'
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
const INPUT_BG = '#FFFFFF'
const INPUT_BORDER = '#D1D5DB'
const SELECTED_BG = colors.surface1
const SELECTED_BORDER = colors.primary
const MUTED = '#6B7280'
const PLACEHOLDER = '#9CA3AF'

function ImageWithLightbox({ uri }: { uri: string }) {
  const [open, setOpen] = useState(false)
  const scaleRef = useRef(1)
  const posRef = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const applyTransform = () => {
    if (imgRef.current) {
      imgRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px) scale(${scaleRef.current})`
    }
  }

  useEffect(() => {
    if (Platform.OS === 'web' && open) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      scaleRef.current = 1
      posRef.current = { x: 0, y: 0 }
      applyTransform()

      // Zoom via wheel
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        scaleRef.current = Math.max(0.5, Math.min(5, scaleRef.current + delta))
        if (scaleRef.current <= 1) posRef.current = { x: 0, y: 0 }
        applyTransform()
      }

      // Touch pinch zoom
      let lastDist = 0
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault()
          const dx = e.touches[0].clientX - e.touches[1].clientX
          const dy = e.touches[0].clientY - e.touches[1].clientY
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (lastDist > 0) {
            const delta = (dist - lastDist) * 0.005
            scaleRef.current = Math.max(0.5, Math.min(5, scaleRef.current + delta))
            if (scaleRef.current <= 1) posRef.current = { x: 0, y: 0 }
            applyTransform()
          }
          lastDist = dist
        } else if (e.touches.length === 1 && scaleRef.current > 1) {
          // Pan when zoomed
          e.preventDefault()
          if (dragging.current) {
            posRef.current = {
              x: posRef.current.x + (e.touches[0].clientX - dragStart.current.x),
              y: posRef.current.y + (e.touches[0].clientY - dragStart.current.y),
            }
            dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
            applyTransform()
          }
        }
      }
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1 && scaleRef.current > 1) {
          dragging.current = true
          dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
      }
      const handleTouchEnd = () => { lastDist = 0; dragging.current = false }

      // Mouse drag when zoomed
      const handleMouseDown = (e: MouseEvent) => {
        if (scaleRef.current > 1) {
          dragging.current = true
          dragStart.current = { x: e.clientX, y: e.clientY }
        }
      }
      const handleMouseMove = (e: MouseEvent) => {
        if (dragging.current && scaleRef.current > 1) {
          posRef.current = {
            x: posRef.current.x + (e.clientX - dragStart.current.x),
            y: posRef.current.y + (e.clientY - dragStart.current.y),
          }
          dragStart.current = { x: e.clientX, y: e.clientY }
          applyTransform()
        }
      }
      const handleMouseUp = () => { dragging.current = false }

      document.addEventListener('wheel', handleWheel, { passive: false })
      document.addEventListener('touchstart', handleTouchStart, { passive: false })
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      document.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
        document.removeEventListener('wheel', handleWheel)
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
        document.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [open])

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.9}>
        <Image source={{ uri }} style={{ width: '100%', height: 280, borderRadius: 16, backgroundColor: colors.surface2 }} resizeMode="contain" />
      </TouchableOpacity>
      {open && Platform.OS === 'web' && (() => {
        const ReactDOM = require('react-dom')
        return ReactDOM.createPortal(
          // @ts-ignore
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', touchAction: 'none' }}
          >
            {/* Close button */}
            {/* @ts-ignore */}
            <div
              onClick={(e: any) => { e.stopPropagation(); setOpen(false) }}
              style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 10 }}
            >
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>✕</span>
            </div>
            {/* Zoom hint */}
            {/* @ts-ignore */}
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              Pinch or scroll to zoom
            </div>
            {/* Image */}
            <img
              ref={(el: any) => { imgRef.current = el }}
              src={uri}
              onClick={(e: any) => e.stopPropagation()}
              style={{ maxWidth: '92%', maxHeight: '85%', objectFit: 'contain', borderRadius: 8, transition: 'transform 0.05s ease', cursor: 'grab', userSelect: 'none' }}
            />
          </div>,
          document.body
        )
      })()}
      {open && Platform.OS !== 'web' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setOpen(false)} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={1} style={{ width: '92%', height: '85%' }}>
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      )}
    </>
  )
}

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
                    placeholder={c.placeholder || t.blocks.typeHere}
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
                paddingVertical: 6,
                borderBottomWidth: i < safeCol - 1 ? 1 : 0, borderBottomColor: '#E8E8E8',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 2 }}>
                  {extractLocalized(prevCol.header, locale)}
                </Text>
                <Text style={{ fontSize: 12, color: colors.primary }} numberOfLines={2}>
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
          placeholder={col.placeholder || t.blocks.typeHere}
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
  onOpenPdf?: (url: string, name: string) => void,
) {
  const content = typeof block.content === 'string' ? block.content : extractLocalized(block.content, locale)
  const isRequired = !!block.required
  const Star = isRequired ? <Text style={{ color: colors.error }}> *</Text> : null
  const onChange = readOnly ? () => {} : onBlockChange

  switch (block.type) {
    case 'heading':
      return (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.5, lineHeight: 30 }}>{content}</Text>
        </View>
      )

    case 'paragraph':
      return <Text style={{ fontSize: 17, color: '#374151', lineHeight: 28 }}>{content}</Text>

    case 'quote':
      return (
        <View style={{
          paddingHorizontal: 20, paddingVertical: 16,
          borderLeftWidth: 3, borderLeftColor: '#FBBF24',
          borderTopRightRadius: 12, borderBottomRightRadius: 12,
        }}>
          <Text style={{ fontSize: 17, color: '#374151', fontStyle: 'italic', lineHeight: 28 }}>&ldquo;{content}&rdquo;</Text>
          {block.attribution && <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>— {block.attribution}</Text>}
        </View>
      )

    case 'tip':
      return (
        <View style={{
          padding: 16, backgroundColor: '#fff', borderRadius: 12,
          borderLeftWidth: 3, borderLeftColor: '#10B981',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Lightbulb size={18} color="#10B981" style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 15, color: '#374151', lineHeight: 24, flex: 1 }}>{content}</Text>
          </View>
        </View>
      )

    case 'divider':
      return <View style={{ height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 }} />

    case 'key_points': {
      const points: string[] = Array.isArray(block.points) ? block.points : []
      return (
        <View style={{
          backgroundColor: '#fff', borderRadius: 12, padding: 20,
          borderLeftWidth: 3, borderLeftColor: colors.bloom,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        }}>
          {content ? (
            <Text style={{ fontWeight: '600', color: '#1A1A1A', marginBottom: 14, fontSize: 16 }}>{content}</Text>
          ) : null}
          {points.map((pt, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: i < points.length - 1 ? 12 : 0,
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.bloom, marginTop: 8 }} />
              <Text style={{ flex: 1, fontSize: 15, color: '#374151', lineHeight: 24 }}>{typeof pt === 'string' ? pt : ''}</Text>
            </View>
          ))}
        </View>
      )
    }

    case 'callout': {
      const ct = block.calloutType || 'info'
      const calloutConfig: Record<string, { borderColor: string; iconColor: string; IconComponent: any }> = {
        info: { borderColor: '#60A5FA', iconColor: '#60A5FA', IconComponent: Info },
        warning: { borderColor: '#FBBF24', iconColor: '#FBBF24', IconComponent: Target },
        success: { borderColor: colors.bloom, iconColor: colors.bloom, IconComponent: Lightbulb },
        tip: { borderColor: '#10B981', iconColor: '#10B981', IconComponent: Lightbulb },
        example: { borderColor: '#A78BFA', iconColor: '#A78BFA', IconComponent: BookMarked },
      }
      const cfg = calloutConfig[ct] || calloutConfig.info
      const CalloutIcon = cfg.IconComponent
      return (
        <View style={{
          padding: 16, backgroundColor: '#fff', borderRadius: 12,
          borderLeftWidth: 3, borderLeftColor: cfg.borderColor,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <CalloutIcon size={18} color={cfg.iconColor} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 15, color: '#374151', lineHeight: 24, flex: 1 }}>{content}</Text>
          </View>
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
              placeholder={block.placeholder || t?.blocks?.shareThoughts || "Share your thoughts..."}
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
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
        const rMin = (block.scaleMin ?? 1) as number
        const rMax = (block.scaleMax ?? block.scaleRange ?? 10) as number
        const rNums = Array.from({ length: rMax - rMin + 1 }, (_, i) => rMin + i)
        return (
          <View>
            <Text style={LABEL}>{content}{Star}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {rNums.map((n) => {
                const sel = blockValue === n
                return (
                  <TouchableOpacity key={n} onPress={() => onChange(n)} style={{
                    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: sel ? '#F59E0B' : colors.surface2,
                    borderWidth: 1, borderColor: sel ? '#F59E0B' : '#E5E5E3',
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: sel ? '#fff' : colors.primary }}>{n}</Text>
                  </TouchableOpacity>
                )
              })}
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
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
            placeholder={block.placeholder || t?.blocks?.enterNumber || "Enter a number..."}
            placeholderTextColor={PLACEHOLDER}
            style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 16, color: colors.primary, borderWidth: 1.5, borderColor: INPUT_BORDER }}
          />
        </View>
      )

    case 'date_picker': {
      const dateVal = (blockValue as string) || ''
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          {Platform.OS === 'web' ? (
            // @ts-ignore — HTML date input for web
            <input
              type="date"
              value={dateVal}
              onChange={(e: any) => !readOnly && onChange(e.target.value)}
              disabled={readOnly}
              style={{
                width: '100%', padding: 14, fontSize: 15, borderRadius: 16,
                border: `1.5px solid ${dateVal ? colors.bloom : INPUT_BORDER}`,
                backgroundColor: INPUT_BG, color: colors.primary,
                fontFamily: 'inherit', boxSizing: 'border-box' as any,
              }}
            />
          ) : (
            <TextInput
              value={dateVal}
              editable={!readOnly}
              onChangeText={(t) => onChange(t)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={PLACEHOLDER}
              style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 15, color: colors.primary, borderWidth: 1.5, borderColor: dateVal ? colors.bloom : INPUT_BORDER }}
            />
          )}
        </View>
      )
    }

    case 'time_input': {
      const timeVal = (blockValue as string) || ''
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={timeVal.split(':')[0] || ''}
              editable={!readOnly}
              onChangeText={(h) => {
                const cleaned = h.replace(/[^0-9]/g, '').slice(0, 2)
                const mins = timeVal.split(':')[1] || '00'
                onChange(`${cleaned}:${mins}`)
              }}
              placeholder="HH"
              placeholderTextColor={PLACEHOLDER}
              keyboardType="number-pad"
              maxLength={2}
              style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 20, fontWeight: '600', color: colors.primary, borderWidth: 1.5, borderColor: INPUT_BORDER, width: 70, textAlign: 'center' }}
            />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>:</Text>
            <TextInput
              value={timeVal.split(':')[1] || ''}
              editable={!readOnly}
              onChangeText={(m) => {
                const cleaned = m.replace(/[^0-9]/g, '').slice(0, 2)
                const hours = timeVal.split(':')[0] || '00'
                onChange(`${hours}:${cleaned}`)
              }}
              placeholder="MM"
              placeholderTextColor={PLACEHOLDER}
              keyboardType="number-pad"
              maxLength={2}
              style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 14, fontSize: 20, fontWeight: '600', color: colors.primary, borderWidth: 1.5, borderColor: INPUT_BORDER, width: 70, textAlign: 'center' }}
            />
          </View>
        </View>
      )
    }

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
                  placeholder={block.placeholder || (t?.blocks?.itemPlaceholder || 'Item {n}...').replace('{n}', String(i + 1))}
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

    case 'video_response': {
      const videoUri = blockValue as string | null
      const hasVideo = !!videoUri

      const pickVideo = async () => {
        const ImagePicker = require('expo-image-picker')
        const Alert = require('react-native').Alert
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'videos', videoMaxDuration: 420, quality: 0.7 })
        if (!result.canceled && result.assets?.[0]?.uri) {
          const localUri = result.assets[0].uri
          // Show local preview immediately
          onChange(localUri)
          // Upload to Supabase storage
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            // Supabase doesn't support video/quicktime — normalize to mp4
            let mimeType = result.assets[0].mimeType || 'video/mp4'
            if (mimeType === 'video/quicktime') mimeType = 'video/mp4'
            const ext = mimeType === 'video/mp4' ? 'mp4' : (mimeType.split('/')[1] || 'mp4')
            const fileName = `${user.id}/video-responses/${Date.now()}.${ext}`
            const fetchResponse = await fetch(localUri)
            const blob = await fetchResponse.blob()
            const { data, error } = await supabase.storage
              .from('resource-media')
              .upload(fileName, blob, { contentType: mimeType, upsert: true })
            if (error) {
              console.error('Video upload error:', error)
              // Clear the local blob — don't save unplayable URLs
              onChange('')
              if (Platform.OS === 'web') {
                window.alert('Video upload failed. Please try again.')
              } else {
                Alert.alert('Upload failed', 'Video upload failed. Please try again.')
              }
            } else if (data) {
              const { data: urlData } = supabase.storage.from('resource-media').getPublicUrl(data.path)
              onChange(urlData.publicUrl)
            }
          } catch (e) {
            console.error('Video upload failed:', e)
            onChange('')
            if (Platform.OS === 'web') {
              window.alert('Video upload failed. Please try again.')
            }
          }
        }
      }

      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          {readOnly ? (
            hasVideo && (videoUri!.startsWith('http') || videoUri!.startsWith('blob:')) ? (
              <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#1A1A1A' }}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore
                  <video src={videoUri!} controls style={{ width: '100%', height: 220, backgroundColor: '#1A1A1A', objectFit: 'contain' }} />
                ) : (
                  <ExpoVideo source={{ uri: videoUri! }} style={{ width: '100%', height: 220 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                )}
              </View>
            ) : (
              <View style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, minHeight: 80, borderWidth: 1, borderColor: INPUT_BORDER, justifyContent: 'center', alignItems: 'center' }}>
                {hasVideo ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <VideoIcon size={18} color={colors.bloom} strokeWidth={1.8} />
                    <Text style={{ fontSize: 14, color: colors.bloom, fontWeight: '600' }}>{t?.blocks?.videoRecorded || 'Video recorded'}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 14, color: MUTED }}>{t?.blocks?.noVideo || 'No video'}</Text>
                )}
              </View>
            )
          ) : hasVideo ? (
            <View>
              {/* Video player */}
              <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 10, backgroundColor: '#1A1A1A' }}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore — HTML video element for web
                  <video
                    src={videoUri!}
                    controls
                    style={{ width: '100%', height: 220, borderRadius: 16, backgroundColor: '#1A1A1A', objectFit: 'contain' }}
                  />
                ) : (
                  <ExpoVideo
                    source={{ uri: videoUri! }}
                    style={{ width: '100%', height: 220 }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                  />
                )}
              </View>
              {/* Change video */}
              <TouchableOpacity
                onPress={() => pickVideo()}
                style={{ backgroundColor: INPUT_BG, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: INPUT_BORDER }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{t?.blocks?.changeVideo || 'Change video'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Empty state — record or upload */}
              <TouchableOpacity
                onPress={() => pickVideo()}
                style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 24, minHeight: 100, borderWidth: 1.5, borderColor: INPUT_BORDER, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
              >
                <VideoIcon size={28} color={colors.bloom} strokeWidth={1.8} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t?.blocks?.chooseVideo || 'Choose video'}</Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{t?.blocks?.maxDuration || 'Max 7 minutes'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )
    }

    case 'audio_response': {
      const audioUri = blockValue as string | null
      const hasAudio = !!audioUri

      const pickAudio = async () => {
        const DocumentPicker = require('expo-document-picker')
        const Alert = require('react-native').Alert
        const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true })
        if (!result.canceled && result.assets?.[0]?.uri) {
          const localUri = result.assets[0].uri
          onChange(localUri)
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const mimeType = result.assets[0].mimeType || 'audio/mpeg'
            const ext = mimeType.split('/')[1] || 'mp3'
            const fileName = `${user.id}/audio-responses/${Date.now()}.${ext}`
            const fetchResponse = await fetch(localUri)
            const blob = await fetchResponse.blob()
            const { data, error } = await supabase.storage
              .from('resource-media')
              .upload(fileName, blob, { contentType: mimeType, upsert: true })
            if (error) {
              onChange('')
              Platform.OS === 'web' ? window.alert('Audio upload failed.') : Alert.alert('Upload failed', 'Please try again.')
            } else if (data) {
              const { data: urlData } = supabase.storage.from('resource-media').getPublicUrl(data.path)
              onChange(urlData.publicUrl)
            }
          } catch {
            onChange('')
          }
        }
      }

      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          {readOnly ? (
            hasAudio ? (
              <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface2, padding: 12 }}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore
                  <audio controls src={audioUri!} style={{ width: '100%', borderRadius: 8 }} />
                ) : (
                  <ExpoVideo source={{ uri: audioUri! }} style={{ width: '100%', height: 48 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                )}
              </View>
            ) : (
              <View style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: INPUT_BORDER, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: MUTED }}>{locale === 'fr' ? 'Pas d\'audio' : 'No audio'}</Text>
              </View>
            )
          ) : hasAudio ? (
            <View>
              <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface2, padding: 12, marginBottom: 10 }}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore
                  <audio controls src={audioUri!} style={{ width: '100%', borderRadius: 8 }} />
                ) : (
                  <ExpoVideo source={{ uri: audioUri! }} style={{ width: '100%', height: 48 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                )}
              </View>
              <TouchableOpacity onPress={pickAudio} style={{ backgroundColor: INPUT_BG, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: INPUT_BORDER }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{locale === 'fr' ? 'Changer l\'audio' : 'Change audio'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={pickAudio} style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 24, minHeight: 80, borderWidth: 1.5, borderColor: INPUT_BORDER, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}>
              <Mic size={28} color={colors.bloom} strokeWidth={1.8} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{locale === 'fr' ? 'Choisir un fichier audio' : 'Choose audio file'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )
    }

    case 'file_response': {
      const fileUri = blockValue as string | null
      const hasFile = !!fileUri
      const fileName = hasFile && fileUri!.startsWith('http') ? fileUri!.split('/').pop()?.split('?')[0] || 'file' : ''

      const pickFile = async () => {
        const DocumentPicker = require('expo-document-picker')
        const Alert = require('react-native').Alert
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
        if (!result.canceled && result.assets?.[0]?.uri) {
          const localUri = result.assets[0].uri
          onChange(localUri)
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const mimeType = result.assets[0].mimeType || 'application/octet-stream'
            const originalName = result.assets[0].name || `file-${Date.now()}`
            const ext = originalName.split('.').pop() || 'bin'
            const filePath = `${user.id}/file-responses/${Date.now()}.${ext}`
            const fetchResponse = await fetch(localUri)
            const blob = await fetchResponse.blob()
            const { data, error } = await supabase.storage
              .from('resource-media')
              .upload(filePath, blob, { contentType: mimeType, upsert: true })
            if (error) {
              onChange('')
              Platform.OS === 'web' ? window.alert('File upload failed.') : Alert.alert('Upload failed', 'Please try again.')
            } else if (data) {
              const { data: urlData } = supabase.storage.from('resource-media').getPublicUrl(data.path)
              onChange(urlData.publicUrl)
            }
          } catch {
            onChange('')
          }
        }
      }

      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          {readOnly ? (
            hasFile ? (
              <TouchableOpacity
                onPress={() => {
                  try { const { Linking } = require('react-native'); Linking.openURL(fileUri!) } catch {}
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface2, borderRadius: 16, padding: 14 }}
              >
                <FileUp size={20} color={colors.bloom} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500', flex: 1 }} numberOfLines={1}>{fileName || (locale === 'fr' ? 'Fichier envoyé' : 'File uploaded')}</Text>
                <ExternalLink size={16} color={colors.bloom} />
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: INPUT_BORDER, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: MUTED }}>{locale === 'fr' ? 'Pas de fichier' : 'No file'}</Text>
              </View>
            )
          ) : hasFile ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface2, borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <FileUp size={20} color={colors.bloom} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500', flex: 1 }} numberOfLines={1}>{fileName || (locale === 'fr' ? 'Fichier sélectionné' : 'File selected')}</Text>
                {fileUri!.startsWith('http') && (
                  <TouchableOpacity
                    onPress={() => {
                      try { const { Linking } = require('react-native'); Linking.openURL(fileUri!) } catch {}
                    }}
                  >
                    <ExternalLink size={16} color={colors.bloom} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {fileUri!.startsWith('http') && (
                  <TouchableOpacity
                    onPress={() => {
                      try { const { Linking } = require('react-native'); Linking.openURL(fileUri!) } catch {}
                    }}
                    style={{ flex: 1, backgroundColor: colors.bloom, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{locale === 'fr' ? 'Ouvrir' : 'Open'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={pickFile} style={{ flex: 1, backgroundColor: INPUT_BG, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: INPUT_BORDER }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{locale === 'fr' ? 'Changer le fichier' : 'Change file'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={pickFile} style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 24, minHeight: 80, borderWidth: 1.5, borderColor: INPUT_BORDER, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}>
              <FileUp size={28} color={colors.bloom} strokeWidth={1.8} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{locale === 'fr' ? 'Choisir un fichier' : 'Choose file'}</Text>
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{locale === 'fr' ? 'PDF, image, document...' : 'PDF, image, document...'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )
    }

    case 'image': {
      const imageUrl = (block as any).mediaFile?.url
      return (
        <View>
          {content ? <Text style={LABEL}>{content}</Text> : null}
          {imageUrl ? (
            <ImageWithLightbox uri={imageUrl} />
          ) : (
            <View style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, minHeight: 60, borderWidth: 1, borderColor: INPUT_BORDER, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: MUTED }}>Image</Text>
            </View>
          )}
        </View>
      )
    }

    case 'affirmation':
      return (
        <View style={{ backgroundColor: '#F5F3FF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E9D5FF', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#7C3AED', textAlign: 'center' }}>{content}</Text>
        </View>
      )

    // ─── Media blocks (psychoeducation) ────────────────────
    case 'video': {
      const videoUrl = (block as any).mediaFile?.url || (block as any).url || content
      return videoUrl ? (
        <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
          {Platform.OS === 'web' ? (
            // @ts-ignore — HTML video element for web
            <video controls src={videoUrl} style={{ width: '100%', height: 220, backgroundColor: '#000', objectFit: 'contain' }} />
          ) : (
            <ExpoVideo
              source={{ uri: videoUrl }}
              style={{ width: '100%', height: 220 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}
          {(block as any).caption && (
            <View style={{ padding: 12, backgroundColor: colors.surface2 }}>
              <Text style={{ fontSize: 12, color: MUTED }}>{(block as any).caption}</Text>
            </View>
          )}
        </View>
      ) : null
    }

    case 'audio': {
      const audioUrl = (block as any).mediaFile?.url || (block as any).url || content
      return audioUrl ? (
        <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface2, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.bloom}20`, justifyContent: 'center', alignItems: 'center' }}>
              <Mic size={20} color={colors.bloom} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>{(block as any).title || (locale === 'fr' ? 'Audio' : 'Audio')}</Text>
              {(block as any).caption && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{(block as any).caption}</Text>}
            </View>
          </View>
          {Platform.OS === 'web' ? (
            // @ts-ignore — HTML audio element for web
            <audio controls src={audioUrl} style={{ width: '100%', marginTop: 12, borderRadius: 8 }} />
          ) : (
            <ExpoVideo
              source={{ uri: audioUrl }}
              style={{ width: '100%', height: 48, marginTop: 12 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}
        </View>
      ) : null
    }

    case 'link': {
      const linkUrl = (block as any).linkUrl || (block as any).url || content
      const linkTitle = (block as any).linkTitle || (block as any).title || linkUrl
      return linkUrl ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: '#E5E5E3' }}>
          <TouchableOpacity
            onPress={() => {
              try { const { Linking } = require('react-native'); Linking.openURL(linkUrl) } catch {}
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.bloom}15`, justifyContent: 'center', alignItems: 'center' }}>
              <ExternalLink size={18} color={colors.bloom} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }} numberOfLines={1}>{linkTitle}</Text>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }} numberOfLines={1}>{linkUrl}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              try {
                const Clipboard = require('expo-clipboard')
                Clipboard.setStringAsync(linkUrl)
              } catch {
                if (Platform.OS === 'web') navigator.clipboard.writeText(linkUrl)
              }
            }}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5E3', justifyContent: 'center', alignItems: 'center' }}
          >
            <Copy size={15} color={MUTED} />
          </TouchableOpacity>
        </View>
      ) : null
    }

    // ─── Exercise step blocks ──────────────────────────────
    case 'instruction': {
      const stepContent = (block as any).instructions || (block as any).content || content
      return (
        <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BookOpen size={16} color={colors.bloom} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>{locale === 'fr' ? 'Instructions' : 'Instructions'}</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.primary, lineHeight: 21 }}>{typeof stepContent === 'string' ? stripHtmlTags(stepContent) : ''}</Text>
        </View>
      )
    }

    case 'timed_action': {
      const duration = (block as any).duration || 60
      const mins = Math.floor(duration / 60)
      const secs = duration % 60
      return (
        <View style={{ backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FED7AA' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Play size={16} color="#EA580C" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#EA580C' }}>{locale === 'fr' ? 'Action minutée' : 'Timed Action'}</Text>
            <Text style={{ fontSize: 12, color: '#9A3412', marginLeft: 'auto' }}>{mins > 0 ? `${mins}m ` : ''}{secs > 0 ? `${secs}s` : ''}</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.primary, lineHeight: 21 }}>{typeof content === 'string' ? stripHtmlTags(content) : (block as any).instructions || ''}</Text>
        </View>
      )
    }

    case 'breathing': {
      const pattern = (block as any).pattern || '4-7-8'
      const cycles = (block as any).cycles || 3
      return (
        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Wind size={16} color="#16A34A" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#16A34A' }}>{locale === 'fr' ? 'Respiration' : 'Breathing'}</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#15803D', marginBottom: 4 }}>{pattern}</Text>
          <Text style={{ fontSize: 12, color: '#166534' }}>{cycles} {locale === 'fr' ? 'cycles' : 'cycles'}</Text>
          {(block as any).instructions && <Text style={{ fontSize: 13, color: colors.primary, marginTop: 10, textAlign: 'center', lineHeight: 19 }}>{(block as any).instructions}</Text>}
        </View>
      )
    }

    case 'visualization': {
      return (
        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Eye size={16} color="#2563EB" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563EB' }}>{locale === 'fr' ? 'Visualisation' : 'Visualization'}</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.primary, lineHeight: 21 }}>{typeof content === 'string' ? stripHtmlTags(content) : (block as any).instructions || ''}</Text>
          {(block as any).mediaFile?.url && (
            <Image source={{ uri: (block as any).mediaFile.url }} style={{ width: '100%', height: 180, borderRadius: 12, marginTop: 12 }} resizeMode="cover" />
          )}
        </View>
      )
    }

    case 'body_scan': {
      return (
        <View style={{ backgroundColor: '#FDF4FF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F5D0FE' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Activity size={16} color="#A855F7" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#A855F7' }}>{locale === 'fr' ? 'Scan corporel' : 'Body Scan'}</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.primary, lineHeight: 21 }}>{typeof content === 'string' ? stripHtmlTags(content) : (block as any).instructions || ''}</Text>
        </View>
      )
    }

    case 'reflection': {
      const reflectionPrompt = (block as any).prompt || (block as any).instructions || content
      return (
        <View style={{ backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FDE68A' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <PenLine size={16} color="#D97706" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#D97706' }}>{locale === 'fr' ? 'Réflexion' : 'Reflection'}</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.primary, lineHeight: 21, fontStyle: 'italic' }}>{typeof reflectionPrompt === 'string' ? stripHtmlTags(reflectionPrompt) : ''}</Text>
          {!readOnly && (
            <TextInput
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, marginTop: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', color: colors.primary }}
              multiline
              placeholder={locale === 'fr' ? 'Écrivez votre réflexion...' : 'Write your reflection...'}
              placeholderTextColor={MUTED}
              value={typeof blockValue === 'string' ? blockValue : ''}
              onChangeText={(text) => onChange(text)}
            />
          )}
        </View>
      )
    }

    // ─── PDF document viewer ──────────────────────────
    case 'pdf_document': {
      const { PdfViewer } = require('./interactive/PdfViewer')
      return (
        <PdfViewer
          content={content}
          url={block.mediaFile || block.url || ''}
          fileName={block.fileName}
          onOpenPdf={onOpenPdf}
        />
      )
    }

    // ─── Interactive block types ────────────────────────
    case 'matching_pairs': {
      const { MatchingPairs } = require('./interactive/MatchingPairs')
      return (
        <MatchingPairs
          content={content}
          pairs={block.pairs || []}
          value={blockValue}
          onChange={onChange}
          readOnly={readOnly}
        />
      )
    }

    case 'flashcard': {
      const { Flashcard } = require('./interactive/Flashcard')
      return (
        <Flashcard
          content={content}
          cards={block.cards || []}
          value={blockValue}
          onChange={onChange}
          readOnly={readOnly}
        />
      )
    }

    case 'fill_blank': {
      const { FillBlank } = require('./interactive/FillBlank')
      return (
        <FillBlank
          content={content}
          sentence={block.sentence || ''}
          blanks={block.blanks || []}
          value={blockValue}
          onChange={onChange}
          readOnly={readOnly}
        />
      )
    }

    case 'ordering': {
      const { Ordering } = require('./interactive/Ordering')
      return (
        <Ordering
          content={content}
          items={block.items || []}
          correctOrder={block.correctOrder}
          value={blockValue}
          onChange={onChange}
          readOnly={readOnly}
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
