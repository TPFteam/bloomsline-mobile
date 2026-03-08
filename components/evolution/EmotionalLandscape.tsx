import { View, Text, Dimensions } from 'react-native'
import { MOOD_SCORES, MOOD_COLORS, colors } from '@/lib/theme'
import { Moment } from '@/lib/services/moments'
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'

const { width } = Dimensions.get('window')

interface EmotionalLandscapeProps {
    moments: Moment[]
    days: number
}

export function EmotionalLandscape({ moments, days }: EmotionalLandscapeProps) {
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

    const dominantColor = MOOD_COLORS[dayScores[dayScores.length - 1]?.mood] || colors.bloom

    return (
        <View style={{ backgroundColor: colors.surface3, borderRadius: 24, overflow: 'hidden', paddingTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: colors.textTertiary, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 4 }}>
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
                        stroke={colors.surface3}
                        strokeWidth={2}
                    />
                ))}
            </Svg>
        </View>
    )
}
