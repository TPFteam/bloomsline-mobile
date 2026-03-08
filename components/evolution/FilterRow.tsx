import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { Camera, Video, Mic, PenLine } from 'lucide-react-native'
import { MOOD_COLORS, colors } from '@/lib/theme'

const TYPE_FILTERS: { key: string; label: string; Icon?: any }[] = [
    { key: 'all', label: 'All' },
    { key: 'photo', label: 'Photo', Icon: Camera },
    { key: 'video', label: 'Video', Icon: Video },
    { key: 'voice', label: 'Voice', Icon: Mic },
    { key: 'write', label: 'Write', Icon: PenLine },
]

interface FilterRowProps {
    activeType: string
    onTypeChange: (t: string) => void
    activeMood: string | null
    onMoodChange: (m: string | null) => void
    availableMoods: string[]
}

export function FilterRow({ activeType, onTypeChange, activeMood, onMoodChange, availableMoods }: FilterRowProps) {
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
                            backgroundColor: active ? colors.primary : colors.surface1,
                        }}
                    >
                        {f.Icon && <f.Icon size={14} color={active ? '#fff' : colors.textSecondary} strokeWidth={2} />}
                        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>{f.label}</Text>
                    </TouchableOpacity>
                )
            })}

            {/* Mood dots */}
            {availableMoods.length > 0 && (
                <View style={{ width: 1, height: 24, backgroundColor: colors.disabled, marginHorizontal: 4, alignSelf: 'center' }} />
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
