import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image, Pressable, Animated } from 'react-native'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMemberMoments, Moment, MomentType } from '@/lib/services/moments'
import { PageLoader } from '@/components/PageLoader'
import { Camera, Video, Mic, PenLine, LayoutGrid, GitBranch } from 'lucide-react-native'
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg'

const { width } = Dimensions.get('window')

type TimeRange = '7d' | '30d' | '90d'

// ─── Mood data ──────────────────────────────────────

const MOOD_SCORES: Record<string, number> = {
  joyful: 95, grateful: 90, inspired: 88, proud: 85,
  loved: 82, peaceful: 80, hopeful: 75, calm: 72,
  tender: 55, restless: 48, uncertain: 45,
  tired: 42, overwhelmed: 38, heavy: 32,
}

const MOOD_COLORS: Record<string, string> = {
  joyful: '#F59E0B', grateful: '#10B981', inspired: '#8B5CF6', proud: '#EC4899',
  loved: '#F43F5E', peaceful: '#06B6D4', hopeful: '#F97316', calm: '#6366F1',
  tender: '#A78BFA', restless: '#EAB308', uncertain: '#94A3B8',
  tired: '#64748B', overwhelmed: '#EF4444', heavy: '#475569',
}

// ─── Bloom Score Ring ───────────────────────────────

function BloomScoreRing({ score, trend, label }: { score: number; trend: number; label: string }) {
  const size = 160
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const cx = size / 2
  const cy = size / 2

  // Color based on score
  const color = score >= 70 ? '#4A9A86' : score >= 40 ? '#F59E0B' : '#94A3B8'

  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke="#f0f0f0" strokeWidth={stroke} fill="none"
        />
        {/* Progress ring */}
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Score text */}
        <SvgText
          x={cx} y={cy - 6}
          fontSize={42} fontWeight="700"
          fill="#000" textAnchor="middle"
          alignmentBaseline="central"
        >
          {score}
        </SvgText>
        <SvgText
          x={cx} y={cy + 24}
          fontSize={12} fontWeight="500"
          fill="#bbb" textAnchor="middle"
        >
          {label}
        </SvgText>
      </Svg>
      {trend !== 0 && (
        <Text style={{ fontSize: 13, color: trend > 0 ? '#10B981' : '#EF4444', fontWeight: '600', marginTop: 4 }}>
          {trend > 0 ? '+' : ''}{trend} from last period
        </Text>
      )}
    </View>
  )
}

// ─── Emotional Landscape Chart ──────────────────────

