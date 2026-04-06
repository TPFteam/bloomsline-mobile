import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import NotificationBell from '@/components/NotificationBell'
import { View, Text, TouchableOpacity, Animated, Pressable, Modal } from 'react-native'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'
import { PageLoader } from '@/components/PageLoader'
import { Camera, Video, Mic, PenLine, Settings, Heart, User, Plus, Lightbulb } from 'lucide-react-native'
import { getNavOrder, getHomeScreen } from '@/lib/nav-order'
import { InlineGuide } from '@/components/InlineGuide'
import { WelcomeGuide } from '@/components/WelcomeGuide'
import { colors, CAPTURE_TYPE_COLORS } from '@/lib/theme'
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { supabase } from '@/lib/supabase'

// Extracted components
import { DayNav, getToday, isSameDay, getGreetingKey } from '@/components/DayNav'
import { useI18n } from '@/lib/i18n'
import { EmotionalTimeline } from '@/components/EmotionalTimeline'
import { MomentDetail } from '@/components/MomentDetail'
import { BloomFullScreen } from '@/components/BloomFullScreen'

const CARD_SIZE = 95
const CAPTURE_TYPES = [
  { key: 'photo', Icon: Camera, label: 'Photo', color: CAPTURE_TYPE_COLORS.photo },
  { key: 'write', Icon: PenLine, label: 'Write', color: CAPTURE_TYPE_COLORS.write },
  { key: 'voice', Icon: Mic, label: 'Voice', color: CAPTURE_TYPE_COLORS.voice },
  { key: 'video', Icon: Video, label: 'Video', color: CAPTURE_TYPE_COLORS.video },
]

// ─── Empty Moment Messages ──────────────────────────
const EMPTY_MESSAGES_EN = [
  { text: 'How are you feeling right now?', sub: 'Take a second to check in with yourself.' },
  { text: "What's on your mind?", sub: 'Even one word captures something real.' },
  { text: 'Pause. Breathe. Notice.', sub: 'What do you feel in this moment?' },
  { text: "You're here. That's enough.", sub: 'Capture whatever comes to mind.' },
  { text: 'What would you like to remember?', sub: 'A thought, a photo, a feeling.' },
  { text: 'This moment is yours.', sub: 'Write it, snap it, or say it.' },
  { text: 'Check in with yourself.', sub: "How's your energy right now?" },
  { text: 'What are you noticing?', sub: 'Sometimes the small things matter most.' },
]

const EMPTY_MESSAGES_FR = [
  { text: 'Comment vous sentez-vous ?', sub: 'Prenez un instant pour vous écouter.' },
  { text: "Qu'avez-vous en tête ?", sub: 'Même un mot capture quelque chose de vrai.' },
  { text: 'Pause. Respirez. Observez.', sub: 'Que ressentez-vous en ce moment ?' },
  { text: 'Vous êtes là. C\'est suffisant.', sub: 'Capturez ce qui vous vient.' },
  { text: 'Que voulez-vous retenir ?', sub: 'Une pensée, une photo, un ressenti.' },
  { text: 'Ce moment est à vous.', sub: 'Écrivez-le, photographiez-le, ou dites-le.' },
  { text: 'Faites le point avec vous-même.', sub: 'Comment est votre énergie en ce moment ?' },
  { text: 'Qu\'observez-vous ?', sub: 'Parfois les petites choses comptent le plus.' },
]

const PAST_MESSAGES_EN = [
  'A quiet day.',
  'No moments captured.',
  'Nothing here — and that\'s okay.',
  'An empty page, a full life.',
]

const PAST_MESSAGES_FR = [
  'Une journée calme.',
  'Aucun moment capturé.',
  'Rien ici — et c\'est très bien.',
  'Une page vide, une vie remplie.',
]

