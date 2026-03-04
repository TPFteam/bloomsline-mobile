// Member Hub Types

// ============================================
// ENUMS
// ============================================

export type MemberStatus = 'active' | 'inactive' | 'pending'

export type EngagementLevel = 'low' | 'medium' | 'high'

export type SessionType = 'initial_consultation' | 'follow_up' | 'check_in' | 'crisis' | 'group' | 'other'

export type SessionFormat = 'in_person' | 'virtual' | 'phone'

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export type NoteType = 'general' | 'assessment' | 'treatment_plan' | 'milestone' | 'concern' | 'observation'

export type FileCategory = 'general' | 'intake' | 'assessment' | 'consent' | 'insurance' | 'correspondence' | 'other'

export type MilestoneCategory = 'general' | 'therapy_goal' | 'behavioral' | 'emotional' | 'social' | 'other'

export type MilestoneStatus = 'discovery' | 'building' | 'thriving' | 'independent'

// ============================================
// INTERFACES
// ============================================

// Bilingual value type - supports both legacy format and new {en, fr} format
export type BilingualString = string | { en: string; fr: string }
export type BilingualStringArray = string[] | { en: string[]; fr: string[] }

export interface MemberPreferences {
  communication_style: string | string[] | BilingualStringArray | null
  key_strengths: string[] | BilingualStringArray
  areas_of_sensitivity: string[] | BilingualStringArray
  therapeutic_context: string | BilingualString | null
  current_treatment: string | BilingualString | null
  preferred_contact_method: 'email' | 'phone' | 'text'
  preferred_session_format: SessionFormat
}

export interface EmergencyContact {
  name: string | null
  relationship: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

export interface Member {
  id: string
  practitioner_id: string
  user_id: string | null // Links to auth.users for member login access

  // Basic Information
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null // ISO date string
  avatar_url: string | null

  // Status & Engagement
  status: MemberStatus
  engagement_level: EngagementLevel

  // Preferences & Emergency Contact
  preferences: MemberPreferences
  emergency_contact: EmergencyContact

  // Notes
  internal_notes: string | null

  // Demo flag
  is_demo: boolean // Identifies demo/example profiles for new practitioners

  // Metadata
  created_at: string
  updated_at: string
  last_session_at: string | null
}

// Member with computed fields
export interface MemberWithStats extends Member {
  total_sessions: number
  upcoming_sessions: number
  last_session_date: string | null
  days_since_last_session: number | null
}

export type RescheduleStatus = 'pending' | 'proposed' | 'accepted' | 'declined'

export interface Session {
  id: string
  member_id: string
  practitioner_id: string

  // Session Details
  session_type: SessionType
  session_format: SessionFormat
  scheduled_at: string // ISO datetime string
  duration_minutes: number

  // Status
  status: SessionStatus

  // Content
  notes: string | null
  summary: string | null
  mood_rating: number | null // 1-10

  // Goals & Outcomes
  goals: SessionGoal[]
  outcomes: SessionOutcome[]
  homework: SessionHomework[]

  // Member confirmation & reschedule
  member_confirmed: boolean
  reschedule_requested: boolean
  reschedule_reason: string | null
  member_suggested_date: string | null
  practitioner_proposed_date: string | null
  reschedule_status: RescheduleStatus | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface SessionGoal {
  id: string
  text: string
  achieved: boolean
}

export interface SessionOutcome {
  id: string
  text: string
  category: 'positive' | 'neutral' | 'concern'
}

export interface SessionHomework {
  id: string
  text: string
  completed: boolean
  due_date: string | null
}

// Session with member info
export interface SessionWithMember extends Session {
  member: Pick<Member, 'id' | 'first_name' | 'last_name' | 'avatar_url'>
}

export interface ProgressNote {
  id: string
  member_id: string
  practitioner_id: string
  session_id: string | null

  // Content
  title: string | null
  content: string
  note_type: NoteType
  image_urls: string[] | null

  // Visibility
  is_private: boolean

  // Metadata
  created_at: string
  updated_at: string
}

export interface MemberFile {
  id: string
  member_id: string
  practitioner_id: string

  // File Information
  file_name: string
  file_type: string
  file_size: number | null
  storage_path: string

  // Organization
  category: FileCategory
  description: string | null

  // Folder hierarchy
  is_folder: boolean
  parent_folder_id: string | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface FolderBreadcrumb {
  id: string
  name: string
}

export interface SharedResource {
  id: string
  member_id: string
  story_id: string
  practitioner_id: string

  // Sharing Details
  shared_at: string
  message: string | null
  viewed_at: string | null

  // Metadata
  created_at: string
}

// Shared resource with story info
export interface SharedResourceWithStory extends SharedResource {
  story: {
    id: string
    title: string
    unique_slug: string
    published: boolean
  }
}

export interface Milestone {
  id: string
  member_id: string
  practitioner_id: string

