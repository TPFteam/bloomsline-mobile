import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, Pressable, Platform } from 'react-native'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'
import { PageLoader } from '@/components/PageLoader'
import { Camera, Video, Mic, PenLine, Settings } from 'lucide-react-native'
import { colors, CAPTURE_TYPE_COLORS } from '@/lib/theme'

// Extracted components
import { BloomLogo } from '@/components/BloomLogo'
import { DayNav, getToday, isSameDay, getGreetingKey } from '@/components/DayNav'
import { useI18n } from '@/lib/i18n'
import { EmotionalTimeline } from '@/components/EmotionalTimeline'
import { MomentDetail } from '@/components/MomentDetail'
import { BloomFullScreen } from '@/components/BloomFullScreen'

const CARD_SIZE = 95
const CAPTURE_TYPES = [
  { key: 'photo', Icon: Camera, label: 'Photo', color: CAPTURE_TYPE_COLORS.photo, rotate: '-6deg', offsetX: -55, offsetY: -120 },
  { key: 'video', Icon: Video, label: 'Video', color: CAPTURE_TYPE_COLORS.video, rotate: '5deg', offsetX: 55, offsetY: -120 },
  { key: 'voice', Icon: Mic, label: 'Voice', color: CAPTURE_TYPE_COLORS.voice, rotate: '-4deg', offsetX: -55, offsetY: -10 },
  { key: 'write', Icon: PenLine, label: 'Write', color: CAPTURE_TYPE_COLORS.write, rotate: '4deg', offsetX: 55, offsetY: -10 },
]

// ─── Main Screen ─────────────────────────────────────

