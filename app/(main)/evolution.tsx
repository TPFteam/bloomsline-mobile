import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'
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

// ─── Main ───────────────────────────────────────────

export default function Evolution() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [range, setRange] = useState<TimeRange>('7d')
  const [moments, setMoments] = useState<Moment[]>([])
  const [, setLoading] = useState(true)

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - days)
      const data = await getMemberMoments(500, 0, since)
      setMoments(data)
      setLoading(false)
    }
    fetchData()
  }, [days])

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
  const scoreLabel = bloomScore >= 80 ? 'Flourishing' :
    bloomScore >= 60 ? 'Steadily Blooming' :
    bloomScore >= 40 ? 'Taking Root' :
    bloomScore >= 20 ? 'Planting Seeds' : 'Getting Started'

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}
        >
          <Text style={{ fontSize: 18, color: '#000', marginTop: -1 }}>‹</Text>
        </TouchableOpacity>

        {/* Bloom Score */}
        <BloomScoreRing score={bloomScore} trend={0} label={scoreLabel} />

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

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
          <View style={{ flex: 1, backgroundColor: '#fafafa', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#000' }}>{moments.length}</Text>
            <Text style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>moments</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fafafa', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#000' }}>{activeDays}</Text>
            <Text style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>active days</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fafafa', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#000' }}>
              {Math.round((activeDays / days) * 100)}%
            </Text>
            <Text style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>consistency</Text>
          </View>
        </View>

        {/* Mood Composition */}
        {sortedMoods.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: '#bbb', textTransform: 'uppercase', marginBottom: 16 }}>
              Your moods
            </Text>
            <MoodRing moodCounts={sortedMoods} totalMoments={totalMoodEntries} />
          </View>
        )}

        {/* Mood Calendar */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: '#bbb', textTransform: 'uppercase', marginBottom: 16 }}>
            Mood calendar
          </Text>
          <MoodCalendar moments={moments} days={days} />
        </View>
      </ScrollView>
    </View>
  )
}
