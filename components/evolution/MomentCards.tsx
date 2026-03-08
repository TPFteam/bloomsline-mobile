import { useMemo } from 'react'
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native'
import { Mic } from 'lucide-react-native'
import { MOOD_COLORS, colors } from '@/lib/theme'
import { Moment } from '@/lib/services/moments'

const { width } = Dimensions.get('window')

// ─── Helpers ────────────────────────────────────────

export function groupMomentsByWeek(moments: Moment[]): { label: string; moments: Moment[] }[] {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const groups: Map<string, { label: string; start: Date; moments: Moment[] }> = new Map()
    const sorted = [...moments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    sorted.forEach(m => {
        const d = new Date(m.created_at)
        const mDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const diffDays = Math.floor((today.getTime() - mDate.getTime()) / (24 * 60 * 60 * 1000))

        let key: string, label: string
        if (diffDays < 7) {
            key = 'this-week'
            label = 'This Week'
        } else if (diffDays < 14) {
            key = 'last-week'
            label = 'Last Week'
        } else {
            const ws = new Date(mDate)
            ws.setDate(ws.getDate() - ws.getDay())
            key = ws.toISOString().split('T')[0]
            const we = new Date(ws)
            we.setDate(we.getDate() + 6)
            label = `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        }

        if (!groups.has(key)) {
            groups.set(key, { label, start: mDate, moments: [] })
        }
        groups.get(key)!.moments.push(m)
    })

    return Array.from(groups.values())
}

// ─── MomentRiverCard ────────────────────────────────

function MomentRiverCard({ moment, cardWidth, onPress }: { moment: Moment; cardWidth: number; onPress: () => void }) {
    const mood = moment.moods?.[0]
    const moodColor = MOOD_COLORS[mood] || '#94A3B8'
    const time = new Date(moment.created_at)
    const timeStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const hasImage = moment.media_url && (moment.type === 'photo' || moment.type === 'video' || moment.type === 'mixed')
    const isVoice = moment.type === 'voice'
    const isWrite = moment.type === 'write'

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ width: cardWidth }}>
            <View style={{
                backgroundColor: colors.bg,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#f0f0f0',
                overflow: 'hidden',
            }}>
                {/* Photo/Video */}
                {hasImage && (
                    <View>
                        <Image
                            source={{ uri: moment.thumbnail_url || moment.media_url! }}
                            style={{ width: '100%', height: 140 }}
                            resizeMode="cover"
                        />
                        {moment.type === 'video' && (
                            <View style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 32, height: 32, borderRadius: 16,
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    justifyContent: 'center', alignItems: 'center',
                                }}>
                                    <View style={{
                                        width: 0, height: 0,
                                        borderLeftWidth: 10, borderTopWidth: 6, borderBottomWidth: 6,
                                        borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent',
                                        marginLeft: 2,
                                    }} />
                                </View>
                            </View>
                        )}
                        {moment.media_items && moment.media_items.length > 1 && (
                            <View style={{
                                position: 'absolute', top: 8, right: 8,
                                backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
                                paddingHorizontal: 6, paddingVertical: 2,
                            }}>
                                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>{moment.media_items.length}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Voice */}
                {isVoice && (
                    <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: '#F59E0B' + '1A',
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Mic size={18} color="#F59E0B" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 }}>
                            {Array.from({ length: 16 }, (_, i) => (
                                <View key={i} style={{
                                    width: 2.5, borderRadius: 1.25,
                                    height: 8 + Math.sin(i * 0.8 + (moment.id?.charCodeAt(0) || 0)) * 14,
                                    backgroundColor: '#F59E0B',
                                    opacity: 0.6,
                                }} />
                            ))}
                        </View>
                        {moment.duration_seconds ? (
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                {Math.floor(moment.duration_seconds / 60)}:{String(Math.round(moment.duration_seconds % 60)).padStart(2, '0')}
                            </Text>
                        ) : null}
                    </View>
                )}

                {/* Text/Write */}
                {isWrite && (
                    <View style={{ padding: 16, backgroundColor: colors.surface3 }}>
                        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.primary, lineHeight: 22 }} numberOfLines={4}>
                            {moment.text_content || moment.caption || ''}
                        </Text>
                    </View>
                )}

                {/* Footer: mood + date */}
                <View style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {mood ? (
                        <View style={{
                            backgroundColor: moodColor + '14',
                            borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: moodColor, textTransform: 'capitalize' }}>{mood}</Text>
                        </View>
                    ) : <View />}
                    <Text style={{ fontSize: 11, color: colors.textFaint }}>{timeStr}</Text>
                </View>

                {/* Caption below image if exists */}
                {hasImage && (moment.caption || moment.text_content) && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                        <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }} numberOfLines={2}>
                            {moment.caption || moment.text_content}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    )
}

// ─── GridCard ───────────────────────────────────────

function GridCard({ moment, onPress }: { moment: Moment; onPress: () => void }) {
    const mood = moment.moods?.[0]
    const moodColor = MOOD_COLORS[mood] || '#94A3B8'
    const timeStr = new Date(moment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const hasImage = moment.media_url && (moment.type === 'photo' || moment.type === 'video' || moment.type === 'mixed')
    const isVoice = moment.type === 'voice'
    const isWrite = moment.type === 'write'

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <View style={{
                backgroundColor: isWrite ? colors.surface1 : colors.bg,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#f0f0f0',
                overflow: 'hidden',
            }}>
                {hasImage && (
                    <View>
                        <Image
                            source={{ uri: moment.thumbnail_url || moment.media_url! }}
                            style={{ width: '100%', height: 160 }}
                            resizeMode="cover"
                        />
                        {moment.type === 'video' && (
                            <View style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 36, height: 36, borderRadius: 18,
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    justifyContent: 'center', alignItems: 'center',
                                }}>
                                    <View style={{
                                        width: 0, height: 0,
                                        borderLeftWidth: 12, borderTopWidth: 7, borderBottomWidth: 7,
                                        borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent',
                                        marginLeft: 3,
                                    }} />
                                </View>
                            </View>
                        )}
                        {moment.media_items && moment.media_items.length > 1 && (
                            <View style={{
                                position: 'absolute', top: 8, right: 8,
                                backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
                                paddingHorizontal: 7, paddingVertical: 2,
                            }}>
                                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>{moment.media_items.length}</Text>
                            </View>
                        )}
                    </View>
                )}
                {isVoice && (
                    <View style={{ padding: 16, alignItems: 'center', gap: 8 }}>
                        <View style={{
                            width: 44, height: 44, borderRadius: 22,
                            backgroundColor: '#F59E0B' + '1A',
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Mic size={20} color="#F59E0B" strokeWidth={2} />
                        </View>
                        {moment.duration_seconds ? (
                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                {Math.floor(moment.duration_seconds / 60)}:{String(Math.round(moment.duration_seconds % 60)).padStart(2, '0')}
                            </Text>
                        ) : null}
                    </View>
                )}
                {isWrite && (
                    <View style={{ padding: 14 }}>
                        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.primary, lineHeight: 22 }} numberOfLines={5}>
                            {moment.text_content || moment.caption || ''}
                        </Text>
                    </View>
                )}
                {hasImage && (moment.text_content || moment.caption) && (
                    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
                        <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }} numberOfLines={2}>
                            {moment.text_content || moment.caption}
                        </Text>
                    </View>
                )}
                <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {mood ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: moodColor }} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: moodColor, textTransform: 'capitalize' }}>{mood}</Text>
                        </View>
                    ) : <View />}
                    <Text style={{ fontSize: 11, color: colors.textFaint }}>{timeStr}</Text>
                </View>
            </View>
        </TouchableOpacity>
    )
}

// ─── EmotionalRiver ─────────────────────────────────

interface MomentViewProps {
    moments: Moment[]
    onMomentPress: (m: Moment) => void
}

export function EmotionalRiver({ moments, onMomentPress }: MomentViewProps) {
    const cardWidth = (width - 48) / 2 - 14
    const groups = useMemo(() => groupMomentsByWeek(moments), [moments])

    if (moments.length === 0) {
        return (
            <View style={{ backgroundColor: colors.surface2, borderRadius: 24, padding: 40, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 40, opacity: 0.25, marginBottom: 16 }}>✦</Text>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textFaint, textAlign: 'center' }}>No moments captured</Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
                    Your moments will flow here as you capture them
                </Text>
            </View>
        )
    }

    return (
        <View>
            {groups.map((group, gi) => (
                <View key={gi}>
                    <View style={{ alignItems: 'center', marginBottom: 20, marginTop: gi > 0 ? 12 : 0 }}>
                        <View style={{
                            backgroundColor: colors.bg, borderWidth: 1, borderColor: '#f0f0f0',
                            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6,
                        }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase' }}>
                                {group.label} · {group.moments.length}
                            </Text>
                        </View>
                    </View>

                    <View style={{ position: 'relative' }}>
                        <View style={{
                            position: 'absolute',
                            left: (width - 48) / 2,
                            top: 0, bottom: 0,
                            width: 2,
                            backgroundColor: '#f0f0f0',
                            borderRadius: 1,
                        }} />

                        {group.moments.map((moment, mi) => {
                            const isLeft = mi % 2 === 0
                            const mood = moment.moods?.[0]
                            const moodColor = MOOD_COLORS[mood] || '#ddd'

                            return (
                                <View key={moment.id} style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    marginBottom: 20,
                                    justifyContent: isLeft ? 'flex-start' : 'flex-end',
                                }}>
                                    {isLeft ? (
                                        <>
                                            <MomentRiverCard moment={moment} cardWidth={cardWidth} onPress={() => onMomentPress(moment)} />
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
                                                <View style={{ width: 12, height: 1, backgroundColor: colors.disabled }} />
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: moodColor }} />
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: moodColor }} />
                                                <View style={{ width: 12, height: 1, backgroundColor: colors.disabled }} />
                                            </View>
                                            <MomentRiverCard moment={moment} cardWidth={cardWidth} onPress={() => onMomentPress(moment)} />
                                        </>
                                    )}
                                </View>
                            )
                        })}
                    </View>
                </View>
            ))}
        </View>
    )
}

// ─── MomentsGrid ────────────────────────────────────

export function MomentsGrid({ moments, onMomentPress }: MomentViewProps) {
    const groups = useMemo(() => groupMomentsByWeek(moments), [moments])

    if (moments.length === 0) {
        return (
            <View style={{ backgroundColor: colors.surface2, borderRadius: 24, padding: 40, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 40, opacity: 0.25, marginBottom: 16 }}>✦</Text>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textFaint, textAlign: 'center' }}>No moments captured</Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
                    Your moments will flow here as you capture them
                </Text>
            </View>
        )
    }

    return (
        <View>
            {groups.map((group, gi) => (
                <View key={gi}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: gi > 0 ? 20 : 0 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{group.label}</Text>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.bloom }} />
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                            {group.moments.length} {group.moments.length === 1 ? 'moment' : 'moments'}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1, gap: 10 }}>
                            {group.moments.filter((_, i) => i % 2 === 0).map(moment => (
                                <GridCard key={moment.id} moment={moment} onPress={() => onMomentPress(moment)} />
                            ))}
                        </View>
                        <View style={{ flex: 1, gap: 10 }}>
                            {group.moments.filter((_, i) => i % 2 === 1).map(moment => (
                                <GridCard key={moment.id} moment={moment} onPress={() => onMomentPress(moment)} />
                            ))}
                        </View>
                    </View>
                </View>
            ))}
        </View>
    )
}
