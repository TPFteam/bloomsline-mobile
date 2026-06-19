import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Play, RotateCcw, Lock, ChevronLeft, Clock, ChevronRight, Settings } from 'lucide-react-native'
import NotificationBell from '@/components/NotificationBell'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { WorksheetStepView } from '@/components/practitioner/WorksheetStepView'
import { saveForYouRun, getForYouHistory, cleanText, type ForYouRun } from '@/lib/services/for-you-resources'

type ViewMode = 'overview' | 'run'

// Block types that don't expect an answer (reading/media + full-screen
// practices like breathing). Anything else is an answerable input — mirrors
// the renderer's CONTENT_TYPES + IMMERSIVE_TYPES.
const NON_INPUT_TYPES = new Set([
  'heading', 'paragraph', 'quote', 'tip', 'divider', 'key_points',
  'callout', 'image', 'video', 'audio', 'link', 'pdf_document', 'spacer',
  'breathing', 'visualization', 'body_scan', 'timed_action',
])

function isAnswered(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return true // numbers, booleans (incl. 0 / false) count as answered
}

export default function ForYouActivity() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { member } = useAuth()
  const { t, locale } = useI18n()
  const fr = locale === 'fr'
  const { id, title: titleParam } = useLocalSearchParams<{ id: string; title?: string }>()

  const [blocks, setBlocks] = useState<any[] | null>(null)
  const [title, setTitle] = useState(titleParam || '')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [view, setView] = useState<ViewMode>('overview')
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<ForYouRun[]>([])
  const [justSaved, setJustSaved] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!id) return
    setHistory(await getForYouHistory(id))
  }, [id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) return
      const [{ data, error }] = await Promise.all([
        supabase.from('resources').select('title, description, blocks').eq('id', id).single(),
        loadHistory(),
      ])
      if (cancelled) return
      if (error) console.error('load for-you activity failed:', error)
      setBlocks((data?.blocks as any[]) || [])
      if (data?.title) setTitle(data.title)
      if (data?.description) setDescription(cleanText(data.description))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, loadHistory])

  const handleResponseChange = (blockId: string, value: unknown) =>
    setResponses(prev => ({ ...prev, [blockId]: value }))

  // Live: would submitting right now save an empty run? Drives the disabled
  // Submit button in the renderer.
  const hasInputs = (blocks || []).some((b: any) => !NON_INPUT_TYPES.has(b.type))
  const submitDisabled = !reviewing && hasInputs && !Object.values(responses).some(isAnswered)

  const handleSubmit = async () => {
    if (reviewing) { backToOverview(); return }
    if (submitDisabled) { blockedSubmit(); return }
    setSubmitting(true)
    await saveForYouRun({ resourceId: id!, memberId: member?.id, answers: responses })
    setSubmitting(false)
    await loadHistory()
    setJustSaved(true)
    setView('overview')
  }

  const blockedSubmit = () =>
    Alert.alert(
      fr ? 'Rien à envoyer' : 'Nothing to submit yet',
      fr ? 'Veuillez saisir une réponse avant d’envoyer.' : 'Please enter a response before submitting.',
    )

  const backToOverview = () => {
    setReviewing(false)
    setResponses({})
    setView('overview')
  }

  const startRun = () => {
    setResponses({})
    setReviewing(false)
    setJustSaved(false)
    setView('run')
  }

  const reviewRun = (run: ForYouRun) => {
    setResponses(run.answers || {})
    setReviewing(true)
    setView('run')
  }

  if (loading || blocks === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#4A9A86" />
      </View>
    )
  }

  if (view === 'run') {
    return (
      <WorksheetStepView
        blocks={blocks}
        responses={responses}
        onResponseChange={handleResponseChange}
        onSubmit={handleSubmit}
        onClose={backToOverview}
        submitting={submitting}
        submitDisabled={submitDisabled}
        onBlockedSubmit={blockedSubmit}
        isCompleted={reviewing}
        t={t}
        locale={locale}
        resourceId={id}
      />
    )
  }

  // ── Overview ───────────────────────────────────────────────────────────────
  const done = history.length > 0
  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: back + notification bell + settings */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={20} color="#999" />
            <Text style={{ fontSize: 15, color: '#999' }}>{fr ? 'Pratiques' : 'Practices'}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <NotificationBell onOpenResource={(resourceId) => {
              router.push({ pathname: '/(main)/practitioner', params: { openResourceId: resourceId } })
            }} />
            <TouchableOpacity
              onPress={() => router.push('/(main)/settings')}
              activeOpacity={0.7}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}
            >
              <Settings size={18} color="#666" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ fontSize: 26, fontWeight: '700', color: '#000', letterSpacing: -0.4, lineHeight: 33 }}>{title}</Text>
        {!!description && (
          <Text style={{ fontSize: 15, color: '#777', marginTop: 12, lineHeight: 22 }}>{description}</Text>
        )}

        {justSaved && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: '#E8F5F2', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Lock size={14} color="#4A9A86" />
            <Text style={{ fontSize: 13, color: '#3B7C6C', flex: 1 }}>
              {fr ? 'Enregistré en privé — vous seul(e) le voyez.' : 'Saved privately — only you can see it.'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={startRun}
          activeOpacity={0.85}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4A9A86', borderRadius: 16, paddingVertical: 16, marginTop: 20 }}
        >
          {done ? <RotateCcw size={18} color="#fff" /> : <Play size={18} color="#fff" fill="#fff" />}
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
            {done ? (fr ? 'Recommencer' : 'Do it again') : (fr ? 'Commencer' : 'Start')}
          </Text>
        </TouchableOpacity>

        {/* Private history */}
        {done && (
          <View style={{ marginTop: 28 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 10 }}>
              {fr ? `Vos entrées (${history.length})` : `Your entries (${history.length})`}
            </Text>
            {history.map(run => (
              <TouchableOpacity
                key={run.id}
                onPress={() => reviewRun(run)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEE', marginBottom: 8 }}
              >
                <Clock size={16} color="#9CA3AF" />
                <Text style={{ flex: 1, fontSize: 14, color: '#374151' }}>
                  {new Date(run.completed_at).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {new Date(run.completed_at).toLocaleTimeString(fr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <ChevronRight size={16} color="#CCC" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
