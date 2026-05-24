import { supabase } from '@/lib/supabase'
import { prewarmSignedUrls } from '@/lib/hooks/useSignedUrl'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'

// ============================================
// TYPES
// ============================================

export type MomentType = 'photo' | 'video' | 'voice' | 'write' | 'mixed'

export interface MediaItem {
  uri: string
  mimeType: string
  durationSeconds?: number
}

export interface MomentMediaRow {
  id: string
  moment_id: string
  /** @deprecated prefer media_path; sign at render time */
  media_url: string
  media_path?: string | null
  mime_type: string
  duration_seconds: number | null
  file_size_bytes: number | null
  sort_order: number
  created_at: string
}

export interface Moment {
  id: string
  user_id: string
  type: MomentType
  /** @deprecated Prefer media_path. Will be dropped in a follow-up
   *  migration once nothing reads it. */
  media_url: string | null
  /** Storage path inside `moments_media`. Render code calls
   *  createSignedUrl on this and uses the result for <Image>. */
  media_path: string | null
  /** @deprecated See media_url */
  thumbnail_url: string | null
  thumbnail_path: string | null
  text_content: string | null
  caption: string | null
  moods: string[]
  duration_seconds: number | null
  file_size_bytes: number | null
  mime_type: string | null
  story_id: string | null
  created_at: string
  updated_at: string
  /** ISO timestamp when patient shared this moment with their
   *  practitioner. Null = not shared. Flipped via
   *  shareMomentWithPractitioner / unshareMomentFromPractitioner. */
  shared_with_practitioner_at: string | null
  // Multi-media items (populated from moment_media table)
  media_items?: MomentMediaRow[]
}

export interface CreateMomentInput {
  mediaItems: MediaItem[]
  textContent?: string
  caption?: string
  moods: string[]
  storyId?: string
}

// ============================================
// STORAGE HELPERS
// ============================================

async function uploadMomentMedia(
  userId: string,
  momentId: string,
  uri: string,
  mimeType: string,
  index: number = 0,
): Promise<{ url: string | null; path: string | null; fileSize: number | null }> {
  // Determine file extension
  let extension = 'bin'
  if (mimeType.startsWith('image/')) {
    extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  } else if (mimeType.startsWith('video/')) {
    extension = mimeType.split('/')[1] || 'mp4'
  } else if (mimeType.startsWith('audio/')) {
    extension = mimeType.split('/')[1] || 'webm'
  }

  const fileName = `media-${index}.${extension}`
  const filePath = `${userId}/${momentId}/${fileName}`

  let fileBody: ArrayBuffer | Blob | FormData
  let fileSize: number | null = null

  if (Platform.OS === 'web') {
    // On web, fetch the blob from the URI
    const response = await fetch(uri)
    const blob = await response.blob()
    fileBody = blob
    fileSize = blob.size
  } else {
    // On native, get file info for size then read as blob via fetch
    // This avoids loading entire file into memory as base64
    const fileInfo = await FileSystem.getInfoAsync(uri)
    if (fileInfo.exists && 'size' in fileInfo) {
      fileSize = fileInfo.size
    }
    const response = await fetch(uri)
    const blob = await response.blob()
    fileBody = blob
    if (!fileSize) fileSize = blob.size
  }

  const { error } = await supabase.storage
    .from('moments_media')
    .upload(filePath, fileBody, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) {
    console.error('Error uploading moment media:', error)
    return { url: null, path: null, fileSize: null }
  }

  // Bucket is private. Return both the path (new source of truth — used
  // by render code via useSignedUrl) and a 1-year signed URL (kept for
  // backward compatibility during the migration window).
  const { data: signed } = await supabase.storage
    .from('moments_media')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365)

  return { url: signed?.signedUrl || null, path: filePath, fileSize }
}

// ============================================
// HELPERS
// ============================================

function deriveMomentType(items: MediaItem[], textContent?: string): MomentType {
  if (items.length === 0 && textContent) return 'write'
  if (items.length === 0) return 'write'

  const types = new Set<string>()
  for (const item of items) {
    if (item.mimeType.startsWith('image/')) types.add('photo')
    else if (item.mimeType.startsWith('video/')) types.add('video')
    else if (item.mimeType.startsWith('audio/')) types.add('voice')
  }

  // If text + media, or multiple different media types → mixed
  if (textContent && types.size > 0) return 'mixed'
  if (types.size > 1) return 'mixed'
  if (types.size === 1) return [...types][0] as MomentType
  return 'write'
}

// ============================================
// MOMENT OPERATIONS
// ============================================

