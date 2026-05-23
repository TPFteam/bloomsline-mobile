import { useState, useRef, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, Pressable, Modal, Dimensions, TextInput } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { Mic, Play, Pause, Volume2, VolumeX, Maximize, Minimize, X, BookOpen, Send, CheckCircle2 } from 'lucide-react-native'
import { MOOD_COLORS, colors } from '@/lib/theme'
import { Moment } from '@/lib/services/moments'
import { useI18n } from '@/lib/i18n'
import { useSignedUrl } from '@/lib/hooks/useSignedUrl'

const { width: _sw, height: _sh } = Dimensions.get('window')
const SCREEN_WIDTH = Math.min(_sw, 430)
const SCREEN_HEIGHT = _sh

interface MomentDetailProps {
    moment: Moment
    onClose: () => void
    onOpenStory?: (storyId: string) => void
    onShareToggle?: (m: Moment) => void
    /** When true, scroll the sheet to the bottom of the conversation
     *  on initial load — used by the notification deeplink so the
     *  practitioner's latest reply is what the patient sees first. */
    highlightLatestComment?: boolean
}

function VideoPlayer({ uri, style, compact }: { uri: string; style?: any; compact?: boolean }) {
    const videoRef = useRef<Video>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [position, setPosition] = useState(0)
    const [duration, setDuration] = useState(0)
    const [showControls, setShowControls] = useState(true)
    const [fullscreen, setFullscreen] = useState(false)
    const hideTimer = useRef<NodeJS.Timeout | null>(null)

    const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return
        setIsPlaying(status.isPlaying)
        setPosition(status.positionMillis || 0)
        setDuration(status.durationMillis || 0)
        if (status.didJustFinish) {
            videoRef.current?.setPositionAsync(0)
            setIsPlaying(false)
        }
    }, [])

    const togglePlay = async () => {
        if (!videoRef.current) return
        if (isPlaying) {
            await videoRef.current.pauseAsync()
        } else {
            await videoRef.current.playAsync()
        }
        resetHideTimer()
    }

    const toggleMute = async () => {
        if (!videoRef.current) return
        await videoRef.current.setIsMutedAsync(!isMuted)
        setIsMuted(!isMuted)
        resetHideTimer()
    }

    const toggleFullscreen = () => {
        setFullscreen(!fullscreen)
    }

    const resetHideTimer = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current)
        setShowControls(true)
        hideTimer.current = setTimeout(() => {
            if (isPlaying) setShowControls(false)
        }, 3000)
    }

    const seekTo = async (ratio: number) => {
        if (!videoRef.current || !duration) return
        await videoRef.current.setPositionAsync(ratio * duration)
        resetHideTimer()
    }

    const formatTime = (ms: number) => {
        const s = Math.floor(ms / 1000)
        const m = Math.floor(s / 60)
        return `${m}:${String(s % 60).padStart(2, '0')}`
    }

    const progress = duration ? position / duration : 0

    const videoContent = (
        <View style={[{ backgroundColor: '#000', overflow: 'hidden' }, style, fullscreen && { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
            <Video
                ref={videoRef}
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                // Always CONTAIN so the whole video shows in both the
                // inline preview and fullscreen, regardless of whether
                // it's portrait or landscape. COVER cropped portrait
                // videos to fit the preview's square frame.
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isMuted={isMuted}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            />

            {/* Tap area to toggle controls */}
            <Pressable
                onPress={() => {
                    if (showControls && isPlaying) {
                        setShowControls(false)
                    } else {
                        resetHideTimer()
                    }
                }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            >
                {/* Controls overlay */}
                {showControls && (
                    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        {/* Center play button */}
                        {!isPlaying && !compact && (
                            <TouchableOpacity
                                onPress={togglePlay}
                                activeOpacity={0.8}
                                style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    marginTop: -28, marginLeft: -28,
                                    width: 56, height: 56, borderRadius: 28,
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                <Play size={24} color="#fff" fill="#fff" />
                            </TouchableOpacity>
                        )}

                        {/* Bottom bar */}
                        <View style={{
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            paddingHorizontal: compact ? 8 : 14,
                            paddingVertical: compact ? 6 : 10,
                            flexDirection: 'row', alignItems: 'center', gap: compact ? 8 : 12,
                        }}>
                            {/* Play/Pause */}
                            <TouchableOpacity onPress={togglePlay} hitSlop={8}>
                                {isPlaying
                                    ? <Pause size={compact ? 16 : 20} color="#fff" fill="#fff" />
                                    : <Play size={compact ? 16 : 20} color="#fff" fill="#fff" />
                                }
                            </TouchableOpacity>

                            {/* Progress bar */}
                            {!compact && (
                                <>
                                    <Text style={{ fontSize: 11, color: '#ccc', fontVariant: ['tabular-nums'] }}>
                                        {formatTime(position)}
                                    </Text>
                                    <Pressable
                                        onPress={(e) => {
                                            const barWidth = e.nativeEvent.locationX
                                            const totalWidth = (e.nativeEvent as any).target?.offsetWidth || 200
                                            seekTo(barWidth / totalWidth)
                                        }}
                                        style={{ flex: 1, height: 20, justifyContent: 'center' }}
                                    >
                                        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
                                            <View style={{ height: 3, backgroundColor: '#fff', borderRadius: 2, width: `${progress * 100}%` }} />
                                        </View>
                                    </Pressable>
                                    <Text style={{ fontSize: 11, color: '#ccc', fontVariant: ['tabular-nums'] }}>
                                        {formatTime(duration)}
                                    </Text>
                                </>
                            )}

                            {/* Mute */}
                            <TouchableOpacity onPress={toggleMute} hitSlop={8}>
                                {isMuted
                                    ? <VolumeX size={compact ? 16 : 20} color="#fff" />
                                    : <Volume2 size={compact ? 16 : 20} color="#fff" />
                                }
                            </TouchableOpacity>

                            {/* Fullscreen */}
                            {!compact && (
                                <TouchableOpacity onPress={toggleFullscreen} hitSlop={8}>
                                    {fullscreen
                                        ? <Minimize size={20} color="#fff" />
                                        : <Maximize size={20} color="#fff" />
                                    }
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </Pressable>
        </View>
    )

    if (fullscreen) {
        return (
            <Modal visible animationType="fade" supportedOrientations={['portrait', 'landscape']}>
                <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
                    {/* Close button */}
                    <TouchableOpacity
                        onPress={toggleFullscreen}
                        style={{
                            position: 'absolute', top: 50, right: 20, zIndex: 10,
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            justifyContent: 'center', alignItems: 'center',
                        }}
                    >
                        <X size={20} color="#fff" />
                    </TouchableOpacity>
                    {videoContent}
                </View>
            </Modal>
        )
    }

    return videoContent
}

function GalleryItem({ item, onPress }: {
    item: { id?: string; media_url: string; media_path?: string | null; mime_type?: string }
    onPress: (uri: string) => void
}) {
    const signed = useSignedUrl('moments_media', item.media_path ?? item.media_url)
    const uri = signed || ''
    if (!uri) return null
    if (item.mime_type?.startsWith('video/')) {
        return <VideoPlayer uri={uri} style={{ width: 140, height: 140, borderRadius: 16 }} compact />
    }
    return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(uri)}>
            <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: 16 }} resizeMode="cover" />
        </TouchableOpacity>
    )
}

interface MomentCommentRow {
    id: string
    moment_id: string
    author_id: string
    author_type: 'practitioner' | 'member'
    content: string
    created_at: string
}

export function MomentDetail({ moment, onClose, onOpenStory, onShareToggle, highlightLatestComment }: MomentDetailProps) {
    const { t, locale } = useI18n()
    const insets = useSafeAreaInsets()
    const hasMedia = (moment.media_path || moment.media_url) && (moment.type === 'photo' || moment.type === 'video' || moment.type === 'mixed')
    const isMainVideo = hasMedia && (moment.mime_type?.startsWith('video/') || moment.type === 'video')
    const isVoice = moment.type === 'voice'
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
    const mainSignedUrl = useSignedUrl('moments_media', moment.media_path ?? moment.media_url)

    const [comments, setComments] = useState<MomentCommentRow[]>([])
    const [newComment, setNewComment] = useState('')
    const [postingComment, setPostingComment] = useState(false)
    const conversationScrollRef = useRef<ScrollView>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data } = await supabase
                .from('moment_comments')
                .select('*')
                .eq('moment_id', moment.id)
                .order('created_at', { ascending: true })
            if (cancelled) return
            const rows = (data || []) as MomentCommentRow[]
            setComments(rows)
            if (highlightLatestComment && rows.length > 0) {
                // Wait one tick for the sheet's ScrollView to layout
                // the new content, then jump to the bottom.
                setTimeout(() => conversationScrollRef.current?.scrollToEnd({ animated: true }), 60)
            }
        })()
        return () => { cancelled = true }
    }, [moment.id, highlightLatestComment])

    const postComment = useCallback(async () => {
        const trimmed = newComment.trim()
        if (!trimmed) return
        setPostingComment(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data, error } = await supabase
                .from('moment_comments')
                .insert({ moment_id: moment.id, author_id: user.id, author_type: 'member', content: trimmed })
                .select()
                .single()
            if (error) return
            setComments(prev => [...prev, data as MomentCommentRow])
            setNewComment('')
            setTimeout(() => conversationScrollRef.current?.scrollToEnd({ animated: true }), 50)
            // Notify practitioner. We need the practitioner_id from the
            // member row.
            const { data: memberRow } = await supabase
                .from('members')
                .select('id, practitioner_id, first_name, last_name')
                .eq('user_id', user.id)
                .maybeSingle()
            if (memberRow?.practitioner_id) {
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'
                    fetch(`${API_URL}/api/notifications/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify({
                            userId: memberRow.practitioner_id,
                            userType: 'practitioner',
                            type: 'moment_comment',
                            entityType: 'member',
                            entityId: memberRow.id,
                            metadata: {
                                memberName: `${memberRow.first_name || ''} ${memberRow.last_name || ''}`.trim(),
                                memberId: memberRow.id,
                                momentId: moment.id,
                            },
                        }),
                    }).catch(() => {})
                }
            }
        } finally {
            setPostingComment(false)
        }
    }, [moment.id, newComment])

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

                <ScrollView ref={conversationScrollRef} showsVerticalScrollIndicator={false}>
                    {/* Media */}
                    {hasMedia && mainSignedUrl && (
                        isMainVideo ? (
                            <VideoPlayer uri={mainSignedUrl} style={{ width: '100%', height: 300, borderRadius: 0 }} />
                        ) : (
                            <TouchableOpacity activeOpacity={0.9} onPress={() => setFullscreenImage(mainSignedUrl)}>
                                <Image
                                    source={{ uri: mainSignedUrl }}
                                    style={{ width: '100%', height: 280 }}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
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
                                        <GalleryItem key={item.id || i} item={item} onPress={setFullscreenImage} />
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

                        {/* Send to practitioner */}
                        {onShareToggle && (() => {
                            const isShared = !!moment.shared_with_practitioner_at
                            return (
                                <TouchableOpacity
                                    onPress={() => onShareToggle(moment)}
                                    activeOpacity={0.85}
                                    style={{
                                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                        gap: 8, marginTop: 16, paddingVertical: 14,
                                        backgroundColor: isShared ? colors.surface1 : colors.bloom,
                                        borderRadius: 16,
                                        borderWidth: isShared ? 1 : 0,
                                        borderColor: isShared ? '#E5E7EB' : 'transparent',
                                    }}
                                >
                                    {isShared ? (
                                        <CheckCircle2 size={18} color={colors.bloom} strokeWidth={2} />
                                    ) : (
                                        <Send size={16} color="#fff" strokeWidth={2} />
                                    )}
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: isShared ? colors.bloom : '#fff' }}>
                                        {isShared
                                            ? (locale === 'fr' ? 'Partagé · Appuyez pour arrêter' : 'Shared · Tap to stop sharing')
                                            : (locale === 'fr' ? 'Envoyer à mon praticien' : 'Send to my practitioner')}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })()}

                        {/* Read Story button */}
                        {moment.story_id && onOpenStory && (
                            <TouchableOpacity
                                onPress={() => { onClose(); onOpenStory(moment.story_id!) }}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                    gap: 8, marginTop: 16, paddingVertical: 14,
                                    backgroundColor: colors.surface1, borderRadius: 16,
                                }}
                                activeOpacity={0.7}
                            >
                                <BookOpen size={18} color={colors.bloom} />
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bloom }}>
                                    {locale === 'fr' ? 'Lire l\'histoire' : 'Read Story'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Conversation */}
                        <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 12 }}>
                                {locale === 'fr' ? 'Conversation' : 'Conversation'}
                            </Text>
                            {comments.length === 0 ? (
                                <Text style={{ fontSize: 13, color: colors.textFaint, fontStyle: 'italic' }}>
                                    {locale === 'fr' ? 'Pas encore de commentaires' : 'No comments yet'}
                                </Text>
                            ) : (
                                <View style={{ gap: 10 }}>
                                    {comments.map(c => {
                                        const mine = c.author_type === 'member'
                                        const when = new Date(c.created_at).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                        return (
                                            <View key={c.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                                                <View style={{
                                                    maxWidth: '82%',
                                                    backgroundColor: mine ? colors.bloom : colors.surface1,
                                                    borderRadius: 16,
                                                    paddingHorizontal: 14, paddingVertical: 8,
                                                }}>
                                                    <Text style={{ fontSize: 14, color: mine ? '#fff' : colors.primary, lineHeight: 20 }}>{c.content}</Text>
                                                </View>
                                                <Text style={{ fontSize: 10, color: colors.textFaint, marginTop: 4, paddingHorizontal: 4 }}>{when}</Text>
                                            </View>
                                        )
                                    })}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* Composer pinned at the bottom of the sheet */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
                    borderTopWidth: 1, borderTopColor: '#F0F0F0',
                    backgroundColor: colors.bg,
                }}>
                    <TextInput
                        value={newComment}
                        onChangeText={setNewComment}
                        placeholder={locale === 'fr' ? 'Écrire un commentaire...' : 'Write a comment...'}
                        placeholderTextColor={colors.textTertiary}
                        style={{
                            flex: 1,
                            backgroundColor: colors.surface1,
                            borderRadius: 18,
                            paddingHorizontal: 14, paddingVertical: 10,
                            fontSize: 14, color: colors.primary,
                        }}
                        editable={!postingComment}
                        onSubmitEditing={() => { if (newComment.trim()) postComment() }}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        onPress={postComment}
                        disabled={!newComment.trim() || postingComment}
                        activeOpacity={0.8}
                        style={{
                            paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18,
                            backgroundColor: colors.bloom,
                            opacity: !newComment.trim() || postingComment ? 0.5 : 1,
                        }}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                            {locale === 'fr' ? 'Envoyer' : 'Send'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Pressable>

            {/* Fullscreen image viewer */}
            <Modal visible={!!fullscreenImage} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
                <Pressable
                    onPress={() => setFullscreenImage(null)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
                >
                    <TouchableOpacity
                        onPress={() => setFullscreenImage(null)}
                        activeOpacity={0.8}
                        style={{
                            position: 'absolute', top: insets.top + 12, right: 16, zIndex: 10,
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            justifyContent: 'center', alignItems: 'center',
                        }}
                    >
                        <X size={20} color="#fff" />
                    </TouchableOpacity>
                    {fullscreenImage && (
                        <Image
                            source={{ uri: fullscreenImage }}
                            style={{ width: '100%', height: '80%' }}
                            resizeMode="contain"
                        />
                    )}
                </Pressable>
            </Modal>
        </Pressable>
    )
}
