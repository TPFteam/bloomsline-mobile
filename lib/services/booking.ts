import { supabase } from '../supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'

// ─── Types ──────────────────────────────────────────

export interface SessionType {
  id: string
  name: string
  duration: number
  price: number | null
}

export interface BookingSettings {
  default_duration: number
  buffer_before: number
  buffer_after: number
  min_notice_hours: number
  max_advance_days: number
  session_types: SessionType[]
  booking_page_enabled: boolean
  require_approval: boolean
  cancellation_policy: string | null
  booking_instructions: string | null
  external_booking_url: string | null
}

export interface TimeSlot {
  slot_start: string
  slot_end: string
}

export interface PractitionerPublicProfile {
  id: string
  user_id: string
  slug: string
  full_name: string
  avatar_url: string | null
  headline: string | null
  bio: string | null
  credentials: string[]
  specialties: string[]
  approaches: string[]
  education: { degree: string; institution: string; year_completed?: number }[]
  licenses: { type: string; state_province: string; is_verified?: boolean }[]
  years_experience: number | null
  offers_telehealth: boolean
  offers_in_person: boolean
  client_acceptance_status: 'accepting' | 'waitlist' | 'not_accepting' | null
  age_groups: string[]
  session_types: string[]
  languages: string[]
  contact_email: string | null
  contact_phone: string | null
  social_links: { website?: string; linkedin?: string } | null
  practice_location: { city?: string; state_province?: string; country?: string } | null
  publications: { type: string; title: string; description?: string; url?: string }[]
  session_fee_min: number | null
  session_fee_max: number | null
  fee_currency: string | null
  offers_sliding_scale: boolean
  is_verified: boolean
  bookingUrl: string | null
  booking_page_enabled: boolean
}

// ─── Fetchers ───────────────────────────────────────

export async function fetchPublicProfile(practitionerId: string): Promise<PractitionerPublicProfile | null> {
  const { data: userData } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url')
    .eq('id', practitionerId)
    .single()

  if (!userData) return null

  const { data: profile } = await supabase
    .from('practitioner_profiles')
    .select('*')
    .eq('user_id', practitionerId)
    .maybeSingle()

  const { data: bookingSettings } = await supabase
    .from('booking_settings')
    .select('external_booking_url, booking_page_enabled')
    .eq('user_id', practitionerId)
    .maybeSingle()

  let bookingUrl: string | null = null
  if (bookingSettings?.external_booking_url) {
    bookingUrl = bookingSettings.external_booking_url
  } else if (bookingSettings?.booking_page_enabled && profile?.slug) {
    bookingUrl = `https://bloomsline.com/practitioner/${profile.slug}/book`
  }

  return {
    id: profile?.id || practitionerId,
    user_id: practitionerId,
    slug: profile?.slug || '',
    full_name: userData.full_name || '',
    avatar_url: userData.avatar_url,
    headline: profile?.headline || null,
    bio: profile?.bio || null,
    credentials: profile?.credentials || [],
    specialties: profile?.specialties || [],
    approaches: profile?.approaches || [],
    education: profile?.education || [],
    licenses: profile?.licenses || [],
    years_experience: profile?.years_experience || null,
    offers_telehealth: profile?.offers_telehealth ?? false,
    offers_in_person: profile?.offers_in_person ?? false,
    client_acceptance_status: profile?.client_acceptance_status || null,
    age_groups: profile?.age_groups || [],
    session_types: profile?.session_types || [],
    languages: profile?.languages || [],
    contact_email: profile?.contact_email || null,
    contact_phone: profile?.contact_phone || null,
    social_links: profile?.social_links || null,
    practice_location: profile?.practice_location || null,
    publications: profile?.publications || [],
    session_fee_min: profile?.session_fee_min || null,
    session_fee_max: profile?.session_fee_max || null,
    fee_currency: profile?.fee_currency || null,
    offers_sliding_scale: profile?.offers_sliding_scale ?? false,
    is_verified: profile?.is_verified ?? false,
    bookingUrl,
    booking_page_enabled: bookingSettings?.booking_page_enabled ?? false,
  }
}

export async function fetchBookingSettings(practitionerId: string): Promise<BookingSettings | null> {
  const { data } = await supabase
    .from('booking_settings')
    .select('*')
    .eq('user_id', practitionerId)
    .maybeSingle()

  if (!data || !data.booking_page_enabled) return null

  return {
    default_duration: data.default_duration || 60,
    buffer_before: data.buffer_before || 0,
    buffer_after: data.buffer_after || 0,
    min_notice_hours: data.min_notice_hours || 24,
    max_advance_days: data.max_advance_days || 60,
    session_types: data.session_types || [],
    booking_page_enabled: data.booking_page_enabled,
    require_approval: data.require_approval ?? true,
    cancellation_policy: data.cancellation_policy || null,
    booking_instructions: data.booking_instructions || null,
    external_booking_url: data.external_booking_url || null,
  }
}

