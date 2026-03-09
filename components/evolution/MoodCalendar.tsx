import { View, Text, Dimensions } from 'react-native'
import { MOOD_COLORS, colors } from '@/lib/theme'
import { Moment } from '@/lib/services/moments'
import { useI18n } from '@/lib/i18n'

const { width } = Dimensions.get('window')

interface MoodCalendarProps {
    moments: Moment[]
    days: number
}

export function MoodCalendar({ moments, days }: MoodCalendarProps) {
    const { t } = useI18n()
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
    const dayLabels = t.evolution.dayLabels

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
                    <Text key={i} style={{ width: pixelSize, textAlign: 'center', fontSize: 10, color: colors.textMuted, fontWeight: '500' }}>
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
                            backgroundColor: day.mood ? (MOOD_COLORS[day.mood] || '#94A3B8') : colors.surface1,
                            opacity: day.mood ? 1 : 0.5,
                        }}
                    />
                ))}
            </View>

            {/* Streak */}
            {streak > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: '#f0fdf4', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 14 }}>🌿</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>
                        {streak} {t.evolution.dayStreak}
                    </Text>
                </View>
            )}
        </View>
    )
}
