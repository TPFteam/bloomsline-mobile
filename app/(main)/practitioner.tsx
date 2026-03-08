import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Alert,
  Platform,
  Share,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { BackButton } from '@/components/ui/BackButton'
import { PageLoader } from '@/components/PageLoader'
import { useAuth } from '@/lib/auth-context'
import { colors } from '@/lib/theme'
import { renderBlock } from '@/components/practitioner/BlockRenderer'
import {
  fetchPractitioner,
  fetchSessions,
  fetchResources,
  confirmSession,
  requestReschedule,
  acceptProposedDate,
  declineProposedDate,
  invitePractitioner,
  openResourceForFill,
  saveDraft,
  submitResource,
  markResourceComplete,
  PractitionerProfile,
  UpcomingSession,
  ResourceItem,
} from '@/lib/services/practitioner'

// ─── Helpers ────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function getSessionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    initial: 'Initial Session', initial_consultation: 'Initial Session',
    follow_up: 'Follow-up', check_in: 'Check-in',
    emergency: 'Emergency', crisis: 'Crisis',
    assessment: 'Assessment', group: 'Group', other: 'Session',
  }
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getFormatLabel(format: string): string {
  return ({ video: 'Video', virtual: 'Video', in_person: 'In Person', phone: 'Phone' } as Record<string, string>)[format] || format
}

// ─── Main Component ─────────────────────────────────