export async function createMoment(input: CreateMomentInput): Promise<Moment | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('No authenticated user')
    return null
  }

  const momentId = crypto.randomUUID()

  // Upload all media items in parallel
  const uploadResults = await Promise.all(
    input.mediaItems.map((item, i) =>
      uploadMomentMedia(user.id, momentId, item.uri, item.mimeType, i)
    )
  )

  // Use first item for backward-compat columns on moments table
  const firstItem = input.mediaItems[0]
  const firstUpload = uploadResults[0]

  const momentType = deriveMomentType(input.mediaItems, input.textContent)

  const { data, error } = await supabase
    .from('moments')
    .insert({
      id: momentId,
      user_id: user.id,
      type: momentType,
      media_url: firstUpload?.url || null,
      media_path: firstUpload?.path || null,
      text_content: input.textContent || null,
      caption: input.caption || null,
      moods: input.moods,
      duration_seconds: firstItem?.durationSeconds || null,
      file_size_bytes: firstUpload?.fileSize || null,
      mime_type: firstItem?.mimeType || null,
      story_id: input.storyId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating moment:', error)
    return null
  }

  // Batch-insert into moment_media for ALL items (including first, for consistent querying)
  if (input.mediaItems.length > 0) {
    const mediaRows = input.mediaItems.map((item, i) => ({
      moment_id: momentId,
      media_url: uploadResults[i]?.url || '',
      media_path: uploadResults[i]?.path || null,
      mime_type: item.mimeType,
      duration_seconds: item.durationSeconds || null,
      file_size_bytes: uploadResults[i]?.fileSize || null,
      sort_order: i,
    }))

    const { error: mediaError } = await supabase
      .from('moment_media')
      .insert(mediaRows)

    if (mediaError) {
      console.error('Error inserting moment_media rows:', mediaError)
    }
  }

  return data as Moment
}

export async function getMemberMoments(limit = 50, offset = 0, sinceDate?: Date, untilDate?: Date): Promise<Moment[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('moments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (sinceDate) {
    query = query.gte('created_at', sinceDate.toISOString())
  }
  if (untilDate) {
    query = query.lt('created_at', untilDate.toISOString())
  }

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching moments:', error)
    return []
  }

  const moments = data as Moment[]

  // Fetch media items for all moments that may have multiple
  if (moments.length > 0) {
    const momentIds = moments.map(m => m.id)
    const { data: mediaData } = await supabase
      .from('moment_media')
      .select('*')
      .in('moment_id', momentIds)
      .order('sort_order', { ascending: true })

    if (mediaData) {
      const mediaByMoment = new Map<string, MomentMediaRow[]>()
      for (const row of mediaData as MomentMediaRow[]) {
        if (!mediaByMoment.has(row.moment_id)) mediaByMoment.set(row.moment_id, [])
        mediaByMoment.get(row.moment_id)!.push(row)
      }
      for (const moment of moments) {
        moment.media_items = mediaByMoment.get(moment.id) || []
      }
    }
  }

  // Mint signed URLs for all visible thumbnails / media in one batch
  // and seed the useSignedUrl cache. Without this, every card hits
  // Supabase storage individually at render time which makes My
  // Journey feel sluggish on first load.
  if (moments.length > 0) {
    const paths: Array<string | null | undefined> = []
    for (const m of moments) {
      // Cards prefer thumbnail when available, fall back to media.
      paths.push(m.thumbnail_path ?? m.thumbnail_url ?? m.media_path ?? m.media_url)
      if (m.media_items) {
        for (const item of m.media_items) {
          paths.push(item.media_path ?? item.media_url)
        }
      }
    }
    // Fire-and-forget — UI still works without it; cards just take the
    // slow path. But we await it inline because callers (Evolution
    // screen) already show a single PageLoader while fetching, and
    // waiting one extra batch round-trip is far better than 20+
    // sequential ones afterwards.
    await prewarmSignedUrls('moments_media', paths)
  }

  return moments
}

/**
 * Flag a moment as shared with the patient's practitioner. Sets
 * `shared_with_practitioner_at` to now. Returns the new ISO timestamp
 * on success or null on failure.
 */
export async function shareMomentWithPractitioner(momentId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const sharedAt = new Date().toISOString()
  const { error } = await supabase
    .from('moments')
    .update({ shared_with_practitioner_at: sharedAt })
    .eq('id', momentId)
    .eq('user_id', user.id)
  if (error) {
    console.error('Error sharing moment:', error)
    return null
  }
  return sharedAt
}

/**
 * Bulk-share many moments in one round-trip. Used by the multi-select
 * flow in the evolution screen. Returns the timestamp the rows were
 * stamped with, or null on failure.
 */
export async function shareMomentsWithPractitioner(momentIds: string[]): Promise<string | null> {
  if (momentIds.length === 0) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const sharedAt = new Date().toISOString()
  const { error } = await supabase
    .from('moments')
    .update({ shared_with_practitioner_at: sharedAt })
    .in('id', momentIds)
    .eq('user_id', user.id)
  if (error) {
    console.error('Error bulk-sharing moments:', error)
    return null
  }
  return sharedAt
}

/**
 * Revoke a previously-shared moment. Sets the column back to null so
 * the practitioner can no longer fetch the row (RLS denies them).
 */
export async function unshareMomentFromPractitioner(momentId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase
    .from('moments')
    .update({ shared_with_practitioner_at: null })
    .eq('id', momentId)
    .eq('user_id', user.id)
  if (error) {
    console.error('Error unsharing moment:', error)
    return false
  }
  return true
}

export async function deleteMoment(momentId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Delete media from storage (lists all files in the moment folder)
  const mediaPath = `${user.id}/${momentId}`
  const { data: files } = await supabase.storage
    .from('moments_media')
    .list(mediaPath)

  if (files && files.length > 0) {
    const filesToDelete = files.map(f => `${mediaPath}/${f.name}`)
    await supabase.storage.from('moments_media').remove(filesToDelete)
  }

  // moment_media rows are cascade-deleted via FK
  const { error } = await supabase
    .from('moments')
    .delete()
    .eq('id', momentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting moment:', error)
    return false
  }

  return true
}
