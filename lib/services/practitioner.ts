import { supabase } from '../supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'

// ─── Types ──────────────────────────────────────────

export interface PractitionerProfile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  headline: string | null
  credentials: string[]
  specialties: string[]
  bookingUrl: string | null
  slug: string | null
}

export interface UpcomingSession {
  id: string
  scheduled_at: string
  duration_minutes: number
  session_type: string
  session_format: string
  status: string
  member_confirmed: boolean
  reschedule_requested: boolean
  reschedule_status: 'pending' | 'proposed' | 'accepted' | 'declined' | null
  practitioner_proposed_date: string | null
  notes: string | null
  practitioner: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

export interface ResourceItem {
  id: string
  resourceId: string
  type: 'assignment' | 'shared'
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  dueDate: string | null
  instructions: string | null
  resourceType: string | null
}

// ─── Helpers ────────────────────────────────────────

function extractLocalized(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return val.en || Object.values(val)[0] || ''
}

// ─── Fetchers ───────────────────────────────────────

export async function fetchPractitioner(practitionerId: string): Promise<PractitionerProfile | null> {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url')
    .eq('id', practitionerId)
    .single()

  if (userError || !userData) return null

  const { data: profile } = await supabase
    .from('practitioner_profiles')
    .select('headline, credentials, specialties, slug')
    .eq('user_id', practitionerId)
    .maybeSingle()

  // Fetch booking settings for external booking URL
  const { data: bookingSettings } = await supabase
    .from('booking_settings')
    .select('external_booking_url, booking_page_enabled')
    .eq('user_id', practitionerId)
    .maybeSingle()

  // Determine booking URL: external URL takes priority, otherwise use public booking page
  let bookingUrl: string | null = null
  if (bookingSettings?.external_booking_url) {
    bookingUrl = bookingSettings.external_booking_url
  } else if (bookingSettings?.booking_page_enabled && profile?.slug) {
    bookingUrl = `https://bloomsline.com/practitioner/${profile.slug}/book`
  }

  return {
    id: userData.id,
    full_name: userData.full_name,
    email: userData.email,
    avatar_url: userData.avatar_url,
    headline: profile?.headline || null,
    credentials: profile?.credentials || [],
    specialties: profile?.specialties || [],
    bookingUrl,
    slug: profile?.slug || null,
  }
}

export async function fetchSessions(memberId: string, userId?: string): Promise<{
  upcoming: UpcomingSession[]
  past: UpcomingSession[]
}> {
  const now = new Date().toISOString()

  // Fetch from sessions table (practitioner-created sessions)
  const [upcomingRes, pastRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, scheduled_at, duration_minutes, session_type, session_format, status, member_confirmed, reschedule_requested, reschedule_status, practitioner_proposed_date, notes, practitioner_id')
      .eq('member_id', memberId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(5),
    supabase
      .from('sessions')
      .select('id, scheduled_at, duration_minutes, session_type, session_format, status, member_confirmed, reschedule_requested, reschedule_status, practitioner_proposed_date, notes, practitioner_id')
      .eq('member_id', memberId)
      .or('status.eq.completed,status.eq.cancelled,status.eq.no_show')
      .order('scheduled_at', { ascending: false })
      .limit(20),
  ])

  // Also fetch from bookings table (member-booked appointments)
  const bookingQueries = userId ? await Promise.all([
    supabase
      .from('bookings')
      .select('id, start_time, end_time, session_type, status, notes, practitioner_id, client_name')
      .eq('member_id', userId)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(10),
    supabase
      .from('bookings')
      .select('id, start_time, end_time, session_type, status, notes, practitioner_id, client_name')
      .eq('member_id', userId)
      .in('status', ['completed', 'cancelled', 'no_show'])
      .order('start_time', { ascending: false })
      .limit(20),
  ]) : [{ data: null }, { data: null }]

  // Map bookings to the same UpcomingSession shape
  const mapBooking = (b: any): any => {
    const start = new Date(b.start_time)
    const end = new Date(b.end_time)
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
    return {
      id: b.id,
      scheduled_at: b.start_time,
      duration_minutes: durationMinutes,
      session_type: b.session_type,
      session_format: 'telehealth',
      status: b.status === 'confirmed' ? 'scheduled' : b.status,
      member_confirmed: b.status === 'confirmed',
      reschedule_requested: false,
      reschedule_status: null,
      practitioner_proposed_date: null,
      notes: b.notes,
      practitioner_id: b.practitioner_id,
      _source: 'booking',
    }
  }

  const upcomingBookings = (bookingQueries[0]?.data || []).map(mapBooking)
  const pastBookings = (bookingQueries[1]?.data || []).map(mapBooking)

  // Deduplicate: when a booking is confirmed, a session is also created.
  // Skip bookings that already have a matching session (same practitioner + time).
  const sessionTimes = new Set(
    [...(upcomingRes.data || []), ...(pastRes.data || [])].map(
      (s: any) => `${s.practitioner_id}_${s.scheduled_at}`
    )
  )
  const dedupBookings = (bookings: any[]) =>
    bookings.filter((b) => !sessionTimes.has(`${b.practitioner_id}_${b.scheduled_at}`))

  const allUpcoming = [...(upcomingRes.data || []), ...dedupBookings(upcomingBookings)]
  const allPast = [...(pastRes.data || []), ...dedupBookings(pastBookings)]

  const allSessions = [...allUpcoming, ...allPast]
  let practitionerMap: Record<string, any> = {}

  if (allSessions.length > 0) {
    const practitionerIds = [...new Set(allSessions.map(s => s.practitioner_id))]
    const { data: practitioners } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', practitionerIds)

    if (practitioners) {
      for (const p of practitioners) practitionerMap[p.id] = p
    }
  }

  const mapSession = (session: any): UpcomingSession => ({
    ...session,
    member_confirmed: session.member_confirmed ?? false,
    reschedule_requested: session.reschedule_requested ?? false,
    reschedule_status: session.reschedule_status ?? null,
    practitioner_proposed_date: session.practitioner_proposed_date ?? null,
    practitioner: practitionerMap[session.practitioner_id] || null,
  })

  // Sort upcoming by date ascending
  allUpcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  allPast.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  return {
    upcoming: allUpcoming.map(mapSession),
    past: allPast.map(mapSession),
  }
}

export async function fetchResources(memberId: string): Promise<ResourceItem[]> {
  try {
    const [assignmentsRes, sharedRes] = await Promise.all([
      supabase
        .from('resource_assignments')
        .select('id, status, due_date, instructions, resource:resources(id, title, description, type)')
        .eq('member_id', memberId)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('member_shared_resources')
        .select('id, viewed_at, completed_at, message, resource:resources(id, title, description, type)')
        .eq('member_id', memberId)
        .order('shared_at', { ascending: false }),
    ])

    const items: ResourceItem[] = []

    if (assignmentsRes.data) {
      for (const a of assignmentsRes.data) {
        const resource = Array.isArray(a.resource) ? a.resource[0] : a.resource
        if (!resource) continue
        items.push({
          id: a.id,
          resourceId: resource.id,
          type: 'assignment',
          title: extractLocalized(resource.title) || 'Untitled',
          description: extractLocalized(resource.description) || null,
          status: a.status as any,
          dueDate: a.due_date,
          instructions: (a as any).instructions || null,
          resourceType: resource.type || null,
        })
      }
    }

    if (sharedRes.data) {
      const assignedIds = new Set(
        assignmentsRes.data?.map((a: any) => {
          const r = Array.isArray(a.resource) ? a.resource[0] : a.resource
          return r?.id
        }) || []
      )

      for (const s of sharedRes.data) {
        const resource = Array.isArray(s.resource) ? s.resource[0] : s.resource
        if (!resource || assignedIds.has(resource.id)) continue
        items.push({
          id: s.id,
          resourceId: resource.id,
          type: 'shared',
          title: extractLocalized(resource.title) || 'Untitled',
          description: extractLocalized(resource.description) || null,
          status: (s as any).completed_at ? 'completed' : s.viewed_at ? 'in_progress' : 'pending',
          dueDate: null,
          instructions: (s as any).message || null,
          resourceType: resource.type || null,
        })
      }
    }

    return items
  } catch (error) {
    console.error('Error fetching resources:', error)
    return []
  }
}

// ─── Session Actions ────────────────────────────────

export async function confirmSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .update({ member_confirmed: true, reschedule_requested: false })
    .eq('id', sessionId)
  return !error
}

