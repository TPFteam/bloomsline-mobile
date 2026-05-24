import { useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity, Alert, Modal, Pressable } from 'react-native'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMemberMoments, Moment, shareMomentWithPractitioner, shareMomentsWithPractitioner, unshareMomentFromPractitioner } from '@/lib/services/moments'
import { PageLoader } from '@/components/PageLoader'
import { GalleryVerticalEnd as GitBranch, LayoutGrid, Settings, CheckSquare2, X } from 'lucide-react-native'
import NotificationBell from '@/components/NotificationBell'
import { MOOD_COLORS, colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// Extracted components
import { BackButton } from '@/components/ui/BackButton'
import { MomentDetail } from '@/components/MomentDetail'
import { MoodCalendar } from '@/components/evolution/MoodCalendar'
import { RememberThisCard } from '@/components/evolution/RememberThisCard'
import { FilterRow } from '@/components/evolution/FilterRow'
import { EmotionalRiver, MomentsGrid } from '@/components/evolution/MomentCards'

type TimeRange = '7d' | '30d' | '90d'

export default function Evolution() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ openMomentId?: string; highlightLatestComment?: string }>()
  const [highlightLatest, setHighlightLatest] = useState(false)
  const [range, setRange] = useState<TimeRange>('7d')
  const [allMoments, setAllMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterMood, setFilterMood] = useState<string | null>(null)
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null)
  const [viewMode, setViewMode] = useState<'river' | 'grid'>('river')
  const [displayLimit, setDisplayLimit] = useState(20)
  const [tab, setTab] = useState<'moments' | 'patterns'>('moments')
  const [practitionerName, setPractitionerName] = useState<string | undefined>(undefined)
  const [shareConfirm, setShareConfirm] = useState<Moment | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const { member } = useAuth()
  const { t, locale } = useI18n()

  useEffect(() => {
    if (!member?.practitioner_id) return
    supabase
      .from('users')
      .select('full_name')
      .eq('id', member.practitioner_id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setPractitionerName(data.full_name)
      })
  }, [member?.practitioner_id])

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90

  const fetchData = useCallback(async () => {
    const data = await getMemberMoments(500, 0)
    setAllMoments(data)
  }, [])

  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true)
      await fetchData()
      setLoading(false)
    }
    initialFetch()
  }, [fetchData])

  // Notification deeplink: when ?openMomentId=... is in the URL and the
  // matching moment has loaded, open the detail sheet. If the deeplink
  // also says highlightLatestComment, MomentDetail will auto-scroll to
  // the most recent comment after fetching the conversation.
  useEffect(() => {
    const id = params.openMomentId
    if (!id || allMoments.length === 0) return
    const target = allMoments.find(m => m.id === id)
    if (target) {
      setHighlightLatest(params.highlightLatestComment === '1')
      setViewingMoment(target)
    }
  }, [params.openMomentId, params.highlightLatestComment, allMoments])

  const onRefresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true)
    setSelectedIds([])
  }, [])

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds([])
  }, [])

  const toggleSelect = useCallback((m: Moment) => {
    if (m.shared_with_practitioner_at) return
    setSelectedIds(prev => {
      if (prev.includes(m.id)) {
        const next = prev.filter(id => id !== m.id)
        // Deselecting the last moment = user is done. Drop out of
        // selection mode so the bottom action bar and the active
        // Cancel pill at the top don't linger with nothing selected.
        if (next.length === 0) {
          queueMicrotask(() => setSelectionMode(false))
        }
        return next
      }
      return [...prev, m.id]
    })
  }, [])

  // Long-press shortcut: flip into selection mode with this moment
  // pre-selected. If selection mode is already on, treat it like a tap
  // (toggle the moment).
  const handleLongPressMoment = useCallback((m: Moment) => {
    if (selectionMode) {
      toggleSelect(m)
      return
    }
    setSelectionMode(true)
    if (m.shared_with_practitioner_at) setSelectedIds([])
    else setSelectedIds([m.id])
  }, [selectionMode, toggleSelect])

  const confirmBulkShareAction = useCallback(async () => {
    if (!member?.practitioner_id || !member?.id) return
    const ids = selectedIds.slice()
    if (ids.length === 0) return
    setShareBusy(true)
    try {
      const sharedAt = await shareMomentsWithPractitioner(ids)
      if (!sharedAt) {
        Alert.alert(locale === 'fr' ? 'Erreur' : 'Error', locale === 'fr' ? 'Impossible de partager.' : 'Could not share.')
        return
      }
      setAllMoments(prev => prev.map(x => ids.includes(x.id) ? { ...x, shared_with_practitioner_at: sharedAt } : x))
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'
          fetch(`${API_URL}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              userId: member.practitioner_id,
              userType: 'practitioner',
              type: 'moment_shared',
              entityType: 'member',
              entityId: member.id,
              metadata: {
                memberId: member.id,
                memberName: `${(member as any).first_name || ''} ${(member as any).last_name || ''}`.trim(),
                count: ids.length,
                momentIds: ids,
              },
            }),
          }).catch(() => {})
        }
      } catch {}
    } finally {
      setShareBusy(false)
      setBulkConfirmOpen(false)
      exitSelectionMode()
    }
  }, [selectedIds, member, locale, exitSelectionMode])

  const handleShareToggle = useCallback((m: Moment) => {
    if (!member?.practitioner_id || !member?.id) {
      Alert.alert(
        locale === 'fr' ? 'Pas de praticien' : 'No practitioner',
        locale === 'fr' ? 'Connectez-vous à un praticien pour partager.' : 'Connect a practitioner to share.'
      )
      return
    }
    setShareConfirm(m)
  }, [member, locale])

  const closeShareConfirm = useCallback(() => {
    if (shareBusy) return
    setShareConfirm(null)
  }, [shareBusy])

  const confirmShareAction = useCallback(async () => {
    const m = shareConfirm
    if (!m || !member?.practitioner_id || !member?.id) return
    setShareBusy(true)
    try {
      const isShared = !!m.shared_with_practitioner_at
      if (isShared) {
        const ok = await unshareMomentFromPractitioner(m.id)
        if (!ok) {
          Alert.alert(locale === 'fr' ? 'Erreur' : 'Error', locale === 'fr' ? 'Impossible de modifier.' : 'Could not update.')
          return
        }
        setAllMoments(prev => prev.map(x => x.id === m.id ? { ...x, shared_with_practitioner_at: null } : x))
      } else {
        const sharedAt = await shareMomentWithPractitioner(m.id)
        if (!sharedAt) {
          Alert.alert(locale === 'fr' ? 'Erreur' : 'Error', locale === 'fr' ? 'Impossible de partager.' : 'Could not share.')
          return
        }
        setAllMoments(prev => prev.map(x => x.id === m.id ? { ...x, shared_with_practitioner_at: sharedAt } : x))
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'
            fetch(`${API_URL}/api/notifications/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({
                userId: member.practitioner_id,
                userType: 'practitioner',
                type: 'moment_shared',
                entityType: 'member',
                entityId: member.id,
                metadata: {
                  memberId: member.id,
                  memberName: `${(member as any).first_name || ''} ${(member as any).last_name || ''}`.trim(),
                  momentId: m.id,
                  momentType: m.type,
                  momentMood: m.moods?.[0] || null,
                  momentDate: m.created_at,
                },
              }),
            }).catch(() => {})
          }
        } catch {}
      }
    } finally {
      setShareBusy(false)
      setShareConfirm(null)
    }
  }, [shareConfirm, member, locale])

  // Range-filtered moments for analytics
  const rangeSince = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.getTime()
  }, [days])

  const moments = useMemo(() =>
    allMoments.filter(m => new Date(m.created_at).getTime() >= rangeSince),
    [allMoments, rangeSince]
  )

  // ─── Computed stats ────────────────────────────────

  const moodCounts: Record<string, number> = {}
  let totalMoodEntries = 0
  moments.forEach(m => {
    m.moods?.forEach(mood => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1
      totalMoodEntries++
    })
  })
  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])

  const daySet = new Set<string>()
  moments.forEach(m => daySet.add(m.created_at.split('T')[0]))
  const activeDays = daySet.size

  // Filtered moments for library
  const filteredMoments = useMemo(() => {
    let filtered = allMoments
    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType)
    }
    if (filterMood) {
      filtered = filtered.filter(m => m.moods?.includes(filterMood))
    }
    setDisplayLimit(20) // reset on filter change
    return filtered
  }, [allMoments, filterType, filterMood])

  const displayedMoments = useMemo(() =>
    filteredMoments.slice(0, displayLimit),
    [filteredMoments, displayLimit]
  )
  const hasMore = displayLimit < filteredMoments.length

  const allMoodCounts: Record<string, number> = {}
  allMoments.forEach(m => { m.moods?.forEach(mood => { allMoodCounts[mood] = (allMoodCounts[mood] || 0) + 1 }) })
  const availableMoods = Object.entries(allMoodCounts).sort((a, b) => b[1] - a[1]).map(([mood]) => mood)

  if (loading) return <PageLoader />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sticky header */}
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, backgroundColor: colors.bg, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(main)/home')} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
            {t.evolution?.title || 'My Journey'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <NotificationBell onOpenResource={() => {}} />
            <TouchableOpacity
              onPress={() => router.push('/(main)/settings')}
              activeOpacity={0.7}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}
            >
              <Settings size={18} color="#666" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab switcher: Moments / Patterns */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.surface1,
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
        }}>
          {(['moments', 'patterns'] as const).map(k => {
            const active = tab === k
            const label = k === 'moments'
              ? (locale === 'fr' ? 'Moments' : 'Moments')
              : (locale === 'fr' ? 'Tendances' : 'Patterns')
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setTab(k)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: active ? colors.bg : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: active ? colors.primary : colors.textTertiary,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <PullToRefreshScrollView
        onRefresh={onRefresh}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >

        {tab === 'patterns' && (
          <>
        {/* Time range picker */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['7d', '30d', '90d'] as TimeRange[]).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: range === r ? colors.primary : '#fff',
                borderWidth: range === r ? 0 : 1,
                borderColor: '#EBEBEB',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: range === r ? '#fff' : colors.textSecondary }}>
                {r === '7d' ? t.evolution.days7 : r === '30d' ? t.evolution.days30 : t.evolution.days90}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Personal insight */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#EBEBEB',
        }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.primary, lineHeight: 28 }}>
            {moments.length === 0
              ? (locale === 'fr' ? 'Pas encore de moments cette période.' : 'No moments yet this period.')
              : activeDays === 1
                ? (locale === 'fr' ? `Vous avez capturé ${moments.length} moment${moments.length > 1 ? 's' : ''} en ${activeDays} jour.` : `You captured ${moments.length} moment${moments.length > 1 ? 's' : ''} in ${activeDays} day.`)
                : (locale === 'fr' ? `Vous avez capturé ${moments.length} moment${moments.length > 1 ? 's' : ''} en ${activeDays} jours.` : `You captured ${moments.length} moment${moments.length > 1 ? 's' : ''} across ${activeDays} days.`)
            }
          </Text>
          {activeDays > 0 && (
            <Text style={{ fontSize: 14, color: '#999', marginTop: 8, lineHeight: 20 }}>
              {activeDays >= days * 0.7
                ? (locale === 'fr' ? 'Belle régularité. Continuez comme ça.' : "That's great consistency. Keep it up.")
                : activeDays >= days * 0.4
                  ? (locale === 'fr' ? 'Vous prenez le rythme.' : "You're building a rhythm.")
                  : (locale === 'fr' ? 'Chaque moment compte.' : 'Every moment counts.')}
            </Text>
          )}
        </View>

        {/* Mood bars — conversational */}
        {sortedMoods.length > 0 && (
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#EBEBEB',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 16 }}>
              {locale === 'fr' ? 'Ce que vous avez ressenti' : 'How you felt'}
            </Text>
            {sortedMoods.slice(0, 5).map(([mood, count], i) => {
              const moodColor = MOOD_COLORS[mood] || '#888'
              const pct = Math.round((count / totalMoodEntries) * 100)
              const moodLabel = t.moods[mood as keyof typeof t.moods] || mood
              return (
                <View key={mood} style={{ marginBottom: i < Math.min(sortedMoods.length, 5) - 1 ? 14 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                      {moodLabel}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#BBB' }}>
                      {count}×
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: '#F5F5F3' }}>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: moodColor, width: `${Math.max(pct, 8)}%` }} />
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Mood Calendar */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 20,
          marginBottom: 28,
          borderWidth: 1,
          borderColor: '#EBEBEB',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 16 }}>
            {locale === 'fr' ? 'Votre rythme' : 'Your rhythm'}
          </Text>
          <MoodCalendar moments={moments} days={days} />
        </View>
          </>
        )}

        {tab === 'moments' && (
          <>
        {/* ─── Moments Library ─── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: colors.textTertiary, textTransform: 'uppercase' }}>
            {t.evolution.yourMoments}
          </Text>
        </View>

        {/* Remember This */}
        <RememberThisCard moments={allMoments} onPress={setViewingMoment} />

        {/* Filters + bulk-select toggle + view-mode toggle */}
        <View style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <FilterRow
            activeType={filterType}
            onTypeChange={setFilterType}
            activeMood={filterMood}
            onMoodChange={setFilterMood}
            availableMoods={availableMoods}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={selectionMode ? exitSelectionMode : enterSelectionMode}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel={selectionMode ? (locale === 'fr' ? 'Annuler la sélection' : 'Cancel selection') : (locale === 'fr' ? 'Sélectionner' : 'Select')}
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: selectionMode ? colors.bloom : '#fff',
                borderWidth: selectionMode ? 0 : 1,
                borderColor: '#EBEBEB',
                justifyContent: 'center', alignItems: 'center',
              }}
            >
              {selectionMode
                ? <X size={16} color="#fff" strokeWidth={2.5} />
                : <CheckSquare2 size={16} color={colors.textSecondary} strokeWidth={2} />}
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface1, borderRadius: 12, padding: 3 }}>
              <TouchableOpacity
                onPress={() => setViewMode('river')}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: viewMode === 'river' ? colors.bg : 'transparent',
                }}
              >
                <GitBranch size={16} color={viewMode === 'river' ? colors.primary : colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode('grid')}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: viewMode === 'grid' ? colors.bg : 'transparent',
                }}
              >
                <LayoutGrid size={16} color={viewMode === 'grid' ? colors.primary : colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* River or Grid view */}
        {viewMode === 'river' ? (
          <EmotionalRiver
            moments={displayedMoments}
            onMomentPress={setViewingMoment}
            onShareToggle={handleShareToggle}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onLongPress={handleLongPressMoment}
          />
        ) : (
          <MomentsGrid
            moments={displayedMoments}
            onMomentPress={setViewingMoment}
            onShareToggle={handleShareToggle}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onLongPress={handleLongPressMoment}
          />
        )}

        {/* Load more */}
        {hasMore && (
          <TouchableOpacity
            onPress={() => setDisplayLimit(prev => prev + 80)}
            activeOpacity={0.8}
            style={{
              alignSelf: 'center',
              marginTop: 20,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 20,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#EBEBEB',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
              {locale === 'fr' ? 'Voir plus' : 'Load more'}
            </Text>
          </TouchableOpacity>
        )}
          </>
        )}
      </PullToRefreshScrollView>

      {/* Moment detail sheet */}
      {viewingMoment && (
        <MomentDetail
          moment={viewingMoment}
          onClose={() => { setViewingMoment(null); setHighlightLatest(false) }}
          onShareToggle={(m) => { setViewingMoment(null); handleShareToggle(m) }}
          highlightLatestComment={highlightLatest}
        />
      )}

      {/* Selection action bar pinned to the bottom of the screen
          while bulk-select is active. */}
      {selectionMode && (
        <View style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingTop: 12, paddingBottom: insets.bottom + 12, paddingHorizontal: 16,
          backgroundColor: '#fff',
          borderTopWidth: 1, borderTopColor: '#EBEBEB',
          flexDirection: 'row', alignItems: 'center', gap: 12,
          shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
        }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary }}>
            {selectedIds.length === 0
              ? (locale === 'fr' ? 'Sélectionnez des moments à partager' : 'Select moments to share')
              : selectedIds.length === 1
                ? (locale === 'fr' ? '1 moment sélectionné' : '1 moment selected')
                : (locale === 'fr' ? `${selectedIds.length} moments sélectionnés` : `${selectedIds.length} moments selected`)}
          </Text>
          <TouchableOpacity
            onPress={() => selectedIds.length > 0 && setBulkConfirmOpen(true)}
            activeOpacity={0.85}
            disabled={selectedIds.length === 0}
            style={{
              paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14,
              backgroundColor: colors.bloom,
              opacity: selectedIds.length === 0 ? 0.45 : 1,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
              {locale === 'fr'
                ? (selectedIds.length > 1 ? `Partager ${selectedIds.length}` : 'Partager')
                : (selectedIds.length > 1 ? `Share ${selectedIds.length}` : 'Share')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bulk-share confirmation */}
      <Modal
        visible={bulkConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !shareBusy && setBulkConfirmOpen(false)}
      >
        <Pressable
          onPress={() => !shareBusy && setBulkConfirmOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary, marginBottom: 8 }}>
              {(() => {
                const n = selectedIds.length
                const display = practitionerName || (locale === 'fr' ? 'votre praticien' : 'your practitioner')
                if (locale === 'fr') return n === 1 ? `Partager avec ${display} ?` : `Partager ${n} moments avec ${display} ?`
                return n === 1 ? `Share with ${display}?` : `Share ${n} moments with ${display}?`
              })()}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 20 }}>
              {locale === 'fr'
                ? 'Ces moments apparaîtront dans leur tableau de bord et une notification leur sera envoyée.'
                : 'They will appear on their dashboard and a notification will be sent.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setBulkConfirmOpen(false)}
                disabled={shareBusy}
                activeOpacity={0.7}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
                  {locale === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmBulkShareAction}
                disabled={shareBusy}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: colors.bloom,
                  opacity: shareBusy ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  {shareBusy ? '...' : (locale === 'fr' ? 'Partager' : 'Share')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Share confirmation modal. Custom Modal instead of Alert.alert
          because Alert.alert with multiple buttons is flaky on RN Web. */}
      <Modal
        visible={!!shareConfirm}
        transparent
        animationType="fade"
        onRequestClose={closeShareConfirm}
      >
        <Pressable
          onPress={closeShareConfirm}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 20, padding: 24 }}>
            {shareConfirm && (() => {
              const isShared = !!shareConfirm.shared_with_practitioner_at
              const display = practitionerName || (locale === 'fr' ? 'votre praticien' : 'your practitioner')
              const title = isShared
                ? (locale === 'fr' ? 'Arrêter le partage ?' : 'Stop sharing?')
                : (locale === 'fr' ? `Partager avec ${display} ?` : `Share with ${display}?`)
              const body = isShared
                ? (locale === 'fr' ? `Ce moment ne sera plus visible par ${display}.` : `${display} will no longer see this moment.`)
                : (locale === 'fr' ? 'Ce moment apparaîtra dans leur tableau de bord.' : 'This moment will appear on their dashboard.')
              const confirmLabel = isShared
                ? (locale === 'fr' ? 'Arrêter' : 'Stop sharing')
                : (locale === 'fr' ? 'Partager' : 'Share')
              return (
                <>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary, marginBottom: 8 }}>
                    {title}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 20 }}>
                    {body}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      onPress={closeShareConfirm}
                      disabled={shareBusy}
                      activeOpacity={0.7}
                      style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
                        {locale === 'fr' ? 'Annuler' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmShareAction}
                      disabled={shareBusy}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                        backgroundColor: isShared ? '#EF4444' : colors.primary,
                        opacity: shareBusy ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                        {shareBusy ? (locale === 'fr' ? '...' : '...') : confirmLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
