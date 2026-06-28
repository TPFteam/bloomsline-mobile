import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native'
import { Video as VideoIcon, Mic, FileUp, ExternalLink, Play, Wind, Eye, Activity, BookOpen, PenLine, Lightbulb, Info, Target, BookMarked, Copy, Plus, X as XIcon, Maximize2, Minimize2 } from 'lucide-react-native'
import { Video as ExpoVideo, ResizeMode, Audio } from 'expo-av'
import { WebView } from 'react-native-webview'
import Svg, { Rect, Circle as SvgCircle, Ellipse as SvgEllipse, Polygon as SvgPolygon, Text as SvgText, Image as SvgImage, G as SvgG } from 'react-native-svg'
import { Modal } from 'react-native'
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
  const exampleRow: Record<string, string> = (block.exampleRow && typeof block.exampleRow === 'object') ? block.exampleRow : {}
  const columns: any[] = Array.isArray(block.columns) ? block.columns.map((c: any) => ({
    ...c,
    description: c.description || exampleRow[c.id] || '',
  })) : []
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

      {/* Column navigation */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => setCurrentCol(Math.max(0, safeCol - 1))}
          disabled={safeCol === 0}
          style={{
            paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
            backgroundColor: safeCol === 0 ? 'transparent' : 'rgba(255,255,255,0.15)',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: safeCol === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)' }}>
            ← {locale === 'fr' ? 'Précédent' : 'Back'}
          </Text>
        </TouchableOpacity>

        {safeCol < columns.length - 1 ? (
          <TouchableOpacity
            onPress={() => setCurrentCol(safeCol + 1)}
            style={{
              paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
              {locale === 'fr' ? 'Suivant' : 'Next'} →
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setShowReview(true)}
            style={{
              paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
              {locale === 'fr' ? 'Vérifier' : 'Review'} ✓
            </Text>
          </TouchableOpacity>
        )}
      </View>
      </>
      )}
    </View>
  )
}

/**
 * Patient-fill audio response: record a voice note in-app (native via expo-av,
 * web via MediaRecorder) OR choose an existing audio file. Both upload to the
 * resource-responses bucket and store a long-lived signed URL via onChange.
 */
