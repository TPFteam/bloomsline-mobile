import { View, Text } from 'react-native'
import { MOOD_COLORS, colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'

interface MoodRingProps {
    moodCounts: [string, number][]
    totalMoments: number
}

export function MoodRing({ moodCounts, totalMoments }: MoodRingProps) {
    const { t } = useI18n()
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
                <Circle cx={cx} cy={cy} r={radius} stroke={colors.surface1} strokeWidth={stroke} fill="none" />
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
                <SvgText x={cx} y={cy - 4} fontSize={28} fontWeight="700" fill={colors.primary} textAnchor="middle" alignmentBaseline="central">
                    {totalMoments}
                </SvgText>
                <SvgText x={cx} y={cy + 18} fontSize={11} fill={colors.textTertiary} textAnchor="middle">
                    {t.evolution.moments}
                </SvgText>
            </Svg>

            {/* Legend */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 16, paddingHorizontal: 8 }}>
                {arcs.map(arc => (
                    <View key={arc.mood} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: arc.color }} />
                        <Text style={{ fontSize: 12, color: '#666', textTransform: 'capitalize' }}>{t.moods[arc.mood as keyof typeof t.moods] || arc.mood}</Text>
                        <Text style={{ fontSize: 11, color: colors.textFaint }}>{arc.count}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}
