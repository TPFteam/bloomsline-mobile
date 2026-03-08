// ─── Bloomsline Design Tokens ────────────────────────
// Single source of truth for all shared constants.

// ─── Colors ──────────────────────────────────────────

export const colors = {
  bg: '#fff',
  primary: '#000',
  bloom: '#4A9A86',

  surface1: '#f5f5f5',
  surface2: '#f8f8f8',
  surface3: '#fafafa',

  textPrimary: '#000',
  textSecondary: '#999',
  textTertiary: '#bbb',
  textFaint: '#ccc',
  textMuted: '#d4d4d4',

  divider: '#eee',
  disabled: '#e5e5e5',

  error: '#DC2626',
  errorBg: '#FEE2E2',
} as const

// ─── Spacing ─────────────────────────────────────────

export const spacing = {
  screenPadding: 24,
  cardPadding: 20,
  sectionGap: 32,
  stackGap: 12,
} as const

// ─── Radii ───────────────────────────────────────────

export const radii = {
  button: 28,
  card: 20,
  chartCard: 24,
  input: 16,
  pill: 18,
  circle: (size: number) => size / 2,
} as const

// ─── Typography ──────────────────────────────────────

export const typography = {
  screenTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5 },
  greeting: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  authHeadline: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  cardTitle: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 17, fontWeight: '600' as const },
  sectionLabel: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.5 },
  timestamp: { fontSize: 13, fontWeight: '400' as const },
  version: { fontSize: 13, fontWeight: '400' as const },
} as const

// ─── Mood System ─────────────────────────────────────

export const MOOD_SCORES: Record<string, number> = {
  joyful: 95,
  grateful: 90,
  inspired: 88,
  proud: 85,
  loved: 82,
  peaceful: 80,
  hopeful: 75,
  calm: 72,
  tender: 55,
  restless: 48,
  uncertain: 45,
  tired: 42,
  overwhelmed: 38,
  heavy: 32,
}

export const MOOD_COLORS: Record<string, string> = {
  joyful: '#F59E0B',
  grateful: '#10B981',
  inspired: '#8B5CF6',
  proud: '#EC4899',
  loved: '#F43F5E',
  peaceful: '#06B6D4',
  hopeful: '#F97316',
  calm: '#6366F1',
  tender: '#A78BFA',
  restless: '#EAB308',
  uncertain: '#94A3B8',
  tired: '#64748B',
  overwhelmed: '#EF4444',
  heavy: '#475569',
}

export interface MoodDef {
  key: string
  emoji: string
  label: string
  color: string
  valence: number
}

export const MOODS: MoodDef[] = [
  { key: 'grateful', emoji: '🙏', label: 'Grateful', color: '#10B981', valence: 90 },
  { key: 'peaceful', emoji: '🌿', label: 'Peaceful', color: '#06B6D4', valence: 80 },
  { key: 'joyful', emoji: '✨', label: 'Joyful', color: '#F59E0B', valence: 95 },
  { key: 'inspired', emoji: '🌱', label: 'Inspired', color: '#8B5CF6', valence: 88 },
  { key: 'loved', emoji: '💕', label: 'Loved', color: '#F43F5E', valence: 82 },
  { key: 'calm', emoji: '🧘', label: 'Calm', color: '#6366F1', valence: 72 },
  { key: 'hopeful', emoji: '☀️', label: 'Hopeful', color: '#F97316', valence: 75 },
  { key: 'proud', emoji: '🏆', label: 'Proud', color: '#EC4899', valence: 85 },
  { key: 'overwhelmed', emoji: '😮‍💨', label: 'Overwhelmed', color: '#EF4444', valence: 38 },
  { key: 'tired', emoji: '🌙', label: 'Tired', color: '#64748B', valence: 42 },
  { key: 'uncertain', emoji: '🌫️', label: 'Uncertain', color: '#94A3B8', valence: 45 },
  { key: 'tender', emoji: '🌸', label: 'Tender', color: '#A78BFA', valence: 55 },
  { key: 'restless', emoji: '💬', label: 'Restless', color: '#EAB308', valence: 48 },
  { key: 'heavy', emoji: '🌊', label: 'Heavy', color: '#475569', valence: 32 },
]

// ─── Capture Types ───────────────────────────────────

export const CAPTURE_TYPE_COLORS = {
  photo: '#3B82F6',
  video: '#8B5CF6',
  voice: '#F59E0B',
  write: '#10B981',
} as const