function AudioResponseInput({ value, onChange, resourceId, readOnly, locale, content, star }: {
  value: string | null
  onChange: (v: unknown) => void
  resourceId?: string
  readOnly?: boolean
  locale?: string
  content: string
  star: React.ReactNode
}) {
  const fr = locale === 'fr'
  const hasAudio = !!value
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [elapsed, setElapsed] = useState(0) // ms

  const recRef = useRef<Audio.Recording | null>(null)        // native
  const mediaRecRef = useRef<any>(null)                      // web MediaRecorder
  const chunksRef = useRef<Blob[]>([])                       // web
  const streamRef = useRef<MediaStream | null>(null)         // web
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  const startTimer = () => {
    setElapsed(0)
    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Date.now() - start), 200)
  }

  // Clean up any in-flight recording on unmount.
  useEffect(() => () => {
    stopTimer()
    recRef.current?.stopAndUnloadAsync().catch(() => {})
    try { mediaRecRef.current?.stop() } catch { /* noop */ }
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const fail = () => {
    if (Platform.OS === 'web') window.alert(fr ? "Échec de l'envoi audio." : 'Audio upload failed.')
    else require('react-native').Alert.alert(fr ? 'Échec' : 'Upload failed', fr ? 'Veuillez réessayer.' : 'Please try again.')
  }

  const uploadBlob = async (blob: Blob, mimeType: string, ext: string) => {
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setUploading(false); return }
      const folder = resourceId || 'unattached'
      const fileName = `${user.id}/${folder}/audio-${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('resource-responses')
        .upload(fileName, blob, { contentType: mimeType, upsert: true })
      if (error || !data) { onChange(''); fail() }
      else {
        const { data: signed } = await supabase.storage
          .from('resource-responses')
          .createSignedUrl(data.path, 60 * 60 * 24 * 365)
        onChange(signed?.signedUrl || '')
      }
    } catch {
      onChange('')
    } finally {
      setUploading(false)
    }
  }

  const pickAudio = async () => {
    const DocumentPicker = require('expo-document-picker')
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true })
    if (result.canceled || !result.assets?.[0]?.uri) return
    const asset = result.assets[0]
    const mimeType = (asset.mimeType || 'audio/mpeg').split(';')[0]
    const ext = (mimeType.split('/')[1] || 'mp3')
    try {
      const blob = await (await fetch(asset.uri)).blob()
      await uploadBlob(blob, mimeType, ext)
    } catch { onChange('') }
  }

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        const MR: typeof MediaRecorder = (window as any).MediaRecorder
        const mr = new MR(stream)
        chunksRef.current = []
        mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        mr.onstop = async () => {
          const mt = (mr.mimeType || 'audio/webm').split(';')[0]
          const ext = mt.includes('mp4') ? 'm4a' : mt.includes('ogg') ? 'ogg' : 'webm'
          const blob = new Blob(chunksRef.current, { type: mt })
          streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
          await uploadBlob(blob, mt, ext)
        }
        mediaRecRef.current = mr
        mr.start()
        startTimer(); setRecording(true)
      } catch {
        window.alert(fr ? "Accès au micro refusé." : 'Microphone access denied.')
      }
      return
    }
    // native
    try {
      const perm = await Audio.requestPermissionsAsync()
      if (!perm.granted) { require('react-native').Alert.alert(fr ? 'Micro requis' : 'Microphone needed', fr ? 'Autorisez le micro pour enregistrer.' : 'Allow microphone access to record.'); return }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      recRef.current = rec
      startTimer(); setRecording(true)
    } catch { /* noop */ }
  }

  const stopRecording = async () => {
    stopTimer(); setRecording(false)
    if (Platform.OS === 'web') {
      try { mediaRecRef.current?.stop() } catch { /* noop */ }
      mediaRecRef.current = null
      return
    }
    const rec = recRef.current; recRef.current = null
    if (!rec) return
    try {
      await rec.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
      const uri = rec.getURI()
      if (uri) {
        const blob = await (await fetch(uri)).blob()
        await uploadBlob(blob, 'audio/m4a', 'm4a')
      }
    } catch { /* noop */ }
  }

  const mmss = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const Player = () => (
    <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface2, padding: 12 }}>
      {Platform.OS === 'web' ? (
        // @ts-ignore — DOM audio element on web
        <audio controls src={value!} style={{ width: '100%', borderRadius: 8 }} />
      ) : (
        <ExpoVideo source={{ uri: value! }} style={{ width: '100%', height: 48 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
      )}
    </View>
  )

  return (
    <View>
      <Text style={LABEL}>{content}{star}</Text>

      {readOnly ? (
        hasAudio ? <Player /> : (
          <View style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: INPUT_BORDER, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: MUTED }}>{fr ? "Pas d'audio" : 'No audio'}</Text>
          </View>
        )
      ) : uploading ? (
        <View style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 24, minHeight: 80, borderWidth: 1, borderColor: INPUT_BORDER, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 }}>
          <ActivityIndicator size="small" color={colors.bloom} />
          <Text style={{ fontSize: 14, color: MUTED }}>{fr ? 'Envoi…' : 'Uploading…'}</Text>
        </View>
      ) : recording ? (
        <View style={{ backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' }} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#B91C1C' }}>{fr ? 'Enregistrement' : 'Recording'} · {mmss(elapsed)}</Text>
          </View>
          <TouchableOpacity onPress={stopRecording} style={{ backgroundColor: '#EF4444', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#fff' }} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{fr ? 'Arrêter' : 'Stop'}</Text>
          </TouchableOpacity>
        </View>
      ) : hasAudio ? (
        <View>
          <View style={{ marginBottom: 10 }}><Player /></View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={startRecording} style={{ flex: 1, backgroundColor: INPUT_BG, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: INPUT_BORDER, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Mic size={16} color={colors.bloom} strokeWidth={1.8} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{fr ? 'Réenregistrer' : 'Record again'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAudio} style={{ flex: 1, backgroundColor: INPUT_BG, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: INPUT_BORDER }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{fr ? "Changer l'audio" : 'Change audio'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <TouchableOpacity onPress={startRecording} style={{ backgroundColor: INPUT_BG, borderRadius: 16, padding: 20, minHeight: 80, borderWidth: 1.5, borderColor: colors.bloom, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}>
            <Mic size={28} color={colors.bloom} strokeWidth={1.8} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{fr ? 'Enregistrer un message vocal' : 'Record voice'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickAudio} style={{ borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, textDecorationLine: 'underline' }}>{fr ? 'Ou choisir un fichier audio' : 'Or choose audio file'}</Text>
          </TouchableOpacity>
        </View>
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
  /** When true, headings and paragraphs render in white-on-colored-bg style (used inside the
   *  worksheet step view where context sits directly on the resource's tinted background). */
  lightText?: boolean,
  /** Required when the block can produce a response file (video_response,
   *  audio_response, file_response). Used to scope the upload path to
   *  `{user_id}/{resourceId}/{filename}` in the resource-responses bucket
   *  so storage RLS can authorize practitioner reads. */
  resourceId?: string,
) {
  const content = typeof block.content === 'string' ? block.content : extractLocalized(block.content, locale)
  const isRequired = !!block.required
  const Star = isRequired ? <Text style={{ color: colors.error }}> *</Text> : null
  const onChange = readOnly ? () => {} : onBlockChange

  switch (block.type) {
    case 'heading': {
      // Optional heading level — defaults to h2 to preserve historical
      // resources that didn't carry the field.
      const lvl = (block as any).headingLevel === 'h1' ? 'h1'
        : (block as any).headingLevel === 'h3' ? 'h3'
        : 'h2'
      const fontSize = lvl === 'h1' ? 28 : lvl === 'h3' ? 18 : 22
      const lineHeight = lvl === 'h1' ? 34 : lvl === 'h3' ? 24 : 28
      const fontWeight = (lvl === 'h1' ? '700' : '600') as '600' | '700'
      return (
        <View style={{ marginTop: 4 }}>
          <Text style={{
            fontSize,
            fontWeight,
            color: lightText ? '#FFFFFF' : '#1A1A1A',
            letterSpacing: -0.4,
            lineHeight,
          }}>{content}</Text>
        </View>
      )
    }

    case 'spacer': {
      // Vertical whitespace — small/medium/large.
      const size = (block as any).spacerSize === 'sm' ? 12
        : (block as any).spacerSize === 'lg' ? 48
        : 24
      return <View style={{ height: size }} aria-hidden />
    }

    case 'paragraph':
      return (
        <Text style={{
          fontSize: 16,
          fontWeight: '300',
          color: lightText ? 'rgba(255,255,255,0.88)' : '#374151',
          lineHeight: 26,
          letterSpacing: 0.1,
        }}>{content}</Text>
      )

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
      const allowMultiple = !!(block as any).allowMultiple
      // When allowMultiple is set the response is an array of selected
      // indices and each option renders as a checkbox-style square.
      // Otherwise it's a single index and we render the radio circle.
      const isSel = (i: number) =>
        allowMultiple
          ? Array.isArray(blockValue) && (blockValue as number[]).includes(i)
          : blockValue === i
      const onPick = (i: number) => {
        if (!allowMultiple) { onChange(i); return }
        const current: number[] = Array.isArray(blockValue) ? (blockValue as number[]) : []
        const next = current.includes(i) ? current.filter(v => v !== i) : [...current, i]
        onChange(next)
      }
      return (
        <View>
          <Text style={LABEL}>{content}{Star}</Text>
          <View style={{ gap: 8 }}>
            {opts.map((opt, i) => {
              const label = typeof opt === 'string' ? opt : opt.label
              const sel = isSel(i)
              return (
                <TouchableOpacity key={i} onPress={() => onPick(i)} activeOpacity={readOnly ? 1 : 0.7} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16,
                  backgroundColor: sel ? SELECTED_BG : colors.surface2,
                  borderWidth: 2, borderColor: sel ? SELECTED_BORDER : 'transparent',
                  opacity: readOnly && !sel ? 0.5 : 1,
                }}>
                  <View style={{
                    width: 20, height: 20,
                    borderRadius: allowMultiple ? 4 : 10,
                    borderWidth: 2,
                    borderColor: sel ? colors.primary : '#D4D4D4',
                    backgroundColor: sel ? colors.primary : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && (allowMultiple
                      ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 14 }}>✓</Text>
                      : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                    )}
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
            // Folder convention is {user_id}/{resource_id}/{filename} — the
            // resource id segment is required so storage RLS can grant the
            // practitioner read access via foldername[2].
            const folder = resourceId || 'unattached'
            const fileName = `${user.id}/${folder}/video-${Date.now()}.${ext}`
            const fetchResponse = await fetch(localUri)
            const blob = await fetchResponse.blob()
            const { data, error } = await supabase.storage
              .from('resource-responses')
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
              // Bucket is private — issue a long-lived signed URL. Renderers
              // that hit a 403 after expiry can re-sign via path.
              const { data: signed } = await supabase.storage
                .from('resource-responses')
                .createSignedUrl(data.path, 60 * 60 * 24 * 365) // 1 year
              if (signed?.signedUrl) onChange(signed.signedUrl)
              else onChange('')
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
      return (
        <AudioResponseInput
          value={blockValue as string | null}
          onChange={onChange}
          resourceId={resourceId}
          readOnly={readOnly}
          locale={locale}
          content={content}
          star={Star}
        />
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
            const folder = resourceId || 'unattached'
            const filePath = `${user.id}/${folder}/file-${Date.now()}.${ext}`
            const fetchResponse = await fetch(localUri)
            const blob = await fetchResponse.blob()
            const { data, error } = await supabase.storage
              .from('resource-responses')
              .upload(filePath, blob, { contentType: mimeType, upsert: true })
            if (error) {
              onChange('')
              Platform.OS === 'web' ? window.alert('File upload failed.') : Alert.alert('Upload failed', 'Please try again.')
            } else if (data) {
              const { data: signed } = await supabase.storage
                .from('resource-responses')
                .createSignedUrl(data.path, 60 * 60 * 24 * 365)
              if (signed?.signedUrl) onChange(signed.signedUrl)
              else onChange('')
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
      const videoType: 'upload' | 'youtube' | 'vimeo' | undefined = (block as any).videoType
      const externalUrl: string | undefined = (block as any).videoUrl
      const uploadedUrl: string | undefined =
        (block as any).mediaFile?.url || (block as any).url || content

      // YouTube / Vimeo embeds — the worksheet creator stores the raw URL
      // in block.videoUrl. The renderer previously only checked
      // mediaFile.url, so external videos came back as an empty native
      // <video> element with no source.
      const externalEmbed = (() => {
        if (!externalUrl) return null
        if (videoType === 'youtube') {
          const m = externalUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
          return m ? `https://www.youtube.com/embed/${m[1]}` : null
        }
        if (videoType === 'vimeo') {
          const m = externalUrl.match(/vimeo\.com\/(\d+)/)
          return m ? `https://player.vimeo.com/video/${m[1]}` : null
        }
        return null
      })()

      const caption = (block as any).caption

      if (externalEmbed) {
        return (
          <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
            {Platform.OS === 'web' ? (
              // @ts-ignore — iframe for web; allows YouTube/Vimeo controls
              <iframe
                src={externalEmbed}
                style={{ width: '100%', height: 220, border: 0, backgroundColor: '#000' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <View style={{ width: '100%', height: 220 }}>
                <WebView
                  source={{ uri: externalEmbed }}
                  style={{ flex: 1, backgroundColor: '#000' }}
                  allowsFullscreenVideo
                  javaScriptEnabled
                  domStorageEnabled
                  mediaPlaybackRequiresUserAction
                />
              </View>
            )}
            {caption && (
              <View style={{ padding: 12, backgroundColor: colors.surface2 }}>
                <Text style={{ fontSize: 12, color: MUTED }}>{caption}</Text>
              </View>
            )}
          </View>
        )
      }

      return uploadedUrl ? (
        <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
          {Platform.OS === 'web' ? (
            // @ts-ignore — HTML video element for web
            <video controls src={uploadedUrl} style={{ width: '100%', height: 220, backgroundColor: '#000', objectFit: 'contain' }} />
          ) : (
            <ExpoVideo
              source={{ uri: uploadedUrl }}
              style={{ width: '100%', height: 220 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}
          {caption && (
            <View style={{ padding: 12, backgroundColor: colors.surface2 }}>
              <Text style={{ fontSize: 12, color: MUTED }}>{caption}</Text>
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

    case 'zoned_canvas': {
      return (
        <ZonedCanvasBlock
          block={block as any}
          value={blockValue as any}
          onChange={onChange}
          readOnly={readOnly}
          locale={locale}
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

// ─── Zoned canvas (spatial-zone interactive exercise) ─────────────
// Mobile counterpart to the web ZonedCanvasRenderer. Same data shape
// (Record<zoneId, ZoneEntry[]>), same template library. Renders the
// canvas via react-native-svg and a list-per-zone view below for
// entry.

type ZCAccent = 'teal' | 'amber' | 'rose' | 'violet' | 'sky' | 'emerald' | 'orange' | 'slate'
const ZC_ACCENT: Record<ZCAccent, { fill: string; stroke: string; text: string; bgRgba: string }> = {
  teal:    { fill: 'rgba(20, 184, 166, 0.10)', stroke: '#0d9488', text: '#0f766e', bgRgba: 'rgba(20, 184, 166, 0.08)' },
  amber:   { fill: 'rgba(245, 158, 11, 0.10)', stroke: '#d97706', text: '#a16207', bgRgba: 'rgba(245, 158, 11, 0.08)' },
  rose:    { fill: 'rgba(244, 63, 94, 0.10)',  stroke: '#e11d48', text: '#be123c', bgRgba: 'rgba(244, 63, 94, 0.08)' },
  violet:  { fill: 'rgba(139, 92, 246, 0.10)', stroke: '#7c3aed', text: '#6d28d9', bgRgba: 'rgba(139, 92, 246, 0.08)' },
  sky:     { fill: 'rgba(14, 165, 233, 0.10)', stroke: '#0284c7', text: '#0369a1', bgRgba: 'rgba(14, 165, 233, 0.08)' },
  emerald: { fill: 'rgba(16, 185, 129, 0.10)', stroke: '#059669', text: '#047857', bgRgba: 'rgba(16, 185, 129, 0.08)' },
  orange:  { fill: 'rgba(249, 115, 22, 0.10)', stroke: '#ea580c', text: '#c2410c', bgRgba: 'rgba(249, 115, 22, 0.08)' },
  slate:   { fill: 'rgba(100, 116, 139, 0.06)', stroke: '#475569', text: '#334155', bgRgba: 'rgba(100, 116, 139, 0.06)' },
}

interface ZCShape {
  kind: 'rect' | 'circle' | 'ellipse' | 'polygon'
  x?: number; y?: number; w?: number; h?: number; rx?: number
  cx?: number; cy?: number; r?: number; ry?: number
  points?: [number, number][]
}
interface ZCZone {
  id: string
  label: { en: string; fr: string; es?: string }
  description?: { en: string; fr: string; es?: string }
  shape: ZCShape
  accent?: ZCAccent
  parentZoneId?: string | null
}
interface ZCBlock {
  id: string
  content?: string
  canvas: { width: number; height: number; backgroundImageUrl?: string }
  zones: ZCZone[]
}
interface ZCEntry { id: string; text: string; createdAt: string }

function zoneArea(z: ZCZone): number {
  const s = z.shape
  if (s.kind === 'rect') return (s.w ?? 0) * (s.h ?? 0)
  if (s.kind === 'circle') return Math.PI * (s.r ?? 0) ** 2
  if (s.kind === 'ellipse') return Math.PI * (s.rx ?? 0) * (s.ry ?? 0)
  if (s.kind === 'polygon' && s.points) {
    let a = 0
    for (let i = 0; i < s.points.length; i++) {
      const [x1, y1] = s.points[i]
      const [x2, y2] = s.points[(i + 1) % s.points.length]
      a += x1 * y2 - x2 * y1
    }
    return Math.abs(a) / 2
  }
  return 0
}

function ZonedCanvasBlock({
  block,
  value,
  onChange,
  readOnly = false,
  locale,
}: {
  block: ZCBlock
  value: Record<string, ZCEntry[]> | undefined
  onChange?: (v: Record<string, ZCEntry[]>) => void
  readOnly?: boolean
  locale?: string
}) {
  const fr = locale === 'fr'
  const es = locale === 'es'
  const lt = (l: { en: string; fr: string; es?: string }) =>
    fr ? l.fr : es ? (l.es ?? l.en) : l.en

  const entries = value ?? {}
  const [editingZone, setEditingZone] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  // Which on-canvas tag is tapped open — its full sentence shows in a popup.
  const [openEntry, setOpenEntry] = useState<string | null>(null)
  // Measured inline-canvas width, to lay tap targets over the SVG tags.
  const [canvasW, setCanvasW] = useState(0)

  const startAdd = (zoneId: string) => {
    if (readOnly) return
    setOpenEntry(null)
    setEditingZone(zoneId)
    setDraft('')
  }
  const commitAdd = () => {
    if (!editingZone || !draft.trim()) { setEditingZone(null); return }
    const next = { ...entries }
    const list = next[editingZone] ? [...next[editingZone]] : []
    list.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: draft.trim(),
      createdAt: new Date().toISOString(),
    })
    next[editingZone] = list
    onChange?.(next)
    setEditingZone(null)
    setDraft('')
  }
  const removeEntry = (zoneId: string, entryId: string) => {
    const next = { ...entries }
    next[zoneId] = (next[zoneId] || []).filter(e => e.id !== entryId)
    if (next[zoneId].length === 0) delete next[zoneId]
    onChange?.(next)
  }

  // Defensive: older drafts (and any future bug in the save mapper)
  // can land here without `zones` / `canvas`. Crashing inside the
  // worksheet step view bricks the whole exercise for the patient.
  const zones: ZCZone[] = Array.isArray(block.zones) ? block.zones : []
  const canvas = block.canvas ?? { width: 800, height: 600 }
  if (zones.length === 0) {
    return (
      <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
          This exercise is missing its zones. Please ask your practitioner to re-share it.
        </Text>
      </View>
    )
  }
  const paintOrder = [...zones].sort((a, b) => zoneArea(b) - zoneArea(a))
  // Long custom labels overflow the canvas (SVG text doesn't wrap), so each
  // zone shows a small numbered badge and the full labels live in the legend
  // list below (number → label).
  const zoneNumber: Record<string, number> = {}
  zones.forEach((z, i) => { zoneNumber[z.id] = i + 1 })

  // react-native-svg's web shim forwards native gesture props (onPress →
  // onResponderTerminate, etc.) that react-native-web doesn't recognise,
  // producing "Unknown event handler property" warnings. Skip onPress on
  // web — the per-zone "+ Add" buttons below give web users an equivalent
  // input path.
  const tapHandler = (id: string) =>
    Platform.OS === 'web' ? {} : { onPress: () => startAdd(id) }

  const renderShape = (z: ZCZone) => {
    const a = ZC_ACCENT[(z.accent ?? 'slate') as ZCAccent]
    const s = z.shape
    if (s.kind === 'rect') {
      return (
        <Rect
          key={z.id}
          x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 0}
          fill={a.fill} stroke={a.stroke} strokeWidth={2}
          {...tapHandler(z.id)}
        />
      )
    }
    if (s.kind === 'circle') {
      return (
        <SvgCircle
          key={z.id}
          cx={s.cx} cy={s.cy} r={s.r}
          fill={a.fill} stroke={a.stroke} strokeWidth={2}
          {...tapHandler(z.id)}
        />
      )
    }
    if (s.kind === 'ellipse') {
      return (
        <SvgEllipse
          key={z.id}
          cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
          fill={a.fill} stroke={a.stroke} strokeWidth={2}
          {...tapHandler(z.id)}
        />
      )
    }
    if (s.kind === 'polygon' && s.points) {
      return (
        <SvgPolygon
          key={z.id}
          points={s.points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill={a.fill} stroke={a.stroke} strokeWidth={2}
          {...tapHandler(z.id)}
        />
      )
    }
    return null
  }

  // Per-zone layout — returns the centre column + label baseline + the y
  // where entry text should start stacking. Labels sit near the *top* of
  // each shape (not the centre) so entries have room to stack below them
  // and still fall inside the zone.
  const zonePos = (z: ZCZone) => {
    const s = z.shape
    if (s.kind === 'rect') {
      const cx = (s.x ?? 0) + (s.w ?? 0) / 2
      const labelY = (s.y ?? 0) + 30
      return { cx, labelY, entriesStartY: labelY + 30 }
    }
    if (s.kind === 'circle') {
      const cx = s.cx ?? 0
      const labelY = (s.cy ?? 0) - (s.r ?? 0) + 34
      return { cx, labelY, entriesStartY: labelY + 30 }
    }
    if (s.kind === 'ellipse') {
      const cx = s.cx ?? 0
      const labelY = (s.cy ?? 0) - (s.ry ?? 0) + 34
      return { cx, labelY, entriesStartY: labelY + 30 }
    }
    if (s.kind === 'polygon' && s.points && s.points.length) {
      const cx = s.points.reduce((acc, [x]) => acc + x, 0) / s.points.length
      const minY = Math.min(...s.points.map(p => p[1]))
      const labelY = minY + 30
      return { cx, labelY, entriesStartY: labelY + 30 }
    }
    return { cx: 0, labelY: 0, entriesStartY: 0 }
  }

  const renderLabel = (z: ZCZone) => {
    const a = ZC_ACCENT[(z.accent ?? 'slate') as ZCAccent]
    const { cx, labelY } = zonePos(z)
    return (
      <SvgG key={`label-${z.id}`}>
        <SvgCircle cx={cx} cy={labelY} r={14} fill={a.stroke} />
        <SvgText
          x={cx} y={labelY + 5}
          fill="#ffffff"
          fontSize={16}
          fontWeight="700"
          textAnchor="middle"
        >
          {zoneNumber[z.id]}
        </SvgText>
      </SvgG>
    )
  }

  // Scatter each entry as a small "tag" pill at a deterministic-but-
  // varied position inside the zone. Pills avoid the label area, child
  // zones (e.g. the inner circle for Circle of Control), and each other.
  // Deterministic seeding keeps positions stable across re-renders so
  // pills don't jiggle when the patient adds a new one.
  const seededRand = (seed: string) => {
    let h = 2166136261
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = (h * 16777619) >>> 0
    }
    return () => {
      h = (h * 1664525 + 1013904223) >>> 0
      return h / 0xffffffff
    }
  }
  const estimatePillWidth = (text: string, fontSize: number) =>
    Math.max(50, text.length * fontSize * 0.58 + 24)
  const insideShape = (x: number, y: number, s: ZCShape, pad = 0): boolean => {
    if (s.kind === 'rect') {
      return x >= (s.x ?? 0) + pad && x <= (s.x ?? 0) + (s.w ?? 0) - pad &&
             y >= (s.y ?? 0) + pad && y <= (s.y ?? 0) + (s.h ?? 0) - pad
    }
    if (s.kind === 'circle') {
      const dx = x - (s.cx ?? 0), dy = y - (s.cy ?? 0)
      return Math.hypot(dx, dy) <= (s.r ?? 0) - pad
    }
    if (s.kind === 'ellipse') {
      const dx = (x - (s.cx ?? 0)) / Math.max(1, (s.rx ?? 0) - pad)
      const dy = (y - (s.cy ?? 0)) / Math.max(1, (s.ry ?? 0) - pad)
      return dx * dx + dy * dy <= 1
    }
    return false
  }
  // Does an (axis-aligned, padded) pill box overlap a shape? Keeps outer-zone
  // tags clear of a nested inner shape (e.g. the circle), checking the whole
  // box, not just its centre.
  const boxOverlapsShape = (cx: number, cy: number, w: number, h: number, s: ZCShape, clearance = 0): boolean => {
    const hw = w / 2 + clearance, hh = h / 2 + clearance
    if (s.kind === 'circle' || s.kind === 'ellipse') {
      const r = s.kind === 'circle' ? (s.r ?? 0) : Math.min(s.rx ?? 0, s.ry ?? 0)
      const nx = Math.max(cx - hw, Math.min(s.cx ?? 0, cx + hw))
      const ny = Math.max(cy - hh, Math.min(s.cy ?? 0, cy + hh))
      return Math.hypot((s.cx ?? 0) - nx, (s.cy ?? 0) - ny) < r
    }
    if (s.kind === 'rect') {
      const scx = (s.x ?? 0) + (s.w ?? 0) / 2, scy = (s.y ?? 0) + (s.h ?? 0) / 2
      return Math.abs(cx - scx) < hw + (s.w ?? 0) / 2 && Math.abs(cy - scy) < hh + (s.h ?? 0) / 2
    }
    return false
  }
  // Zones nested inside `z` (explicit parentZoneId, or geometrically a smaller
  // zone whose centre is inside z). Tags in z must avoid these.
  const childrenOf = (z: ZCZone): ZCZone[] =>
    zones.filter(c => {
      if (c.id === z.id) return false
      if (c.parentZoneId === z.id) return true
      if (zoneArea(c) >= zoneArea(z)) return false
      const s = c.shape
      let ccx = 0, ccy = 0
      if (s.kind === 'rect') { ccx = (s.x ?? 0) + (s.w ?? 0) / 2; ccy = (s.y ?? 0) + (s.h ?? 0) / 2 }
      else if (s.kind === 'circle' || s.kind === 'ellipse') { ccx = s.cx ?? 0; ccy = s.cy ?? 0 }
      else if (s.kind === 'polygon' && s.points?.length) {
        ccx = s.points.reduce((a, p) => a + p[0], 0) / s.points.length
        ccy = s.points.reduce((a, p) => a + p[1], 0) / s.points.length
      }
      return insideShape(ccx, ccy, z.shape, 0)
    })
  type Placed = { id: string; text: string; cx: number; cy: number; w: number; h: number; angle: number }

  // Build the placement plan once per zone — used by renderEntries.
  const planEntries = (z: ZCZone): Placed[] => {
    const list = entries[z.id] ?? []
    if (list.length === 0) return []
    const maxVisible = 8
    const visible = list.slice(0, maxVisible)
    const children = childrenOf(z)
    const { labelY } = zonePos(z)
    const fontSize = 13
    const h = fontSize + 14
    const placed: Placed[] = []
    const margin = 12

    for (const entry of visible) {
      // Keep tags compact so they fit inside their zone; the full sentence is
      // revealed on tap (and only then allowed to overflow).
      const raw = entry.text || ''
      const text = raw.length > 18 ? raw.slice(0, 16) + '…' : raw
      const w = estimatePillWidth(text, fontSize)
      const halfDiag = Math.hypot(w / 2, h / 2)  // rotation-safe radius
      const rng = seededRand(z.id + entry.id)
      let chosen: Placed | null = null
      for (let t = 0; t < 80; t++) {
        const s = z.shape
        let cx = 0, cy = 0
        if (s.kind === 'rect') {
          cx = (s.x ?? 0) + w / 2 + margin + rng() * ((s.w ?? 0) - w - 2 * margin)
          cy = labelY + 26 + h / 2 + rng() * ((s.y ?? 0) + (s.h ?? 0) - labelY - 26 - h - 2 * margin)
        } else if (s.kind === 'circle') {
          const angle = rng() * Math.PI * 2
          const maxR = Math.max(0, (s.r ?? 0) - halfDiag - margin)
          const radius = Math.sqrt(rng()) * maxR
          cx = (s.cx ?? 0) + Math.cos(angle) * radius
          cy = (s.cy ?? 0) + Math.sin(angle) * radius
          if (cy < labelY + h / 2 + 8) continue
        } else if (s.kind === 'ellipse') {
          const angle = rng() * Math.PI * 2
          const r = Math.sqrt(rng())
          cx = (s.cx ?? 0) + r * Math.cos(angle) * Math.max(0, (s.rx ?? 0) - w / 2 - margin)
          cy = (s.cy ?? 0) + r * Math.sin(angle) * Math.max(0, (s.ry ?? 0) - h / 2 - margin)
          if (cy < labelY + h / 2 + 8) continue
        } else if (s.kind === 'polygon' && s.points && s.points.length) {
          const xs = s.points.map(p => p[0]), ys = s.points.map(p => p[1])
          cx = Math.min(...xs) + margin + rng() * (Math.max(...xs) - Math.min(...xs) - 2 * margin)
          cy = Math.min(...ys) + margin + rng() * (Math.max(...ys) - Math.min(...ys) - 2 * margin)
        }
        // Keep the whole tag box clear of any nested zone (e.g. the circle),
        // not just its centre — so outer tags never spill onto the circle.
        let hitsChild = false
        for (const c of children) {
          if (boxOverlapsShape(cx, cy, w, h, c.shape, 4)) { hitsChild = true; break }
        }
        if (hitsChild) continue
        // Collision check against already-placed pills.
        const angle = (rng() - 0.5) * 6
        const candidate: Placed = { id: entry.id, text, cx, cy, w, h, angle }
        let collides = false
        for (const p of placed) {
          if (Math.abs(p.cx - cx) < (p.w + w) / 2 + 6 && Math.abs(p.cy - cy) < (p.h + h) / 2 + 4) {
            collides = true; break
          }
        }
        if (collides) continue
        chosen = candidate
        break
      }
      if (chosen) placed.push(chosen)
    }
    return placed
  }

  const renderEntries = (z: ZCZone, placed: Placed[]) => {
    const list = entries[z.id] ?? []
    if (list.length === 0) return null
    const a = ZC_ACCENT[(z.accent ?? 'slate') as ZCAccent]
    const overflow = list.length - placed.length
    return (
      <SvgG key={`entries-${z.id}`}>
        {placed.map(p => (
          <SvgG key={`entry-${p.id}`} transform={`translate(${p.cx} ${p.cy}) rotate(${p.angle})`}>
            <Rect
              x={-p.w / 2} y={-p.h / 2}
              width={p.w} height={p.h} rx={p.h / 2}
              fill="#ffffff" stroke={a.stroke} strokeWidth={1.2}
              opacity={0.95}
            />
            <SvgText
              x={0} y={3}
              fill={a.stroke}
              fontSize={13}
              fontWeight="500"
              textAnchor="middle"
              pointerEvents="none"
            >
              {p.text}
            </SvgText>
          </SvgG>
        ))}
        {overflow > 0 ? (
          <SvgText
            x={zonePos(z).cx}
            y={zonePos(z).labelY + 22}
            fill={a.stroke}
            fontSize={11}
            fontStyle="italic"
            textAnchor="middle"
            opacity={0.75}
            pointerEvents="none"
          >
            {fr ? `+${overflow} de plus` : es ? `+${overflow} más` : `+${overflow} more`}
          </SvgText>
        ) : null}
      </SvgG>
    )
  }

  // Plan all zones once so the entry layer and the tap hotspots agree on
  // positions.
  const placedByZone: Record<string, Placed[]> = {}
  for (const z of zones) placedByZone[z.id] = planEntries(z)

  // Map a viewBox point to on-screen pixels inside the measured inline canvas
  // (Svg is width 100% × 280, preserveAspectRatio xMidYMid meet). Used to lay
  // transparent tap targets over each tag so tapping works on web too (SVG
  // onPress isn't reliable under react-native-web).
  const INLINE_H = 280
  const scale = canvasW > 0 ? Math.min(canvasW / canvas.width, INLINE_H / canvas.height) : 0
  const offX = (canvasW - canvas.width * scale) / 2
  const offY = (INLINE_H - canvas.height * scale) / 2

  // Full text + accent for the currently-open tag (for the popup).
  const openInfo = (() => {
    if (!openEntry) return null
    const text = Object.values(entries).flat().find(e => e.id === openEntry)?.text
    if (!text) return null
    let accent: ZCAccent = 'slate'
    for (const z of zones) {
      if ((entries[z.id] ?? []).some(e => e.id === openEntry)) { accent = (z.accent ?? 'slate') as ZCAccent; break }
    }
    return { text, colour: ZC_ACCENT[accent] }
  })()

  return (
    <View>
      {block.content ? (
        <Text style={{ color: '#374151', fontSize: 15, lineHeight: 22, marginBottom: 16 }}>{block.content}</Text>
      ) : null}

      {/* Canvas */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 8, marginBottom: 16, position: 'relative' }}>
        <View style={{ position: 'relative' }} onLayout={e => setCanvasW(e.nativeEvent.layout.width)}>
          <Svg viewBox={`0 0 ${canvas.width} ${canvas.height}`} width="100%" height={280}>
            {canvas.backgroundImageUrl ? (
              <SvgImage
                href={canvas.backgroundImageUrl as any}
                x={0} y={0}
                width={canvas.width} height={canvas.height}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : null}
            {paintOrder.map(renderShape)}
            {paintOrder.map(renderLabel)}
            {paintOrder.map(z => renderEntries(z, placedByZone[z.id] ?? []))}
          </Svg>
          {/* Transparent tap targets over each tag → open the full-text popup.
              Works on web (where SVG onPress is unreliable) and native. */}
          {scale > 0 && Object.values(placedByZone).flat().map(p => (
            <TouchableOpacity
              key={`hit-${p.id}`}
              onPress={() => setOpenEntry(p.id)}
              style={{
                position: 'absolute',
                left: offX + (p.cx - p.w / 2) * scale,
                top: offY + (p.cy - p.h / 2) * scale,
                width: p.w * scale,
                height: p.h * scale,
              }}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          style={{ position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 999, padding: 8 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={fr ? 'Agrandir' : es ? 'Ampliar' : 'Expand canvas'}
        >
          <Maximize2 size={16} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Full-screen expanded canvas */}
      <Modal
        visible={expanded}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setExpanded(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, gap: 12 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>
              {block.content || ''}
            </Text>
            <TouchableOpacity
              onPress={() => setExpanded(false)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={fr ? 'Réduire' : es ? 'Reducir' : 'Close expanded canvas'}
            >
              <Minimize2 size={16} color="#111827" />
              <Text style={{ color: '#111827', fontSize: 14, fontWeight: '600' }}>
                {fr ? 'Réduire' : es ? 'Cerrar' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setExpanded(false)}
            style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 12, justifyContent: 'center' }}
          >
            <View
              style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12 }}
              onStartShouldSetResponder={() => true}
            >
              <Svg viewBox={`0 0 ${canvas.width} ${canvas.height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ aspectRatio: canvas.width / canvas.height }}>
                {canvas.backgroundImageUrl ? (
                  <SvgImage
                    href={canvas.backgroundImageUrl as any}
                    x={0} y={0}
                    width={canvas.width} height={canvas.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : null}
                {paintOrder.map(renderShape)}
                {paintOrder.map(renderLabel)}
                {paintOrder.map(z => renderEntries(z, placedByZone[z.id] ?? []))}
              </Svg>
            </View>
          </TouchableOpacity>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center', paddingBottom: 18 }}>
            {fr ? "Touchez à l'extérieur pour fermer" : es ? 'Toca afuera para cerrar' : 'Tap outside to close'}
          </Text>
        </View>
      </Modal>

      {/* Tag tapped open — show the full sentence in a small centred popup. */}
      <Modal
        visible={!!openInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenEntry(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpenEntry(null)}
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 360, borderTopWidth: 3, borderTopColor: openInfo?.colour.stroke ?? '#475569' }}
          >
            <Text style={{ fontSize: 15, lineHeight: 22, color: '#1f2937' }}>{openInfo?.text}</Text>
            <TouchableOpacity onPress={() => setOpenEntry(null)} style={{ alignSelf: 'flex-end', marginTop: 14, paddingVertical: 4, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: openInfo?.colour.stroke ?? '#475569' }}>
                {fr ? 'Fermer' : es ? 'Cerrar' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Per-zone list — primary mobile input surface */}
      <View style={{ gap: 12 }}>
        {zones.map(zone => {
          const colour = ZC_ACCENT[(zone.accent ?? 'slate') as ZCAccent]
          const list = entries[zone.id] ?? []
          const desc = zone.description ? lt(zone.description) : ''
          return (
            <View
              key={zone.id}
              style={{
                // Faint card bg blended into the page's green theme — use
                // an off-white instead so the card itself reads as a
                // distinct surface regardless of page background.
                backgroundColor: '#fafaf9',
                borderColor: colour.stroke + '88',
                borderWidth: 1.5,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, marginTop: 1, backgroundColor: colour.stroke, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{zoneNumber[zone.id]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>{lt(zone.label)}</Text>
                    {desc ? <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{desc}</Text> : null}
                  </View>
                </View>
                {!readOnly ? (
                  <TouchableOpacity
                    onPress={() => startAdd(zone.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
                  >
                    <Plus size={12} color="#4b5563" />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151' }}>
                      {fr ? 'Ajouter' : es ? 'Añadir' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {list.length > 0 ? (
                <View style={{ gap: 6 }}>
                  {list.map((entry, i) => (
                    <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={{ minWidth: 18, fontSize: 14, fontWeight: '600', color: colour.stroke, lineHeight: 20 }}>{i + 1}.</Text>
                      <Text style={{ flex: 1, minWidth: 0, flexShrink: 1, fontSize: 14, color: '#1f2937', lineHeight: 20 }}>{entry.text}</Text>
                      {!readOnly ? (
                        <TouchableOpacity
                          onPress={() => removeEntry(zone.id, entry.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{
                            width: 22, height: 22, borderRadius: 11,
                            backgroundColor: '#f3f4f6',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <XIcon size={13} color="#374151" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                  {fr ? 'Aucune entrée pour le moment' : es ? 'Sin entradas todavía' : 'No entries yet'}
                </Text>
              )}
            </View>
          )
        })}
      </View>

      {/* Bottom-sheet input */}
      <Modal
        visible={!!editingZone}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingZone(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setEditingZone(null)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {fr ? 'Ajouter à' : es ? 'Añadir a' : 'Add to'}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
              {editingZone ? lt(zones.find(z => z.id === editingZone)!.label) : ''}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={fr ? 'Écrivez quelque chose…' : es ? 'Escribe algo…' : 'Write something…'}
              multiline
              numberOfLines={3}
              autoFocus
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#1f2937', minHeight: 80, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setEditingZone(null)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 14, color: '#4b5563' }}>
                  {fr ? 'Annuler' : es ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={commitAdd}
                disabled={!draft.trim()}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: draft.trim() ? '#111827' : '#d1d5db' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#fff' }}>
                  {fr ? 'Ajouter' : es ? 'Añadir' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
