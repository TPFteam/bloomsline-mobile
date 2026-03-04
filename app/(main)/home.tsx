import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Dimensions, RefreshControl, Animated, Pressable, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'
import { Camera, Video, Mic, PenLine } from 'lucide-react-native'
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg'

const { width } = Dimensions.get('window')

const CARD_SIZE = 95
const CAPTURE_TYPES = [
  { key: 'photo', Icon: Camera, label: 'Photo', color: '#3B82F6', rotate: '-6deg', offsetX: -55, offsetY: -120 },
  { key: 'video', Icon: Video, label: 'Video', color: '#8B5CF6', rotate: '5deg', offsetX: 55, offsetY: -120 },
  { key: 'voice', Icon: Mic, label: 'Voice', color: '#F59E0B', rotate: '-4deg', offsetX: -55, offsetY: -10 },
  { key: 'write', Icon: PenLine, label: 'Write', color: '#10B981', rotate: '4deg', offsetX: 55, offsetY: -10 },
]

// Mood emotional valence scores (0–100, higher = more positive)
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

const CHART_W = width - 56
const TL_H = 180
const CURVE_TOP = 28
const CURVE_BOT = 140
const TIME_Y = 168

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Helpers ─────────────────────────────────────────

function getToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getDateLabel(date: Date): string {
  const today = getToday()
  if (isSameDay(date, today)) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getGreetingText(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// ─── Components ──────────────────────────────────────

function BloomLogo({ size = 36 }: { size?: number }) {
  const dot = size * 0.6
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: dot, height: dot, borderRadius: dot / 2,
        backgroundColor: '#4A9A86',
      }} />
    </View>
  )
}

