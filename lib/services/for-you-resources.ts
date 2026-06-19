// ── For You (self-guided) resources ─────────────────────────────────────────
// Practitioner-authored activities the patient does on their own, anytime.
// Answers are PRIVATE: stored in for_you_responses with patient-only RLS — the
// practitioner never sees them. History keeps every run. Patients can add their
// own private tags (for_you_item_tags). See the care-app migration
// scripts/for-you-resources-migration.sql.

import { supabase } from '../supabase'

// Descriptions can carry HTML/entities from the care-app rich editor (e.g.
// "&nbsp;"). Strip tags + decode the common entities so they read cleanly.
export function cleanText(s?: string | null): string {
  if (!s) return ''
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface ForYouResource {
  id: string
  title: string
  description: string | null
  type: string
  category: string | null
  blocks: any[]
  practitioner_id: string
}

export interface ForYouRun {
  id: string
  resource_id: string
  answers: Record<string, unknown>
  completed_at: string
}

// All published self-guided activities across the patient's practitioner(s).
export async function getForYouResources(practitionerIds: string[]): Promise<ForYouResource[]> {
  const ids = Array.from(new Set(practitionerIds.filter(Boolean)))
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('resources')
    .select('id, title, description, type, category, blocks, practitioner_id')
    .in('practitioner_id', ids)
    .eq('for_you', true)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getForYouResources failed:', error)
    return []
  }
  return (data || []).map((r: any) => ({ ...r, description: cleanText(r.description) })) as ForYouResource[]
}

// Save one run. New row each time → the patient keeps a private history.
export async function saveForYouRun(opts: {
  resourceId: string
  memberId?: string | null
  answers: Record<string, unknown>
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase.from('for_you_responses').insert({
    resource_id: opts.resourceId,
    user_id: user.id,
    member_id: opts.memberId ?? null,
    answers: opts.answers ?? {},
  })
  if (error) {
    console.error('saveForYouRun failed:', error)
    return false
  }
  return true
}

// A patient's private history for one activity (newest first).
export async function getForYouHistory(resourceId: string): Promise<ForYouRun[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('for_you_responses')
    .select('id, resource_id, answers, completed_at')
    .eq('user_id', user.id)
    .eq('resource_id', resourceId)
    .order('completed_at', { ascending: false })
  if (error) {
    console.error('getForYouHistory failed:', error)
    return []
  }
  return (data || []) as ForYouRun[]
}

// Per-patient run counts for a set of activities (for the list cards).
export async function getForYouRunCounts(resourceIds: string[]): Promise<Record<string, number>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || resourceIds.length === 0) return {}
  const { data, error } = await supabase
    .from('for_you_responses')
    .select('resource_id')
    .eq('user_id', user.id)
    .in('resource_id', resourceIds)
  if (error) {
    console.error('getForYouRunCounts failed:', error)
    return {}
  }
  const counts: Record<string, number> = {}
  for (const row of data || []) counts[(row as any).resource_id] = (counts[(row as any).resource_id] || 0) + 1
  return counts
}

// ── Patient-private tags ────────────────────────────────────────────────────
// One row per (patient, resource) holding the patient's own labels.
export async function getForYouTags(): Promise<Record<string, string[]>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  const { data, error } = await supabase
    .from('for_you_item_tags')
    .select('resource_id, tags')
    .eq('user_id', user.id)
  if (error) {
    console.error('getForYouTags failed:', error)
    return {}
  }
  const map: Record<string, string[]> = {}
  for (const row of data || []) map[(row as any).resource_id] = ((row as any).tags || []) as string[]
  return map
}

export async function setForYouTags(resourceId: string, tags: string[]): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase.from('for_you_item_tags').upsert(
    { user_id: user.id, resource_id: resourceId, tags, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,resource_id' },
  )
  if (error) {
    console.error('setForYouTags failed:', error)
    return false
  }
  return true
}
