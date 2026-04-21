import { useState, useCallback, useEffect, useMemo } from 'react'
import NotificationBell from '@/components/NotificationBell'
import { FileText, Table2, BookOpen, Dumbbell, FileQuestion, Frown, Meh, Smile, CheckCircle, Settings, Mic, PenLine, Heart, User, Calendar, Clock, FolderOpen } from 'lucide-react-native'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Share,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import RenderHtml from 'react-native-render-html'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { getGreetingKey } from '@/components/DayNav'
import * as Clipboard from 'expo-clipboard'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { trackEvent } from '@/lib/analytics'
import { BackButton } from '@/components/ui/BackButton'
import { BloomLogo } from '@/components/BloomLogo'
import { BloomFullScreen } from '@/components/BloomFullScreen'
import { getNavOrder, getHomeScreen } from '@/lib/nav-order'
import { InlineGuide } from '@/components/InlineGuide'
import { FloatingCapture } from '@/components/FloatingCapture'
import { PageLoader } from '@/components/PageLoader'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { renderBlock } from '@/components/practitioner/BlockRenderer'
import { WorksheetStepView } from '@/components/practitioner/WorksheetStepView'
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
  saveTableEntry,
  submitResource,
  markResourceComplete,
  fetchPractitionerNotes,
  saveResourceFeedback,
  PractitionerProfile,
  UpcomingSession,
  ResourceItem,
} from '@/lib/services/practitioner'
import { fetchModificationSettings, cancelBooking, rescheduleBooking, fetchAvailableSlots } from '@/lib/services/booking'
import { ContainedModal as Modal } from '@/components/ContainedModal'

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