function EmotionalLandscape({ moments, days }: { moments: Moment[]; days: number }) {
  const chartW = width - 48
  const chartH = 140
  const padTop = 16
  const padBot = 24

  // Group moments by day and compute daily average mood score
  const dayScores: { date: string; score: number; mood: string }[] = []
  const grouped: Record<string, number[]> = {}
  const dayMoods: Record<string, string[]> = {}

  moments.forEach(m => {
    const day = m.created_at.split('T')[0]
    const mood = m.moods?.[0]
    if (!mood) return
    if (!grouped[day]) grouped[day] = []
    if (!dayMoods[day]) dayMoods[day] = []
    grouped[day].push(MOOD_SCORES[mood] ?? 50)
    dayMoods[day].push(mood)
  })

  // Build points for each day in range
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (grouped[key]) {
      const avg = grouped[key].reduce((a, b) => a + b, 0) / grouped[key].length
      // Most common mood of the day
      const moodFreq: Record<string, number> = {}
      dayMoods[key].forEach(m => { moodFreq[m] = (moodFreq[m] || 0) + 1 })
      const topMood = Object.entries(moodFreq).sort((a, b) => b[1] - a[1])[0][0]
      dayScores.push({ date: key, score: avg, mood: topMood })
    }
  }

  if (dayScores.length === 0) return null

  // Map to chart coordinates
  const points = dayScores.map((ds, i) => {
    const x = dayScores.length === 1 ? chartW / 2 : (i / (dayScores.length - 1)) * (chartW - 32) + 16
    const y = padTop + (1 - ds.score / 100) * (chartH - padTop - padBot)
    return { x, y, ...ds }
  })

  // Build smooth curve
  let curvePath = ''
  if (points.length >= 2) {
    curvePath = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      curvePath += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
    }
  }

  const fillPath = curvePath
    ? curvePath + ` L ${points[points.length - 1].x},${chartH - padBot} L ${points[0].x},${chartH - padBot} Z`
    : ''

  const dominantColor = MOOD_COLORS[dayScores[dayScores.length - 1]?.mood] || '#4A9A86'

  return (
    <View style={{ backgroundColor: '#fafafa', borderRadius: 24, overflow: 'hidden', paddingTop: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: '#bbb', textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 4 }}>
        Emotional landscape
      </Text>
      <Svg width={chartW} height={chartH}>
        <Defs>
          <LinearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={dominantColor} stopOpacity="0.15" />
            <Stop offset="1" stopColor={dominantColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {fillPath ? <Path d={fillPath} fill="url(#landGrad)" /> : null}
        {curvePath ? (
          <Path d={curvePath} stroke={dominantColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        ) : null}

        {/* Data points */}
        {points.map((pt, i) => (
          <Circle
            key={i}
            cx={pt.x} cy={pt.y}
            r={4}
            fill={MOOD_COLORS[pt.mood] || '#666'}
            stroke="#fafafa"
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  )
}

// ─── Mood Composition Ring ──────────────────────────

function MoodRing({ moodCounts, totalMoments }: { moodCounts: [string, number][]; totalMoments: number }) {
  const size = 180
  const stroke = 18
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  if (moodCounts.length === 0) return null

  // Build arcs
  let startAngle = -90 // start from top
  const arcs = moodCounts.slice(0, 6).map(([mood, count]) => {
    const pct = count / totalMoments
    const angle = pct * 360
    const arc = {
      mood,
      count,
      color: MOOD_COLORS[mood] || '#94A3B8',
      startAngle,
      endAngle: startAngle + angle,
      dashArray: `${pct * circumference} ${(1 - pct) * circumference}`,
      dashOffset: -(startAngle + 90) / 360 * circumference,
    }
    startAngle += angle
    return arc
  })

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={radius} stroke="#f5f5f5" strokeWidth={stroke} fill="none" />
        {arcs.map((arc, i) => (
          <Circle
            key={i}
            cx={cx} cy={cy} r={radius}
            stroke={arc.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <SvgText x={cx} y={cy - 4} fontSize={28} fontWeight="700" fill="#000" textAnchor="middle" alignmentBaseline="central">
          {totalMoments}
        </SvgText>
        <SvgText x={cx} y={cy + 18} fontSize={11} fill="#bbb" textAnchor="middle">
          moments
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 16, paddingHorizontal: 8 }}>
        {arcs.map(arc => (
          <View key={arc.mood} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: arc.color }} />
            <Text style={{ fontSize: 12, color: '#666', textTransform: 'capitalize' }}>{arc.mood}</Text>
            <Text style={{ fontSize: 11, color: '#ccc' }}>{arc.count}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Mood Calendar (Year in Pixels) ─────────────────

function MoodCalendar({ moments, days }: { moments: Moment[]; days: number }) {
  // Build day → dominant mood map
  const dayMoodMap: Record<string, string> = {}
  const dayMoodFreq: Record<string, Record<string, number>> = {}

  moments.forEach(m => {
    const day = m.created_at.split('T')[0]
    const mood = m.moods?.[0]
    if (!mood) return
    if (!dayMoodFreq[day]) dayMoodFreq[day] = {}
    dayMoodFreq[day][mood] = (dayMoodFreq[day][mood] || 0) + 1
  })

  Object.entries(dayMoodFreq).forEach(([day, freq]) => {
    dayMoodMap[day] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
  })

  // Generate grid of days
  const today = new Date()
  const grid: { date: string; mood: string | null }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    grid.push({ date: key, mood: dayMoodMap[key] || null })
  }

  const pixelSize = Math.floor((width - 48 - 6 * 6) / 7) // 7 columns, 6 gaps
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  // Find current streak
  let streak = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (dayMoodMap[key]) streak++
    else break
  }

  return (
    <View>
      {/* Day labels */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
        {dayLabels.map((d, i) => (
          <Text key={i} style={{ width: pixelSize, textAlign: 'center', fontSize: 10, color: '#d4d4d4', fontWeight: '500' }}>
            {d}
          </Text>
        ))}
      </View>

      {/* Pixel grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {grid.map(day => (
          <View
            key={day.date}
            style={{
              width: pixelSize,
              height: pixelSize,
              borderRadius: 6,
              backgroundColor: day.mood ? (MOOD_COLORS[day.mood] || '#94A3B8') : '#f5f5f5',
              opacity: day.mood ? 1 : 0.5,
            }}
          />
        ))}
      </View>

      {/* Streak */}
      {streak > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: '#f0fdf4', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 14 }}>🌿</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#4A9A86' }}>
            {streak}-day streak
          </Text>
        </View>
      )}
    </View>
  )
}

// ─── Remember This Card ─────────────────────────────

function RememberThisCard({ moments, onPress }: { moments: Moment[]; onPress: (m: Moment) => void }) {
  // Pick a random moment older than 2 days, different each load
  const memory = useMemo(() => {
    const now = Date.now()
    const candidates = moments.filter(m => {
      const t = new Date(m.created_at).getTime()
      return t < now - 2 * 24 * 60 * 60 * 1000 && m.moods?.length > 0
    })
    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }, [moments])

  if (!memory) return null

  const mood = memory.moods?.[0]
  const daysAgo = Math.round((Date.now() - new Date(memory.created_at).getTime()) / (24 * 60 * 60 * 1000))
  const timeLabel = daysAgo === 7 ? 'One week ago' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`

  return (
    <TouchableOpacity onPress={() => onPress(memory)} activeOpacity={0.8} style={{ marginBottom: 24 }}>
      <View style={{ backgroundColor: '#fafafa', borderRadius: 24, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4A9A86' }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4A9A86' }}>Bloom</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', lineHeight: 22 }}>
          {timeLabel}, you felt{' '}
          <Text style={{ color: MOOD_COLORS[mood] || '#666', textTransform: 'capitalize' as any }}>{mood}</Text>
        </Text>

        {/* Mini moment preview */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginTop: 14 }}>
          {memory.media_url && (memory.type === 'photo' || memory.type === 'video' || memory.type === 'mixed') && (
            <Image
              source={{ uri: memory.thumbnail_url || memory.media_url }}
              style={{ width: '100%', height: 120, borderRadius: 12, marginBottom: 10 }}
              resizeMode="cover"
            />
          )}
          {memory.text_content ? (
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }} numberOfLines={2}>
              {memory.text_content}
            </Text>
          ) : memory.caption ? (
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }} numberOfLines={2}>
              {memory.caption}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Filter Row ─────────────────────────────────────

const TYPE_FILTERS: { key: string; label: string; Icon?: any }[] = [
  { key: 'all', label: 'All' },
  { key: 'photo', label: 'Photo', Icon: Camera },
  { key: 'video', label: 'Video', Icon: Video },
  { key: 'voice', label: 'Voice', Icon: Mic },
  { key: 'write', label: 'Write', Icon: PenLine },
]

function FilterRow({
  activeType, onTypeChange, activeMood, onMoodChange, availableMoods,
}: {
  activeType: string; onTypeChange: (t: string) => void
  activeMood: string | null; onMoodChange: (m: string | null) => void
  availableMoods: string[]
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
      {TYPE_FILTERS.map(f => {
        const active = activeType === f.key
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => onTypeChange(f.key)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: active ? '#000' : '#f5f5f5',
            }}
          >
            {f.Icon && <f.Icon size={14} color={active ? '#fff' : '#999'} strokeWidth={2} />}
            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#999' }}>{f.label}</Text>
          </TouchableOpacity>
        )
      })}

      {/* Mood dots */}
      {availableMoods.length > 0 && (
        <View style={{ width: 1, height: 24, backgroundColor: '#e5e5e5', marginHorizontal: 4, alignSelf: 'center' }} />
      )}
      {availableMoods.slice(0, 6).map(mood => {
        const active = activeMood === mood
        return (
          <TouchableOpacity
            key={mood}
            onPress={() => onMoodChange(active ? null : mood)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: active ? 12 : 0,
              paddingVertical: active ? 6 : 0,
              borderRadius: 12,
              backgroundColor: active ? (MOOD_COLORS[mood] || '#666') + '1A' : 'transparent',
            }}
          >
            <View style={{
              width: active ? 16 : 24, height: active ? 16 : 24,
              borderRadius: active ? 8 : 12,
              backgroundColor: MOOD_COLORS[mood] || '#666',
              opacity: active ? 1 : 0.5,
            }} />
            {active && (
              <Text style={{ fontSize: 12, fontWeight: '600', color: MOOD_COLORS[mood] || '#666', textTransform: 'capitalize' }}>
                {mood}
              </Text>
            )}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

// ─── Moment Card ────────────────────────────────────

function MomentRiverCard({ moment, cardWidth, onPress }: { moment: Moment; cardWidth: number; onPress: () => void }) {
  const mood = moment.moods?.[0]
  const moodColor = MOOD_COLORS[mood] || '#94A3B8'
  const time = new Date(moment.created_at)
  const timeStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const hasImage = moment.media_url && (moment.type === 'photo' || moment.type === 'video' || moment.type === 'mixed')
  const isVoice = moment.type === 'voice'
  const isWrite = moment.type === 'write'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ width: cardWidth }}>
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        overflow: 'hidden',
      }}>
        {/* Photo/Video */}
        {hasImage && (
          <View>
            <Image
              source={{ uri: moment.thumbnail_url || moment.media_url! }}
              style={{ width: '100%', height: 140 }}
              resizeMode="cover"
            />
            {moment.type === 'video' && (
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <View style={{
                    width: 0, height: 0,
                    borderLeftWidth: 10, borderTopWidth: 6, borderBottomWidth: 6,
                    borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent',
                    marginLeft: 2,
                  }} />
                </View>
              </View>
            )}
            {moment.media_items && moment.media_items.length > 1 && (
              <View style={{
                position: 'absolute', top: 8, right: 8,
                backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
                paddingHorizontal: 6, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>{moment.media_items.length}</Text>
              </View>
            )}
          </View>
        )}

        {/* Voice */}
        {isVoice && (
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: '#F59E0B' + '1A',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Mic size={18} color="#F59E0B" strokeWidth={2} />
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 }}>
              {Array.from({ length: 16 }, (_, i) => (
                <View key={i} style={{
                  width: 2.5, borderRadius: 1.25,
                  height: 8 + Math.sin(i * 0.8 + (moment.id?.charCodeAt(0) || 0)) * 14,
                  backgroundColor: '#F59E0B',
                  opacity: 0.6,
                }} />
              ))}
            </View>
            {moment.duration_seconds ? (
              <Text style={{ fontSize: 12, color: '#999' }}>
                {Math.floor(moment.duration_seconds / 60)}:{String(Math.round(moment.duration_seconds % 60)).padStart(2, '0')}
              </Text>
            ) : null}
          </View>
        )}

        {/* Text/Write */}
        {isWrite && (
          <View style={{ padding: 16, backgroundColor: '#fafafa' }}>
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#000', lineHeight: 22 }} numberOfLines={4}>
              {moment.text_content || moment.caption || ''}
            </Text>
          </View>
        )}

        {/* Footer: mood + date */}
        <View style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {mood ? (
            <View style={{
              backgroundColor: moodColor + '14',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: moodColor, textTransform: 'capitalize' }}>{mood}</Text>
            </View>
          ) : <View />}
          <Text style={{ fontSize: 11, color: '#ccc' }}>{timeStr}</Text>
        </View>

        {/* Caption below image if exists */}
        {hasImage && (moment.caption || moment.text_content) && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
            <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }} numberOfLines={2}>
              {moment.caption || moment.text_content}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Emotional River ────────────────────────────────

function groupMomentsByWeek(moments: Moment[]): { label: string; moments: Moment[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Sunday

  const groups: Map<string, { label: string; start: Date; moments: Moment[] }> = new Map()

  const sorted = [...moments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  sorted.forEach(m => {
    const d = new Date(m.created_at)
    const mDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    // Determine which week
    const diffDays = Math.floor((today.getTime() - mDate.getTime()) / (24 * 60 * 60 * 1000))

    let key: string, label: string
    if (diffDays < 7) {
      key = 'this-week'
      label = 'This Week'
    } else if (diffDays < 14) {
      key = 'last-week'
      label = 'Last Week'
    } else {
      // Group by week start
      const ws = new Date(mDate)
      ws.setDate(ws.getDate() - ws.getDay())
      key = ws.toISOString().split('T')[0]
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      label = `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }

    if (!groups.has(key)) {
      groups.set(key, { label, start: mDate, moments: [] })
    }
    groups.get(key)!.moments.push(m)
  })

  return Array.from(groups.values())
}

function EmotionalRiver({
  moments, onMomentPress,
}: {
  moments: Moment[]
  onMomentPress: (m: Moment) => void
}) {
  const cardWidth = (width - 48) / 2 - 14 // half screen minus gaps for river line
  const groups = useMemo(() => groupMomentsByWeek(moments), [moments])

  if (moments.length === 0) {
    return (
      <View style={{ backgroundColor: '#f8f8f8', borderRadius: 24, padding: 40, alignItems: 'center', marginTop: 8 }}>
        <Text style={{ fontSize: 40, opacity: 0.25, marginBottom: 16 }}>✦</Text>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#ccc', textAlign: 'center' }}>No moments captured</Text>
        <Text style={{ fontSize: 14, color: '#d4d4d4', textAlign: 'center', marginTop: 8 }}>
          Your moments will flow here as you capture them
        </Text>
      </View>
    )
  }

  return (
    <View>
      {groups.map((group, gi) => (
        <View key={gi}>
          {/* Week header */}
          <View style={{ alignItems: 'center', marginBottom: 20, marginTop: gi > 0 ? 12 : 0 }}>
            <View style={{
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0',
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#bbb', textTransform: 'uppercase' }}>
                {group.label} · {group.moments.length}
              </Text>
            </View>
          </View>

          {/* River with alternating cards */}
          <View style={{ position: 'relative' }}>
            {/* Central river line */}
            <View style={{
              position: 'absolute',
              left: (width - 48) / 2,
              top: 0, bottom: 0,
              width: 2,
              backgroundColor: '#f0f0f0',
              borderRadius: 1,
            }} />

            {/* Moment cards */}
            {group.moments.map((moment, mi) => {
              const isLeft = mi % 2 === 0
              const mood = moment.moods?.[0]
              const moodColor = MOOD_COLORS[mood] || '#ddd'

              return (
                <View key={moment.id} style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: 20,
                  justifyContent: isLeft ? 'flex-start' : 'flex-end',
                }}>
                  {isLeft ? (
                    <>
                      <MomentRiverCard moment={moment} cardWidth={cardWidth} onPress={() => onMomentPress(moment)} />
                      {/* Connector line + dot */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
                        <View style={{ width: 12, height: 1, backgroundColor: '#e5e5e5' }} />
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: moodColor }} />
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Connector line + dot */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: moodColor }} />
                        <View style={{ width: 12, height: 1, backgroundColor: '#e5e5e5' }} />
                      </View>
                      <MomentRiverCard moment={moment} cardWidth={cardWidth} onPress={() => onMomentPress(moment)} />
                    </>
                  )}
                </View>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Grid View ──────────────────────────────────────

function MomentsGrid({
  moments, onMomentPress,
}: {
  moments: Moment[]
  onMomentPress: (m: Moment) => void
}) {
  const groups = useMemo(() => groupMomentsByWeek(moments), [moments])

  if (moments.length === 0) {
    return (
      <View style={{ backgroundColor: '#f8f8f8', borderRadius: 24, padding: 40, alignItems: 'center', marginTop: 8 }}>
        <Text style={{ fontSize: 40, opacity: 0.25, marginBottom: 16 }}>✦</Text>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#ccc', textAlign: 'center' }}>No moments captured</Text>
        <Text style={{ fontSize: 14, color: '#d4d4d4', textAlign: 'center', marginTop: 8 }}>
          Your moments will flow here as you capture them
        </Text>
      </View>
    )
  }

  return (
    <View>
      {groups.map((group, gi) => (
        <View key={gi}>
          {/* Week header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: gi > 0 ? 20 : 0 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#000' }}>{group.label}</Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4A9A86' }} />
            <Text style={{ fontSize: 13, color: '#999' }}>
              {group.moments.length} {group.moments.length === 1 ? 'moment' : 'moments'}
            </Text>
          </View>

          {/* 2-column masonry grid */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Left column */}
            <View style={{ flex: 1, gap: 10 }}>
              {group.moments.filter((_, i) => i % 2 === 0).map(moment => (
                <GridCard key={moment.id} moment={moment} onPress={() => onMomentPress(moment)} />
              ))}
            </View>
            {/* Right column */}
            <View style={{ flex: 1, gap: 10 }}>
              {group.moments.filter((_, i) => i % 2 === 1).map(moment => (
                <GridCard key={moment.id} moment={moment} onPress={() => onMomentPress(moment)} />
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

function GridCard({ moment, onPress }: { moment: Moment; onPress: () => void }) {
  const mood = moment.moods?.[0]
  const moodColor = MOOD_COLORS[mood] || '#94A3B8'
  const timeStr = new Date(moment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const hasImage = moment.media_url && (moment.type === 'photo' || moment.type === 'video' || moment.type === 'mixed')
  const isVoice = moment.type === 'voice'
  const isWrite = moment.type === 'write'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={{
        backgroundColor: isWrite ? '#f5f5f5' : '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        overflow: 'hidden',
      }}>
        {/* Photo/Video */}
        {hasImage && (
          <View>
            <Image
              source={{ uri: moment.thumbnail_url || moment.media_url! }}
              style={{ width: '100%', height: 160 }}
              resizeMode="cover"
            />
            {moment.type === 'video' && (
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <View style={{
                    width: 0, height: 0,
                    borderLeftWidth: 12, borderTopWidth: 7, borderBottomWidth: 7,
                    borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent',
                    marginLeft: 3,
                  }} />
                </View>
              </View>
            )}
            {moment.media_items && moment.media_items.length > 1 && (
              <View style={{
                position: 'absolute', top: 8, right: 8,
                backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
                paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>{moment.media_items.length}</Text>
              </View>
            )}
          </View>
        )}

        {/* Voice */}
        {isVoice && (
          <View style={{ padding: 16, alignItems: 'center', gap: 8 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: '#F59E0B' + '1A',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Mic size={20} color="#F59E0B" strokeWidth={2} />
            </View>
            {moment.duration_seconds ? (
              <Text style={{ fontSize: 13, color: '#999' }}>
                {Math.floor(moment.duration_seconds / 60)}:{String(Math.round(moment.duration_seconds % 60)).padStart(2, '0')}
              </Text>
            ) : null}
          </View>
        )}

        {/* Text/Write */}
        {isWrite && (
          <View style={{ padding: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#000', lineHeight: 22 }} numberOfLines={5}>
              {moment.text_content || moment.caption || ''}
            </Text>
          </View>
        )}

        {/* Caption for photo/video */}
        {hasImage && (moment.text_content || moment.caption) && (
          <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
            <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }} numberOfLines={2}>
              {moment.text_content || moment.caption}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {mood ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: moodColor }} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: moodColor, textTransform: 'capitalize' }}>{mood}</Text>
            </View>
          ) : <View />}
          <Text style={{ fontSize: 11, color: '#ccc' }}>{timeStr}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Moment Detail Sheet ────────────────────────────

function MomentDetailSheet({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const hasImage = moment.media_url && (moment.type === 'photo' || moment.type === 'video' || moment.type === 'mixed')
  const isVoice = moment.type === 'voice'

  return (
    <Pressable
      onPress={onClose}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
      }}
    >
      <Pressable
        onPress={() => {}}
        style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingBottom: insets.bottom + 16,
          maxHeight: '80%',
        }}
      >
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5' }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {hasImage && (
            <Image
              source={{ uri: moment.media_url! }}
              style={{ width: '100%', height: 280 }}
              resizeMode="cover"
            />
          )}
          {isVoice && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
                <Mic size={28} color="#fff" strokeWidth={2} />
              </View>
            </View>
          )}
          <View style={{ padding: 20 }}>
            {moment.moods?.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {moment.moods.map(m => (
                  <View key={m} style={{
                    backgroundColor: (MOOD_COLORS[m] || '#666') + '14',
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: MOOD_COLORS[m] || '#666', textTransform: 'capitalize' }}>{m}</Text>
                  </View>
                ))}
              </View>
            )}
            {moment.text_content ? (
              <Text style={{ fontSize: 17, color: '#000', lineHeight: 26, marginBottom: 12 }}>{moment.text_content}</Text>
            ) : null}
            {moment.caption ? (
              <Text style={{ fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 12 }}>{moment.caption}</Text>
            ) : null}
            <Text style={{ fontSize: 13, color: '#bbb' }}>
              {new Date(moment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              {new Date(moment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  )
}

// ─── Main ───────────────────────────────────────────

export default function Evolution() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [range, setRange] = useState<TimeRange>('7d')
  const [allMoments, setAllMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterMood, setFilterMood] = useState<string | null>(null)
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null)
  const [viewMode, setViewMode] = useState<'river' | 'grid'>('river')

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90

  const fetchData = useCallback(async () => {
    const data = await getMemberMoments(500, 0)
    setAllMoments(data)
  }, [])

  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true)
      await fetchData()
      setLoading(false)
    }
    initialFetch()
  }, [fetchData])

  const onRefresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Range-filtered moments for analytics
  const rangeSince = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.getTime()
  }, [days])

  const moments = useMemo(() =>
    allMoments.filter(m => new Date(m.created_at).getTime() >= rangeSince),
    [allMoments, rangeSince]
  )

  // ─── Computed stats ────────────────────────────────

  const moodCounts: Record<string, number> = {}
  let totalMoodEntries = 0
  moments.forEach(m => {
    m.moods?.forEach(mood => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1
      totalMoodEntries++
    })
  })
  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])

  // Active days
  const daySet = new Set<string>()
  moments.forEach(m => daySet.add(m.created_at.split('T')[0]))
  const activeDays = daySet.size

  // Bloom Score calculation
  const frequencyScore = Math.min(100, (moments.length / (days * 2)) * 100) // target: 2/day
  const consistencyScore = (activeDays / days) * 100

  // Valence: weighted average, with difficult moods still contributing positively (honesty)
  let valenceSum = 0
  let valenceCount = 0
  moments.forEach(m => {
    m.moods?.forEach(mood => {
      valenceSum += MOOD_SCORES[mood] ?? 50
      valenceCount++
    })
  })
  const valenceScore = valenceCount > 0 ? valenceSum / valenceCount : 50

  const bloomScore = moments.length === 0 ? 0 : Math.round(
    frequencyScore * 0.3 + valenceScore * 0.35 + consistencyScore * 0.35
  )

  // Score label
  const scoreLabel = bloomScore >= 80 ? 'Amazing week' :
    bloomScore >= 60 ? 'Going strong' :
    bloomScore >= 40 ? 'Building up' :
    bloomScore >= 20 ? 'Keep going' : 'Just starting'

  // Filtered moments for library (uses ALL moments, not range-filtered)
  const filteredMoments = useMemo(() => {
    let filtered = allMoments
    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType)
    }
    if (filterMood) {
      filtered = filtered.filter(m => m.moods?.includes(filterMood))
    }
    return filtered
  }, [allMoments, filterType, filterMood])

  // All moods across all moments for filter dots
  const allMoodCounts: Record<string, number> = {}
  allMoments.forEach(m => { m.moods?.forEach(mood => { allMoodCounts[mood] = (allMoodCounts[mood] || 0) + 1 }) })
  const availableMoods = Object.entries(allMoodCounts).sort((a, b) => b[1] - a[1]).map(([mood]) => mood)

  if (loading) return <PageLoader />

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PullToRefreshScrollView
        onRefresh={onRefresh}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(main)/home')}
          activeOpacity={0.7}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}
        >
          <Text style={{ fontSize: 18, color: '#000', marginTop: -1 }}>‹</Text>
        </TouchableOpacity>

        {/* Time range */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {(['7d', '30d', '90d'] as TimeRange[]).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: range === r ? '#000' : '#f5f5f5',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: range === r ? '#fff' : '#999' }}>
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Emotional Landscape */}
        {moments.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <EmotionalLandscape moments={moments} days={days} />
          </View>
        )}

        {/* Mood Calendar */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: '#bbb', textTransform: 'uppercase', marginBottom: 16 }}>
            Mood calendar
          </Text>
          <MoodCalendar moments={moments} days={days} />
        </View>

        {/* ─── Moments Library ─── */}
        <View style={{ height: 1, backgroundColor: '#f0f0f0', marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: '#bbb', textTransform: 'uppercase' }}>
            Your moments
          </Text>
          {/* View toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 12, padding: 3 }}>
            <TouchableOpacity
              onPress={() => setViewMode('river')}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                backgroundColor: viewMode === 'river' ? '#fff' : 'transparent',
              }}
            >
              <GitBranch size={16} color={viewMode === 'river' ? '#000' : '#bbb'} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('grid')}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                backgroundColor: viewMode === 'grid' ? '#fff' : 'transparent',
              }}
            >
              <LayoutGrid size={16} color={viewMode === 'grid' ? '#000' : '#bbb'} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Remember This */}
        <RememberThisCard moments={allMoments} onPress={setViewingMoment} />

        {/* Filters */}
        <View style={{ marginBottom: 24 }}>
          <FilterRow
            activeType={filterType}
            onTypeChange={setFilterType}
            activeMood={filterMood}
            onMoodChange={setFilterMood}
            availableMoods={availableMoods}
          />
        </View>

        {/* River or Grid view */}
        {viewMode === 'river' ? (
          <EmotionalRiver
            moments={filteredMoments}
            onMomentPress={setViewingMoment}
          />
        ) : (
          <MomentsGrid
            moments={filteredMoments}
            onMomentPress={setViewingMoment}
          />
        )}
      </PullToRefreshScrollView>

      {/* Moment detail sheet */}
      {viewingMoment && (
        <MomentDetailSheet moment={viewingMoment} onClose={() => setViewingMoment(null)} />
      )}
    </View>
  )
}
