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
  calm: 72,
  grateful: 90,
  inspired: 88,
  loved: 82,
  proud: 85,
  hopeful: 75,
  funny: 80,
  peaceful: 78,
  playful: 83,
  anxious: 38,
  overwhelmed: 35,
  tired: 42,
  heavy: 32,
  sad: 28,
  angry: 30,
  lonely: 25,
  // Legacy keys for backward compatibility with old moments
  joyful: 95,
  peaceful: 80,
  tender: 55,
  restless: 48,
  uncertain: 45,
}

export const MOOD_COLORS: Record<string, string> = {
  calm: '#4A9A86',
  grateful: '#10B981',
  inspired: '#8B5CF6',
  loved: '#F43F5E',
  proud: '#EC4899',
  hopeful: '#F97316',
  funny: '#FBBF24',
  playful: '#F59E0B',
  anxious: '#3B82F6',
  overwhelmed: '#EF4444',
  tired: '#64748B',
  heavy: '#475569',
  sad: '#6B7280',
  angry: '#DC2626',
  lonely: '#7C3AED',
  // Legacy keys
  joyful: '#F59E0B',
  peaceful: '#06B6D4',
  tender: '#A78BFA',
  restless: '#EAB308',
  uncertain: '#94A3B8',
}

export interface MoodDef {
  key: string
  icon: string // lucide icon name
  label: string
  color: string
  valence: number
}

export const MOODS: MoodDef[] = [
  // Positive — gentle to energetic
  { key: 'peaceful', icon: 'TreePalm', label: 'Peaceful', color: '#06B6D4', valence: 78 },
  { key: 'calm', icon: 'Leaf', label: 'Calm', color: '#4A9A86', valence: 72 },
  { key: 'grateful', icon: 'Heart', label: 'Grateful', color: '#10B981', valence: 90 },
  { key: 'hopeful', icon: 'Sun', label: 'Hopeful', color: '#F97316', valence: 75 },
  { key: 'loved', icon: 'HeartHandshake', label: 'Loved', color: '#F43F5E', valence: 82 },
  { key: 'proud', icon: 'Trophy', label: 'Proud', color: '#EC4899', valence: 85 },
  { key: 'inspired', icon: 'Sparkles', label: 'Inspired', color: '#8B5CF6', valence: 88 },
  { key: 'funny', icon: 'Laugh', label: 'Funny', color: '#FBBF24', valence: 80 },
  { key: 'playful', icon: 'Zap', label: 'Playful', color: '#F59E0B', valence: 83 },
  // Difficult — mild to intense
  { key: 'tired', icon: 'Moon', label: 'Tired', color: '#64748B', valence: 42 },
  { key: 'anxious', icon: 'Wind', label: 'Anxious', color: '#3B82F6', valence: 38 },
  { key: 'sad', icon: 'CloudDrizzle', label: 'Sad', color: '#6B7280', valence: 28 },
  { key: 'lonely', icon: 'UserX', label: 'Lonely', color: '#7C3AED', valence: 25 },
  { key: 'overwhelmed', icon: 'Waves', label: 'Overwhelmed', color: '#EF4444', valence: 35 },
  { key: 'heavy', icon: 'CloudRain', label: 'Heavy', color: '#475569', valence: 32 },
  { key: 'angry', icon: 'Flame', label: 'Angry', color: '#DC2626', valence: 30 },
]

// ─── Capture Types ───────────────────────────────────

export const CAPTURE_TYPE_COLORS = {
  photo: '#3B82F6',
  video: '#8B5CF6',
  voice: '#F59E0B',
  write: '#10B981',
} as const