export async function requestReschedule(
  sessionId: string,
  reason: string,
  suggestedDate?: string,
  suggestedTime?: string,
): Promise<boolean> {
  let memberSuggestedDate = null
  if (suggestedDate && suggestedTime) {
    memberSuggestedDate = new Date(`${suggestedDate}T${suggestedTime}`).toISOString()
  }

  const { error } = await supabase
    .from('sessions')
    .update({
      reschedule_requested: true,
      reschedule_reason: reason,
      member_confirmed: false,
      member_suggested_date: memberSuggestedDate,
      reschedule_status: 'pending',
    })
    .eq('id', sessionId)
  return !error
}

export async function acceptProposedDate(session: UpcomingSession): Promise<boolean> {
  if (!session.practitioner_proposed_date) return false
  const { error } = await supabase
    .from('sessions')
    .update({
      scheduled_at: session.practitioner_proposed_date,
      reschedule_requested: false,
      reschedule_status: 'accepted',
      member_confirmed: true,
      practitioner_proposed_date: null,
    })
    .eq('id', session.id)
  return !error
}

export async function declineProposedDate(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .update({
      reschedule_status: 'pending',
      practitioner_proposed_date: null,
    })
    .eq('id', sessionId)
  return !error
}

// ─── Resource Actions ───────────────────────────────

