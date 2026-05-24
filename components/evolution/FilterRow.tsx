import { useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native'
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
    const [anchor, setAnchor] = useState<{ x: number; y: number; h: number } | null>(null)
    const triggerRef = useRef<View>(null)

    const getLabel = (key: string) => {
        if (key === 'all') return t.evolution.filterAll
        return t.home[LABEL_KEYS[key] as keyof typeof t.home] || key
    }

    const active = TYPE_FILTERS.find(f => f.key === activeType) || TYPE_FILTERS[0]
    const ActiveIcon = active.Icon

    const openMenu = () => {
        triggerRef.current?.measureInWindow((x, y, _w, h) => {
            setAnchor({ x, y, h })
            setOpen(true)
        })
    }

    return (
        <View ref={triggerRef} style={{ alignSelf: 'flex-start' }}>
            <TouchableOpacity
                onPress={openMenu}
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

            {/* Dropdown lives in a Modal so it overlays cards below
                (the absolute-positioned approach got clipped because
                each card creates its own stacking context). Anchored
                to the trigger via measureInWindow. */}
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable
                    onPress={() => setOpen(false)}
                    style={{ flex: 1, backgroundColor: 'transparent' }}
                >
                    {anchor && (
                        <View
                            onStartShouldSetResponder={() => true}
                            style={{
                                position: 'absolute',
                                top: anchor.y + anchor.h + 6,
                                left: anchor.x,
                                minWidth: 170,
                                backgroundColor: '#fff', borderRadius: 14,
                                borderWidth: 1, borderColor: '#EBEBEB',
                                shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.12, shadowRadius: 14, elevation: 10,
                                paddingVertical: 4,
                            }}
                        >
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
                </Pressable>
            </Modal>
        </View>
    )
}
