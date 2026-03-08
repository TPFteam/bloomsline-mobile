import { View, Text } from 'react-native'
import { colors } from '@/lib/theme'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'

interface BloomScoreRingProps {
    score: number
    trend: number
    label: string
}

export function BloomScoreRing({ score, trend, label }: BloomScoreRingProps) {
    const size = 160
    const stroke = 10
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const progress = (score / 100) * circumference
    const cx = size / 2
    const cy = size / 2

    // Color based on score
    const color = score >= 70 ? colors.bloom : score >= 40 ? '#F59E0B' : '#94A3B8'

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
                    fill={colors.primary} textAnchor="middle"
                    alignmentBaseline="central"
                >
                    {score}
                </SvgText>
                <SvgText
                    x={cx} y={cy + 24}
                    fontSize={12} fontWeight="500"
                    fill={colors.textTertiary} textAnchor="middle"
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
