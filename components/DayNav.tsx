import { View, Text, TouchableOpacity } from 'react-native'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

// ─── Helpers ─────────────────────────────────────────

export function getToday(): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function getDateLabel(date: Date, labels: { today: string; yesterday: string }, locale?: string): string {
    const today = getToday()
    if (isSameDay(date, today)) return labels.today
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (isSameDay(date, yesterday)) return labels.yesterday
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function getGreetingKey(): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
    const hour = new Date().getHours()
    if (hour < 12) return 'greetingMorning'
    if (hour < 18) return 'greetingAfternoon'
    return 'greetingEvening'
}

export function formatTime(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── DayNav Component ────────────────────────────────

interface DayNavProps {
    selected: Date
    onSelect: (d: Date) => void
}

export function DayNav({ selected, onSelect }: DayNavProps) {
    const { t, locale } = useI18n()
    const today = getToday()
    const isViewingToday = isSameDay(selected, today)

    const goBack = () => {
        const prev = new Date(selected)
        prev.setDate(prev.getDate() - 1)
        onSelect(prev)
    }

    const goForward = () => {
        if (isViewingToday) return
        const next = new Date(selected)
        next.setDate(next.getDate() + 1)
        onSelect(next)
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={goBack} activeOpacity={0.5} hitSlop={12}>
                <Text style={{ fontSize: 16, color: colors.textMuted }}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={!isViewingToday ? () => onSelect(today) : undefined} activeOpacity={isViewingToday ? 1 : 0.6}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textTertiary }}>
                    {getDateLabel(selected, t.dayNav, locale)}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={goForward} activeOpacity={isViewingToday ? 1 : 0.5} hitSlop={12}>
                <Text style={{ fontSize: 16, color: isViewingToday ? colors.divider : colors.textMuted }}>›</Text>
            </TouchableOpacity>
        </View>
    )
}
