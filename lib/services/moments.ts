import { supabase } from '@/lib/supabase'
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
  media_url: string
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
  media_url: string | null
  thumbnail_url: string | null
  text_content: string | null
  caption: string | null
  moods: string[]
  duration_seconds: number | null
  file_size_bytes: number | null
  mime_type: string | null
  created_at: string
  updated_at: string
  // Multi-media items (populated from moment_media table)
  media_items?: MomentMediaRow[]
}

export interface CreateMomentInput {
  mediaItems: MediaItem[]
  textContent?: string
  caption?: string
  moods: string[]
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
): Promise<{ url: string | null; fileSize: number | null }> {
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

  let fileBody: ArrayBuffer | Blob
  let fileSize: number | null = null

  if (Platform.OS === 'web') {
    // On web, fetch the blob from the URI
    const response = await fetch(uri)
    const blob = await response.blob()
    fileBody = blob
    fileSize = blob.size
  } else {
    // On native, read the file as base64 and convert to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    })
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    fileBody = bytes.buffer as ArrayBuffer
    fileSize = bytes.length
  }

  const { error } = await supabase.storage
    .from('moments_media')
    .upload(filePath, fileBody, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) {
    console.error('Error uploading moment media:', error)
    return { url: null, fileSize: null }
  }

  const { data: urlData } = supabase.storage
    .from('moments_media')
    .getPublicUrl(filePath)

  return { url: urlData.publicUrl, fileSize }
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
      text_content: input.textContent || null,
      caption: input.caption || null,
      moods: input.moods,
      duration_seconds: firstItem?.durationSeconds || null,
      file_size_bytes: firstUpload?.fileSize || null,
      mime_type: firstItem?.mimeType || null,
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

export async function getMemberMoments(limit = 50, offset = 0, sinceDate?: Date): Promise<Moment[]> {
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

  return moments
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
