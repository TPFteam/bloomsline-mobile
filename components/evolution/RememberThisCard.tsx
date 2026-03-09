import { useMemo } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { MOOD_COLORS, colors } from '@/lib/theme'
import { Moment } from '@/lib/services/moments'
import { useI18n } from '@/lib/i18n'

interface RememberThisCardProps {
    moments: Moment[]
    onPress: (m: Moment) => void
}

export function RememberThisCard({ moments, onPress }: RememberThisCardProps) {
    const { t } = useI18n()
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
    const timeLabel = daysAgo === 7 ? t.remember.oneWeekAgo : daysAgo === 1 ? t.remember.yesterday : t.remember.daysAgo.replace('{days}', String(daysAgo))

    return (
        <TouchableOpacity onPress={() => onPress(memory)} activeOpacity={0.8} style={{ marginBottom: 24 }}>
            <View style={{ backgroundColor: colors.surface3, borderRadius: 24, padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.bloom }} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.bloom }}>{t.remember.bloom}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary, lineHeight: 22 }}>
                    {timeLabel}, {t.remember.youFelt}{' '}
                    <Text style={{ color: MOOD_COLORS[mood] || '#666', textTransform: 'capitalize' as any }}>{t.moods[mood as keyof typeof t.moods] || mood}</Text>
                </Text>

                {/* Mini moment preview */}
                <View style={{ backgroundColor: colors.bg, borderRadius: 16, padding: 12, marginTop: 14 }}>
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