function DayNav({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const today = getToday()
  const isViewingToday = isSameDay(selected, today)

  const goBack = () => {
    const prev = new Date(selected)
    prev.setDate(prev.getDate() - 1)
    onSelect(prev)
  }

  const goForward = () => {
    if (isViewingToday) return
    const next = new Date(selected)
    next.setDate(next.getDate() + 1)
    onSelect(next)
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <TouchableOpacity onPress={goBack} activeOpacity={0.5} hitSlop={12}>
        <Text style={{ fontSize: 16, color: '#d4d4d4' }}>‹</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={!isViewingToday ? () => onSelect(today) : undefined} activeOpacity={isViewingToday ? 1 : 0.6}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#bbb' }}>
          {getDateLabel(selected)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goForward} activeOpacity={isViewingToday ? 1 : 0.5} hitSlop={12}>
        <Text style={{ fontSize: 16, color: isViewingToday ? '#eee' : '#d4d4d4' }}>›</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Emotional Timeline ──────────────────────────────

function EmotionalTimeline({ moments, showNow, onMomentPress }: { moments: Moment[]; showNow: boolean; onMomentPress?: (m: Moment) => void }) {
  const sorted = [...moments]
    .filter(m => m.moods && m.moods.length > 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (sorted.length === 0) return null

  // Map moments → chart coordinates
  const points = sorted.map(m => {
    const date = new Date(m.created_at)
    const hour = date.getHours() + date.getMinutes() / 60
    const mood = m.moods[0]
    const score = MOOD_SCORES[mood] ?? 50
    const x = Math.max(16, Math.min(CHART_W - 16, (hour / 24) * CHART_W))
    const y = CURVE_TOP + (1 - score / 100) * (CURVE_BOT - CURVE_TOP)
    return { x, y, mood, score, time: date, moment: m }
  })

  // Smooth Bézier curve through points
  let curvePath = ''
  let fillPath = ''
  if (points.length >= 2) {
    curvePath = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      curvePath += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
    }
    fillPath = curvePath + ` L ${points[points.length - 1].x},${CURVE_BOT} L ${points[0].x},${CURVE_BOT} Z`
  }

  // Current time marker
  const now = new Date()
  const nowHour = now.getHours() + now.getMinutes() / 60
  const nowX = Math.max(16, Math.min(CHART_W - 16, (nowHour / 24) * CHART_W))

  const timeLabels = [
    { hour: 6, text: '6a' },
    { hour: 12, text: '12p' },
    { hour: 18, text: '6p' },
  ]

  const latest = points[points.length - 1]
  const latestColor = MOOD_COLORS[latest.mood] || '#000'

  return (
    <View style={{ backgroundColor: '#fafafa', borderRadius: 24, overflow: 'hidden' }}>
      {/* Card header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: '#bbb', textTransform: 'uppercase' }}>
          Emotional flow
        </Text>
        <View style={{ backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#999' }}>
            {sorted.length} {sorted.length === 1 ? 'moment' : 'moments'}
          </Text>
        </View>
      </View>

      {/* SVG chart */}
      <View style={{ paddingHorizontal: 4 }}>
        <Svg width={CHART_W} height={TL_H}>
          <Defs>
            <LinearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={latestColor} stopOpacity="0.1" />
              <Stop offset="1" stopColor={latestColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Subtle horizontal grid */}
          {[0.25, 0.5, 0.75].map(pct => {
            const gy = CURVE_TOP + pct * (CURVE_BOT - CURVE_TOP)
            return (
              <Line key={pct} x1={16} y1={gy} x2={CHART_W - 16} y2={gy} stroke="#000" strokeWidth={0.5} opacity={0.04} />
            )
          })}

          {/* Fill under curve */}
          {fillPath ? <Path d={fillPath} fill="url(#curveGrad)" /> : null}

          {/* Curve line */}
          {curvePath ? (
            <Path d={curvePath} stroke="#000" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}

          {/* Single-moment guide line */}
          {points.length === 1 && (
            <Line
              x1={16} y1={points[0].y}
              x2={CHART_W - 16} y2={points[0].y}
              stroke="#000" strokeWidth={1}
              strokeDasharray="4,6" opacity={0.06}
            />
          )}

          {/* Now indicator (only for today) */}
          {showNow && (
            <>
              <Line
                x1={nowX} y1={CURVE_TOP - 4}
                x2={nowX} y2={CURVE_BOT + 4}
                stroke="#000" strokeWidth={1}
                strokeDasharray="2,4" opacity={0.1}
              />
              <SvgText x={nowX} y={CURVE_TOP - 10} fontSize={9} fill="#ccc" textAnchor="middle" fontWeight="600">
                now
              </SvgText>
            </>
          )}

          {/* Mood orbs (visual) */}
          {points.flatMap((pt, i) => {
            const isLatest = i === points.length - 1
            const color = MOOD_COLORS[pt.mood] || '#666'
            const elements = []
            if (isLatest) {
              elements.push(
                <Circle key={`glow-${i}`} cx={pt.x} cy={pt.y} r={16} fill={color} opacity={0.1} />
              )
            }
            elements.push(
              <Circle
                key={`orb-${i}`}
                cx={pt.x} cy={pt.y}
                r={isLatest ? 8 : 5}
                fill={color}
                stroke="#fafafa"
                strokeWidth={isLatest ? 3 : 2}
              />
            )
            return elements
          })}

          {/* Time labels */}
          {timeLabels.map(l => (
            <SvgText
              key={l.hour}
              x={(l.hour / 24) * CHART_W}
              y={TIME_Y}
              fontSize={10}
              fill="#d4d4d4"
              textAnchor="middle"
            >
              {l.text}
            </SvgText>
          ))}

        </Svg>

        {/* Touch targets (native Views overlaid on SVG) */}
        {points.map((pt, i) => (
          <TouchableOpacity
            key={`hit-${i}`}
            activeOpacity={0.7}
            onPress={() => onMomentPress?.(pt.moment)}
            style={{
              position: 'absolute',
              left: pt.x - 18,
              top: pt.y - 18,
              width: 36,
              height: 36,
              borderRadius: 18,
            }}
          />
        ))}
      </View>

      {/* Latest mood pill */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18, paddingTop: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: latestColor }} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#000', textTransform: 'capitalize' }}>
            {latest.mood}
          </Text>
          <Text style={{ fontSize: 13, color: '#bbb' }}>
            · {formatTime(latest.time.toISOString())}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Moment Detail Sheet ─────────────────────────────

function MomentDetail({ moment, onClose }: { moment: Moment; onClose: () => void }) {
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
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: insets.bottom + 16,
          maxHeight: '80%',
        }}
      >
        {/* Handle bar */}
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5' }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Media */}
          {hasImage && (
            <Image
              source={{ uri: moment.media_url! }}
              style={{ width: '100%', height: 280 }}
              resizeMode="cover"
            />
          )}

          {/* Voice indicator */}
          {isVoice && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center',
              }}>
                <Mic size={28} color="#fff" strokeWidth={2} />
              </View>
              {moment.duration_seconds ? (
                <Text style={{ fontSize: 15, color: '#999', marginTop: 12 }}>
                  {Math.floor(moment.duration_seconds / 60)}:{String(Math.round(moment.duration_seconds % 60)).padStart(2, '0')}
                </Text>
              ) : null}
            </View>
          )}

          {/* Content */}
          <View style={{ padding: 20 }}>
            {/* Moods */}
            {moment.moods?.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {moment.moods.map(mood => (
                  <View key={mood} style={{
                    backgroundColor: (MOOD_COLORS[mood] || '#666') + '14',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: MOOD_COLORS[mood] || '#666', textTransform: 'capitalize' }}>
                      {mood}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Text content */}
            {moment.text_content ? (
              <Text style={{ fontSize: 17, color: '#000', lineHeight: 26, marginBottom: 12 }}>
                {moment.text_content}
              </Text>
            ) : null}

            {/* Caption */}
            {moment.caption ? (
              <Text style={{ fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 12 }}>
                {moment.caption}
              </Text>
            ) : null}

            {/* Multi-media gallery */}
            {moment.media_items && moment.media_items.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {moment.media_items.map((item, i) => (
                    <Image
                      key={item.id || i}
                      source={{ uri: item.media_url }}
                      style={{ width: 120, height: 120, borderRadius: 16 }}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Time */}
            <Text style={{ fontSize: 13, color: '#bbb' }}>
              {new Date(moment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {moment.type !== 'write' ? ` · ${moment.type}` : ''}
            </Text>
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  )
}

// ─── Main Screen ─────────────────────────────────────

export default function Home() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, member } = useAuth()
  const [moments, setMoments] = useState<Moment[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(getToday)
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current
  const fabRotateAnim = useRef(new Animated.Value(0)).current

  const isToday = isSameDay(selectedDate, getToday())

  const toggleCapture = () => {
    const opening = !captureOpen
    setCaptureOpen(opening)
    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue: opening ? 1 : 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(fabRotateAnim, {
        toValue: opening ? 1 : 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleCaptureType = (type: string) => {
    setCaptureOpen(false)
    expandAnim.setValue(0)
    fabRotateAnim.setValue(0)
    router.push({ pathname: '/(main)/capture', params: { type } })
  }

  const firstName = member?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || ''

  const fetchMoments = useCallback(async () => {
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(selectedDate)
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
    const data = await getMemberMoments(20, 0, start, end)
    setMoments(data)
  }, [selectedDate])

  useEffect(() => {
    fetchMoments()
  }, [fetchMoments])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchMoments()
    setRefreshing(false)
  }

  const todayMomentCount = moments.length

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120, paddingHorizontal: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <BloomLogo size={36} />
          <TouchableOpacity
            onPress={() => router.push('/(main)/settings')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 16 }}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 }}>
            {getGreetingText()},{'\n'}
            <Text style={{ color: '#999' }}>{firstName}.</Text>
          </Text>
        </View>

        {/* Date strip + Timeline */}
        <View style={{ marginBottom: 32 }}>
          <DayNav selected={selectedDate} onSelect={setSelectedDate} />

          {todayMomentCount === 0 ? (
            isToday ? (
              <TouchableOpacity
                onPress={() => router.push('/(main)/capture')}
                style={{
                  backgroundColor: '#f8f8f8',
                  borderRadius: 24,
                  padding: 32,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 48, marginBottom: 16 }}>✦</Text>
                <Text style={{ fontSize: 20, fontWeight: '600', color: '#000', textAlign: 'center', marginBottom: 8 }}>
                  Capture your first moment
                </Text>
                <Text style={{ fontSize: 15, color: '#999', textAlign: 'center' }}>
                  How are you feeling right now?
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  backgroundColor: '#f8f8f8',
                  borderRadius: 24,
                  padding: 32,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>✦</Text>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#ccc', textAlign: 'center' }}>
                  No moments captured
                </Text>
              </View>
            )
          ) : (
            <EmotionalTimeline moments={moments} showNow={isToday} onMomentPress={setViewingMoment} />
          )}
        </View>

        {/* Quick actions */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/evolution')}
            style={{
              backgroundColor: '#000',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>
              My Evolution
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#fff' }}>
              See your emotional arc →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/practitioner')}
            style={{
              backgroundColor: '#f8f8f8',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#bbb', textTransform: 'uppercase', marginBottom: 8 }}>
              My Practitioner
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#000' }}>
              Connect with your guide →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Moment detail sheet */}
      {viewingMoment && (
        <MomentDetail moment={viewingMoment} onClose={() => setViewingMoment(null)} />
      )}

      {/* Capture overlay */}
      {captureOpen && (
        <Pressable
          onPress={toggleCapture}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.92)',
          }}
        >
          {/* Floating cards */}
          <View style={{ position: 'absolute', bottom: insets.bottom + 180, left: 0, right: 0, alignItems: 'center' }}>
            {CAPTURE_TYPES.map((type) => {
              const scale = expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              })
              const translateX = expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, type.offsetX],
              })
              const translateY = expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [60, type.offsetY],
              })
              const opacity = expandAnim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 0.5, 1],
              })

              return (
                <Animated.View
                  key={type.key}
                  style={{
                    position: 'absolute',
                    transform: [{ translateX }, { translateY }, { scale }, { rotate: type.rotate }],
                    opacity,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleCaptureType(type.key)}
                    activeOpacity={0.85}
                    style={{
                      width: CARD_SIZE,
                      height: CARD_SIZE,
                      backgroundColor: type.color,
                      borderRadius: 20,
                      padding: 16,
                      justifyContent: 'space-between',
                      shadowColor: type.color,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.3,
                      shadowRadius: 16,
                      elevation: 10,
                    }}
                  >
                    <type.Icon size={28} color="#fff" strokeWidth={2} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{type.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )
            })}
          </View>
        </Pressable>
      )}

      {/* FAB — Capture */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 24, left: 0, right: 0, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={toggleCapture}
          activeOpacity={0.85}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#000',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Animated.Text
            style={{
              color: '#fff',
              fontSize: 28,
              fontWeight: '300',
              transform: [{
                rotate: fabRotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              }],
            }}
          >
            +
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