function EmptyMomentCard({ onPress, locale, isToday, firstName }: { onPress?: () => void; locale: string; isToday: boolean; firstName: string }) {
  const glowAnim = useRef(new Animated.Value(0)).current

  // Stable message — only changes when date or locale changes, not on every render
  const todayKey = new Date().toDateString()
  const msg = useMemo(() => {
    const msgs = locale === 'fr' ? EMPTY_MESSAGES_FR : EMPTY_MESSAGES_EN
    return msgs[Math.floor(Math.random() * msgs.length)]
  }, [locale, todayKey])

  const pastMsg = useMemo(() => {
    const msgs = locale === 'fr' ? PAST_MESSAGES_FR : PAST_MESSAGES_EN
    return msgs[Math.floor(Math.random() * msgs.length)]
  }, [locale])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start()
  }, [])

  if (!isToday) {
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' }}>
        <Text style={{ fontSize: 15, color: '#BBB', textAlign: 'center', fontStyle: 'italic' }}>{pastMsg}</Text>
      </View>
    )
  }

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${colors.bloom}20`, `${colors.bloom}60`],
  })

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.2],
  })

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={{
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor,
        shadowColor: colors.bloom,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity,
        shadowRadius: 16,
        elevation: 4,
      }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.primary, textAlign: 'center', marginBottom: 8, lineHeight: 28 }}>
          {msg.text}
        </Text>
        <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
          {msg.sub}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.bloom }}>
          {locale === 'fr' ? 'Appuyez pour capturer →' : 'Tap to capture →'}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

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
  const [showWelcome, setShowWelcome] = useState(false)
  const [spotlightGuide, setSpotlightGuide] = useState(false)
  const [walkthroughCTA, setWalkthroughCTA] = useState(false)
  const [walkthroughReturn, setWalkthroughReturn] = useState(false)
  const [walkthroughFinal, setWalkthroughFinal] = useState(false)
  const [revealActive, setRevealActive] = useState(false)
  const [captureHighlight, setCaptureHighlight] = useState(false)
  const captureHighlightPulse = useRef(new Animated.Value(0)).current
  const walkthroughActive = useRef(false)
  const [practitionerName, setPractitionerName] = useState<string | undefined>(undefined)
  const walkthroughFade = useRef(new Animated.Value(0)).current
  const finalFade = useRef(new Animated.Value(0)).current
  const revealScale = useRef(new Animated.Value(0)).current
  const revealOpacity = useRef(new Animated.Value(1)).current
  const expandAnim = useRef(new Animated.Value(0)).current
  const fabRotateAnim = useRef(new Animated.Value(0)).current
  const bloomPulse = useRef(new Animated.Value(0)).current

  // Check if welcome guide should show
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('users')
      .select('guides_seen')
      .eq('id', user.id)
      .single()
      .then(async ({ data }) => {
        const seen = data?.guides_seen || {}
        if (!seen.walkthrough_complete) {
          // Check if user already has moments (previous incomplete walkthrough)
          const start = new Date(); start.setHours(0, 0, 0, 0)
          const end = new Date(); end.setDate(end.getDate() + 1); end.setHours(0, 0, 0, 0)
          const existing = await getMemberMoments(1, 0, start, end)
          if (existing.length > 0) {
            // Already has moments — skip onboarding, mark complete
            await supabase.from('users').update({
              guides_seen: { ...seen, welcome: true, moments: true, walkthrough_complete: true }
            }).eq('id', user!.id)
          } else {
            setShowWelcome(true)
          }
        }
      })
    if (member?.practitioner_id) {
      supabase
        .from('users')
        .select('full_name')
        .eq('id', member.practitioner_id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setPractitionerName(data.full_name)
        })
    }
  }, [user?.id, member?.practitioner_id])

  const handleWelcomeDismiss = async () => {
    setShowWelcome(false)
    setSpotlightGuide(true)
    // Mark welcome as seen
    if (!user?.id) return
    const { data } = await supabase.from('users').select('guides_seen').eq('id', user.id).single()
    const seen = data?.guides_seen || {}
    await supabase.from('users').update({ guides_seen: { ...seen, welcome: true } }).eq('id', user.id)
  }

  const handleSpotlightDismiss = () => {
    walkthroughFade.setValue(0)
    setWalkthroughCTA(true)
    setSpotlightGuide(false)
    setTimeout(() => {
      Animated.timing(walkthroughFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start()
    }, 300)
  }

  const startWalkthrough = () => {
    setWalkthroughCTA(false)
    walkthroughActive.current = true
    const prefill = locale === 'fr'
      ? 'Je suis curieux de voir comment ça marche...'
      : "I'm feeling curious about how this works..."
    router.push({ pathname: '/(main)/capture', params: { type: 'write', walkthrough: '1', prefill } })
  }

  const handleMomentClose = () => {
    if (walkthroughReturn) {
      setViewingMoment(null)
      setWalkthroughReturn(false)
      setWalkthroughFinal(true)
      finalFade.setValue(0)
      setTimeout(() => {
        Animated.timing(finalFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start()
      }, 300)
    } else {
      setViewingMoment(null)
    }
  }

  const handleWalkthroughComplete = async () => {
    // Start reveal animation
    setRevealActive(true)
    revealScale.setValue(0)
    revealOpacity.setValue(1)

    // Phase 1: circle expands from center
    Animated.timing(revealScale, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start(() => {
      // Phase 2: reveal the app — hide walkthrough states, fade out overlay
      setWalkthroughFinal(false)
      Animated.timing(revealOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setRevealActive(false)
        setCaptureHighlight(true)
        Animated.loop(
          Animated.sequence([
            Animated.timing(captureHighlightPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(captureHighlightPulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ])
        ).start()
      })
    })

    // Save to DB
    if (!user?.id) return
    const { data } = await supabase.from('users').select('guides_seen').eq('id', user.id).single()
    const seen = data?.guides_seen || {}
    await supabase.from('users').update({ guides_seen: { ...seen, walkthrough_complete: true } }).eq('id', user.id)
  }

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
    if (captureHighlight) setCaptureHighlight(false)
    const opening = !captureOpen
    if (opening) {
      setCaptureOpen(true)
      Animated.spring(expandAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start()
    } else {
      Animated.timing(expandAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setCaptureOpen(false)
      })
    }
  }

  const handleCaptureType = (type: string) => {
    setCaptureOpen(false)
    expandAnim.setValue(0)
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
    // Check if returning from walkthrough capture
    if (walkthroughActive.current && data.length > 0) {
      walkthroughActive.current = false
      setWalkthroughReturn(true)
    }
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
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 180, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        {isHome ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 28 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <NotificationBell onOpenResource={(resourceId) => {
                  router.push({ pathname: '/(main)/practitioner', params: { openResourceId: resourceId } })
                }} />
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

        {/* Inline guide — hidden during walkthrough CTA */}
        {!walkthroughCTA && (
          <InlineGuide
            guideKey="moments"
            icon={Heart}
            title={locale === 'fr' ? 'Vos moments' : 'Your moments'}
            description={locale === 'fr'
              ? 'Gardez les moments qui ont compté pour vous (photos, vocaux, textes).'
              : 'Keep the moments that mattered to you (photos, voice, texts).'}
            spotlight={spotlightGuide}
            onDismiss={handleSpotlightDismiss}
          />
        )}

        {spotlightGuide ? (
          /* Skeleton placeholders while spotlight guide is active */
          <View style={{ opacity: 0.4 }}>
            {/* Date strip skeleton */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E5E5' }} />
              <View style={{ width: 80, height: 16, borderRadius: 8, backgroundColor: '#E5E5E5' }} />
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E5E5' }} />
            </View>
            {/* Timeline skeleton */}
            <View style={{ backgroundColor: '#F0F0EE', borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 32 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E5E5', marginBottom: 16 }} />
              <View style={{ width: 180, height: 16, borderRadius: 8, backgroundColor: '#E5E5E5', marginBottom: 8 }} />
              <View style={{ width: 140, height: 12, borderRadius: 6, backgroundColor: '#E5E5E5' }} />
            </View>
            {/* Cards skeleton */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#E5E5E5', borderRadius: 24, height: 160 }} />
              <View style={{ flex: 1, backgroundColor: '#E5E5E5', borderRadius: 24, height: 160 }} />
            </View>
          </View>
        ) : (
          <>
            {/* Date strip + Timeline */}
            <View style={{ marginBottom: 32 }}>
              <DayNav selected={selectedDate} onSelect={setSelectedDate} />

              {todayMomentCount === 0 ? (
                isToday ? (
                  walkthroughCTA ? (
                    /* Walkthrough CTA — personalized first moment prompt */
                    <Animated.View style={{ opacity: walkthroughFade, transform: [{ translateY: walkthroughFade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                    <TouchableOpacity
                      onPress={startWalkthrough}
                      activeOpacity={0.85}
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 24,
                        padding: 24,
                        borderWidth: 2,
                        borderColor: `${colors.bloom}30`,
                        shadowColor: colors.bloom,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 16,
                        elevation: 6,
                      }}
                    >
                      <Text style={{ fontSize: 15, color: '#888', marginBottom: 12 }}>
                        {locale === 'fr' ? 'Créez votre premier moment' : 'Create your first moment'}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 16, lineHeight: 28 }}>
                        {locale === 'fr' ? 'Comment vous sentez-vous\nen ce moment ?' : 'How are you feeling\nright now?'}
                      </Text>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        backgroundColor: `${colors.bloom}15`,
                        borderRadius: 16, padding: 14,
                        shadowColor: colors.bloom,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 6,
                      }}>
                        <View style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: colors.bloom,
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                          <Plus size={20} color="#fff" strokeWidth={2.5} />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bloom }}>
                          {locale === 'fr' ? 'Commencer ici →' : 'Start here →'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    </Animated.View>
                  ) : (
                  <EmptyMomentCard onPress={() => router.push('/(main)/capture')} locale={locale} isToday={true} firstName={firstName} />
                  )
                ) : (
                  <EmptyMomentCard locale={locale} isToday={false} firstName={firstName} />
                )
              ) : (
                <EmotionalTimeline moments={moments} showNow={isToday} onMomentPress={setViewingMoment} glowDots={walkthroughReturn} />
              )}
            </View>

            {/* Final walkthrough card — after closing first moment detail */}
            {walkthroughFinal && (
              <Animated.View style={{
                opacity: finalFade,
                transform: [{ translateY: finalFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              }}>
                <View style={{
                  backgroundColor: '#fff',
                  borderRadius: 24,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#EBEBEB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  elevation: 4,
                  overflow: 'hidden',
                }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 8, lineHeight: 28 }}>
                    {locale === 'fr' ? `Bravo ${firstName} !` : `Well done, ${firstName}!`}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#888', lineHeight: 21, marginBottom: 6 }}>
                    {locale === 'fr'
                      ? 'Continuez à capturer de petits moments au fil de la journée. Ensemble, ils dessinent votre fil émotionnel.'
                      : 'Keep capturing small moments throughout your day. Together, they build your emotional flow.'}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#888', lineHeight: 21, marginBottom: 16 }}>
                    {locale === 'fr'
                      ? 'Avec le temps, cela vous aide à comprendre vos habitudes et à voir votre progression.'
                      : 'Over time, this helps you understand your patterns and see your progress.'}
                  </Text>

                  {/* Emotional flow preview */}
                  <View style={{ marginBottom: 20, marginHorizontal: -8 }}>
                    <Svg width="100%" height={80} viewBox="0 0 300 80">
                      <Defs>
                        <LinearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.12" />
                          <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
                        </LinearGradient>
                      </Defs>
                      {/* Fill */}
                      <Path
                        d="M0,40 C40,40 50,18 80,18 C110,18 120,55 160,52 C200,49 210,15 240,12 C270,9 290,30 300,28 L300,80 L0,80 Z"
                        fill="url(#flowFill)"
                      />
                      {/* Curve */}
                      <Path
                        d="M0,40 C40,40 50,18 80,18 C110,18 120,55 160,52 C200,49 210,15 240,12 C270,9 290,30 300,28"
                        stroke="#1A1A1A"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Dots */}
                      <Circle cx="80" cy="18" r="5" fill={colors.bloom} />
                      <Circle cx="160" cy="52" r="5" fill="#F43F5E" />
                      <Circle cx="240" cy="12" r="7" fill="#8B5CF6" />
                      <Circle cx="240" cy="12" r="12" fill="#8B5CF6" fillOpacity="0.15" />
                    </Svg>
                  </View>

                  <TouchableOpacity
                    onPress={handleWalkthroughComplete}
                    activeOpacity={0.85}
                    style={{
                      height: 52, borderRadius: 26,
                      backgroundColor: colors.primary,
                      justifyContent: 'center', alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                      {locale === 'fr' ? 'Je suis prêt' : "I'm ready"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Quick actions — hidden during walkthrough */}
            {!walkthroughCTA && !walkthroughReturn && !walkthroughFinal && (
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

                  {/* Bloom — only for self-onboarded users (signup_source = waitlist) */}
                  {(member as any)?.signup_source !== 'practitioner_invite' && <TouchableOpacity
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
                  </TouchableOpacity>}
                </View>

              </View>

              {/* Tips for you */}
              <TouchableOpacity
                onPress={() => router.push('/(main)/tips' as any)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#F8F7F4',
                  borderRadius: 24,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  borderWidth: 1,
                  borderColor: '#EBEBEB',
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: '#FEF3C7',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Lightbulb size={22} color="#F59E0B" strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 2 }}>
                    {locale === 'fr' ? 'Conseils pour vous' : 'Tips for you'}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#999' }}>
                    {locale === 'fr' ? 'Petites idées pour mieux capturer vos moments' : 'Simple ideas to get more from your moments'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            )}
          </>
        )}
      </PullToRefreshScrollView>

      {/* Moment detail sheet */}
      {viewingMoment && (
        <MomentDetail
          moment={viewingMoment}
          onClose={handleMomentClose}
          onOpenStory={(storyId) => router.push({ pathname: '/(main)/stories', params: { openStoryId: storyId } })}
        />
      )}

      {/* Capture type pills — modal overlay */}
      <Modal visible={captureOpen} transparent animationType="none" onRequestClose={toggleCapture}>
        <Pressable onPress={toggleCapture} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{
            position: 'absolute',
            bottom: insets.bottom + 90,
            right: 20,
            alignItems: 'flex-end',
            gap: 8,
          }}>
            {CAPTURE_TYPES.slice().reverse().map((type, i) => (
              <Animated.View
                key={type.key}
                style={{
                  opacity: expandAnim,
                  transform: [{
                    translateY: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20 + i * 8, 0],
                    }),
                  }, {
                    scale: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                }}
              >
                <TouchableOpacity
                  onPress={() => handleCaptureType(type.key)}
                  activeOpacity={0.85}
                  style={{
                    width: 52, height: 52, borderRadius: 16,
                    backgroundColor: '#fff',
                    justifyContent: 'center', alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 4,
                    borderWidth: 1,
                    borderColor: '#F0F0F0',
                  }}
                >
                  <type.Icon size={22} color={type.color} strokeWidth={1.8} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Bloom full screen */}
      {bloomOpen && (
        <BloomFullScreen onClose={() => setBloomOpen(false)} firstName={firstName} />
      )}


      {/* Bottom floating bar — hidden during walkthrough */}
      {!viewingMoment && !bloomOpen && !walkthroughCTA && !spotlightGuide && !walkthroughReturn && !walkthroughFinal && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          left: 0, right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 10,
          zIndex: 10,
        }}>
          {/* Nav bubble — 3 tabs */}
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
          {/* Capture — standalone circle */}
          <View style={{ alignItems: 'center' }}>
            {/* Tooltip */}
            {captureHighlight && (
              <View style={{
                position: 'absolute',
                bottom: 64,
                backgroundColor: colors.primary,
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>
                  {locale === 'fr' ? 'Ajoutez vos moments' : 'Add your moments'}
                </Text>
                {/* Arrow */}
                <View style={{
                  position: 'absolute', bottom: -6,
                  left: '50%', marginLeft: -6,
                  width: 0, height: 0,
                  borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6,
                  borderLeftColor: 'transparent', borderRightColor: 'transparent',
                  borderTopColor: colors.primary,
                }} />
              </View>
            )}
            {/* Pulse ring */}
            {captureHighlight && (
              <Animated.View style={{
                position: 'absolute',
                width: 56, height: 56, borderRadius: 28,
                borderWidth: 2,
                borderColor: colors.bloom,
                opacity: captureHighlightPulse.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.6, 0.1, 0],
                }),
                transform: [{
                  scale: captureHighlightPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.8],
                  }),
                }],
              }} />
            )}
            <TouchableOpacity
              onPress={toggleCapture}
              activeOpacity={0.8}
              style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: captureOpen ? colors.primary : '#fff',
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 1,
                borderColor: captureOpen ? colors.primary : '#EBEBEB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 8,
              }}
            >
              <Plus size={24} color={captureOpen ? '#fff' : colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Welcome guide modal */}
      <WelcomeGuide
        visible={showWelcome}
        onDismiss={handleWelcomeDismiss}
        locale={locale}
        hasPractitioner={!!member?.practitioner_id}
        practitionerName={practitionerName}
        memberFirstName={member?.first_name}
      />

      {/* Magic circle reveal */}
      {revealActive && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 100,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#FAFAF8',
            opacity: revealOpacity,
          }}
        >
          <Animated.View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.bloom,
            transform: [{
              scale: revealScale.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 1, 25],
              }),
            }],
            opacity: revealScale.interpolate({
              inputRange: [0, 0.2, 0.6, 1],
              outputRange: [0, 1, 0.6, 0],
            }),
          }} />
        </Animated.View>
      )}
    </View>
  )
}
