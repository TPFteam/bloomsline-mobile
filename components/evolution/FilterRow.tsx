import { Text, TouchableOpacity, ScrollView } from 'react-native'
import { Camera, Video, Mic, PenLine } from 'lucide-react-native'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

const TYPE_FILTERS: { key: string; Icon?: any }[] = [
    { key: 'all' },
    { key: 'photo', Icon: Camera },
    { key: 'video', Icon: Video },
    { key: 'voice', Icon: Mic },
    { key: 'write', Icon: PenLine },
]

const LABEL_KEYS: Record<string, string> = {
    all: 'filterAll',
    photo: 'capturePhoto',
    video: 'captureVideo',
    voice: 'captureVoice',
    write: 'captureWrite',
}

interface FilterRowProps {
    activeType: string
    onTypeChange: (t: string) => void
    activeMood: string | null
    onMoodChange: (m: string | null) => void
    availableMoods: string[]
}

export function FilterRow({ activeType, onTypeChange }: FilterRowProps) {
    const { t } = useI18n()

    const getLabel = (key: string) => {
        if (key === 'all') return t.evolution.filterAll
        return t.home[LABEL_KEYS[key] as keyof typeof t.home] || key
    }

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
                        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>{getLabel(f.key)}</Text>
                    </TouchableOpacity>
                )
            })}
        </ScrollView>
    )
}