export default function Home() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, member } = useAuth()
  const { t } = useI18n()
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(getToday)
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [bloomOpen, setBloomOpen] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current
  const fabRotateAnim = useRef(new Animated.Value(0)).current
  const bloomPulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bloomPulse, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(bloomPulse, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const isToday = isSameDay(selectedDate, getToday())

  const toggleCapture = () => {
    const opening = !captureOpen
    if (opening) {
      setCaptureOpen(true)
      Animated.parallel([
        Animated.spring(expandAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.spring(fabRotateAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start()
    } else {
      expandAnim.setValue(0)
      fabRotateAnim.setValue(0)
      setCaptureOpen(false)
    }
  }

  const handleCaptureType = (type: string) => {
    setCaptureOpen(false)
    expandAnim.setValue(0)
    fabRotateAnim.setValue(0)
    router.push({ pathname: '/(main)/capture', params: { type } })
  }

  const firstName = member?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  const fetchMoments = useCallback(async () => {
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(selectedDate)
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
    const data = await getMemberMoments(20, 0, start, end)
    setMoments(data)
    setLoading(false)
  }, [selectedDate])

  useFocusEffect(
    useCallback(() => {
      fetchMoments()
    }, [fetchMoments])
  )

  const onRefresh = useCallback(async () => {
    await fetchMoments()
  }, [fetchMoments])

  const todayMomentCount = moments.length

  if (loading) return <PageLoader />

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      <PullToRefreshScrollView
        onRefresh={onRefresh}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 180, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <BloomLogo size={36} />
          <TouchableOpacity
            onPress={() => router.push('/(main)/settings')}
            activeOpacity={0.7}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: '#f5f5f5',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Settings size={18} color="#666" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: colors.primary, letterSpacing: -0.8, lineHeight: 38 }}>
            {t.home[getGreetingKey()]}{firstName ? `,\n` : '.'}
            {firstName ? <Text style={{ color: '#8A8A8A' }}>{firstName}.</Text> : null}
          </Text>
        </View>

        {/* Date strip + Timeline */}
        <View style={{ marginBottom: 32 }}>
          <DayNav selected={selectedDate} onSelect={setSelectedDate} />

          {todayMomentCount === 0 ? (
            isToday ? (
              <TouchableOpacity
                onPress={() => router.push('/(main)/capture')}
                style={{
                  backgroundColor: colors.surface2,
                  borderRadius: 24,
                  padding: 32,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 48, marginBottom: 16 }}>✦</Text>
                <Text style={{ fontSize: 20, fontWeight: '600', color: colors.primary, textAlign: 'center', marginBottom: 8 }}>
                  {t.home.emptyTitle}
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
                  {t.home.emptySubtitle}
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  backgroundColor: colors.surface2,
                  borderRadius: 24,
                  padding: 32,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>✦</Text>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textFaint, textAlign: 'center' }}>
                  {t.home.noMoments}
                </Text>
              </View>
            )
          ) : (
            <EmotionalTimeline moments={moments} showNow={isToday} onMomentPress={setViewingMoment} />
          )}
        </View>

        {/* Quick actions */}
        <View style={{ gap: 14 }}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/evolution')}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.bloom,
              borderRadius: 22,
              padding: 24,
              shadowColor: colors.bloom,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 10 }}>
              {t.home.evolution}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
              {t.home.evolutionCta}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/practitioner')}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#fff',
              borderRadius: 22,
              padding: 24,
              borderWidth: 1,
              borderColor: '#EBEBEB',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 10 }}>
              {t.home.practitioner}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3 }}>
              {t.home.practitionerCta}
            </Text>
          </TouchableOpacity>
        </View>
      </PullToRefreshScrollView>

      {/* Moment detail sheet */}
      {viewingMoment && (
        <MomentDetail moment={viewingMoment} onClose={() => setViewingMoment(null)} />
      )}

      {/* Capture overlay */}
      {captureOpen && (
        <Pressable
          onPress={toggleCapture}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.92)',
          }}
        >
          {/* Floating cards */}
          <View style={{ position: 'absolute', bottom: insets.bottom + 180, left: 0, right: 0, alignItems: 'center' }}>
            {CAPTURE_TYPES.map((type) => {
              const scale = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })
              const translateX = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, type.offsetX] })
              const translateY = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [60, type.offsetY] })
              const opacity = expandAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 1] })

              return (
                <Animated.View
                  key={type.key}
                  style={{
                    position: 'absolute',
                    transform: [{ translateX }, { translateY }, { scale }, { rotate: type.rotate }],
                    opacity,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleCaptureType(type.key)}
                    activeOpacity={0.85}
                    style={{
                      width: CARD_SIZE, height: CARD_SIZE,
                      backgroundColor: type.color,
                      borderRadius: 20,
                      padding: 16,
                      justifyContent: 'space-between',
                      shadowColor: type.color,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.3,
                      shadowRadius: 16,
                      elevation: 10,
                    }}
                  >
                    <type.Icon size={28} color="#fff" strokeWidth={2} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{t.home[`capture${type.key.charAt(0).toUpperCase() + type.key.slice(1)}` as keyof typeof t.home]}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )
            })}
          </View>
        </Pressable>
      )}

      {/* Bottom area — either inline chat or action buttons (hidden when viewing a moment) */}
      {viewingMoment ? null : bloomOpen ? (
        <BloomFullScreen onClose={() => setBloomOpen(false)} firstName={firstName} />
      ) : (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          left: 0, right: 0,
          alignItems: 'center',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 24,
            backgroundColor: '#fff',
            paddingHorizontal: 28, paddingVertical: 14,
            borderRadius: 40,
            borderWidth: 1,
            borderColor: '#EBEBEB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 8,
          }}>
            {/* Bloom — mic button */}
            <TouchableOpacity
              onPress={() => setBloomOpen(true)}
              activeOpacity={0.8}
              style={{ alignItems: 'center', gap: 8 }}
            >
              <View style={{ width: 64, height: 64, justifyContent: 'center', alignItems: 'center' }}>
                {/* Glow behind */}
                <Animated.View style={{
                  position: 'absolute',
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: colors.bloom,
                  opacity: bloomPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.15, 0.3],
                  }),
                }} />
                <Animated.View style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: colors.primary,
                  justifyContent: 'center', alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.2,
                  shadowRadius: 16,
                  elevation: 8,
                }}>
                  <Mic size={22} color="#fff" strokeWidth={2} />
                </Animated.View>
              </View>
              <Text style={{ fontSize: 12, color: '#8A8A8A', fontWeight: '600', marginTop: 2 }}>{t.home.bloom}</Text>
            </TouchableOpacity>

            {/* Capture — plus button */}
            <TouchableOpacity
              onPress={toggleCapture}
              activeOpacity={0.8}
              style={{ alignItems: 'center', gap: 8 }}
            >
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: '#fff',
                borderWidth: 1, borderColor: '#E5E5E3',
                justifyContent: 'center', alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <Animated.Text
                  style={{
                    color: colors.primary,
                    fontSize: 26,
                    fontWeight: '300',
                    transform: [{
                      rotate: fabRotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '45deg'],
                      }),
                    }],
                  }}
                >
                  +
                </Animated.Text>
              </View>
              <Text style={{ fontSize: 12, color: '#8A8A8A', fontWeight: '600', marginTop: 2 }}>{t.home.capture}</Text>
            </TouchableOpacity>

            {/* Stories — write button */}
            <TouchableOpacity
              onPress={() => router.push('/(main)/stories')}
              activeOpacity={0.8}
              style={{ alignItems: 'center', gap: 8 }}
            >
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: '#fff',
                borderWidth: 1, borderColor: '#E5E5E3',
                justifyContent: 'center', alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <PenLine size={22} color={colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={{ fontSize: 12, color: '#8A8A8A', fontWeight: '600', marginTop: 2 }}>{t.stories?.section || 'Stories'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}