  // Details
  title: string
  description: string | null
  category: MilestoneCategory

  // Status
  status: MilestoneStatus
  achieved: boolean // Keep for backwards compatibility
  achieved_at: string | null
  target_date: string | null

  // Sharing
  shared_with_member: boolean

  // Notes/Comments (legacy single note)
  notes: string | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface MilestoneComment {
  id: string
  milestone_id: string
  practitioner_id: string
  content: string
  created_at: string
  updated_at: string
}

// ============================================
// FORM TYPES
// ============================================

export interface CreateMemberInput {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  status?: MemberStatus
  internal_notes?: string
  preferences?: Partial<MemberPreferences>
  emergency_contact?: Partial<EmergencyContact>
}

export interface UpdateMemberInput extends Partial<CreateMemberInput> {
  engagement_level?: EngagementLevel
  avatar_url?: string
}

export interface CreateSessionInput {
  member_id: string
  session_type: SessionType
  session_format: SessionFormat
  scheduled_at: string
  duration_minutes?: number
  notes?: string
}

export interface UpdateSessionInput {
  session_type?: SessionType
  session_format?: SessionFormat
  scheduled_at?: string
  duration_minutes?: number
  status?: SessionStatus
  notes?: string
  summary?: string
  mood_rating?: number
  goals?: SessionGoal[]
  outcomes?: SessionOutcome[]
  homework?: SessionHomework[]
}

export interface CreateProgressNoteInput {
  member_id: string
  session_id?: string
  title?: string
  content: string
  note_type?: NoteType
  is_private?: boolean
}

export interface CreateMilestoneInput {
  member_id: string
  title: string
  description?: string
  category?: MilestoneCategory
  target_date?: string
}

// ============================================
// FILTER TYPES
// ============================================

export type MemberFilter = 'all' | MemberStatus

export interface MemberSearchParams {
  filter: MemberFilter
  search: string
  sortBy: 'name' | 'last_session' | 'created_at'
  sortOrder: 'asc' | 'desc'
}

// ============================================
// STATS TYPES
// ============================================

export interface MemberHubStats {
  total_members: number
  active_members: number
  inactive_members: number
  pending_members: number // Deprecated - kept for backwards compatibility
  sessions_this_week: number
  average_engagement: number // percentage
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMemberFullName(member: Pick<Member, 'first_name' | 'last_name'>): string {
  return `${member.first_name} ${member.last_name}`.trim()
}

export function getMemberInitials(member: Pick<Member, 'first_name' | 'last_name'>): string {
  const first = member.first_name?.[0] || ''
  const last = member.last_name?.[0] || ''
  return `${first}${last}`.toUpperCase()
}

export function getStatusColor(status: MemberStatus): string {
  switch (status) {
    case 'active':
      return 'emerald'
    case 'inactive':
      return 'gray'
    case 'pending':
      return 'amber'
    default:
      return 'gray'
  }
}

export function getEngagementColor(level: EngagementLevel): string {
  switch (level) {
    case 'high':
      return 'emerald'
    case 'medium':
      return 'amber'
    case 'low':
      return 'red'
    default:
      return 'gray'
  }
}

export function getSessionTypeLabel(type: SessionType): string {
  const labels: Record<SessionType, string> = {
    initial_consultation: 'Initial Consultation',
    follow_up: 'Follow-up',
    check_in: 'Check-in',
    crisis: 'Crisis',
    group: 'Group Session',
    other: 'Other'
  }
  return labels[type] || type
}

export function getSessionFormatLabel(format: SessionFormat): string {
  const labels: Record<SessionFormat, string> = {
    in_person: 'In Person',
    virtual: 'Virtual',
    phone: 'Phone Call'
  }
  return labels[format] || format
}

export function formatRelativeTime(date: string | null): string {
  if (!date) return 'Never'

  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  return `${Math.floor(diffDays / 30)} months ago`
}

export function formatDate(date: string | null, locale: 'en' | 'fr' | 'es' = 'en'): string {
  if (!date) return locale === 'fr' ? 'Jamais' : locale === 'es' ? 'Nunca' : 'Never'

  const d = new Date(date)
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | null, locale: 'en' | 'fr' | 'es' = 'en'): string {
  if (!date) return locale === 'fr' ? 'Jamais' : locale === 'es' ? 'Nunca' : 'Never'

  const d = new Date(date)
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// MEMBER SUMMARY TYPES
// ============================================

export interface SummaryContent {
  current_status: string
  progress_highlights: string[]
  key_themes: string[]
  areas_of_attention: string[]
  recommendations: string[]
  next_steps: string[]
}

export interface MemberSummary {
  id: string
  member_id: string
  practitioner_id: string
  summary_content: SummaryContent
  summary_text: string | null
  model_used: string
  tokens_used: number | null
  generated_at: string
  created_at: string
}
