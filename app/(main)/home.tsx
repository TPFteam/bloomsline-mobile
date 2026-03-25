import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, Pressable, Platform } from 'react-native'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'
import { PageLoader } from '@/components/PageLoader'
import { Camera, Video, Mic, PenLine, Settings, Heart, User } from 'lucide-react-native'
import { getNavOrder, getHomeScreen } from '@/lib/nav-order'
import { InlineGuide } from '@/components/InlineGuide'
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
  const { t, locale } = useI18n()
  const isHome = getHomeScreen(member as any) === 'moments'
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
        {isHome ? (
          <>
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
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 30, fontWeight: '700', color: colors.primary, letterSpacing: -0.8, lineHeight: 38 }}>
                {t.home[getGreetingKey()]}{firstName ? `,\n` : '.'}
                {firstName ? <Text style={{ color: '#8A8A8A' }}>{firstName}.</Text> : null}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={{ marginBottom: 28 }}>
              <TouchableOpacity
                onPress={() => router.canGoBack() ? router.back() : router.push('/(main)/practitioner')}
                activeOpacity={0.7}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 18, color: '#000', marginTop: -1 }}>‹</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 30, fontWeight: '700', color: colors.primary, letterSpacing: -0.8, lineHeight: 38, marginBottom: 20 }}>
              {locale === 'fr' ? 'Mes Moments' : 'My Moments'}
            </Text>
          </>
        )}

        {/* Inline guide */}
        <InlineGuide
          guideKey="moments"
          icon={Heart}
          title={locale === 'fr' ? 'Vos moments' : 'Your moments'}
          description={locale === 'fr'
            ? 'Capturez ce que vous ressentez — photos, voix, écriture. Votre parcours émotionnel se construit au fil du temps.'
            : 'Capture how you feel — photos, voice, writing. Your emotional timeline builds over time.'}
        />

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
          <View style={{ position: 'relative' }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* My Evolution */}
              <TouchableOpacity
                onPress={() => router.push('/(main)/evolution')}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  backgroundColor: colors.bloom,
                  borderRadius: 24,
                  padding: 20,
                  minHeight: 160,
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                  <Heart size={18} color="#fff" strokeWidth={2} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 24 }}>
                    {locale === 'fr' ? 'Mon parcours' : 'My Journey'}
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                    {locale === 'fr' ? 'Tendances et progression' : 'Patterns and progress'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Bloom */}
              <TouchableOpacity
                onPress={() => setBloomOpen(true)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  backgroundColor: '#1A1A1A',
                  borderRadius: 24,
                  padding: 20,
                  minHeight: 160,
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Mic size={18} color="#fff" strokeWidth={2} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 24 }}>
                    {locale === 'fr' ? 'Parler à Bloom' : 'Talk to Bloom'}
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                    {locale === 'fr' ? 'Réfléchir et grandir' : 'Reflect and grow'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Capture + overlapping center */}
            <TouchableOpacity
              onPress={toggleCapture}
              activeOpacity={0.85}
              style={{
                position: 'absolute',
                top: -24,
                left: '50%',
                marginLeft: -28,
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: colors.primary,
                justifyContent: 'center', alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 8,
                borderWidth: 3,
                borderColor: '#FAFAF8',
                zIndex: 5,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '300', marginTop: -1 }}>+</Text>
            </TouchableOpacity>
          </View>

        </View>
      </PullToRefreshScrollView>

      {/* Moment detail sheet */}
      {viewingMoment && (
        <MomentDetail
          moment={viewingMoment}
          onClose={() => setViewingMoment(null)}
          onOpenStory={(storyId) => router.push({ pathname: '/(main)/stories', params: { openStoryId: storyId } })}
        />
      )}

      {/* Capture overlay */}
      {captureOpen && (
        <Pressable
          onPress={toggleCapture}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.95)',
            zIndex: 20,
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: insets.bottom + 100,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: CARD_SIZE * 2 + 12 }}>
            {CAPTURE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
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
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      )}

      {/* Bloom full screen */}
      {bloomOpen && (
        <BloomFullScreen onClose={() => setBloomOpen(false)} firstName={firstName} />
      )}


      {/* Bottom floating bar */}
      {!viewingMoment && !bloomOpen && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          left: 0, right: 0,
          alignItems: 'center',
          zIndex: 10,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 16,
            backgroundColor: '#fff',
            paddingHorizontal: 20, paddingVertical: 12,
            borderRadius: 40,
            borderWidth: 1,
            borderColor: '#EBEBEB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 8,
          }}>
            {getNavOrder(member as any).map((key) => {
              const isActive = key === 'moments'
              const config = {
                moments: { icon: Heart, label: t.home?.moments || 'Moments', route: null },
                practitioner: { icon: User, label: t.practitioner?.tabLabel || 'My Care', route: '/(main)/practitioner' },
                stories: { icon: PenLine, label: t.stories?.section || 'Stories', route: '/(main)/stories' },
              }[key] as { icon: any; label: string; route: string | null }
              if (!config) return null
              const Icon = config.icon
              return (
                <TouchableOpacity
                  key={key}
                  onPress={config.route ? () => router.push(config.route as any) : undefined}
                  activeOpacity={0.8}
                  style={{ alignItems: 'center', gap: 6 }}
                >
                  <View style={{
                    width: 52, height: 52, borderRadius: 26,
                    backgroundColor: isActive ? `${colors.bloom}15` : '#fff',
                    borderWidth: isActive ? 0 : 1,
                    borderColor: '#E5E5E3',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Icon size={22} color={isActive ? colors.bloom : colors.primary} strokeWidth={isActive ? 2 : 1.8} />
                  </View>
                  <Text style={{ fontSize: 11, color: isActive ? colors.bloom : '#8A8A8A', fontWeight: isActive ? '600' : '500' }}>{config.label}</Text>
                </TouchableOpacity>
              )
            })}

          </View>
        </View>
      )}
    </View>
  )
}
