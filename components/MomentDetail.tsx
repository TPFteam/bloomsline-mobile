import { View, Text, TouchableOpacity, ScrollView, Image, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Video, ResizeMode } from 'expo-av'
import { Mic } from 'lucide-react-native'
import { MOOD_COLORS, colors } from '@/lib/theme'
import { Moment } from '@/lib/services/moments'
import { useI18n } from '@/lib/i18n'

interface MomentDetailProps {
    moment: Moment
    onClose: () => void
}

export function MomentDetail({ moment, onClose }: MomentDetailProps) {
    const { t, locale } = useI18n()
    const insets = useSafeAreaInsets()
    const hasMedia = moment.media_url && (moment.type === 'photo' || moment.type === 'video' || moment.type === 'mixed')
    const isMainVideo = hasMedia && (moment.mime_type?.startsWith('video/') || moment.type === 'video')
    const isVoice = moment.type === 'voice'

    return (
        <Pressable
            onPress={onClose}
            style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                justifyContent: 'flex-end',
            }}
        >
            <Pressable
                onPress={() => { }}
                style={{
                    backgroundColor: colors.bg,
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingBottom: insets.bottom + 16,
                    maxHeight: '80%',
                }}
            >
                {/* Handle bar */}
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.disabled }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Media */}
                    {hasMedia && (
                        isMainVideo ? (
                            <Video
                                source={{ uri: moment.media_url! }}
                                style={{ width: '100%', height: 280 }}
                                resizeMode={ResizeMode.COVER}
                                useNativeControls
                                shouldPlay={false}
                            />
                        ) : (
                            <Image
                                source={{ uri: moment.media_url! }}
                                style={{ width: '100%', height: 280 }}
                                resizeMode="cover"
                            />
                        )
                    )}

                    {/* Voice indicator */}
                    {isVoice && (
                        <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' }}>
                            <View style={{
                                width: 64, height: 64, borderRadius: 32,
                                backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center',
                            }}>
                                <Mic size={28} color="#fff" strokeWidth={2} />
                            </View>
                            {moment.duration_seconds ? (
                                <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12 }}>
                                    {Math.floor(moment.duration_seconds / 60)}:{String(Math.round(moment.duration_seconds % 60)).padStart(2, '0')}
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {/* Content */}
                    <View style={{ padding: 20 }}>
                        {/* Moods */}
                        {moment.moods?.length > 0 && (
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                                {moment.moods.map(mood => (
                                    <View key={mood} style={{
                                        backgroundColor: (MOOD_COLORS[mood] || '#666') + '14',
                                        borderRadius: 12,
                                        paddingHorizontal: 14,
                                        paddingVertical: 6,
                                    }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: MOOD_COLORS[mood] || '#666', textTransform: 'capitalize' }}>
                                            {t.moods[mood as keyof typeof t.moods] || mood}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Text content */}
                        {moment.text_content ? (
                            <Text style={{ fontSize: 17, color: colors.primary, lineHeight: 26, marginBottom: 12 }}>
                                {moment.text_content}
                            </Text>
                        ) : null}

                        {/* Caption */}
                        {moment.caption ? (
                            <Text style={{ fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 12 }}>
                                {moment.caption}
                            </Text>
                        ) : null}

                        {/* Multi-media gallery */}
                        {moment.media_items && moment.media_items.length > 1 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {moment.media_items.map((item, i) => (
                                        item.mime_type?.startsWith('video/') ? (
                                            <Video
                                                key={item.id || i}
                                                source={{ uri: item.media_url }}
                                                style={{ width: 120, height: 120, borderRadius: 16 }}
                                                resizeMode={ResizeMode.COVER}
                                                useNativeControls
                                                shouldPlay={false}
                                            />
                                        ) : (
                                            <Image
                                                key={item.id || i}
                                                source={{ uri: item.media_url }}
                                                style={{ width: 120, height: 120, borderRadius: 16 }}
                                                resizeMode="cover"
                                            />
                                        )
                                    ))}
                                </View>
                            </ScrollView>
                        )}

                        {/* Time */}
                        <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                            {new Date(moment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' · '}
                            {new Date(moment.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' })}
                            {moment.type !== 'write' ? ` · ${moment.type}` : ''}
                        </Text>
                    </View>
                </ScrollView>
            </Pressable>
        </Pressable>
    )
}