function getSessionTypeLabel(type: string, t?: any): string {
  if (t) {
    const map: Record<string, string> = {
      initial: t.practitioner.sessionTypeInitial, initial_consultation: t.practitioner.sessionTypeInitial,
      follow_up: t.practitioner.sessionTypeFollowUp, check_in: t.practitioner.sessionTypeCheckIn,
      emergency: t.practitioner.sessionTypeEmergency, crisis: t.practitioner.sessionTypeCrisis,
      assessment: t.practitioner.sessionTypeAssessment, group: t.practitioner.sessionTypeGroup, other: t.practitioner.sessionTypeOther,
    }
    if (map[type]) return map[type]
  }
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getFormatLabel(format: string, t?: any): string {
  if (t) {
    const map: Record<string, string> = { video: t.practitioner.formatVideo, virtual: t.practitioner.formatVideo, telehealth: t.practitioner.formatVideo, in_person: t.practitioner.formatInPerson, phone: t.practitioner.formatPhone }
    if (map[format]) return map[format]
  }
  return format
}

// ─── Main Component ─────────────────────────────────

export default function PractitionerScreen() {
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const router = useRouter()
  const { openResourceId } = useLocalSearchParams<{ openResourceId?: string }>()
  const { member, allMembers, setActiveMemberId } = useAuth()
  const { t, locale } = useI18n()

  const isHome = getHomeScreen(member as any) === 'practitioner'
  const [bloomOpen, setBloomOpen] = useState(false)
  const firstName = member?.first_name || ''

  const [loading, setLoading] = useState(true)
  const [practitioner, setPractitioner] = useState<PractitionerProfile | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [pastSessions, setPastSessions] = useState<UpcomingSession[]>([])
  const [resources, setResources] = useState<ResourceItem[]>([])
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

  // Booking modification
  const [modificationSettings, setModificationSettings] = useState<{ allowReschedule: boolean; allowCancel: boolean; noticeHours: number }>({ allowReschedule: false, allowCancel: false, noticeHours: 48 })
  const [practActiveDays, setPractActiveDays] = useState<number[] | null>(null)
  const [practDayFormats, setPractDayFormats] = useState<Record<string, string[]>>({})
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [confirmationScreen, setConfirmationScreen] = useState<{ type: 'cancelled' | 'rescheduled'; message: string } | null>(null)
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null)
  const [rescheduleBookingReason, setRescheduleBookingReason] = useState('')
  const [rescheduleBookingSlots, setRescheduleBookingSlots] = useState<Array<{ slot_start: string; slot_end: string }>>([])
  const [rescheduleBookingDate, setRescheduleBookingDate] = useState<string | null>(null)
  const [rescheduleBookingTime, setRescheduleBookingTime] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [rescheduleCalMonth, setRescheduleCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // Resources
  const [viewingResource, setViewingResource] = useState<ResourceItem | null>(null)
  const [fillResource, setFillResource] = useState<any>(null)
  const [fillLoading, setFillLoading] = useState(false)
  const [activeResourceItem, setActiveResourceItem] = useState<ResourceItem | null>(null)
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [draftResponseId, setDraftResponseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tableReviewReady, setTableReviewReady] = useState(false)
  const [practitionerNotes, setPractitionerNotes] = useState<string | null>(null)
  const [responseStatus, setResponseStatus] = useState<string | null>(null)
  const [pastResponses, setPastResponses] = useState<{ id: string; submitted_at: string; responses: Record<string, unknown> }[]>([])
  const [viewingPastResponse, setViewingPastResponse] = useState<{ id: string; submitted_at: string; responses: Record<string, unknown> } | null>(null)
  const [previewBlocks, setPreviewBlocks] = useState<any[] | null>(null)
  const [previewNotes, setPreviewNotes] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackSelection, setFeedbackSelection] = useState<'negative' | 'neutral' | 'positive' | null>(null)
  const [pendingFeedbackItem, setPendingFeedbackItem] = useState<ResourceItem | null>(null)
  const [pendingFeedbackResponseId, setPendingFeedbackResponseId] = useState<string | null>(null)

  // Quick access
  const [quickModal, setQuickModal] = useState<'practitioners' | 'assessments' | null>(null)
  const [guideVisible, setGuideVisible] = useState(true)
  const [assessmentFilter, setAssessmentFilter] = useState<'all' | 'pending' | 'completed'>('all')

  // Multi-practitioner names
  const [practitionerNames, setPractitionerNames] = useState<Record<string, string>>({})
  const hasMultiplePractitioners = allMembers.length > 1

  useEffect(() => {
    if (!hasMultiplePractitioners) return
    const ids = allMembers.filter(m => m.practitioner_id).map(m => m.practitioner_id)
    if (ids.length === 0) return
    supabase.from('users').select('id, full_name').in('id', ids).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        data.forEach(u => { map[u.id] = u.full_name || '' })
        setPractitionerNames(map)
      }
    })
  }, [allMembers])

  const practitionerId = member?.practitioner_id

  // ─── Data Fetching ──────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!member?.id) { setLoading(false); return }
    try {
      const [practData, sessionsData, resourcesData] = await Promise.all([
        practitionerId ? fetchPractitioner(practitionerId) : Promise.resolve(null),
        fetchSessions(member.id, member.user_id, practitionerId || undefined),
        practitionerId ? fetchResources(member.id) : Promise.resolve([]),
      ])
      setPractitioner(practData)
      setUpcomingSessions(sessionsData.upcoming)
      setPastSessions(sessionsData.past)
      setResources(resourcesData)
      // Load patient modification settings + active days
      if (practitionerId) {
        fetchModificationSettings(practitionerId).then(setModificationSettings).catch(() => {})
        supabase
          .from('availability_schedules')
          .select('day_of_week, session_format')
          .eq('user_id', practitionerId)
          .eq('is_active', true)
          .then(({ data }: { data: { day_of_week: string; session_format?: string }[] | null }) => {
            if (data) {
              const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }
              setPractActiveDays([...new Set(data.map(d => dayMap[d.day_of_week]))])
              const dfMap: Record<string, string[]> = {}
              for (const d of data) {
                const dayNum = String(dayMap[d.day_of_week])
                const fmt = d.session_format || 'both'
                if (!dfMap[dayNum]) dfMap[dayNum] = []
                if (fmt === 'both') {
                  if (!dfMap[dayNum].includes('in_person')) dfMap[dayNum].push('in_person')
                  if (!dfMap[dayNum].includes('video')) dfMap[dayNum].push('video')
                } else {
                  if (!dfMap[dayNum].includes(fmt)) dfMap[dayNum].push(fmt)
                }
              }
              setPractDayFormats(dfMap)
            }
          })
      }
    } catch (error) {
      console.error('Error loading practitioner data:', error)
    } finally {
      setLoading(false)
    }
  }, [member?.id, practitionerId])

  useFocusEffect(useCallback(() => { fetchData() }, [fetchData]))

  // Auto-open resource from email deep link
  useEffect(() => {
    if (openResourceId && resources.length > 0 && !loading) {
      const resource = resources.find(r => r.resourceId === openResourceId || r.id === openResourceId)
      if (resource) setViewingResource(resource)
    }
  }, [openResourceId, resources, loading])

  // Fetch practitioner notes when preview opens for completed resources
  useEffect(() => {
    if (viewingResource && viewingResource.status === 'completed' && member?.id) {
      fetchPractitionerNotes(viewingResource.resourceId, member.id).then(setPreviewNotes)
    } else {
      setPreviewNotes(null)
    }
    // Fetch past responses and resource blocks for recurring resources
    if (viewingResource?.isRecurring && member?.id) {
      supabase
        .from('resource_responses')
        .select('id, submitted_at, responses')
        .eq('resource_id', viewingResource.resourceId)
        .eq('member_id', member.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .then(({ data }) => setPastResponses(data || []))
      // Pre-fetch resource blocks for displaying past responses
      supabase.from('resources').select('blocks').eq('id', viewingResource.resourceId).single()
        .then(({ data }) => { if (data) setPreviewBlocks(data.blocks || []) })
    } else {
      setPastResponses([])
      setPreviewBlocks(null)
    }
    setViewingPastResponse(null)
  }, [viewingResource?.id])

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

  // ─── Booking Cancel/Reschedule ─────────────────────

  function canModifySession(session: UpcomingSession): boolean {
    const hoursUntil = (new Date(session.scheduled_at).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil < modificationSettings.noticeHours) return false
    return modificationSettings.allowCancel || modificationSettings.allowReschedule
  }

  // cancelSessionId holds either a booking_id or session id
  async function handleCancelSession() {
    if (!cancelBookingId || !cancelReason.trim()) return
    setActionLoading(cancelBookingId)

    // Find the session to determine source
    const session = upcomingSessions.find(s => s.id === cancelBookingId || s.booking_id === cancelBookingId)

    if (session?.booking_id) {
      // Booking-based: use API
      const result = await cancelBooking(session.booking_id, cancelReason.trim())
      if (result.success) {
        setUpcomingSessions(prev => prev.filter(s => s.id !== session.id))
        setCancelBookingId(null)
        setCancelReason('')
        setConfirmationScreen({
          type: 'cancelled',
          message: locale === 'fr' ? 'Votre séance a été annulée. Le praticien en sera informé.' : 'Your session has been cancelled. The practitioner will be notified.',
        })
      } else {
        Alert.alert(t.common.error, result.error)
      }
    } else {
      // Session-based: cancel session + any matching booking
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', cancelBookingId)

      // Also cancel matching booking by practitioner_id + scheduled_at
      if (!error && session) {
        await supabase
          .from('bookings')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'member', cancellation_reason: cancelReason.trim() })
          .eq('practitioner_id', session.practitioner?.id || '')
          .eq('start_time', session.scheduled_at)
          .neq('status', 'cancelled')
      }

      if (!error) {
        setUpcomingSessions(prev => prev.filter(s => s.id !== cancelBookingId))
        setCancelBookingId(null)
        setCancelReason('')
        setConfirmationScreen({
          type: 'cancelled',
          message: locale === 'fr' ? 'Votre séance a été annulée.' : 'Your session has been cancelled.',
        })
      } else {
        Alert.alert(t.common.error, error.message)
      }
    }
    setActionLoading(null)
  }

  const rescheduleCalDays = useMemo(() => {
    const { year, month } = rescheduleCalMonth
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const reschSession = upcomingSessions.find(s => (s.booking_id || s.id) === rescheduleBookingId)
    const days: { day: number; date: string; disabled: boolean }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayNum = date.getDay()
      // Disable past days
      let disabled = date < today
      // Disable days without availability
      if (!disabled && practActiveDays !== null && !practActiveDays.includes(dayNum)) disabled = true
      // Disable days that don't match session format
      if (!disabled && reschSession) {
        const fmt = reschSession.session_format
        // Map session_format to availability format
        const availFmt = (fmt === 'telehealth' || fmt === 'virtual' || fmt === 'video') ? 'video' : (fmt === 'in_person' ? 'in_person' : null)
        if (availFmt && practDayFormats[String(dayNum)]) {
          if (!practDayFormats[String(dayNum)].includes(availFmt)) disabled = true
        }
      }
      days.push({ day: d, date: dateStr, disabled })
    }
    return { days, offset: firstDay }
  }, [rescheduleCalMonth, practActiveDays, practDayFormats, rescheduleBookingId, upcomingSessions])

  const rescheduleMonthLabel = new Date(rescheduleCalMonth.year, rescheduleCalMonth.month).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })

  function rescheduleCalPrev() {
    setRescheduleCalMonth(p => ({ year: p.month === 0 ? p.year - 1 : p.year, month: p.month === 0 ? 11 : p.month - 1 }))
  }
  function rescheduleCalNext() {
    setRescheduleCalMonth(p => ({ year: p.month === 11 ? p.year + 1 : p.year, month: p.month === 11 ? 0 : p.month + 1 }))
  }

  function handleSelectRescheduleDate(date: string) {
    setRescheduleBookingDate(date)
    setRescheduleBookingTime('')
    setRescheduleBookingSlots([])
    // Load slots
    const session = upcomingSessions.find(s => (s.booking_id || s.id) === rescheduleBookingId)
    if (!session?.practitioner?.id) return
    setLoadingSlots(true)
    fetchAvailableSlots(session.practitioner.id, date, session.duration_minutes)
      .then(result => setRescheduleBookingSlots(result.slots || []))
      .catch(() => setRescheduleBookingSlots([]))
      .finally(() => setLoadingSlots(false))
  }

  async function handleRescheduleSession() {
    if (!rescheduleBookingId || !rescheduleBookingTime || !rescheduleBookingReason.trim()) return
    const slot = rescheduleBookingSlots.find(s => s.slot_start === rescheduleBookingTime)
    if (!slot) return
    setActionLoading(rescheduleBookingId)

    // Find the session to determine source
    const session = upcomingSessions.find(s => s.id === rescheduleBookingId || s.booking_id === rescheduleBookingId)

    if (session?.booking_id) {
      // Booking-based: use API
      const result = await rescheduleBooking(session.booking_id, rescheduleBookingReason.trim(), slot.slot_start, slot.slot_end)
      if (result.success) {
        setRescheduleBookingId(null)
        setRescheduleBookingReason('')
        setRescheduleBookingDate('')
        setRescheduleBookingTime('')
        fetchData()
        setConfirmationScreen({
          type: 'rescheduled',
          message: locale === 'fr' ? 'Votre demande de reprogrammation a été envoyée. Le praticien en sera informé.' : 'Your reschedule request has been sent. The practitioner will be notified.',
        })
      } else {
        Alert.alert(t.common.error, result.error)
      }
    } else {
      // Session-based: update scheduled_at + cancel matching old booking
      const reschSession = upcomingSessions.find(s => (s.booking_id || s.id) === rescheduleBookingId)
      const { error } = await supabase
        .from('sessions')
        .update({ scheduled_at: slot.slot_start, duration_minutes: Math.round((new Date(slot.slot_end).getTime() - new Date(slot.slot_start).getTime()) / 60000) })
        .eq('id', rescheduleBookingId)

      // Cancel old booking + create new one
      if (!error && reschSession?.practitioner?.id) {
        await supabase
          .from('bookings')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'member', cancellation_reason: `Rescheduled: ${rescheduleBookingReason.trim()}` })
          .eq('practitioner_id', reschSession.practitioner.id)
          .eq('start_time', reschSession.scheduled_at)
          .neq('status', 'cancelled')
      }

      if (!error) {
        setRescheduleBookingId(null)
        setRescheduleBookingReason('')
        setRescheduleBookingDate('')
        setRescheduleBookingTime('')
        fetchData()
        setConfirmationScreen({
          type: 'rescheduled',
          message: locale === 'fr' ? 'Votre séance a été reprogrammée.' : 'Your session has been rescheduled.',
        })
      } else {
        Alert.alert(t.common.error, error.message)
      }
    }
    setActionLoading(null)
  }

  // ─── Resource Actions ───────────────────────────────

  async function handleOpenResource(item: ResourceItem) {
    setViewingResource(null); setFillLoading(true); setActiveResourceItem(item); setResponses({}); setDraftResponseId(null); setPractitionerNotes(null); setResponseStatus(null)
    try {
      const result = await openResourceForFill(item, member!.id, member!.practitioner_id)
      setFillResource(result.resource); setDraftResponseId(result.responseId); setResponses(result.responses); setPractitionerNotes(result.practitionerNotes); setResponseStatus(result.responseStatus)
    } catch {
      Alert.alert(t.common.error, t.practitioner.errorLoadResource)
      setFillResource(null); setActiveResourceItem(null)
    } finally { setFillLoading(false) }
  }

  function closeFill() {
    setFillResource(null); setActiveResourceItem(null); setResponses({}); setDraftResponseId(null); setTableReviewReady(false); setPractitionerNotes(null); setResponseStatus(null); fetchData()
  }

  function handleCloseFill() {
    if (activeResourceItem?.type === 'assignment' && draftResponseId && Object.keys(responses).length > 0) {
      Alert.alert(t.practitioner.saveProgress, t.practitioner.unsavedChanges, [
        { text: t.practitioner.discard, style: 'destructive', onPress: closeFill },
        { text: t.practitioner.saveAndClose, onPress: () => handleSaveDraft().then(closeFill) },
      ])
    } else closeFill()
  }

  async function handleSaveDraft() {
    if (!draftResponseId) return
    setSaving(true)
    const ok = await saveDraft(draftResponseId, responses)
    setSaving(false)
    if (ok) {
      showAlert(t.practitioner?.saved || 'Saved', (t.practitioner as any)?.draftSaved || 'Your progress has been saved.')
    } else {
      showAlert(t.common?.error || 'Error', t.practitioner?.errorFailedSave || 'Failed to save.')
    }
  }

  function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`)
    } else {
      Alert.alert(title, message)
    }
  }

  function confirmAndSubmit() {
    const title = t.practitioner.confirmSubmitTitle || 'Submit'
    const message = t.practitioner.confirmSubmitMessage || 'Are you sure you want to submit? You won\'t be able to edit after submitting.'
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) handleSubmit()
    } else {
      Alert.alert(title, message, [
        { text: t.common.cancel || 'Cancel', style: 'cancel' },
        { text: t.practitioner.submit || 'Submit', style: 'default', onPress: () => handleSubmit() },
      ])
    }
  }

  async function handleSubmit() {
    if (!activeResourceItem) return
    trackEvent('worksheet_completed', { resource_id: activeResourceItem.id, type: activeResourceItem.type })
    setSubmitting(true)
    try {
      if (activeResourceItem.type === 'assignment' && draftResponseId) {
        const ok = await submitResource(draftResponseId, activeResourceItem.id, responses)
        if (!ok) { setSubmitting(false); showAlert(t.common.error, t.practitioner.errorSubmit); return }
      } else {
        await markResourceComplete(activeResourceItem, draftResponseId, responses)
      }
      setSubmitting(false)
      // Show feedback modal instead of closing immediately
      setPendingFeedbackItem(activeResourceItem)
      setPendingFeedbackResponseId(draftResponseId)
      setFeedbackSelection(null)
      setShowFeedback(true)
    } catch (e: any) {
      setSubmitting(false)
      showAlert(t.common.error, `${t.practitioner.errorSomethingWrong}: ${e?.message || t.practitioner.errorUnknown}`)
    }
  }

  async function handleSaveTable() {
    if (!draftResponseId) return
    setSaving(true)
    try {
      await saveTableEntry(draftResponseId, responses)
      setSaving(false)
      closeFill()
      showAlert(t.practitioner.saved, t.practitioner.entrySaved)
    } catch (e: any) {
      setSaving(false)
      showAlert(t.common.error, `${t.practitioner.errorFailedSave}: ${e?.message || t.practitioner.errorUnknown}`)
    }
  }

  async function handleMarkComplete() {
    if (!activeResourceItem) return
    setSubmitting(true)
    await markResourceComplete(activeResourceItem, draftResponseId, responses)
    setSubmitting(false)
    // Show feedback modal instead of closing immediately
    setPendingFeedbackItem(activeResourceItem)
    setPendingFeedbackResponseId(draftResponseId)
    setFeedbackSelection(null)
    setShowFeedback(true)
  }

  async function handleFeedbackDone() {
    if (feedbackSelection && pendingFeedbackItem) {
      try {
        await saveResourceFeedback(feedbackSelection, pendingFeedbackItem, pendingFeedbackResponseId)
      } catch (e) {
        console.error('Failed to save feedback:', e)
      }
    }
    setShowFeedback(false)
    setPendingFeedbackItem(null)
    setPendingFeedbackResponseId(null)
    setFeedbackSelection(null)
    closeFill()
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    const ok = await invitePractitioner(inviteEmail.trim())
    if (ok) { Alert.alert(t.practitioner.inviteSent, t.practitioner.inviteSentMessage); setInviteEmail('') }
    else Alert.alert(t.common.error, t.practitioner.inviteError)
    setInviteSending(false)
  }

  // ─── Loading ────────────────────────────────────────

  if (loading) return <PageLoader />

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
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 180, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        {isHome ? (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <NotificationBell onOpenResource={(resourceId) => {
                const resource = resources.find(r => r.resourceId === resourceId || r.id === resourceId)
                if (resource) setViewingResource(resource)
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
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <NotificationBell onOpenResource={(resourceId) => {
                const resource = resources.find(r => r.resourceId === resourceId || r.id === resourceId)
                if (resource) setViewingResource(resource)
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
        )}

        {isHome ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 30, fontWeight: '700', color: colors.primary, letterSpacing: -0.8, lineHeight: 38 }}>
              {t.home[getGreetingKey() as keyof typeof t.home]}{firstName ? `,\n` : '.'}
              {firstName ? <Text style={{ color: '#8A8A8A' }}>{firstName}.</Text> : null}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 30, fontWeight: '700', color: colors.primary, letterSpacing: -0.8, lineHeight: 38, marginBottom: 28 }}>
            {t.practitioner.title}
          </Text>
        )}

        {/* Practitioner switcher */}
        {hasMultiplePractitioners && (
          <View style={{ flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 16, padding: 4, marginBottom: 20 }}>
            {allMembers.map((m) => {
              const isActive = m.id === member?.id
              const name = m.practitioner_id
                ? (practitionerNames[m.practitioner_id] || '...')
                : t.practitioner.noPractitioner
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setActiveMemberId(m.id)}
                  activeOpacity={0.7}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12,
                    backgroundColor: isActive ? '#fff' : 'transparent',
                    alignItems: 'center',
                    shadowColor: isActive ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isActive ? 0.08 : 0,
                    shadowRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: isActive ? '600' : '400', color: isActive ? '#000' : '#999' }} numberOfLines={1}>
                    {name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Inline guide */}
        <InlineGuide
          guideKey="care"
          icon={User}
          title={locale === 'fr' ? 'Votre espace de suivi' : 'Your care space'}
          description={locale === 'fr'
            ? 'Ici, vous trouverez les ressources partagées par votre praticien, vos séances à venir, et votre progression. Tout est au même endroit.'
            : 'Here you\'ll find resources shared by your practitioner, upcoming sessions, and your progress. Everything in one place.'}
          onVisibilityChange={setGuideVisible}
        />

        {guideVisible ? (
          /* Skeleton while guide is showing */
          <View style={{ opacity: 0.4 }}>
            <View style={{ backgroundColor: '#E5E5E5', borderRadius: 22, height: 100, marginBottom: 32 }} />
            <View style={{ backgroundColor: '#E5E5E5', borderRadius: 22, height: 200, marginBottom: 24 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#E5E5E5', borderRadius: 18, height: 80 }} />
              <View style={{ flex: 1, backgroundColor: '#E5E5E5', borderRadius: 18, height: 80 }} />
            </View>
          </View>
        ) : (
        <View>

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
                  {practitioner.full_name || t.practitioner.yourPractitioner}
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
                  {t.practitioner.noConnection}
                </Text>
                <Text style={{ fontSize: 15, color: '#8A8A8A', marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
                  {t.practitioner.noConnectionSubtitle}
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
                    placeholder={t.practitioner.inviteEmail}
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
                    {inviteCopied ? t.practitioner.copied : t.practitioner.copyLink}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Share.share({ message: t.practitioner.shareMessage })}
                  activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: colors.surface2 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{t.practitioner.share}</Text>
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
              {t.practitioner.bookAppointment}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
              {t.practitioner.scheduleSession}
            </Text>
          </TouchableOpacity>

        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* RESOURCES */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: '#8A8A8A', textTransform: 'uppercase', marginBottom: 14 }}>
            {t.practitioner.resources}
          </Text>

          {resources.length > 0 ? (
            <View style={{ gap: 10 }}>
              {resources.slice(0, 3).map((item) => (
                <ResourceCard key={item.id} item={item} onPress={() => setViewingResource(item)} />
              ))}
              {resources.length > 3 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { setAssessmentFilter('all'); setQuickModal('assessments') }}
                  style={{
                    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14,
                    alignItems: 'center', marginTop: 4,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                    {locale === 'fr' ? 'Voir tout' : 'View all'} ({resources.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <EmptyState icon={FileText} title={t.practitioner.noResources} subtitle={t.practitioner.noResourcesSubtitle} />
          )}
        </View>


        {/* ═══════════════════════════════════════════════ */}
        {/* UPCOMING SESSIONS */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: '#8A8A8A', textTransform: 'uppercase', marginBottom: 14 }}>
            {t.practitioner.upcomingSessions}
          </Text>

          {upcomingSessions.length === 0 ? (
            <EmptyState icon={Calendar} title={t.practitioner.noUpcoming} subtitle={t.practitioner.noUpcomingSubtitle} />
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
                  canModify={canModifySession(session)}
                  onCancel={canModifySession(session) && modificationSettings.allowCancel ? () => { setCancelBookingId(session.booking_id || session.id); setCancelReason('') } : undefined}
                  onRescheduleBooking={canModifySession(session) && modificationSettings.allowReschedule ? () => { setRescheduleBookingId(session.booking_id || session.id); setRescheduleBookingReason(''); setRescheduleBookingDate(''); setRescheduleBookingTime(''); setRescheduleBookingSlots([]) } : undefined}
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
              {t.practitioner.sessionHistory}
            </Text>
            {pastSessions.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllHistory(!showAllHistory)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>
                  {showAllHistory ? t.practitioner.viewLess : t.practitioner.viewAll}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {pastSessions.length === 0 ? (
            <EmptyState icon={Clock} title={t.practitioner.noHistory} subtitle={t.practitioner.noHistorySubtitle} />
          ) : (
            <View style={{ gap: 10 }}>
              {displayHistory.map((session) => (
                <PastSessionCard key={session.id} session={session} />
              ))}
            </View>
          )}
        </View>

        </>)}
        </View>
        )}
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
              {t.practitioner.rescheduleTitle}
            </Text>
            <Text style={{ fontSize: 15, color: '#8A8A8A', marginBottom: 20 }}>
              {t.practitioner.rescheduleSubtitle}
            </Text>

            <TextInput
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              placeholder={t.practitioner.reschedulePlaceholder}
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
                {t.practitioner.suggestDate}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#8A8A8A', marginBottom: 4 }}>{t.practitioner.date}</Text>
                  <TextInput
                    value={suggestedDate} onChangeText={setSuggestedDate}
                    placeholder="YYYY-MM-DD" placeholderTextColor="#CCCCCC"
                    style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 13, color: colors.primary }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#8A8A8A', marginBottom: 4 }}>{t.practitioner.time}</Text>
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
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>{t.common.cancel}</Text>
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
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{t.practitioner.sendRequest}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {confirmationScreen && (
      <Modal visible={true} transparent animationType="fade" onRequestClose={() => setConfirmationScreen(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 28, padding: 32, marginHorizontal: 32, alignItems: 'center', maxWidth: 340, width: '100%' }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32, marginBottom: 20, alignItems: 'center', justifyContent: 'center',
              backgroundColor: confirmationScreen.type === 'cancelled' ? '#FEF2F2' : '#F0FDF4',
            }}>
              <Text style={{ fontSize: 28 }}>{confirmationScreen.type === 'cancelled' ? '✕' : '✓'}</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center', marginBottom: 8 }}>
              {confirmationScreen.type === 'cancelled'
                ? (locale === 'fr' ? 'Séance annulée' : 'Session cancelled')
                : (locale === 'fr' ? 'Reprogrammation demandée' : 'Reschedule requested')}
            </Text>
            <Text style={{ fontSize: 14, color: '#8A8A8A', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              {confirmationScreen.message}
            </Text>
            <TouchableOpacity
              onPress={() => setConfirmationScreen(null)}
              style={{ backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{locale === 'fr' ? 'Compris' : 'Got it'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}

      {cancelBookingId && (
      <Modal visible={true} transparent animationType="fade" onRequestClose={() => setCancelBookingId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }} onPress={() => setCancelBookingId(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: insets.bottom + 28,
          }} onPress={() => {}}><View>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3, marginBottom: 4 }}>
              {locale === 'fr' ? 'Annuler la séance' : 'Cancel session'}
            </Text>
            <Text style={{ fontSize: 15, color: '#8A8A8A', marginBottom: 14 }}>
              {locale === 'fr' ? 'Dites-nous pourquoi vous annulez.' : 'Please tell us why you are cancelling.'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {(locale === 'fr'
                ? ['Conflit d\'horaire', 'Raison personnelle', 'Je ne me sens pas bien', 'Je souhaite reprogrammer']
                : ['Schedule conflict', 'Personal reasons', 'Not feeling well', 'Want to reschedule']
              ).map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setCancelReason(reason)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: cancelReason === reason ? colors.primary : colors.surface2,
                  }}
                >
                  <Text style={{ fontSize: 13, color: cancelReason === reason ? '#fff' : colors.primary, fontWeight: '500' }}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={locale === 'fr' ? "Ou écrivez votre raison..." : 'Or write your reason...'}
              placeholderTextColor="#CCCCCC"
              multiline
              style={{
                backgroundColor: colors.surface2, borderRadius: 16, padding: 16, fontSize: 15,
                color: colors.primary, minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setCancelBookingId(null)}
                style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 28, backgroundColor: colors.surface1 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancelSession}
                disabled={!cancelReason.trim() || actionLoading === cancelBookingId}
                style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: cancelReason.trim() ? '#DC2626' : colors.disabled,
                  borderRadius: 28, paddingVertical: 14,
                }}
              >
                {actionLoading === cancelBookingId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {locale === 'fr' ? "Confirmer l'annulation" : 'Confirm cancellation'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View></Pressable>
        </Pressable>
      </Modal>
      )}
      {rescheduleBookingId && (
      <Modal visible={true} transparent animationType="fade" onRequestClose={() => setRescheduleBookingId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }} onPress={() => setRescheduleBookingId(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: insets.bottom + 28, maxHeight: '80%',
          }} onPress={() => {}}><ScrollView showsVerticalScrollIndicator={false}><View>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3, marginBottom: 4 }}>
              {locale === 'fr' ? 'Reprogrammer la séance' : 'Reschedule session'}
            </Text>
            <Text style={{ fontSize: 15, color: '#8A8A8A', marginBottom: 14 }}>
              {locale === 'fr' ? 'Choisissez une nouvelle date et heure.' : 'Pick a new date and time.'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {(locale === 'fr'
                ? ['Conflit d\'horaire', 'Imprévu personnel', 'Changement de disponibilité', 'Autre engagement']
                : ['Schedule conflict', 'Personal emergency', 'Availability changed', 'Other commitment']
              ).map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setRescheduleBookingReason(reason)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: rescheduleBookingReason === reason ? colors.primary : colors.surface2,
                  }}
                >
                  <Text style={{ fontSize: 13, color: rescheduleBookingReason === reason ? '#fff' : colors.primary, fontWeight: '500' }}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={rescheduleBookingReason}
              onChangeText={setRescheduleBookingReason}
              placeholder={locale === 'fr' ? 'Ou écrivez votre raison...' : 'Or write your reason...'}
              placeholderTextColor="#CCCCCC"
              style={{
                backgroundColor: colors.surface2, borderRadius: 16, padding: 16, fontSize: 15,
                color: colors.primary, marginBottom: 16,
              }}
            />
              <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 14, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity onPress={rescheduleCalPrev} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 18, color: colors.primary }}>‹</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>{rescheduleMonthLabel}</Text>
                  <TouchableOpacity onPress={rescheduleCalNext} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 18, color: colors.primary }}>›</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {(t.booking?.dayHeaders || ['M','T','W','T','F','S','S']).map((d: string, i: number) => (
                    <View key={`rh-${i}`} style={{ flex: 1, alignItems: 'center', paddingBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#8A8A8A' }}>{d}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {Array.from({ length: rescheduleCalDays.offset }).map((_, i) => (
                    <View key={`re-${i}`} style={{ width: '14.28%', height: 38 }} />
                  ))}
                  {rescheduleCalDays.days.map(({ day, date, disabled }) => {
                    const isSelected = rescheduleBookingDate === date
                    return (
                      <TouchableOpacity
                        key={date} disabled={disabled} activeOpacity={0.7}
                        onPress={() => handleSelectRescheduleDate(date)}
                        style={{ width: '14.28%', height: 38, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <View style={{
                          width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
                          backgroundColor: isSelected ? colors.bloom : 'transparent',
                        }}>
                          <Text style={{
                            fontSize: 14,
                            color: isSelected ? '#fff' : disabled ? '#d4d4d4' : colors.primary,
                            fontWeight: isSelected ? '600' : '400',
                          }}>{day}</Text>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
              {rescheduleBookingDate && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 10 }}>
                    {locale === 'fr' ? 'Créneaux disponibles' : 'Available times'}
                  </Text>
                  {loadingSlots ? (
                    <ActivityIndicator size="small" color={colors.bloom} style={{ marginTop: 8 }} />
                  ) : rescheduleBookingSlots.length === 0 ? (
                    <Text style={{ fontSize: 13, color: '#8A8A8A' }}>
                      {locale === 'fr' ? 'Aucun créneau disponible' : 'No available slots'}
                    </Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {rescheduleBookingSlots.map((slot) => {
                        const isSelected = rescheduleBookingTime === slot.slot_start
                        const time = new Date(slot.slot_start).toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                          hour: 'numeric', minute: '2-digit', hour12: locale !== 'fr',
                        })
                        return (
                          <TouchableOpacity
                            key={slot.slot_start}
                            onPress={() => setRescheduleBookingTime(slot.slot_start)}
                            style={{
                              backgroundColor: isSelected ? colors.bloom : '#fff',
                              borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
                              borderWidth: 1, borderColor: isSelected ? colors.bloom : '#EBEBEB',
                            }}
                          >
                            <Text style={{
                              fontSize: 13, fontWeight: '500',
                              color: isSelected ? '#fff' : colors.primary,
                            }}>{time}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}
                </View>
              )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRescheduleBookingId(null)}
                style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 28, backgroundColor: colors.surface1 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRescheduleSession}
                disabled={!rescheduleBookingTime || !rescheduleBookingReason.trim() || actionLoading === rescheduleBookingId}
                style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: (rescheduleBookingTime && rescheduleBookingReason.trim()) ? colors.primary : colors.disabled,
                  borderRadius: 28, paddingVertical: 14,
                }}
              >
                {actionLoading === rescheduleBookingId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {locale === 'fr' ? 'Reprogrammer' : 'Reschedule'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View></ScrollView></Pressable>
        </Pressable>
      </Modal>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* RESOURCE DETAIL MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal visible={!!viewingResource} transparent animationType="slide" onRequestClose={() => setViewingResource(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }} onPress={() => setViewingResource(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingTop: 28, paddingBottom: insets.bottom + 28, maxHeight: '85%',
          }} onPress={() => {}}>
            {viewingResource && (
              <>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginBottom: 20 }} />

                <ScrollView style={{ paddingHorizontal: 28 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, letterSpacing: -0.3, marginBottom: 8 }}>
                  {viewingResource.title}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <StatusBadge status={viewingResource.status} />
                  {viewingResource.resourceType && (
                    <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: '#8A8A8A', textTransform: 'capitalize' }}>
                        {(t.practitioner as any).resourceTypes?.[viewingResource.resourceType] || viewingResource.resourceType.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#8A8A8A' }}>
                      {viewingResource.type === 'assignment' ? t.practitioner.assigned : t.practitioner.shared}
                    </Text>
                  </View>
                </View>

                {/* Practitioner info */}
                {practitioner && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, padding: 12, backgroundColor: colors.surface2, borderRadius: 14 }}>
                    {practitioner.avatar_url ? (
                      <Image source={{ uri: practitioner.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface1 }} />
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bloom, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{(practitioner.full_name || '?')[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{practitioner.full_name}</Text>
                      {practitioner.headline ? (
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{practitioner.headline}</Text>
                      ) : practitioner.credentials.length > 0 ? (
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{practitioner.credentials.join(', ')}</Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textTertiary, fontWeight: '500' }}>{viewingResource.type === 'assignment' ? t.practitioner.assignedBy : t.practitioner.sharedBy}</Text>
                  </View>
                )}

                {viewingResource.description && (
                  <View style={{ marginBottom: 16 }}>
                    <RenderHtml
                      contentWidth={screenWidth - 64}
                      source={{ html: viewingResource.description }}
                      baseStyle={{ fontSize: 15, color: '#8A8A8A', lineHeight: 22 }}
                      tagsStyles={{
                        p: { marginTop: 0, marginBottom: 8 },
                        div: { marginBottom: 4 },
                        br: { height: 4 },
                        table: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, marginVertical: 8 },
                        th: { backgroundColor: '#F5F5F5', padding: 8, fontWeight: '600', color: '#333' },
                        td: { padding: 8, borderTopWidth: 1, borderColor: '#E5E5E5' },
                      }}
                    />
                  </View>
                )}

                {viewingResource.instructions && (
                  <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <RenderHtml
                      contentWidth={screenWidth - 96}
                      source={{ html: viewingResource.instructions }}
                      baseStyle={{ fontSize: 14, color: colors.primary, lineHeight: 20 }}
                      tagsStyles={{ p: { marginTop: 0, marginBottom: 6 }, div: { marginBottom: 2 } }}
                    />
                  </View>
                )}

                {viewingResource.dueDate && (
                  <Text style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 16 }}>
                    {t.practitioner.due.replace('{date}', formatDate(viewingResource.dueDate))}
                  </Text>
                )}

                {/* Practitioner Notes in Preview */}
                {previewNotes && (
                  <View style={{
                    backgroundColor: '#F0FAF5',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#D1F0E0',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Text style={{ fontSize: 16 }}>💬</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534', letterSpacing: 0.3 }}>
                        {practitioner?.full_name ? t.practitioner.noteFrom.replace('{name}', practitioner.full_name) : t.practitioner.noteFromPractitioner}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#15803D', lineHeight: 20 }}>
                      {previewNotes}
                    </Text>
                  </View>
                )}

                </ScrollView>

                {/* Past responses for recurring resources */}
                {viewingResource.isRecurring && pastResponses.length > 0 && (
                  <View style={{ marginHorizontal: 28, marginTop: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
                      {locale === 'fr' ? `Réponses précédentes (${pastResponses.length})` : `Past responses (${pastResponses.length})`}
                    </Text>
                    {pastResponses.slice(0, 5).map((pr) => {
                      const isExpanded = viewingPastResponse?.id === pr.id
                      return (
                        <View key={pr.id} style={{ marginBottom: 6 }}>
                          <TouchableOpacity
                            onPress={() => setViewingPastResponse(isExpanded ? null : pr)}
                            style={{
                              backgroundColor: isExpanded ? colors.surface1 : '#fff',
                              borderRadius: 12, padding: 12,
                              borderWidth: 1, borderColor: isExpanded ? colors.bloom : '#EBEBEB',
                              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>
                              {new Date(pr.submitted_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#999' }}>{isExpanded ? '▲' : '▼'}</Text>
                          </TouchableOpacity>
                          {isExpanded && pr.responses && (
                            <View style={{ backgroundColor: '#FAFAF8', borderRadius: 12, padding: 14, marginTop: 4, borderWidth: 1, borderColor: '#F0F0F0' }}>
                              {(() => {
                                const blocks = previewBlocks || []
                                const entries = Object.entries(pr.responses as Record<string, unknown>)
                                if (entries.length === 0) return <Text style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>{locale === 'fr' ? 'Aucune réponse' : 'No responses'}</Text>
                                return entries.map(([blockId, value]) => {
                                  if (value === undefined || value === null || value === '') return null
                                  const block = blocks.find((b: any) => b.id === blockId)
                                  const question = block ? (typeof block.content === 'string' ? block.content : (block.content?.en || block.content?.fr || '')) : ''
                                  const displayValue = Array.isArray(value)
                                    ? value.filter(Boolean).join(', ')
                                    : typeof value === 'object'
                                    ? Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(', ')
                                    : String(value)
                                  return (
                                    <View key={blockId} style={{ marginBottom: 10 }}>
                                      {question ? <Text style={{ fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 3 }}>{question}</Text> : null}
                                      <Text style={{ fontSize: 14, color: colors.primary, lineHeight: 20 }}>{displayValue}</Text>
                                    </View>
                                  )
                                })
                              })()}
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => handleOpenResource(viewingResource)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 28, paddingVertical: 16, alignItems: 'center',
                    marginHorizontal: 28, marginTop: 16,
                  }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>
                    {viewingResource.isRecurring
                      ? (locale === 'fr' ? 'Remplir à nouveau' : 'Fill again')
                      : viewingResource.status === 'completed' ? t.common.done
                      : viewingResource.status === 'in_progress' ? t.common.continue : t.practitioner.start}
                  </Text>
                </TouchableOpacity>
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
          ) : fillResource && ['worksheet', 'exercise', 'assessment'].includes(activeResourceItem?.resourceType || '') ? (
            /* Step-through card experience for worksheets/exercises */
            <WorksheetStepView
              blocks={(() => {
                const blocks: any[] = Array.isArray(fillResource.blocks) ? fillResource.blocks
                  : Array.isArray(fillResource.content?.blocks) ? fillResource.content.blocks : []
                return blocks
              })()}
              responses={responses}
              onResponseChange={(blockId, value) => setResponses(prev => ({ ...prev, [blockId]: value }))}
              onSaveDraft={handleSaveDraft}
              onSubmit={draftResponseId ? confirmAndSubmit : handleMarkComplete}
              onClose={handleCloseFill}
              saving={saving}
              submitting={submitting}
              isCompleted={activeResourceItem?.status === 'completed'}
              t={t}
              locale={locale}
              draftResponseId={draftResponseId}
            />
          ) : fillResource && (
            <>
              {/* Header — for tables, shared resources, and other non-step types */}
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
                      {saving ? t.common.saving : t.common.save}
                    </Text>
                  </TouchableOpacity>
                ) : <View style={{ width: 36 }} />}
              </View>

              {/* Blocks — original scroll view for tables and other types */}
              <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
                {/* Practitioner info */}
                {practitioner && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                    {practitioner.avatar_url ? (
                      <Image source={{ uri: practitioner.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface1 }} />
                    ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bloom, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{(practitioner.full_name || '?')[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{practitioner.full_name}</Text>
                      {practitioner.headline ? (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{practitioner.headline}</Text>
                      ) : practitioner.credentials.length > 0 ? (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{practitioner.credentials.join(', ')}</Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textTertiary }}>{t.practitioner.sharedBy}</Text>
                  </View>
                )}
                {practitionerNotes && (responseStatus === 'reviewed' || activeResourceItem?.status === 'completed') && (
                  <View style={{
                    backgroundColor: '#F0FAF5', borderRadius: 16, padding: 16, marginBottom: 24,
                    borderWidth: 1, borderColor: '#D1F0E0',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Text style={{ fontSize: 16 }}>💬</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534', letterSpacing: 0.3 }}>
                        {practitioner?.full_name ? t.practitioner.noteFrom.replace('{name}', practitioner.full_name) : t.practitioner.noteFromPractitioner}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#15803D', lineHeight: 20 }}>{practitionerNotes}</Text>
                  </View>
                )}
                {(() => {
                  const resInstructions = fillResource.instructions || fillResource.description || null
                  const blocks: any[] = Array.isArray(fillResource.blocks) ? fillResource.blocks
                    : Array.isArray(fillResource.content?.blocks) ? fillResource.content.blocks : []
                  return blocks.map((block: any, i: number) => (
                    <View key={block.id || i} style={{ marginBottom: 36 }}>
                      {renderBlock(
                        resInstructions && block.type === 'table_exercise' ? { ...block, instructions: resInstructions } : block,
                        responses[block.id], (v) => setResponses(prev => ({ ...prev, [block.id]: v })), (inReview) => setTableReviewReady(inReview), activeResourceItem?.status === 'completed', t, locale
                      )}
                    </View>
                  ))
                })()}
              </ScrollView>

              {/* Bottom action bar — tables and other types */}
              <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EBEBEB',
                paddingHorizontal: 24, paddingVertical: 16, paddingBottom: insets.bottom + 16,
                flexDirection: 'row', gap: 10,
              }}>
                {activeResourceItem?.status === 'completed' ? (
                  <View style={{ flex: 1, backgroundColor: colors.surface1, borderRadius: 28, paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bloom }}>{t.practitioner.completed}</Text>
                  </View>
                ) : activeResourceItem?.resourceType === 'table' ? (
                  tableReviewReady && draftResponseId ? (
                    <TouchableOpacity
                      onPress={handleSaveTable} disabled={saving}
                      style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 16, alignItems: 'center' }}
                    >
                      {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{t.practitioner.saveEntry}</Text>
                      )}
                    </TouchableOpacity>
                  ) : null
                ) : (
                  <TouchableOpacity
                    onPress={handleMarkComplete} disabled={submitting}
                    style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 16, alignItems: 'center' }}
                  >
                    {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                        {activeResourceItem?.type === 'shared' ? t.practitioner.markAsRead : t.practitioner.markComplete}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ─── Feedback Modal ─── */}
      <Modal visible={showFeedback} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 320, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bloom, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
              <CheckCircle size={30} color="#fff" />
            </View>
            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 32 }}>
              {([
                { key: 'negative' as const, Icon: Frown, color: '#EF4444', bg: '#FEF2F2' },
                { key: 'neutral' as const, Icon: Meh, color: '#F59E0B', bg: '#FFFBEB' },
                { key: 'positive' as const, Icon: Smile, color: '#22C55E', bg: '#F0FDF4' },
              ]).map(({ key, Icon, color, bg }) => {
                const selected = feedbackSelection === key
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setFeedbackSelection(selected ? null : key)}
                    style={{
                      width: 64, height: 64, borderRadius: 32,
                      backgroundColor: selected ? bg : colors.surface2,
                      justifyContent: 'center', alignItems: 'center',
                      borderWidth: selected ? 2 : 0,
                      borderColor: selected ? color : 'transparent',
                    }}
                  >
                    <Icon size={28} color={selected ? color : '#AAAAAA'} />
                  </TouchableOpacity>
                )
              })}
            </View>
            <TouchableOpacity
              onPress={handleFeedbackDone}
              style={{
                backgroundColor: colors.primary, borderRadius: 28,
                paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{t.common.done}</Text>
            </TouchableOpacity>
          </View>
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
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {[
                    { value: pastSessions.filter(s => s.status === 'completed').length, label: t.practitioner.statsSessions },
                    { value: resources.length, label: t.practitioner.statsResources },
                    { value: upcomingSessions.length, label: t.practitioner.statsUpcoming },
                  ].map((stat) => (
                    <View key={stat.label} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary }}>{stat.value}</Text>
                      <Text style={{ fontSize: 11, color: '#8A8A8A', marginTop: 2 }}>{stat.label}</Text>
                    </View>
                  ))}
                </View>

                {/* View Profile */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setQuickModal(null)
                    router.push({ pathname: '/(main)/practitioner-profile', params: { practitionerId: member!.practitioner_id } })
                  }}
                  style={{
                    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{t.practitioner.viewProfileCta}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <EmptyState icon={User} title={t.practitioner.noPractitioner} subtitle={t.practitioner.noPractitionerSubtitle} />
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
              {t.practitioner.myAssessments}
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
                    {tab === 'all' ? `${t.practitioner.all} (${resources.length})`
                      : tab === 'pending' ? `${t.practitioner.pending} (${resources.filter(r => r.status !== 'completed').length})`
                      : `${t.practitioner.filterCompleted} (${resources.filter(r => r.status === 'completed').length})`}
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
                <EmptyState icon={FolderOpen} title={t.practitioner.nothingHere} subtitle={t.practitioner.noCategoryResources} />
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bloom full screen */}
      {bloomOpen && (
        <BloomFullScreen onClose={() => setBloomOpen(false)} firstName={firstName} />
      )}

      {/* Floating bottom bar */}
      {!bloomOpen && (
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
          {/* Nav bubble */}
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
              const isActive = key === 'practitioner'
              const config = {
                moments: { icon: Heart, label: (t.home as any)?.moments || 'Moments', route: '/(main)/home' },
                practitioner: { icon: User, label: locale === 'fr' ? 'Mon Suivi' : 'My Care', route: null },
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
                    backgroundColor: isActive ? colors.bloom : '#fff',
                    borderWidth: isActive ? 0 : 1,
                    borderColor: '#E5E5E3',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Icon size={22} color={isActive ? '#fff' : '#999'} strokeWidth={isActive ? 2 : 1.5} />
                  </View>
                  <Text style={{ fontSize: 11, color: isActive ? colors.bloom : '#8A8A8A', fontWeight: isActive ? '700' : '500' }}>{config.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          {/* Capture circle */}
          <FloatingCapture inline />
        </View>
      )}
    </View>
  )
}

const RESOURCE_ICON_MAP: Record<string, { icon: any; color: string; bg: string }> = {
  worksheet: { icon: FileText, color: colors.bloom, bg: '#E8F5F2' },
  table: { icon: Table2, color: '#6366F1', bg: '#EEF2FF' },
  psychoeducation: { icon: BookOpen, color: '#F59E0B', bg: '#FEF3C7' },
  exercise: { icon: Dumbbell, color: '#EC4899', bg: '#FCE7F3' },
  default: { icon: FileQuestion, color: '#8A8A8A', bg: colors.surface1 },
}

// ─── Shared Components ──────────────────────────────

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <View style={{ backgroundColor: colors.surface2, borderRadius: 24, padding: 32, alignItems: 'center' }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
        <Icon size={24} color="#999" strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.primary, textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, color: '#8A8A8A', textAlign: 'center', lineHeight: 20 }}>{subtitle}</Text>
    </View>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
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
        {isCompleted ? t.practitioner.done : isInProgress ? t.practitioner.inProgress : t.practitioner.toDo}
      </Text>
    </View>
  )
}

function ResourceCard({ item, onPress }: { item: ResourceItem; onPress: () => void }) {
  const { t } = useI18n()
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: '#fff', borderRadius: 18, padding: 16,
      borderWidth: 1, borderColor: '#EBEBEB',
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: RESOURCE_ICON_MAP[item.resourceType || '']?.bg || '#F0F5F4', alignItems: 'center', justifyContent: 'center' }}>
        {(() => {
          const cfg = RESOURCE_ICON_MAP[item.resourceType || ''] || RESOURCE_ICON_MAP.default
          const Icon = cfg.icon
          return <Icon size={20} color={cfg.color} strokeWidth={1.8} />
        })()}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }} numberOfLines={1}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <StatusBadge status={item.status} />
          {item.isRecurring && (item.submissionCount || 0) > 0 && (
            <Text style={{ fontSize: 11, color: colors.bloom, fontWeight: '600' }}>({item.submissionCount})</Text>
          )}
          {item.dueDate && (
            <Text style={{ fontSize: 11, color: '#8A8A8A' }}>{t.practitioner.due.replace('{date}', formatDate(item.dueDate))}</Text>
          )}
        </View>
      </View>
      <Text style={{ fontSize: 18, color: '#D4D4D4' }}>›</Text>
    </TouchableOpacity>
  )
}

function UpcomingSessionCard({
  session, actionLoading, onConfirm, onReschedule, onAcceptProposed, onDeclineProposed,
  onCancel, onRescheduleBooking, canModify,
}: {
  session: UpcomingSession; actionLoading: string | null
  onConfirm: () => void; onReschedule: () => void
  onAcceptProposed: () => void; onDeclineProposed: () => void
  onCancel?: () => void; onRescheduleBooking?: () => void
  canModify?: boolean
}) {
  const { t, locale } = useI18n()
  const sessionDate = new Date(session.scheduled_at)
  const needsConfirmation = !session.member_confirmed && !session.reschedule_requested && session.reschedule_status !== 'proposed' && !session.booking_id
  const hasProposedDate = session.reschedule_status === 'proposed' && session.practitioner_proposed_date
  const isLoading = actionLoading === session.id
  const loc = locale === 'fr' ? 'fr-FR' : 'en-US'

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 22, padding: 20,
      borderWidth: 1, borderColor: '#EBEBEB',
    }}>
      {/* Proposed Date Banner */}
      {hasProposedDate && (
        <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 2 }}>
            {t.practitioner.newDateProposed}
          </Text>
          <Text style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 10 }}>
            {formatFullDate(session.practitioner_proposed_date!)} · {formatTime(session.practitioner_proposed_date!)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={onAcceptProposed} disabled={isLoading}
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 10, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
            >
              {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t.practitioner.accept}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDeclineProposed} disabled={isLoading}
              style={{ flex: 1, backgroundColor: colors.surface1, borderRadius: 28, paddingVertical: 10, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{t.practitioner.decline}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status pill */}
      {session.status === 'pending' ? (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ backgroundColor: '#FFF7ED', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#FED7AA' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#EA580C' }}>{locale === 'fr' ? '⏳ En attente de confirmation' : '⏳ Waiting for confirmation'}</Text>
          </View>
        </View>
      ) : needsConfirmation && (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#8A8A8A' }}>{t.practitioner.awaitingConfirmation}</Text>
          </View>
        </View>
      )}
      {session.reschedule_requested && session.reschedule_status === 'pending' && (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#8A8A8A' }}>{t.practitioner.rescheduleRequested}</Text>
          </View>
        </View>
      )}
      {session.member_confirmed && !hasProposedDate && (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ backgroundColor: colors.surface1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.bloom }}>{t.practitioner.confirmed}</Text>
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
            {sessionDate.toLocaleDateString(loc, { month: 'short' })}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{sessionDate.getDate()}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, letterSpacing: -0.3, marginBottom: 4 }}>
            {getSessionTypeLabel(session.session_type, t)}
          </Text>
          <Text style={{ fontSize: 13, color: '#8A8A8A' }}>
            {formatTime(session.scheduled_at)} · {getFormatLabel(session.session_format, t)} · {session.duration_minutes} min
          </Text>
          {session.practitioner && (
            <Text style={{ fontSize: 13, color: '#8A8A8A', marginTop: 2 }}>
              {t.practitioner.with} <Text style={{ fontWeight: '600', color: colors.primary }}>{session.practitioner.full_name}</Text>
            </Text>
          )}
        </View>
      </View>

      {/* Actions — needs confirmation */}
      {needsConfirmation && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EBEBEB' }}>
          <TouchableOpacity
            onPress={onConfirm} disabled={isLoading}
            style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 12, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
          >
            {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t.practitioner.confirm}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReschedule} disabled={isLoading}
            style={{ flex: 1, backgroundColor: colors.surface1, borderRadius: 28, paddingVertical: 12, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
          >
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>{t.practitioner.reschedule}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions — confirmed session with modification allowed */}
      {!needsConfirmation && !hasProposedDate && canModify && (session.member_confirmed || session.booking_id) && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EBEBEB' }}>
          {onRescheduleBooking && (
            <TouchableOpacity
              onPress={onRescheduleBooking} disabled={isLoading}
              style={{ flex: 1, backgroundColor: colors.surface1, borderRadius: 28, paddingVertical: 12, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
            >
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                {locale === 'fr' ? 'Reprogrammer' : 'Reschedule'}
              </Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity
              onPress={onCancel} disabled={isLoading}
              style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 28, paddingVertical: 12, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}
            >
              <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '600' }}>
                {locale === 'fr' ? 'Annuler' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

function PastSessionCard({ session }: { session: UpcomingSession }) {
  const { t, locale } = useI18n()
  const sessionDate = new Date(session.scheduled_at)
  const isCompleted = session.status === 'completed'
  const isCancelled = session.status === 'cancelled'
  const isNoShow = session.status === 'no_show'
  const loc = locale === 'fr' ? 'fr-FR' : 'en-US'

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
            {sessionDate.toLocaleDateString(loc, { month: 'short' })}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{sessionDate.getDate()}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
              {getSessionTypeLabel(session.session_type, t)}
            </Text>
            <View style={{ backgroundColor: colors.surface1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: isCompleted ? colors.bloom : isCancelled ? colors.error : '#8A8A8A' }}>
                {isCompleted ? t.practitioner.done : isCancelled ? t.practitioner.cancelled : isNoShow ? t.practitioner.noShow : session.status}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#8A8A8A' }}>
            {formatTime(session.scheduled_at)} · {getFormatLabel(session.session_format, t)} · {session.duration_minutes} min
          </Text>
          {session.practitioner && (
            <Text style={{ fontSize: 12, color: '#8A8A8A', marginTop: 2 }}>{t.practitioner.with} {session.practitioner.full_name}</Text>
          )}
        </View>
      </View>
    </View>
  )
}