export async function fetchAvailableSlots(
  practitionerId: string,
  date: string,
  duration: number,
): Promise<{ slots: TimeSlot[]; practitionerTimezone: string | null }> {
  // Get practitioner's availability schedule for the day of week
  const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

  const { data: schedules } = await supabase
    .from('availability_schedules')
    .select('start_time, end_time, timezone, is_active')
    .eq('user_id', practitionerId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  if (!schedules || schedules.length === 0) return { slots: [], practitionerTimezone: null }

  const practitionerTz = schedules[0].timezone || 'UTC'

  // Get booking settings for buffer times
  const { data: settings } = await supabase
    .from('booking_settings')
    .select('buffer_before, buffer_after, min_notice_hours')
    .eq('user_id', practitionerId)
    .maybeSingle()

  const bufferBefore = (settings?.buffer_before || 0) * 60000
  const bufferAfter = (settings?.buffer_after || 0) * 60000
  const minNoticeMs = (settings?.min_notice_hours || 0) * 3600000
  const now = Date.now()

  // Get existing bookings for this date to check conflicts
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('practitioner_id', practitionerId)
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)
    .neq('status', 'cancelled')

  // Check availability overrides (blocked dates)
  const { data: overrides } = await supabase
    .from('availability_overrides')
    .select('is_available')
    .eq('user_id', practitionerId)
    .eq('override_date', date)

  if (overrides && overrides.length > 0 && !overrides[0].is_available) {
    return { slots: [], practitionerTimezone: practitionerTz }
  }

  // Generate 30-minute slots from each schedule block
  const allSlots: TimeSlot[] = []
  const durationMs = duration * 60000

  for (const schedule of schedules) {
    const [startH, startM] = schedule.start_time.split(':').map(Number)
    const [endH, endM] = schedule.end_time.split(':').map(Number)

    // Create slot times in practitioner's timezone by building ISO strings
    // We iterate in 30-min intervals from start to end
    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    while (currentMinutes + duration <= endMinutes) {
      const slotH = Math.floor(currentMinutes / 60)
      const slotM = currentMinutes % 60
      const slotTimeStr = `${date}T${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}:00`

      // Create Date in practitioner's timezone
      const slotStart = new Date(slotTimeStr)
      // Approximate: treat the date string as local time in practitioner TZ
      // For proper timezone handling we'd need a library, but this works for same-tz scenarios
      const slotEnd = new Date(slotStart.getTime() + durationMs)

      const slotStartMs = slotStart.getTime()
      const slotEndMs = slotEnd.getTime()

      // Check min notice
      if (slotStartMs - now < minNoticeMs) {
        currentMinutes += 30
        continue
      }

      // Check conflicts with existing bookings
      let hasConflict = false
      if (existingBookings) {
        for (const booking of existingBookings) {
          const bStart = new Date(booking.start_time).getTime() - bufferBefore
          const bEnd = new Date(booking.end_time).getTime() + bufferAfter
          if (slotStartMs < bEnd && slotEndMs > bStart) {
            hasConflict = true
            break
          }
        }
      }

      if (!hasConflict) {
        allSlots.push({
          slot_start: slotStart.toISOString(),
          slot_end: slotEnd.toISOString(),
        })
      }

      currentMinutes += 30
    }
  }

  return { slots: allSlots, practitionerTimezone: practitionerTz }
}

export async function createBooking(input: {
  practitioner_id: string
  session_type: string
  start_time: string
  end_time: string
  timezone: string
  client_name: string
  client_email: string
  client_phone?: string
  notes?: string
  member_id?: string
}): Promise<{ success: boolean; requiresApproval?: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()

  // Use the care app API so notifications, emails, and calendar sync all fire
  try {
    const res = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.error || 'Failed to create booking' }
    }

    const data = await res.json()
    return {
      success: true,
      requiresApproval: data.booking?.status === 'pending',
    }
  } catch (fetchError) {
    // Fallback: insert directly if API is unreachable (no emails/notifications)
    console.warn('Booking API unreachable, inserting directly:', fetchError)

    const { data: settings } = await supabase
      .from('booking_settings')
      .select('require_approval')
      .eq('user_id', input.practitioner_id)
      .maybeSingle()

    const status = settings?.require_approval !== false ? 'pending' : 'confirmed'

    const { error } = await supabase
      .from('bookings')
      .insert({
        practitioner_id: input.practitioner_id,
        member_id: input.member_id || null,
        session_type: input.session_type,
        start_time: input.start_time,
        end_time: input.end_time,
        timezone: input.timezone,
        client_name: input.client_name,
        client_email: input.client_email,
        client_phone: input.client_phone || null,
        notes: input.notes || null,
        status,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, requiresApproval: status === 'pending' }
  }
}

export async function fetchPublishedResources(practitionerId: string) {
  const { data } = await supabase
    .from('resources')
    .select('id, title, description, type')
    .eq('practitioner_id', practitionerId)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .limit(6)

  return data || []
}
