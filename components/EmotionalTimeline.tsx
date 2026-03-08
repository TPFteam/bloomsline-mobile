import { View, Text, TouchableOpacity, Dimensions } from 'react-native'
import { MOOD_SCORES, MOOD_COLORS, colors } from '@/lib/theme'
import { Moment } from '@/lib/services/moments'
import { formatTime } from '@/components/DayNav'
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg'

const { width } = Dimensions.get('window')

const CHART_W = width - 56
const TL_H = 180
const CURVE_TOP = 28
const CURVE_BOT = 140
const TIME_Y = 168

interface EmotionalTimelineProps {
    moments: Moment[]
    showNow: boolean
    onMomentPress?: (m: Moment) => void
}

export function EmotionalTimeline({ moments, showNow, onMomentPress }: EmotionalTimelineProps) {
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
        <View style={{ backgroundColor: colors.surface3, borderRadius: 24, overflow: 'hidden' }}>
            {/* Card header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: colors.textTertiary, textTransform: 'uppercase' }}>
                    Emotional flow
                </Text>
                <View style={{ backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
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
                            <SvgText x={nowX} y={CURVE_TOP - 10} fontSize={9} fill={colors.textFaint} textAnchor="middle" fontWeight="600">
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
                                stroke={colors.surface3}
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
                            fill={colors.textMuted}
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
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary, textTransform: 'capitalize' }}>
                        {latest.mood}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                        · {formatTime(latest.time.toISOString())}
                    </Text>
                </View>
            </View>
        </View>
    )
}