export async function openResourceForFill(
  item: ResourceItem,
  memberId: string,
  practitionerId: string,
): Promise<{ resource: any; responseId: string | null; responses: Record<string, unknown>; practitionerNotes: string | null; responseStatus: string | null }> {
  const { data: resource, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', item.resourceId)
    .single()

  if (error || !resource) throw error || new Error('Resource not found')

  let responseId: string | null = null
  let responses: Record<string, unknown> = {}
  let practitionerNotes: string | null = null
  let responseStatus: string | null = null

  if (item.type === 'assignment') {
    const { data: existing } = await supabase
      .from('resource_responses')
      .select('*')
      .eq('assignment_id', item.id)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      responseId = existing.id
      responses = existing.responses || {}
      practitionerNotes = existing.practitioner_notes || null
      responseStatus = existing.status || null
    } else {
      const { data: newResp } = await supabase
        .from('resource_responses')
        .insert({
          assignment_id: item.id,
          resource_id: item.resourceId,
          member_id: memberId,
          practitioner_id: practitionerId,
          responses: {},
          status: 'draft',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (newResp) {
        responseId = newResp.id
        await supabase
          .from('resource_assignments')
          .update({ status: 'in_progress' })
          .eq('id', item.id)
      }
    }
  } else {
    await supabase
      .from('member_shared_resources')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', item.id)

    // For interactive shared resources (table, worksheet, etc.), create a response record
    const interactiveTypes = ['table', 'worksheet', 'exercise', 'assessment']
    if (interactiveTypes.includes(item.resourceType || '')) {
      const { data: existing } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', item.resourceId)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        responseId = existing.id
        responses = existing.responses || {}
        practitionerNotes = existing.practitioner_notes || null
        responseStatus = existing.status || null
      } else {
        const { data: newResp, error: insertErr } = await supabase
          .from('resource_responses')
          .insert({
            resource_id: item.resourceId,
            member_id: memberId,
            practitioner_id: practitionerId,
            shared_resource_id: item.id,
            responses: {},
            status: 'draft',
            started_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (insertErr) {
          console.error('Failed to create response for shared resource:', insertErr)
          // Retry without shared_resource_id in case column doesn't exist
          const { data: retry, error: retryErr } = await supabase
            .from('resource_responses')
            .insert({
              resource_id: item.resourceId,
              member_id: memberId,
              practitioner_id: practitionerId,
              responses: {},
              status: 'draft',
              started_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (retry) responseId = retry.id
          else console.error('Retry also failed:', retryErr)
        } else if (newResp) {
          responseId = newResp.id
        }
      }
    }
  }

  return { resource, responseId, responses, practitionerNotes, responseStatus }
}

export async function saveDraft(
  responseId: string,
  responses: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await supabase
    .from('resource_responses')
    .update({ responses, updated_at: new Date().toISOString() })
    .eq('id', responseId)
    .eq('status', 'draft')
  return !error
}

export async function saveTableEntry(
  responseId: string,
  responses: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await supabase
    .from('resource_responses')
    .update({ responses, status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', responseId)
  if (error) {
    console.error('saveTableEntry error:', error)
    throw error
  }
  return true
}

export async function fetchPractitionerNotes(
  resourceId: string,
  memberId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('resource_responses')
    .select('practitioner_notes, status')
    .eq('resource_id', resourceId)
    .eq('member_id', memberId)
    .in('status', ['reviewed', 'submitted'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.practitioner_notes || null
}

export async function submitResource(
  responseId: string,
  assignmentId: string,
  responses: Record<string, unknown>,
): Promise<boolean> {
  const now = new Date().toISOString()
  const { error: e1 } = await supabase
    .from('resource_responses')
    .update({ responses, status: 'submitted', submitted_at: now, updated_at: now })
    .eq('id', responseId)

  const { error: e2 } = await supabase
    .from('resource_assignments')
    .update({ status: 'completed', updated_at: now })
    .eq('id', assignmentId)

  return !e1 && !e2
}

export async function markResourceComplete(
  item: ResourceItem,
  responseId: string | null,
  responses: Record<string, unknown>,
): Promise<boolean> {
  const now = new Date().toISOString()
  if (item.type === 'shared') {
    await supabase
      .from('member_shared_resources')
      .update({ viewed_at: now, completed_at: now })
      .eq('id', item.id)

    // Save responses if there's a response record (interactive shared resources)
    if (responseId && Object.keys(responses).length > 0) {
      await supabase
        .from('resource_responses')
        .update({ responses, status: 'submitted', submitted_at: now, updated_at: now })
        .eq('id', responseId)
    }
    return true
  } else {
    await supabase
      .from('resource_assignments')
      .update({ status: 'completed', updated_at: now })
      .eq('id', item.id)

    if (responseId) {
      await supabase
        .from('resource_responses')
        .update({ responses, status: 'submitted', submitted_at: now })
        .eq('id', responseId)
    }
    return true
  }
}

// ─── Invite Practitioner ────────────────────────────

export async function invitePractitioner(email: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_URL}/api/invite-practitioner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ email: email.trim() }),
  })
  return res.ok
}
