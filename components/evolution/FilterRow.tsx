import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Camera, Video, Mic, PenLine, ChevronDown } from 'lucide-react-native'
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
    const [open, setOpen] = useState(false)

    const getLabel = (key: string) => {
        if (key === 'all') return t.evolution.filterAll
        return t.home[LABEL_KEYS[key] as keyof typeof t.home] || key
    }

    const active = TYPE_FILTERS.find(f => f.key === activeType) || TYPE_FILTERS[0]
    const ActiveIcon = active.Icon

    return (
        <View style={{ position: 'relative', alignSelf: 'flex-start', zIndex: 10 }}>
            {/* Trigger: shows the current selection. Tap to open the
                dropdown; tap again to close. */}
            <TouchableOpacity
                onPress={() => setOpen(o => !o)}
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingLeft: 14, paddingRight: 10, paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                }}
            >
                {ActiveIcon && <ActiveIcon size={14} color="#fff" strokeWidth={2} />}
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{getLabel(active.key)}</Text>
                <ChevronDown
                    size={14}
                    color="#fff"
                    strokeWidth={2}
                    style={{
                        marginLeft: 2,
                        transform: [{ rotate: open ? '180deg' : '0deg' }],
                    }}
                />
            </TouchableOpacity>

            {/* Dropdown menu — absolute-positioned below the trigger.
                Lists the other filters; selecting one swaps it into
                the trigger and closes. */}
            {open && (
                <View style={{
                    position: 'absolute', top: 40, left: 0, zIndex: 20,
                    backgroundColor: '#fff', borderRadius: 14,
                    borderWidth: 1, borderColor: '#EBEBEB',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
                    minWidth: 160, paddingVertical: 4,
                }}>
                    {TYPE_FILTERS.filter(f => f.key !== activeType).map(f => (
                        <TouchableOpacity
                            key={f.key}
                            onPress={() => { onTypeChange(f.key); setOpen(false) }}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 10,
                                paddingHorizontal: 14, paddingVertical: 10,
                            }}
                        >
                            {f.Icon
                                ? <f.Icon size={15} color={colors.textSecondary} strokeWidth={2} />
                                : <View style={{ width: 15 }} />}
                            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>{getLabel(f.key)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    )
}