export default function PractitionerScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { member } = useAuth()

  const [loading, setLoading] = useState(true)
  const [practitioner, setPractitioner] = useState<PractitionerProfile | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [pastSessions, setPastSessions] = useState<UpcomingSession[]>([])
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [showAllResources, setShowAllResources] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Reschedule
  const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(null)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [suggestedDate, setSuggestedDate] = useState('')
  const [suggestedTime, setSuggestedTime] = useState('')

  // Resources
  const [viewingResource, setViewingResource] = useState<ResourceItem | null>(null)
  const [fillResource, setFillResource] = useState<any>(null)
  const [fillLoading, setFillLoading] = useState(false)
  const [activeResourceItem, setActiveResourceItem] = useState<ResourceItem | null>(null)
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [draftResponseId, setDraftResponseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Quick access
  const [quickModal, setQuickModal] = useState<'practitioners' | 'assessments' | null>(null)
  const [assessmentFilter, setAssessmentFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const practitionerId = member?.practitioner_id

  // ─── Data Fetching ──────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!member?.id) { setLoading(false); return }
    try {
      const [practData, sessionsData, resourcesData] = await Promise.all([
        practitionerId ? fetchPractitioner(practitionerId) : Promise.resolve(null),
        fetchSessions(member.id),
        practitionerId ? fetchResources(member.id) : Promise.resolve([]),
      ])
      setPractitioner(practData)
      setUpcomingSessions(sessionsData.upcoming)
      setPastSessions(sessionsData.past)
      setResources(resourcesData)
    } catch (error) {
      console.error('Error loading practitioner data:', error)
    } finally {
      setLoading(false)
    }
  }, [member?.id, practitionerId])

  useFocusEffect(useCallback(() => { fetchData() }, [fetchData]))

  const onRefresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // ─── Session Actions ────────────────────────────────

  async function handleConfirmSession(sessionId: string) {
    setActionLoading(sessionId)
    const ok = await confirmSession(sessionId)
    if (ok) setUpcomingSessions(prev => prev.map(s => s.id === sessionId ? { ...s, member_confirmed: true, reschedule_requested: false } : s))
    setActionLoading(null)
  }

  async function handleRequestReschedule(sessionId: string) {
    if (!rescheduleReason.trim()) return
    setActionLoading(sessionId)
    const ok = await requestReschedule(sessionId, rescheduleReason.trim(), suggestedDate, suggestedTime)
    if (ok) {
      setUpcomingSessions(prev => prev.map(s => s.id === sessionId ? { ...s, reschedule_requested: true, member_confirmed: false, reschedule_status: 'pending' as const } : s))
      setRescheduleSessionId(null); setRescheduleReason(''); setSuggestedDate(''); setSuggestedTime('')
    }
    setActionLoading(null)
  }

  async function handleAcceptProposed(session: UpcomingSession) {
    setActionLoading(session.id)
    const ok = await acceptProposedDate(session)
    if (ok) setUpcomingSessions(prev => prev.map(s => s.id === session.id ? { ...s, scheduled_at: session.practitioner_proposed_date!, reschedule_requested: false, reschedule_status: 'accepted' as const, member_confirmed: true, practitioner_proposed_date: null } : s))
    setActionLoading(null)
  }

  async function handleDeclineProposed(sessionId: string) {
    setActionLoading(sessionId)
    const ok = await declineProposedDate(sessionId)
    if (ok) setUpcomingSessions(prev => prev.map(s => s.id === sessionId ? { ...s, reschedule_status: 'pending' as const, practitioner_proposed_date: null } : s))
    setActionLoading(null)
  }

  // ─── Resource Actions ───────────────────────────────

  async function handleOpenResource(item: ResourceItem) {
    setViewingResource(null); setFillLoading(true); setActiveResourceItem(item); setResponses({}); setDraftResponseId(null)
    try {
      const result = await openResourceForFill(item, member!.id, member!.practitioner_id)
      setFillResource(result.resource); setDraftResponseId(result.responseId); setResponses(result.responses)
    } catch {
      Alert.alert('Error', 'Failed to load resource.')
      setFillResource(null); setActiveResourceItem(null)
    } finally { setFillLoading(false) }
  }

  function closeFill() {
    setFillResource(null); setActiveResourceItem(null); setResponses({}); setDraftResponseId(null); fetchData()
  }

  function handleCloseFill() {
    if (activeResourceItem?.type === 'assignment' && draftResponseId && Object.keys(responses).length > 0) {
      Alert.alert('Save progress?', 'You have unsaved changes.', [
        { text: 'Discard', style: 'destructive', onPress: closeFill },
        { text: 'Save & Close', onPress: () => handleSaveDraft().then(closeFill) },
      ])
    } else closeFill()
  }

  async function handleSaveDraft() {
    if (!draftResponseId) return
    setSaving(true); await saveDraft(draftResponseId, responses); setSaving(false)
  }

  async function handleSubmit() {
    if (!draftResponseId || !activeResourceItem) return
    setSubmitting(true)
    const ok = await submitResource(draftResponseId, activeResourceItem.id, responses)
    if (ok) { closeFill(); Alert.alert('Submitted', 'Your response has been submitted.') }
    setSubmitting(false)
  }

  async function handleMarkComplete() {
    if (!activeResourceItem) return
    setSubmitting(true)
    await markResourceComplete(activeResourceItem, draftResponseId, responses)
    closeFill(); Alert.alert('Done', 'Resource marked as complete.')
    setSubmitting(false)
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    const ok = await invitePractitioner(inviteEmail.trim())
    if (ok) { Alert.alert('Sent!', 'Invitation sent.'); setInviteEmail('') }
    else Alert.alert('Error', 'Failed to send invitation.')
    setInviteSending(false)
  }

  // ─── Loading ────────────────────────────────────────

  if (loading) return <PageLoader />

  const displayResources = showAllResources ? resources : resources.slice(0, 3)
  const displayHistory = showAllHistory ? pastSessions : pastSessions.slice(0, 3)
  const filteredResources = assessmentFilter === 'all' ? resources
    : assessmentFilter === 'pending' ? resources.filter(r => r.status !== 'completed')
    : resources.filter(r => r.status === 'completed')

  // ─── Render ─────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      <PullToRefreshScrollView
        onRefresh={onRefresh}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 28 }}>
          <BackButton />
        </View>

        <Text style={{ fontSize: 30, fontWeight: '700', color: colors.primary, letterSpacing: -0.8, lineHeight: 38, marginBottom: 28 }}>
          My Practitioner
        </Text>

        {/* ═══════════════════════════════════════════════ */}
        {/* PRACTITIONER CARD */}
        {/* ═══════════════════════════════════════════════ */}
        <TouchableOpacity
          activeOpacity={practitioner ? 0.85 : 1}
          onPress={() => { if (practitioner) setQuickModal('practitioners') }}
          style={{
            backgroundColor: '#fff', borderRadius: 22, padding: 24, marginBottom: 32,
            borderWidth: 1, borderColor: '#EBEBEB',
          }}
        >
          {practitioner ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {practitioner.avatar_url ? (
                <Image source={{ uri: practitioner.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface1 }} />
              ) : (
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bloom, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>
                    {(practitioner.full_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary, letterSpacing: -0.3 }}>
                  {practitioner.full_name || 'Your Practitioner'}
                </Text>
                {practitioner.headline && (
                  <Text style={{ fontSize: 13, color: '#8A8A8A', marginTop: 2 }} numberOfLines={2}>
                    {practitioner.headline}
                  </Text>
                )}
                {practitioner.specialties.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {practitioner.specialties.slice(0, 3).map((s, i) => (
                      <View key={i} style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.bloom }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 20, color: '#D4D4D4' }}>›</Text>
            </View>
          ) : (
            /* ── No Practitioner — Invite Flow ── */
            <View style={{ paddingVertical: 8 }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{
                  width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface1,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 28 }}>🌿</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center', letterSpacing: -0.3 }}>
                  Connect with your practitioner
                </Text>
                <Text style={{ fontSize: 15, color: '#8A8A8A', marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
                  Invite your therapist to share progress, resources, and sessions together.
                </Text>
              </View>

              {/* Email invite */}
              <View style={{ marginBottom: 12 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.surface2, borderRadius: 16,
                }}>
                  <TextInput
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="Enter practitioner's email"
                    placeholderTextColor="#CCCCCC"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1, paddingHorizontal: 16,
                      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
                      fontSize: 15, color: colors.primary,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleInvite}
                    disabled={inviteSending || !inviteEmail.trim()}
                    activeOpacity={0.7}
                    style={{
                      marginRight: 6, width: 40, height: 40, borderRadius: 20,
                      backgroundColor: inviteEmail.trim() ? colors.primary : colors.disabled,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {inviteSending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ fontSize: 18, color: '#fff', fontWeight: '300' }}>→</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Copy link + Share */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync('https://bloomsline.com/practitioner')
                    setInviteCopied(true)
                    setTimeout(() => setInviteCopied(false), 2000)
                  }}
                  activeOpacity={0.7}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                    backgroundColor: inviteCopied ? colors.surface1 : colors.surface2,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: inviteCopied ? colors.bloom : colors.primary }}>
                    {inviteCopied ? '✓ Copied' : 'Copy link'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Share.share({ message: 'Join me on Bloomsline Care! Sign up as a practitioner: https://bloomsline.com/practitioner' })}
                  activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: colors.surface2 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {practitioner && (<>
        {/* ═══════════════════════════════════════════════ */}
        {/* BOOK APPOINTMENT + VIEW PROFILE */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={{ gap: 10, marginBottom: 32 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (member?.practitioner_id) {
                router.push({ pathname: '/(main)/booking', params: { practitionerId: member.practitioner_id } })
              }
            }}
            style={{
              backgroundColor: colors.bloom, borderRadius: 22, padding: 24,
              shadowColor: colors.bloom, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 10 }}>
              Book Appointment
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
              Schedule a session →
            </Text>
          </TouchableOpacity>

          {practitioner.slug && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (member?.practitioner_id) {
                  router.push({ pathname: '/(main)/practitioner-profile', params: { practitionerId: member.practitioner_id } })
                }
              }}
              style={{
                backgroundColor: '#fff', borderRadius: 22, padding: 24,
                borderWidth: 1, borderColor: '#EBEBEB',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: '#8A8A8A', textTransform: 'uppercase', marginBottom: 10 }}>
                Practitioner Profile
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3 }}>
                View full profile →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* RESOURCES */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: '#8A8A8A', textTransform: 'uppercase' }}>
              Resources
            </Text>
            {resources.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllResources(!showAllResources)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>
                  {showAllResources ? 'View less' : 'View all'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {resources.length > 0 ? (
            <View style={{ gap: 10 }}>
              {displayResources.map((item) => (
                <ResourceCard key={item.id} item={item} onPress={() => setViewingResource(item)} />
              ))}
            </View>
          ) : (
            <EmptyState emoji="📋" title="No resources yet" subtitle="Your practitioner will share worksheets and exercises here." />
          )}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* UPCOMING SESSIONS */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: '#8A8A8A', textTransform: 'uppercase', marginBottom: 14 }}>
            Upcoming Sessions
          </Text>

          {upcomingSessions.length === 0 ? (
            <EmptyState emoji="📅" title="No upcoming sessions" subtitle="Your practitioner will schedule sessions with you." />
          ) : (
            <View style={{ gap: 10 }}>
              {upcomingSessions.map((session) => (
                <UpcomingSessionCard
                  key={session.id}
                  session={session}
                  actionLoading={actionLoading}
                  onConfirm={() => handleConfirmSession(session.id)}
                  onReschedule={() => { setRescheduleSessionId(session.id); setRescheduleReason(''); setSuggestedDate(''); setSuggestedTime('') }}
                  onAcceptProposed={() => handleAcceptProposed(session)}
                  onDeclineProposed={() => handleDeclineProposed(session.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* SESSION HISTORY */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: '#8A8A8A', textTransform: 'uppercase' }}>
              Session History
            </Text>
            {pastSessions.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllHistory(!showAllHistory)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>
                  {showAllHistory ? 'View less' : 'View all'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {pastSessions.length === 0 ? (
            <EmptyState emoji="🕐" title="No session history" subtitle="Completed sessions will appear here." />
          ) : (
            <View style={{ gap: 10 }}>
              {displayHistory.map((session) => (
                <PastSessionCard key={session.id} session={session} />
              ))}
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* QUICK ACCESS */}
        {/* ═══════════════════════════════════════════════ */}
        <View>
          <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: '#8A8A8A', textTransform: 'uppercase', marginBottom: 14 }}>
            Quick Access
          </Text>
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setQuickModal('practitioners')}
              style={{
                backgroundColor: colors.bloom, borderRadius: 22, padding: 24,
                shadowColor: colors.bloom, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 10 }}>
                My Practitioners
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
                View practitioner details →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setAssessmentFilter('all'); setQuickModal('assessments') }}
              style={{
                backgroundColor: '#fff', borderRadius: 22, padding: 24,
                borderWidth: 1, borderColor: '#EBEBEB',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: '#8A8A8A', textTransform: 'uppercase', marginBottom: 10 }}>
                My Assessments
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3 }}>
                Worksheets & exercises →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </>)}
      </PullToRefreshScrollView>

      {/* ═══════════════════════════════════════════════ */}
      {/* RESCHEDULE MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal visible={!!rescheduleSessionId} transparent animationType="fade" onRequestClose={() => setRescheduleSessionId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }} onPress={() => setRescheduleSessionId(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: insets.bottom + 28,
          }} onPress={() => {}}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3, marginBottom: 4 }}>
              Request Reschedule
            </Text>
            <Text style={{ fontSize: 15, color: '#8A8A8A', marginBottom: 20 }}>
              Let your practitioner know why you'd like to reschedule.
            </Text>

            <TextInput
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              placeholder="Reason for rescheduling..."
              placeholderTextColor="#CCCCCC"
              multiline
              style={{
                backgroundColor: colors.surface2, borderRadius: 16, padding: 16, fontSize: 15,
                color: colors.primary, minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
              }}
            />

            {/* Suggest date */}
            <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 10 }}>
                Suggest a new date (optional)
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#8A8A8A', marginBottom: 4 }}>Date</Text>
                  <TextInput
                    value={suggestedDate} onChangeText={setSuggestedDate}
                    placeholder="YYYY-MM-DD" placeholderTextColor="#CCCCCC"
                    style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 13, color: colors.primary }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#8A8A8A', marginBottom: 4 }}>Time</Text>
                  <TextInput
                    value={suggestedTime} onChangeText={setSuggestedTime}
                    placeholder="HH:MM" placeholderTextColor="#CCCCCC"
                    style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 13, color: colors.primary }}
                  />
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRescheduleSessionId(null)}
                style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 28, backgroundColor: colors.surface1 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => rescheduleSessionId && handleRequestReschedule(rescheduleSessionId)}
                disabled={actionLoading === rescheduleSessionId || !rescheduleReason.trim()}
                style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: rescheduleReason.trim() ? colors.primary : colors.disabled,
                  borderRadius: 28, paddingVertical: 14,
                }}
              >
                {actionLoading === rescheduleSessionId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* RESOURCE DETAIL MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal visible={!!viewingResource} transparent animationType="slide" onRequestClose={() => setViewingResource(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }} onPress={() => setViewingResource(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: insets.bottom + 28, maxHeight: '80%',
          }} onPress={() => {}}>
            {viewingResource && (
              <>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginBottom: 20 }} />

                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3, marginBottom: 8 }}>
                  {viewingResource.title}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <StatusBadge status={viewingResource.status} />
                  {viewingResource.resourceType && (
                    <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: '#8A8A8A', textTransform: 'capitalize' }}>
                        {viewingResource.resourceType.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#8A8A8A' }}>
                      {viewingResource.type === 'assignment' ? 'Assigned' : 'Shared'}
                    </Text>
                  </View>
                </View>

                {viewingResource.description && (
                  <Text style={{ fontSize: 15, color: '#8A8A8A', lineHeight: 22, marginBottom: 16 }}>
                    {viewingResource.description}
                  </Text>
                )}

                {viewingResource.instructions && (
                  <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: colors.primary, lineHeight: 20 }}>{viewingResource.instructions}</Text>
                  </View>
                )}

                {viewingResource.dueDate && (
                  <Text style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 16 }}>
                    Due {formatDate(viewingResource.dueDate)}
                  </Text>
                )}

                {viewingResource.status !== 'completed' && (
                  <TouchableOpacity
                    onPress={() => handleOpenResource(viewingResource)}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 16, alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>
                      {viewingResource.status === 'in_progress' ? 'Continue' : 'Start'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* RESOURCE FILL MODAL (Full Screen) */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal visible={!!fillResource || fillLoading} animationType="slide" onRequestClose={handleCloseFill}>
        <View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingTop: insets.top }}>
          {fillLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.bloom} />
            </View>
          ) : fillResource && (
            <>
              {/* Header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff',
                borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
              }}>
                <TouchableOpacity onPress={handleCloseFill} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, color: colors.primary, marginTop: -1 }}>‹</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary, flex: 1, textAlign: 'center', marginHorizontal: 12 }} numberOfLines={1}>
                  {activeResourceItem?.title}
                </Text>
                {activeResourceItem?.type === 'assignment' && draftResponseId ? (
                  <TouchableOpacity onPress={handleSaveDraft} disabled={saving}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: saving ? '#CCCCCC' : colors.bloom }}>
                      {saving ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                ) : <View style={{ width: 36 }} />}
              </View>

              {/* Blocks */}
              <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
                {(() => {
                  const blocks: any[] = Array.isArray(fillResource.blocks) ? fillResource.blocks
                    : Array.isArray(fillResource.content?.blocks) ? fillResource.content.blocks : []
                  return blocks.map((block: any, i: number) => (
                    <View key={block.id || i} style={{ marginBottom: 24 }}>
                      {renderBlock(block, responses[block.id], (v) => setResponses(prev => ({ ...prev, [block.id]: v })))}
                    </View>
                  ))
                })()}
              </ScrollView>

              {/* Bottom action bar */}
              <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EBEBEB',
                paddingHorizontal: 24, paddingVertical: 16, paddingBottom: insets.bottom + 16,
                flexDirection: 'row', gap: 10,
              }}>
                {activeResourceItem?.type === 'assignment' && ['worksheet', 'exercise', 'table', 'assessment'].includes(activeResourceItem.resourceType || '') ? (
                  <>
                    {draftResponseId && (
                      <TouchableOpacity
                        onPress={handleSaveDraft} disabled={saving}
                        style={{ flex: 1, backgroundColor: colors.surface1, borderRadius: 28, paddingVertical: 16, alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>{saving ? 'Saving...' : 'Save Draft'}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={handleSubmit} disabled={submitting}
                      style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 16, alignItems: 'center' }}
                    >
                      {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Submit</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={handleMarkComplete} disabled={submitting}
                    style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 16, alignItems: 'center' }}
                  >
                    {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                        {activeResourceItem?.type === 'shared' ? 'Mark as Read' : 'Mark Complete'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* PRACTITIONERS MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal visible={quickModal === 'practitioners'} transparent animationType="slide" onRequestClose={() => setQuickModal(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }} onPress={() => setQuickModal(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: insets.bottom + 28,
          }} onPress={() => {}}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginBottom: 20 }} />

            {practitioner ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  {practitioner.avatar_url ? (
                    <Image source={{ uri: practitioner.avatar_url }} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface1 }} />
                  ) : (
                    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bloom, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>{(practitioner.full_name || '?')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary, letterSpacing: -0.3 }}>{practitioner.full_name}</Text>
                    {practitioner.headline && (
                      <Text style={{ fontSize: 14, color: '#8A8A8A', marginTop: 4 }}>{practitioner.headline}</Text>
                    )}
                  </View>
                </View>

                {practitioner.credentials.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {practitioner.credentials.map((c, i) => (
                      <View key={i} style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.bloom }}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {practitioner.specialties.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                    {practitioner.specialties.map((s, i) => (
                      <View key={i} style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Stats */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { value: pastSessions.filter(s => s.status === 'completed').length, label: 'Sessions' },
                    { value: resources.length, label: 'Resources' },
                    { value: upcomingSessions.length, label: 'Upcoming' },
                  ].map((stat) => (
                    <View key={stat.label} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary }}>{stat.value}</Text>
                      <Text style={{ fontSize: 11, color: '#8A8A8A', marginTop: 2 }}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <EmptyState emoji="👤" title="No practitioner" subtitle="Connect with a practitioner to get started." />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* ASSESSMENTS MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal visible={quickModal === 'assessments'} transparent animationType="slide" onRequestClose={() => setQuickModal(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }} onPress={() => setQuickModal(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: insets.bottom + 28, maxHeight: '85%',
          }} onPress={() => {}}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3, marginBottom: 16 }}>
              My Assessments
            </Text>

            {/* Filter tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface1, borderRadius: 14, padding: 3, marginBottom: 16 }}>
              {(['all', 'pending', 'completed'] as const).map(tab => (
                <TouchableOpacity
                  key={tab} onPress={() => setAssessmentFilter(tab)} activeOpacity={0.8}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: assessmentFilter === tab ? '#fff' : 'transparent',
                    ...(assessmentFilter === tab ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 } : {}),
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '600',
                    color: assessmentFilter === tab ? colors.primary : '#8A8A8A',
                  }}>
                    {tab === 'all' ? `All (${resources.length})`
                      : tab === 'pending' ? `To Do (${resources.filter(r => r.status !== 'completed').length})`
                      : `Done (${resources.filter(r => r.status === 'completed').length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {filteredResources.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {filteredResources.map(item => (
                    <ResourceCard key={item.id} item={item} onPress={() => { setQuickModal(null); setViewingResource(item) }} />
                  ))}
                </View>
              ) : (
                <EmptyState emoji="📝" title="Nothing here" subtitle="No resources in this category." />
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ─── Shared Components ──────────────────────────────

function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <View style={{ backgroundColor: colors.surface2, borderRadius: 24, padding: 32, alignItems: 'center' }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>{emoji}</Text>
      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.primary, textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 15, color: '#8A8A8A', textAlign: 'center' }}>{subtitle}</Text>
    </View>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === 'completed'
  const isInProgress = status === 'in_progress'
  return (
    <View style={{
      backgroundColor: isCompleted ? colors.surface1 : isInProgress ? colors.surface1 : colors.surface1,
      borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    }}>
      <Text style={{
        fontSize: 11, fontWeight: '600',
        color: isCompleted ? colors.bloom : isInProgress ? colors.primary : '#8A8A8A',
      }}>
        {isCompleted ? '✓ Done' : isInProgress ? 'In progress' : 'To do'}
      </Text>
    </View>
  )
}

function ResourceCard({ item, onPress }: { item: ResourceItem; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: '#fff', borderRadius: 18, padding: 16,
      borderWidth: 1, borderColor: '#EBEBEB',
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20 }}>📄</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }} numberOfLines={1}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <StatusBadge status={item.status} />
          {item.dueDate && (
            <Text style={{ fontSize: 11, color: '#8A8A8A' }}>Due {formatDate(item.dueDate)}</Text>
          )}
        </View>
      </View>
      <Text style={{ fontSize: 18, color: '#D4D4D4' }}>›</Text>
    </TouchableOpacity>
  )
}

function UpcomingSessionCard({
  session, actionLoading, onConfirm, onReschedule, onAcceptProposed, onDeclineProposed,
}: {
  session: UpcomingSession; actionLoading: string | null
  onConfirm: () => void; onReschedule: () => void
  onAcceptProposed: () => void; onDeclineProposed: () => void
}) {
  const sessionDate = new Date(session.scheduled_at)
  const needsConfirmation = !session.member_confirmed && !session.reschedule_requested && session.reschedule_status !== 'proposed'
  const hasProposedDate = session.reschedule_status === 'proposed' && session.practitioner_proposed_date
  const isLoading = actionLoading === session.id

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 22, padding: 20,
      borderWidth: 1, borderColor: '#EBEBEB',
    }}>
      {/* Proposed Date Banner */}
      {hasProposedDate && (
        <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 2 }}>
            New date proposed
          </Text>
          <Text style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 10 }}>
            {formatFullDate(session.practitioner_proposed_date!)} at {formatTime(session.practitioner_proposed_date!)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={onAcceptProposed} disabled={isLoading}
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 10, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
            >
              {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDeclineProposed} disabled={isLoading}
              style={{ flex: 1, backgroundColor: colors.surface1, borderRadius: 28, paddingVertical: 10, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status pill */}
      {needsConfirmation && (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#8A8A8A' }}>Awaiting confirmation</Text>
          </View>
        </View>
      )}
      {session.reschedule_requested && session.reschedule_status === 'pending' && (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#8A8A8A' }}>Reschedule requested</Text>
          </View>
        </View>
      )}
      {session.member_confirmed && !hasProposedDate && (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.bloom }}>✓ Confirmed</Text>
          </View>
        </View>
      )}

      {/* Session info */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View style={{
          width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surface1,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 10, color: '#8A8A8A', textTransform: 'uppercase', fontWeight: '600' }}>
            {sessionDate.toLocaleDateString(undefined, { month: 'short' })}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{sessionDate.getDate()}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, letterSpacing: -0.3, marginBottom: 4 }}>
            {getSessionTypeLabel(session.session_type)}
          </Text>
          <Text style={{ fontSize: 13, color: '#8A8A8A' }}>
            {formatTime(session.scheduled_at)} · {getFormatLabel(session.session_format)} · {session.duration_minutes} min
          </Text>
          {session.practitioner && (
            <Text style={{ fontSize: 13, color: '#8A8A8A', marginTop: 2 }}>
              with <Text style={{ fontWeight: '600', color: colors.primary }}>{session.practitioner.full_name}</Text>
            </Text>
          )}
        </View>
      </View>

      {/* Actions */}
      {needsConfirmation && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EBEBEB' }}>
          <TouchableOpacity
            onPress={onConfirm} disabled={isLoading}
            style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 12, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
          >
            {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Confirm</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReschedule} disabled={isLoading}
            style={{ flex: 1, backgroundColor: colors.surface1, borderRadius: 28, paddingVertical: 12, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
          >
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Reschedule</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function PastSessionCard({ session }: { session: UpcomingSession }) {
  const sessionDate = new Date(session.scheduled_at)
  const isCompleted = session.status === 'completed'
  const isCancelled = session.status === 'cancelled'
  const isNoShow = session.status === 'no_show'

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 18, padding: 14,
      borderWidth: 1, borderColor: '#EBEBEB',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface1,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 9, color: '#8A8A8A', textTransform: 'uppercase', fontWeight: '600' }}>
            {sessionDate.toLocaleDateString(undefined, { month: 'short' })}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{sessionDate.getDate()}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
              {getSessionTypeLabel(session.session_type)}
            </Text>
            <View style={{ backgroundColor: colors.surface1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: isCompleted ? colors.bloom : isCancelled ? colors.error : '#8A8A8A' }}>
                {isCompleted ? '✓ Done' : isCancelled ? 'Cancelled' : isNoShow ? 'No Show' : session.status}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#8A8A8A' }}>
            {formatTime(session.scheduled_at)} · {getFormatLabel(session.session_format)} · {session.duration_minutes} min
          </Text>
          {session.practitioner && (
            <Text style={{ fontSize: 12, color: '#8A8A8A', marginTop: 2 }}>with {session.practitioner.full_name}</Text>
          )}
        </View>
      </View>
    </View>
  )
}
