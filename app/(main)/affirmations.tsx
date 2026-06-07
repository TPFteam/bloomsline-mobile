import { useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Dimensions, Animated } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, Heart, LifeBuoy, Phone } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { INTAKE, CRISIS_STATE, HELPLINES } from '@/lib/for-you'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
// Soft solid backgrounds — same palette as the "deep" walkthrough (tips.tsx).
const PALETTE = ['#4A9A86', '#3B82F6', '#8B5CF6', '#F97316', '#F43F5E', '#2D5F8A']

type Step = 'intake' | 'loading' | 'result' | 'crisis'

export default function Affirmations() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, patientFirstName } = useAuth()
  const { locale } = useI18n()
  const fr = locale === 'fr'
  const params = useLocalSearchParams<{ crisis?: string }>()

  const [step, setStep] = useState<Step>(params.crisis === '1' ? 'crisis' : 'intake')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [affirmations, setAffirmations] = useState<string[]>([])
  const [theme, setTheme] = useState<string | null>(null)
  // Per-card saved state (instant/optimistic) + the DB row id (for un-save).
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const favIds = useRef<Record<number, string>>({})
  const scales = useRef<Record<number, Animated.Value>>({})
  const [currentIndex, setCurrentIndex] = useState(0)

  const getScale = (i: number) => {
    if (!scales.current[i]) scales.current[i] = new Animated.Value(1)
    return scales.current[i]
  }
  const popHeart = (i: number) => {
    const s = getScale(i)
    Animated.sequence([
      Animated.spring(s, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 14 }),
      Animated.spring(s, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 14 }),
    ]).start()
  }

  const close = () => router.back()

  const generate = async (finalAnswers: Record<string, string>) => {
    setStep('loading')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/api/affirmations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          topic: finalAnswers.topic,
          state: finalAnswers.state,
          need: finalAnswers.need,
          firstName: patientFirstName,
          locale,
        }),
      })
      const data = await res.json()
      if (data.crisis) { setStep('crisis'); return }
      setAffirmations(Array.isArray(data.affirmations) ? data.affirmations : [])
      setTheme(data.theme || null)
      setStep('result')
    } catch {
      setStep('result')
      setAffirmations([fr ? 'Je peux être doux/douce avec moi aujourd’hui.' : 'I can be gentle with myself today.'])
    }
  }

  const selectOption = (key: string) => {
    const q = INTAKE[qIndex]
    const next = { ...answers, [q.id]: key }
    setAnswers(next)
    // Acute distress → straight to crisis support.
    if (q.id === 'state' && key === CRISIS_STATE) { setStep('crisis'); return }
    if (qIndex < INTAKE.length - 1) setQIndex(qIndex + 1)
    else generate(next)
  }

  const skip = () => {
    if (qIndex < INTAKE.length - 1) setQIndex(qIndex + 1)
    else generate(answers)
  }

  const toggleSave = async (index: number, text: string) => {
    if (!user?.id) return
    const wasSaved = !!saved[index]
    // Optimistic: flip + animate instantly so the tap feels responsive.
    setSaved(prev => ({ ...prev, [index]: !wasSaved }))
    popHeart(index)
    try {
      if (wasSaved) {
        const id = favIds.current[index]
        delete favIds.current[index]
        if (id) await supabase.from('affirmation_favorites').delete().eq('id', id)
      } else {
        const { data, error } = await supabase
          .from('affirmation_favorites')
          .insert({ user_id: user.id, text, theme, locale })
          .select('id')
          .single()
        if (error) throw error
        if (data?.id) favIds.current[index] = data.id
      }
    } catch {
      // Revert on failure.
      setSaved(prev => ({ ...prev, [index]: wasSaved }))
    }
  }

  // ── Crisis support ─────────────────────────────────────
  if (step === 'crisis') {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 8 }}>
        <TouchableOpacity onPress={close} style={{ alignSelf: 'flex-end', padding: 18 }}>
          <X size={24} color="#999" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFE8EC', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <LifeBuoy size={26} color="#F43F5E" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>
            {fr ? 'Vous n’êtes pas seul(e)' : 'You don’t have to face this alone'}
          </Text>
          <Text style={{ fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 28 }}>
            {fr
              ? 'Si vous traversez un moment vraiment difficile, parler à quelqu’un maintenant peut aider. Ces lignes sont gratuites et confidentielles.'
              : 'If you’re going through something really hard right now, talking to someone can help. These lines are free and confidential.'}
          </Text>
          {HELPLINES.map((h) => (
            <TouchableOpacity
              key={h.tel}
              onPress={() => Linking.openURL(`tel:${h.tel}`)}
              activeOpacity={0.85}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#EEE', borderRadius: 16, padding: 16, marginBottom: 12 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDF9', justifyContent: 'center', alignItems: 'center' }}>
                <Phone size={20} color={colors.bloom} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>{fr ? h.label.fr : h.label.en}</Text>
                <Text style={{ fontSize: 13, color: '#999' }}>{fr ? h.sub.fr : h.sub.en}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={close} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#999' }}>{fr ? 'Je vais mieux, revenir' : 'I’m okay, go back'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // ── Loading ────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#4A9A86', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ fontSize: 16, color: '#fff', fontWeight: '600' }}>{fr ? 'On trouve les bons mots…' : 'Finding the right words…'}</Text>
      </View>
    )
  }

  // ── Result — one affirmation per full card, swipe left/right ───
  if (step === 'result') {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE[currentIndex % PALETTE.length] }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
        >
          {affirmations.map((text, i) => (
            <View
              key={i}
              style={{
                width: SCREEN_W, height: SCREEN_H,
                backgroundColor: PALETTE[i % PALETTE.length],
                justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36,
              }}
            >
              <Text style={{ fontSize: 30, lineHeight: 42, color: '#fff', textAlign: 'center', fontWeight: '800', letterSpacing: -0.3 }}>
                {text}
              </Text>
              {/* Per-card save — instant + animated, saves THIS affirmation */}
              <TouchableOpacity
                onPress={() => toggleSave(i, text)}
                activeOpacity={0.85}
                style={{ position: 'absolute', bottom: insets.bottom + 30, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 26, backgroundColor: saved[i] ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)' }}
              >
                <Animated.View style={{ transform: [{ scale: getScale(i) }] }}>
                  <Heart size={20} color="#fff" fill={saved[i] ? '#fff' : 'transparent'} />
                </Animated.View>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                  {saved[i] ? (fr ? 'Enregistré' : 'Saved') : (fr ? 'Enregistrer' : 'Save')}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Close */}
        <TouchableOpacity
          onPress={close}
          style={{ position: 'absolute', top: insets.top + 8, left: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
        >
          <X size={22} color="#fff" />
        </TouchableOpacity>

        {/* Progress dots */}
        <View style={{ position: 'absolute', bottom: insets.bottom + 92, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {affirmations.map((_, i) => (
            <View key={i} style={{ width: i === currentIndex ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)' }} />
          ))}
        </View>
      </View>
    )
  }

  // ── Intake — deep-section style: soft color, white bold, X + progress ──
  const q = INTAKE[qIndex]
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE[qIndex % PALETTE.length], paddingTop: insets.top + 8 }}>
      {/* Top bar — X + progress */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, marginBottom: 8 }}>
        <TouchableOpacity
          onPress={close}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
        >
          <X size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}>
          <View style={{ width: `${((qIndex + 1) / INTAKE.length) * 100}%`, height: 4, borderRadius: 2, backgroundColor: '#fff' }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 28, lineHeight: 36, letterSpacing: -0.3 }}>
          {fr ? q.fr : q.en}
        </Text>
        {q.options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => selectOption(opt.key)}
            activeOpacity={0.85}
            style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 12 }}
          >
            <Text style={{ fontSize: 17, color: '#fff', fontWeight: '600' }}>{fr ? opt.fr : opt.en}</Text>
          </TouchableOpacity>
        ))}
        {q.optional && (
          <TouchableOpacity onPress={skip} style={{ alignItems: 'center', marginTop: 14 }}>
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{fr ? 'Passer' : 'Skip'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}
