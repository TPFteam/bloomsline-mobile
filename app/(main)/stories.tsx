import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Share,
  Image,
  Pressable,
} from 'react-native'
import { Audio } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import * as Clipboard from 'expo-clipboard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  ArrowLeft,
  Plus,
  BookOpen,
  Check,
  X,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Type,
  AlignLeft,
  Minus,
  MoreVertical,
  Clock,
  Globe,
  Lock,
  Copy,
  Share2,
  ArrowRight,
  ImageIcon,
  Mic,
  MicOff,
  ChevronUp,
  ChevronDown,
  BookMarked,
  FolderPlus,
  LayoutGrid,
  LayoutList,
  Heart,
  Star,
  Sun,
  Moon,
  Cloud,
  Flower2,
  Leaf,
  Mountain,
  Music,
  Sparkles,
  Flame,
  Target,
  Feather,
  Compass,
} from 'lucide-react-native'
import { BackButton } from '@/components/ui/BackButton'
import { PageLoader } from '@/components/PageLoader'
import { useAuth } from '@/lib/auth-context'
import { colors, radii, spacing } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'

const SHARE_BASE_URL = 'https://bloomsline.com/stories'

// ─── Types ──────────────────────────────────────────

interface ContentBlock {
  id: string
  type: 'text' | 'heading' | 'list' | 'divider' | 'media'
  content: any
  order: number
}

interface Story {
  id: string
  user_id: string
  title: string
  content: ContentBlock[]
  published: boolean
  unique_slug: string
  secret_code?: string | null
  chapter_id?: string | null
  chapter_order?: number
  created_at: string
  updated_at: string
}

interface Chapter {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_icon: string
  sort_order: number
  created_at: string
  updated_at: string
}

const CHAPTER_ICONS: { name: string; icon: any }[] = [
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Heart', icon: Heart },
  { name: 'Star', icon: Star },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Flower2', icon: Flower2 },
  { name: 'Leaf', icon: Leaf },
  { name: 'Cloud', icon: Cloud },
  { name: 'Flame', icon: Flame },
  { name: 'Mountain', icon: Mountain },
  { name: 'Music', icon: Music },
  { name: 'Feather', icon: Feather },
  { name: 'Compass', icon: Compass },
  { name: 'Target', icon: Target },
  { name: 'BookMarked', icon: BookMarked },
]

function ChapterIcon({ name, size = 22, color = colors.bloom }: { name: string; size?: number; color?: string }) {
  const entry = CHAPTER_ICONS.find(i => i.name === name)
  const IconComponent = entry?.icon || BookOpen
  return <IconComponent size={size} color={color} />
}

// ─── Helpers ────────────────────────────────────────

function generateSlug(title: string, userId?: string): string {
  const clean = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 7)
  return userId ? `${clean}-${userId.substring(0, 4)}-${ts}-${rand}` : `${clean}-${ts}-${rand}`
}

function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') { alert(message ? `${title}\n${message}` : title) }
  else { Alert.alert(title, message) }
}

function genBlockId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function parseContent(raw: any): ContentBlock[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch {}
  }
  return []
}

function getPreview(blocks: any): string {
  const parsed = parseContent(blocks)
  for (const b of parsed) {
    if (b.type === 'text' && b.content?.text) return b.content.text.substring(0, 120)
    if (b.type === 'heading' && b.content?.text) return b.content.text.substring(0, 120)
  }
  return ''
}

// ─── Audio Player ───────────────────────────────────

function AudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    return () => { sound?.unloadAsync() }
  }, [sound])

  async function togglePlay() {
    if (sound) {
      if (playing) { await sound.pauseAsync(); setPlaying(false) }
      else { await sound.playAsync(); setPlaying(true) }
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0)
            setDuration(status.durationMillis || 0)
            if (status.didJustFinish) { setPlaying(false); setPosition(0) }
          }
        }
      )
      setSound(newSound)
      setPlaying(true)
    }
  }

  function fmtTime(ms: number) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <View style={{
      backgroundColor: colors.surface2, borderRadius: radii.card, padding: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: '#EBEBEB',
    }}>
      <TouchableOpacity
        onPress={togglePlay}
        style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bloom,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          {playing ? '❚❚' : '▶'}
        </Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={{ height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{
            height: 4, backgroundColor: colors.bloom, borderRadius: 2,
            width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
          }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{fmtTime(position)}</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{fmtTime(duration)}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Block Renderer (view mode) ─────────────────────

function RenderBlock({ block, onImagePress }: { block: ContentBlock; onImagePress?: (url: string) => void }) {
  switch (block.type) {
    case 'heading': {
      const level = block.content?.level || 1
      const fontSize = level === 1 ? 22 : level === 2 ? 18 : 16
      return (
        <Text style={{ fontSize, fontWeight: '700', color: colors.primary }}>
          {block.content?.text || ''}
        </Text>
      )
    }
    case 'text':
      return (
        <Text style={{ fontSize: 15, color: '#444', lineHeight: 24 }}>
          {block.content?.text || ''}
        </Text>
      )
    case 'list': {
      const items: string[] = block.content?.items || []
      const ordered = block.content?.ordered || false
      return (
        <View style={{ gap: 4 }}>
          {items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ fontSize: 15, color: colors.textSecondary, width: 20 }}>
                {ordered ? `${i + 1}.` : '•'}
              </Text>
              <Text style={{ flex: 1, fontSize: 15, color: '#444', lineHeight: 22 }}>{item}</Text>
            </View>
          ))}
        </View>
      )
    }
    case 'media': {
      const mediaItems = block.content?.items || (block.content?.url ? [{
        url: block.content.url, fileType: block.content.fileType,
        fileName: block.content.fileName, alt: block.content.alt,
      }] : [])
      if (mediaItems.length === 0) return null
      return (
        <View style={{ gap: 10 }}>
          {mediaItems.map((item: any, i: number) => (
            <View key={i}>
              {item.fileType === 'image' ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress?.(item.url)}>
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: '100%', height: undefined, aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.surface1 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : item.fileType === 'audio' ? (
                <AudioPlayer uri={item.url} />
              ) : null}
            </View>
          ))}
          {block.content?.caption ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' }}>
              {block.content.caption}
            </Text>
          ) : null}
        </View>
      )
    }
    case 'divider':
      return <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 4 }} />
    default:
      return null
  }
}

// ─── Block Actions (edit mode) ──────────────────────

function BlockActions({ onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  onRemove: () => void; onMoveUp?: () => void; onMoveDown?: () => void; isFirst?: boolean; isLast?: boolean
}) {
  return (
    <View style={{ gap: 2, alignItems: 'center' }}>
      {onMoveUp && !isFirst && (
        <TouchableOpacity onPress={onMoveUp} style={{ padding: 4 }}>
          <ChevronUp size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onRemove} style={{ padding: 4 }}>
        <X size={14} color={colors.error} />
      </TouchableOpacity>
      {onMoveDown && !isLast && (
        <TouchableOpacity onPress={onMoveDown} style={{ padding: 4 }}>
          <ChevronDown size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Edit Block (edit mode) ─────────────────────────

function EditBlock({
  block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  block: ContentBlock; onChange: (u: ContentBlock) => void; onRemove: () => void
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean
}) {
  const inputStyle = {
    fontSize: 15, color: colors.primary, padding: 14,
    backgroundColor: colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB',
  }

  switch (block.type) {
    case 'heading':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={block.content?.text || ''}
              onChangeText={(t) => onChange({ ...block, content: { ...block.content, text: t } })}
              placeholder="Heading..."
              placeholderTextColor={colors.textFaint}
              style={{ ...inputStyle, fontSize: 18, fontWeight: '700' }}
            />
          </View>
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    case 'text':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={block.content?.text || ''}
              onChangeText={(t) => onChange({ ...block, content: { text: t } })}
              placeholder="Write something..."
              placeholderTextColor={colors.textFaint}
              multiline
              style={{ ...inputStyle, lineHeight: 22, minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    case 'list': {
      const items: string[] = block.content?.items || ['']
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            {items.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, width: 18 }}>
                  {block.content?.ordered ? `${i + 1}.` : '•'}
                </Text>
                <TextInput
                  value={item}
                  onChangeText={(t) => {
                    const newItems = [...items]; newItems[i] = t
                    onChange({ ...block, content: { ...block.content, items: newItems } })
                  }}
                  placeholder={`Item ${i + 1}...`}
                  placeholderTextColor={colors.textFaint}
                  style={{
                    flex: 1, fontSize: 14, color: colors.primary, padding: 10,
                    backgroundColor: colors.surface2, borderRadius: 10, borderWidth: 1, borderColor: '#EBEBEB',
                  }}
                />
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => {
                    onChange({ ...block, content: { ...block.content, items: items.filter((_, idx) => idx !== i) } })
                  }} style={{ padding: 4 }}>
                    <Minus size={14} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={() => onChange({ ...block, content: { ...block.content, items: [...items, ''] } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
            >
              <Plus size={14} color={colors.bloom} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>Add item</Text>
            </TouchableOpacity>
          </View>
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    }
    case 'media': {
      const mediaItems = block.content?.items || []
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, gap: 8 }}>
            {mediaItems.map((item: any, i: number) => (
              <View key={i}>
                {item.fileType === 'image' ? (
                  <Image source={{ uri: item.url }}
                    style={{ width: '100%', height: undefined, aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: colors.surface1 }}
                    resizeMode="cover"
                  />
                ) : item.fileType === 'audio' ? (
                  <AudioPlayer uri={item.url} />
                ) : null}
              </View>
            ))}
            <TextInput
              value={block.content?.caption || ''}
              onChangeText={(t) => onChange({ ...block, content: { ...block.content, caption: t } })}
              placeholder="Add a caption..."
              placeholderTextColor={colors.textFaint}
              style={{
                fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', padding: 10,
                backgroundColor: colors.surface2, borderRadius: 10, borderWidth: 1, borderColor: '#EBEBEB',
              }}
            />
          </View>
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    }
    case 'divider':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    default:
      return null
  }
}

// ═══════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════

export default function StoriesScreen() {
  const { user } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // View story
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  // Editor
  const [editing, setEditing] = useState(false)
  const [editStory, setEditStory] = useState<Story | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBlocks, setEditBlocks] = useState<ContentBlock[]>([])
  const [editSaving, setEditSaving] = useState(false)

  // Action menu
  const [menuStoryId, setMenuStoryId] = useState<string | null>(null)

  // Publish modal
  const [publishModalVisible, setPublishModalVisible] = useState(false)
  const [publishStep, setPublishStep] = useState<'choose' | 'enter-code'>('choose')
  const [secretCode, setSecretCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [publishTarget, setPublishTarget] = useState<'editor' | 'story'>('editor')
  const [publishingStory, setPublishingStory] = useState<Story | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Code modal
  const [codeModalVisible, setCodeModalVisible] = useState(false)
  const [codeModalStory, setCodeModalStory] = useState<Story | null>(null)
  const [newCode, setNewCode] = useState('')
  const [confirmNewCode, setConfirmNewCode] = useState('')
  const [codeSaving, setCodeSaving] = useState(false)

  // Chapters
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null)
  const [chapterEditorVisible, setChapterEditorVisible] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterDescription, setChapterDescription] = useState('')
  const [chapterIcon, setChapterIcon] = useState('BookOpen')
  const [chapterSaving, setChapterSaving] = useState(false)
  const [assignSheetVisible, setAssignSheetVisible] = useState(false)
  const [assigningStory, setAssigningStory] = useState<Story | null>(null)
  const [chapterReaderVisible, setChapterReaderVisible] = useState(false)
  const [readingChapter, setReadingChapter] = useState<Chapter | null>(null)
  const [chapterMenuId, setChapterMenuId] = useState<string | null>(null)

  // Recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [uploading, setUploading] = useState(false)

  // ─── Data ─────────────────────────────────────────

  const fetchStories = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setStories((data || []).map(s => ({ ...s, content: parseContent(s.content) })))
    } catch (err) {
      console.error('Error fetching stories:', err)
    }
  }, [user?.id])

  const fetchChapters = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
      if (error) throw error
      setChapters((data || []) as Chapter[])
    } catch (err) {
      console.error('Error fetching chapters:', err)
    }
  }, [user?.id])

  useFocusEffect(useCallback(() => {
    setLoading(true)
    Promise.all([fetchStories(), fetchChapters()]).finally(() => setLoading(false))
  }, [fetchStories, fetchChapters]))

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([fetchStories(), fetchChapters()])
    setRefreshing(false)
  }

  // ─── Editor Actions ───────────────────────────────

  function startCreate() {
    setEditStory(null)
    setEditTitle('')
    setEditBlocks([{ id: genBlockId(), type: 'text', content: { text: '' }, order: 0 }])
    setEditing(true)
  }

  function startEdit(story: Story) {
    setEditStory(story)
    setEditTitle(story.title)
    setEditBlocks(parseContent(story.content))
    setEditing(true)
  }

  async function saveStory(publish: boolean, storySecretCode?: string | null) {
    if (!editTitle.trim()) {
      showAlert('Title required', 'Please add a title for your story.')
      return
    }
    setEditSaving(true)
    try {
      const orderedBlocks = editBlocks.map((b, i) => ({ ...b, order: i }))
      const now = new Date().toISOString()

      if (editStory) {
        const updateData: any = {
          title: editTitle.trim(),
          content: orderedBlocks,
          updated_at: now,
        }
        if (publish) {
          updateData.published = true
          if (storySecretCode !== undefined) updateData.secret_code = storySecretCode
        }
        const { error } = await supabase.from('stories').update(updateData).eq('id', editStory.id)
        if (error) throw error
        setStories(prev => prev.map(s => s.id === editStory.id
          ? { ...s, ...updateData, content: orderedBlocks }
          : s
        ))
      } else {
        const slug = generateSlug(editTitle, user?.id)
        const insertData: any = {
          user_id: user?.id,
          title: editTitle.trim(),
          content: orderedBlocks,
          published: publish,
          unique_slug: slug,
          secret_code: storySecretCode ?? null,
          created_at: now,
          updated_at: now,
        }
        const { data: newStory, error } = await supabase
          .from('stories').insert(insertData).select().single()
        if (error) throw error
        if (newStory) {
          setStories(prev => [{ ...newStory, content: orderedBlocks }, ...prev])
        }
      }
      setEditing(false)
    } catch (err) {
      console.error('Error saving story:', err)
      showAlert('Error', 'Failed to save story.')
    } finally {
      setEditSaving(false)
    }
  }

  async function publishStory(story: Story, storySecretCode?: string | null) {
    try {
      const updateData: any = { published: true, updated_at: new Date().toISOString() }
      if (storySecretCode !== undefined) updateData.secret_code = storySecretCode
      const { error } = await supabase.from('stories').update(updateData).eq('id', story.id)
      if (error) throw error
      setStories(prev => prev.map(s => s.id === story.id
        ? { ...s, published: true, secret_code: storySecretCode ?? s.secret_code } : s
      ))
      if (viewingStory?.id === story.id) {
        setViewingStory({ ...viewingStory, published: true, secret_code: storySecretCode ?? viewingStory.secret_code })
      }
    } catch (err) {
      console.error('Error publishing story:', err)
    }
  }

  async function unpublishStory(story: Story) {
    setMenuStoryId(null)
    try {
      const { error } = await supabase.from('stories')
        .update({ published: false, secret_code: null, updated_at: new Date().toISOString() })
        .eq('id', story.id)
      if (error) throw error
      setStories(prev => prev.map(s => s.id === story.id ? { ...s, published: false, secret_code: null } : s))
      if (viewingStory?.id === story.id) {
        setViewingStory({ ...viewingStory, published: false, secret_code: null })
      }
    } catch (err) {
      console.error('Error unpublishing:', err)
    }
  }

  // Publish modal helpers
  function openPublishModal(target: 'editor' | 'story', story?: Story) {
    setPublishStep('choose')
    setSecretCode('')
    setConfirmCode('')
    setPublishTarget(target)
    setPublishingStory(story || null)
    setPublishModalVisible(true)
  }

  function closePublishModal() {
    setPublishModalVisible(false)
    setSecretCode('')
    setConfirmCode('')
  }

  async function handlePublicPublish() {
    closePublishModal()
    if (publishTarget === 'editor') await saveStory(true, null)
    else if (publishingStory) await publishStory(publishingStory, null)
  }

  async function handlePrivatePublish() {
    if (secretCode.trim().length < 4 || secretCode !== confirmCode) return
    closePublishModal()
    if (publishTarget === 'editor') await saveStory(true, secretCode.trim())
    else if (publishingStory) await publishStory(publishingStory, secretCode.trim())
  }

  function getShareUrl(story: Story): string {
    return `${SHARE_BASE_URL}/${story.unique_slug}`
  }

  async function copyShareLink(story: Story) {
    const url = getShareUrl(story)
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(url) } catch {}
    } else {
      await Clipboard.setStringAsync(url)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function shareStory(story: Story) {
    const url = getShareUrl(story)
    const message = story.secret_code
      ? `Check out my story "${story.title}": ${url}\nSecret code: ${story.secret_code}`
      : `Check out my story "${story.title}": ${url}`

    if (Platform.OS === 'web') {
      if (navigator.share) {
        try { await navigator.share({ title: story.title, text: message, url }) } catch {}
      } else await copyShareLink(story)
    } else {
      try { await Share.share({ message }) } catch {}
    }
  }

  function openCodeModal(story: Story) {
    setCodeModalStory(story)
    setNewCode(story.secret_code || '')
    setConfirmNewCode(story.secret_code || '')
    setCodeModalVisible(true)
  }

  async function saveCode() {
    if (!codeModalStory) return
    const trimmed = newCode.trim()
    if (trimmed && trimmed.length < 4) {
      showAlert('Too short', 'Secret code must be at least 4 characters.')
      return
    }
    if (trimmed && trimmed !== confirmNewCode.trim()) {
      showAlert('Mismatch', "Codes don't match.")
      return
    }
    setCodeSaving(true)
    try {
      const codeValue = trimmed || null
      const { error } = await supabase.from('stories')
        .update({ secret_code: codeValue, updated_at: new Date().toISOString() })
        .eq('id', codeModalStory.id)
      if (error) throw error
      setStories(prev => prev.map(s => s.id === codeModalStory.id ? { ...s, secret_code: codeValue } : s))
      if (viewingStory?.id === codeModalStory.id) {
        setViewingStory({ ...viewingStory!, secret_code: codeValue })
      }
      setCodeModalVisible(false)
    } catch (err) {
      showAlert('Error', 'Failed to update secret code.')
    } finally {
      setCodeSaving(false)
    }
  }

  async function removeCode() {
    if (!codeModalStory) return
    setCodeSaving(true)
    try {
      const { error } = await supabase.from('stories')
        .update({ secret_code: null, updated_at: new Date().toISOString() })
        .eq('id', codeModalStory.id)
      if (error) throw error
      setStories(prev => prev.map(s => s.id === codeModalStory.id ? { ...s, secret_code: null } : s))
      if (viewingStory?.id === codeModalStory.id) {
        setViewingStory({ ...viewingStory!, secret_code: null })
      }
      setCodeModalVisible(false)
    } catch (err) {
      console.error('Error removing code:', err)
    } finally {
      setCodeSaving(false)
    }
  }

  // ─── Chapter CRUD ────────────────────────────────

  function openChapterEditor(chapter?: Chapter) {
    if (chapter) {
      setEditingChapter(chapter)
      setChapterTitle(chapter.title)
      setChapterDescription(chapter.description || '')
      setChapterIcon(chapter.cover_icon || 'BookOpen')
    } else {
      setEditingChapter(null)
      setChapterTitle('')
      setChapterDescription('')
      setChapterIcon('BookOpen')
    }
    setChapterEditorVisible(true)
  }

  async function saveChapter() {
    if (!chapterTitle.trim()) {
      showAlert(t.stories?.title || 'Title required')
      return
    }
    setChapterSaving(true)
    try {
      const now = new Date().toISOString()
      if (editingChapter) {
        const { error } = await supabase.from('chapters')
          .update({ title: chapterTitle.trim(), description: chapterDescription.trim() || null, cover_icon: chapterIcon, updated_at: now })
          .eq('id', editingChapter.id)
        if (error) throw error
        setChapters(prev => prev.map(c => c.id === editingChapter.id
          ? { ...c, title: chapterTitle.trim(), description: chapterDescription.trim() || null, cover_icon: chapterIcon, updated_at: now }
          : c
        ))
      } else {
        const { data, error } = await supabase.from('chapters')
          .insert({ user_id: user?.id, title: chapterTitle.trim(), description: chapterDescription.trim() || null, cover_icon: chapterIcon, sort_order: chapters.length })
          .select().single()
        if (error) throw error
        if (data) setChapters(prev => [...prev, data as Chapter])
      }
      setChapterEditorVisible(false)
    } catch (err) {
      console.error('Error saving chapter:', err)
      showAlert('Error', 'Failed to save chapter.')
    } finally {
      setChapterSaving(false)
    }
  }

  function confirmDeleteChapter(chapter: Chapter) {
    const msg = t.chapters?.deleteConfirm || 'Delete this chapter? Stories will become standalone.'
    if (Platform.OS === 'web') {
      if (confirm(msg)) deleteChapter(chapter.id)
    } else {
      Alert.alert(t.chapters?.deleteChapter || 'Delete Chapter', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteChapter(chapter.id) },
      ])
    }
  }

  async function deleteChapter(chapterId: string) {
    try {
      // Remove chapter_id from stories first
      await supabase.from('stories').update({ chapter_id: null, chapter_order: 0 }).eq('chapter_id', chapterId)
      const { error } = await supabase.from('chapters').delete().eq('id', chapterId)
      if (error) throw error
      setChapters(prev => prev.filter(c => c.id !== chapterId))
      setStories(prev => prev.map(s => s.chapter_id === chapterId ? { ...s, chapter_id: null, chapter_order: 0 } : s))
    } catch (err) {
      console.error('Error deleting chapter:', err)
    }
  }

  function openAssignSheet(story: Story) {
    setAssigningStory(story)
    setAssignSheetVisible(true)
  }

  async function assignStoryToChapter(storyId: string, chapterId: string | null) {
    try {
      const chapterOrder = chapterId
        ? stories.filter(s => s.chapter_id === chapterId).length
        : 0
      const { error } = await supabase.from('stories')
        .update({ chapter_id: chapterId, chapter_order: chapterOrder, updated_at: new Date().toISOString() })
        .eq('id', storyId)
      if (error) throw error
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, chapter_id: chapterId, chapter_order: chapterOrder } : s))
      setAssignSheetVisible(false)
    } catch (err) {
      console.error('Error assigning story:', err)
    }
  }

  function openChapterReader(chapter: Chapter) {
    setReadingChapter(chapter)
    setChapterReaderVisible(true)
  }

  function confirmDelete(story: Story) {
    setMenuStoryId(null)
    if (Platform.OS === 'web') {
      if (confirm(`Delete "${story.title}"? This cannot be undone.`)) deleteStory(story.id)
    } else {
      Alert.alert('Delete Story', `Delete "${story.title}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteStory(story.id) },
      ])
    }
  }

  async function deleteStory(id: string) {
    try {
      const { error } = await supabase.from('stories').delete().eq('id', id)
      if (error) throw error
      setStories(prev => prev.filter(s => s.id !== id))
      if (viewingStory?.id === id) setViewingStory(null)
    } catch (err) {
      console.error('Error deleting story:', err)
    }
  }

  // ─── Block Editing ────────────────────────────────

  function addBlock(type: ContentBlock['type']) {
    const newBlock: ContentBlock = {
      id: genBlockId(),
      type,
      content: type === 'text' ? { text: '' }
        : type === 'heading' ? { text: '', level: 2 }
        : type === 'list' ? { items: [''], ordered: false }
        : type === 'media' ? { items: [] }
        : {},
      order: editBlocks.length,
    }
    setEditBlocks(prev => [...prev, newBlock])
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    const newBlocks = [...editBlocks]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return
    ;[newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]]
    setEditBlocks(newBlocks)
  }

  async function uploadToStorage(uri: string, fileName: string, mimeType: string): Promise<string | null> {
    if (!user?.id) return null
    setUploading(true)
    try {
      const response = await fetch(uri)
      const blob = await response.blob()
      const path = `${user.id}/${Date.now()}-${fileName}`
      const { error } = await supabase.storage.from('story-media').upload(path, blob, { contentType: mimeType, upsert: false })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('story-media').getPublicUrl(path)
      return urlData.publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      showAlert('Upload Error', 'Failed to upload file.')
      return null
    } finally {
      setUploading(false)
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    const fileName = asset.fileName || `image-${Date.now()}.jpg`
    const publicUrl = await uploadToStorage(asset.uri, fileName, asset.mimeType || 'image/jpeg')
    if (!publicUrl) return
    const mediaBlock: ContentBlock = {
      id: genBlockId(), type: 'media',
      content: { items: [{ url: publicUrl, fileType: 'image', fileName, alt: '' }], caption: '' },
      order: editBlocks.length,
    }
    setEditBlocks(prev => [...prev, mediaBlock])
  }

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync()
      if (!permission.granted) {
        showAlert('Permission needed', 'Please allow microphone access to record voice notes.')
        return
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      setRecording(rec)
      setRecordingDuration(0)
      rec.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) setRecordingDuration(status.durationMillis || 0)
      })
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  async function stopRecording() {
    if (!recording) return
    try {
      await recording.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
      const uri = recording.getURI()
      setRecording(null)
      setRecordingDuration(0)
      if (!uri) return
      const fileName = `voice-${Date.now()}.m4a`
      const publicUrl = await uploadToStorage(uri, fileName, 'audio/m4a')
      if (!publicUrl) return
      const mediaBlock: ContentBlock = {
        id: genBlockId(), type: 'media',
        content: { items: [{ url: publicUrl, fileType: 'audio', fileName }], caption: '' },
        order: editBlocks.length,
      }
      setEditBlocks(prev => [...prev, mediaBlock])
    } catch (err) {
      console.error('Failed to stop recording:', err)
    }
  }

  // ─── Computed ─────────────────────────────────────

  const publishedCount = stories.filter(s => s.published).length
  const draftCount = stories.filter(s => !s.published).length
  const filtered = filter === 'all' ? stories
    : filter === 'published' ? stories.filter(s => s.published)
    : stories.filter(s => !s.published)

  const standaloneStories = filtered.filter(s => !s.chapter_id)
  const storiesByChapter = (chapterId: string) =>
    filtered.filter(s => s.chapter_id === chapterId).sort((a, b) => (a.chapter_order || 0) - (b.chapter_order || 0))

  // ─── Loading ──────────────────────────────────────

  if (loading) return <PageLoader />

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: spacing.screenPadding, paddingBottom: 16, backgroundColor: '#fff' }}>
        {/* Back button — own row */}
        <View style={{ marginBottom: 28 }}>
          <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(main)/practitioner')} />
        </View>

        {/* Title + Create */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: colors.primary, letterSpacing: -0.8, lineHeight: 38 }}>
            {t.stories?.title || 'My Stories'}
          </Text>
          <TouchableOpacity
            onPress={startCreate}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.bloom, borderRadius: radii.button,
              paddingHorizontal: 16, paddingVertical: 10,
            }}
          >
            <Plus size={18} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
              {t.stories?.create || 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screenPadding, paddingTop: 0, paddingBottom: 120 }}>
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { count: stories.length, label: t.stories?.total || 'Total', color: colors.bloom },
            { count: publishedCount, label: t.stories?.published || 'Published', color: '#059669' },
            { count: draftCount, label: t.stories?.drafts || 'Drafts', color: colors.textSecondary },
          ].map((stat, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: '#fff', borderRadius: radii.card, padding: 14,
              alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB',
            }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: stat.color }}>{stat.count}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter tabs + view toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
            {([
              { key: 'all' as const, label: t.stories?.all || 'All' },
              { key: 'published' as const, label: t.stories?.published || 'Published' },
              { key: 'draft' as const, label: t.stories?.drafts || 'Drafts' },
            ]).map((tab) => {
              const active = filter === tab.key
              return (
                <TouchableOpacity key={tab.key} onPress={() => setFilter(tab.key)} style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.pill,
                  backgroundColor: active ? colors.primary : colors.surface1,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* View mode toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface1, borderRadius: 12, padding: 3 }}>
            <TouchableOpacity
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                backgroundColor: viewMode === 'list' ? '#fff' : 'transparent',
              }}
            >
              <LayoutList size={16} color={viewMode === 'list' ? colors.primary : colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('grid')}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                backgroundColor: viewMode === 'grid' ? '#fff' : 'transparent',
              }}
            >
              <LayoutGrid size={16} color={viewMode === 'grid' ? colors.primary : colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'list' ? (
        /* ═══════════════════════════════════════════ */
        /* CHAPTERS VIEW                               */
        /* ═══════════════════════════════════════════ */
        <>
          {chapters.length > 0 ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>
                  {t.chapters?.title || 'Chapters'}
                </Text>
                <TouchableOpacity onPress={() => openChapterEditor()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FolderPlus size={16} color={colors.bloom} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>
                    {t.chapters?.newChapter || 'New Chapter'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 10 }}>
                {chapters.map((chapter) => {
                  const chapterStories = storiesByChapter(chapter.id)
                  const isExpanded = expandedChapterId === chapter.id
                  return (
                    <View key={chapter.id} style={{
                      backgroundColor: '#fff', borderRadius: radii.card,
                      borderWidth: 1, borderColor: '#EBEBEB', overflow: 'hidden',
                    }}>
                      {/* Chapter header */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setExpandedChapterId(isExpanded ? null : chapter.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}
                      >
                        <ChapterIcon name={chapter.cover_icon || 'BookOpen'} size={26} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
                            {chapter.title}
                          </Text>
                          {chapter.description ? (
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                              {chapter.description}
                            </Text>
                          ) : null}
                          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                            {chapterStories.length} {chapterStories.length === 1
                              ? (t.chapters?.story || 'story')
                              : (t.chapters?.stories || 'stories')}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setChapterMenuId(chapterMenuId === chapter.id ? null : chapter.id) }}
                            hitSlop={8}
                            style={{ padding: 4 }}
                          >
                            <MoreVertical size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          {isExpanded ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
                        </View>
                      </TouchableOpacity>

                      {/* Expanded: story list */}
                      {isExpanded && (
                        <View style={{ borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingHorizontal: 12, paddingVertical: 8 }}>
                          {chapterStories.length === 0 ? (
                            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 }}>
                              {t.chapters?.emptyChapter || 'No stories in this chapter yet.'}
                            </Text>
                          ) : (
                            chapterStories.map((story) => (
                              <TouchableOpacity
                                key={story.id}
                                onPress={() => setViewingStory(story)}
                                activeOpacity={0.7}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }} numberOfLines={1}>{story.title}</Text>
                                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                    {story.published ? (t.stories?.published || 'Published') : (t.stories?.draft || 'Draft')}
                                    {' · '}{formatDate(story.updated_at)}
                                  </Text>
                                </View>
                                <TouchableOpacity onPress={() => setMenuStoryId(story.id)} style={{ padding: 4 }}>
                                  <MoreVertical size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                              </TouchableOpacity>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface1,
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <BookMarked size={32} color={colors.bloom} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                {t.chapters?.noChapters || 'No chapters yet'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                {t.chapters?.createFirst || 'Group your stories into chapters.'}
              </Text>
              <TouchableOpacity onPress={() => openChapterEditor()} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
                backgroundColor: colors.bloom, borderRadius: radii.button, paddingHorizontal: 20, paddingVertical: 12,
              }}>
                <FolderPlus size={18} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  {t.chapters?.newChapter || 'New Chapter'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
        ) : (
        /* ═══════════════════════════════════════════ */
        /* STORIES VIEW                                */
        /* ═══════════════════════════════════════════ */
        <>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface1,
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <BookOpen size={32} color={colors.bloom} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                {filter === 'all' ? (t.stories?.noStories || 'No stories yet')
                  : filter === 'published' ? (t.stories?.noPublished || 'No published stories')
                  : (t.stories?.noDrafts || 'No drafts')}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                {filter === 'all'
                  ? (t.stories?.createFirst || 'Tap Create to write your first story.')
                  : (t.stories?.willAppear || 'Your stories will appear here.')}
              </Text>
              {filter === 'all' && (
                <TouchableOpacity onPress={startCreate} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
                  backgroundColor: colors.bloom, borderRadius: radii.button, paddingHorizontal: 20, paddingVertical: 12,
                }}>
                  <Plus size={18} color="#fff" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                    {t.stories?.createStory || 'Create Story'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filtered.map((story) => {
                const preview = getPreview(story.content)
                return (
                  <TouchableOpacity
                    key={story.id}
                    activeOpacity={0.7}
                    onPress={() => setViewingStory(story)}
                    style={{
                      backgroundColor: '#fff', borderRadius: radii.card, padding: 16,
                      borderWidth: 1, borderColor: '#EBEBEB',
                    }}
                  >
                    {/* Top row: badges + menu */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: story.published ? '#ecfdf5' : colors.surface1,
                          borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                          {story.published ? <Globe size={11} color="#059669" /> : <FileText size={11} color={colors.textSecondary} />}
                          <Text style={{ fontSize: 11, fontWeight: '600', color: story.published ? '#059669' : colors.textSecondary }}>
                            {story.published ? (t.stories?.published || 'Published') : (t.stories?.draft || 'Draft')}
                          </Text>
                        </View>
                        {!!story.secret_code && (
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 3,
                            backgroundColor: '#f5f3ff', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
                          }}>
                            <Lock size={10} color="#7c3aed" />
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#7c3aed' }}>Code</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => setMenuStoryId(menuStoryId === story.id ? null : story.id)}
                        style={{ padding: 4 }}
                      >
                        <MoreVertical size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 4 }} numberOfLines={2}>
                      {story.title}
                    </Text>

                    {/* Preview */}
                    {preview ? (
                      <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 }} numberOfLines={2}>
                        {preview}
                      </Text>
                    ) : null}

                    {/* Date */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                        Updated {formatDate(story.updated_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </>
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════ */}
      {/* VIEW STORY MODAL */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={!!viewingStory} animationType="slide" onRequestClose={() => setViewingStory(null)}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
          {viewingStory && (
            <>
              {/* Header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', padding: 16,
                borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
              }}>
                <TouchableOpacity onPress={() => setViewingStory(null)} style={{ padding: 4, marginRight: 12 }}>
                  <ArrowLeft size={24} color={colors.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
                    {viewingStory.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 3,
                      backgroundColor: viewingStory.published ? '#ecfdf5' : colors.surface1,
                      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: viewingStory.published ? '#059669' : colors.textSecondary }}>
                        {viewingStory.published ? 'Published' : 'Draft'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{formatDate(viewingStory.updated_at)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setViewingStory(null); startEdit(viewingStory) }} style={{ padding: 6 }}>
                  <Edit3 size={20} color={colors.bloom} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}>
                {Array.isArray(viewingStory.content) && viewingStory.content.length > 0 ? (
                  viewingStory.content
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((block) => <RenderBlock key={block.id} block={block} onImagePress={setFullscreenImage} />)
                ) : (
                  <Text style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' }}>
                    This story has no content yet.
                  </Text>
                )}

                {/* Share URL for published stories */}
                {viewingStory.published && (
                  <View style={{
                    marginTop: 20, backgroundColor: '#f0fdf4', borderRadius: radii.card, padding: 16,
                    borderWidth: 1, borderColor: '#bbf7d0',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Globe size={16} color="#059669" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#059669' }}>
                        {viewingStory.secret_code ? 'Private Link' : 'Public Link'}
                      </Text>
                      {!!viewingStory.secret_code && (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: '#f5f3ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                          <Lock size={10} color="#7c3aed" />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: '#7c3aed' }}>Code Protected</Text>
                        </View>
                      )}
                    </View>

                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: '#fff', borderRadius: 12, padding: 10,
                      borderWidth: 1, borderColor: '#EBEBEB',
                    }}>
                      <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                        {getShareUrl(viewingStory)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => copyShareLink(viewingStory)}
                        style={{
                          backgroundColor: linkCopied ? '#059669' : colors.surface1,
                          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                        }}
                      >
                        {linkCopied ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Check size={14} color="#fff" />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Copied</Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Copy size={14} color={colors.primary} />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Copy</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {!!viewingStory.secret_code && (
                      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Lock size={14} color="#7c3aed" />
                        <Text style={{ fontSize: 13, color: '#7c3aed' }}>
                          Secret code: <Text style={{ fontWeight: '700' }}>{viewingStory.secret_code}</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Bottom actions */}
              <View style={{
                padding: 16, paddingBottom: insets.bottom + 16,
                borderTopWidth: 1, borderTopColor: '#EBEBEB', gap: 10,
              }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => { setViewingStory(null); startEdit(viewingStory) }}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      paddingVertical: 14, borderRadius: radii.button, backgroundColor: colors.surface1,
                    }}
                  >
                    <Edit3 size={18} color={colors.primary} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>Edit</Text>
                  </TouchableOpacity>
                  {viewingStory.published ? (
                    <TouchableOpacity
                      onPress={() => unpublishStory(viewingStory)}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        paddingVertical: 14, borderRadius: radii.button, backgroundColor: colors.surface1,
                      }}
                    >
                      <EyeOff size={18} color={colors.primary} />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>Unpublish</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => openPublishModal('story', viewingStory)}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        paddingVertical: 14, borderRadius: radii.button, backgroundColor: colors.bloom,
                      }}
                    >
                      <Globe size={18} color="#fff" />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Publish</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {viewingStory.published && (
                  <TouchableOpacity
                    onPress={() => shareStory(viewingStory)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      paddingVertical: 14, borderRadius: radii.button,
                      backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
                    }}
                  >
                    <Share2 size={18} color="#2563eb" />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#2563eb' }}>Share Story</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
        <Pressable
          onPress={() => setFullscreenImage(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
        >
          <TouchableOpacity
            onPress={() => setFullscreenImage(null)}
            activeOpacity={0.8}
            style={{
              position: 'absolute', top: insets.top + 12, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.15)',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <X size={20} color="#fff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* EDITOR MODAL */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={editing} animationType="slide" onRequestClose={() => {
        if (Platform.OS === 'web') {
          if (confirm('Discard changes?')) setEditing(false)
        } else {
          Alert.alert('Discard changes?', 'Unsaved changes will be lost.', [
            { text: 'Keep editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => setEditing(false) },
          ])
        }
      }}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
          {/* Editor header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', padding: 16,
            borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
          }}>
            <TouchableOpacity onPress={() => {
              if (Platform.OS === 'web') {
                if (confirm('Discard changes?')) setEditing(false)
              } else {
                Alert.alert('Discard changes?', '', [
                  { text: 'Keep editing', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => setEditing(false) },
                ])
              }
            }} style={{ padding: 4, marginRight: 12 }}>
              <X size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, flex: 1 }}>
              {editStory ? 'Edit Story' : 'New Story'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => saveStory(false)}
                disabled={editSaving}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface1 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                  {editSaving ? 'Saving...' : 'Save Draft'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openPublishModal('editor')}
                disabled={editSaving}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.bloom }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            {/* Title */}
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Story title..."
              placeholderTextColor={colors.textFaint}
              style={{
                fontSize: 24, fontWeight: '800', color: colors.primary, marginBottom: 20, padding: 0,
              }}
            />

            {/* Blocks */}
            <View style={{ gap: 12 }}>
              {editBlocks.map((block, i) => (
                <EditBlock
                  key={block.id}
                  block={block}
                  isFirst={i === 0}
                  isLast={i === editBlocks.length - 1}
                  onChange={(updated) => {
                    const newBlocks = [...editBlocks]; newBlocks[i] = updated
                    setEditBlocks(newBlocks)
                  }}
                  onRemove={() => {
                    if (editBlocks.length > 1) setEditBlocks(editBlocks.filter((_, idx) => idx !== i))
                  }}
                  onMoveUp={() => moveBlock(i, 'up')}
                  onMoveDown={() => moveBlock(i, 'down')}
                />
              ))}
            </View>

            {uploading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.surface2, borderRadius: 12, marginTop: 12 }}>
                <ActivityIndicator size="small" color={colors.bloom} />
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Uploading...</Text>
              </View>
            )}
          </ScrollView>

          {/* Add block toolbar */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: '#fff',
            borderTopWidth: 1, borderTopColor: '#EBEBEB',
          }}>
            {recording && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: 10, padding: 10, backgroundColor: colors.errorBg, borderRadius: 12,
              }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.error }}>
                  Recording {Math.floor(recordingDuration / 1000)}s
                </Text>
                <TouchableOpacity
                  onPress={stopRecording}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.error, borderRadius: 10 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Stop</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                { type: 'text' as const, icon: AlignLeft, label: 'Text', bg: colors.surface1, fg: colors.primary },
                { type: 'heading' as const, icon: Type, label: 'Heading', bg: colors.surface1, fg: colors.primary },
                { type: 'list' as const, icon: FileText, label: 'List', bg: colors.surface1, fg: colors.primary },
              ].map((btn) => (
                <TouchableOpacity key={btn.type} onPress={() => addBlock(btn.type)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: btn.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                }}>
                  <btn.icon size={16} color={btn.fg} />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: btn.fg }}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={pickImage} disabled={uploading} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              }}>
                <ImageIcon size={16} color="#2563eb" />
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#2563eb' }}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={recording ? stopRecording : startRecording}
                disabled={uploading}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: recording ? colors.errorBg : '#fdf2f8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                }}
              >
                {recording ? <MicOff size={16} color={colors.error} /> : <Mic size={16} color="#db2777" />}
                <Text style={{ fontSize: 13, fontWeight: '500', color: recording ? colors.error : '#db2777' }}>
                  {recording ? 'Stop' : 'Voice'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => addBlock('divider')} style={{
                backgroundColor: colors.surface1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
              }}>
                <Minus size={16} color={colors.primary} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* ACTION MENU MODAL */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={!!menuStoryId} animationType="fade" transparent onRequestClose={() => setMenuStoryId(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMenuStoryId(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{
              backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingTop: 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 8,
            }}>
              <View style={{ width: 36, height: 4, backgroundColor: colors.divider, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              {(() => {
                const story = stories.find(s => s.id === menuStoryId)
                if (!story) return null
                return (
                  <>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, paddingHorizontal: 16, marginBottom: 12 }} numberOfLines={1}>
                      {story.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => { setMenuStoryId(null); startEdit(story) }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                    >
                      <Edit3 size={20} color={colors.primary} />
                      <Text style={{ fontSize: 16, color: colors.primary }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setMenuStoryId(null)
                        if (story.published) unpublishStory(story)
                        else openPublishModal('story', story)
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                    >
                      {story.published ? <EyeOff size={20} color={colors.primary} /> : <Eye size={20} color={colors.primary} />}
                      <Text style={{ fontSize: 16, color: colors.primary }}>{story.published ? 'Unpublish' : 'Publish'}</Text>
                    </TouchableOpacity>
                    {story.published && (
                      <TouchableOpacity
                        onPress={() => { setMenuStoryId(null); shareStory(story) }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                      >
                        <Share2 size={20} color={colors.primary} />
                        <Text style={{ fontSize: 16, color: colors.primary }}>Share Link</Text>
                      </TouchableOpacity>
                    )}
                    {story.published && (
                      <TouchableOpacity
                        onPress={() => { setMenuStoryId(null); openCodeModal(story) }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                      >
                        <Lock size={20} color="#7c3aed" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, color: colors.primary }}>Secret Code</Text>
                          {story.secret_code ? (
                            <Text style={{ fontSize: 12, color: '#7c3aed', marginTop: 1 }}>Current: {story.secret_code}</Text>
                          ) : (
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>Not set — public access</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    {chapters.length > 0 && (
                      <TouchableOpacity
                        onPress={() => { setMenuStoryId(null); openAssignSheet(story) }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                      >
                        <BookMarked size={20} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, color: colors.primary }}>
                            {t.chapters?.assignToChapter || 'Add to Chapter'}
                          </Text>
                          {story.chapter_id && (
                            <Text style={{ fontSize: 12, color: colors.bloom, marginTop: 1 }}>
                              {chapters.find(c => c.id === story.chapter_id)?.title || ''}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 4, marginHorizontal: 12 }} />
                    <TouchableOpacity
                      onPress={() => { setMenuStoryId(null); confirmDelete(story) }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                    >
                      <Trash2 size={20} color={colors.error} />
                      <Text style={{ fontSize: 16, color: colors.error }}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )
              })()}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* CHAPTER ACTION MENU */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={!!chapterMenuId} animationType="fade" transparent onRequestClose={() => setChapterMenuId(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setChapterMenuId(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{
              backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingTop: 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 8,
            }}>
              <View style={{ width: 36, height: 4, backgroundColor: colors.divider, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              {(() => {
                const chapter = chapters.find(c => c.id === chapterMenuId)
                if (!chapter) return null
                const chapterStories = storiesByChapter(chapter.id)
                return (
                  <>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, paddingHorizontal: 16, marginBottom: 12 }} numberOfLines={1}>
                      {chapter.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => { setChapterMenuId(null); openChapterEditor(chapter) }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                    >
                      <Edit3 size={20} color={colors.primary} />
                      <Text style={{ fontSize: 16, color: colors.primary }}>
                        {t.chapters?.editChapter || 'Edit Chapter'}
                      </Text>
                    </TouchableOpacity>
                    <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 4, marginHorizontal: 12 }} />
                    <TouchableOpacity
                      onPress={() => { setChapterMenuId(null); confirmDeleteChapter(chapter) }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                    >
                      <Trash2 size={20} color={colors.error} />
                      <Text style={{ fontSize: 16, color: colors.error }}>
                        {t.chapters?.deleteChapter || 'Delete Chapter'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )
              })()}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* PUBLISH MODAL */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={publishModalVisible} animationType="fade" transparent onRequestClose={closePublishModal}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 24, width: '100%', maxWidth: 420,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 20, borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
            }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>Publish Your Story</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  {publishStep === 'choose' ? 'Choose how you want to share' : 'Create your secret code'}
                </Text>
              </View>
              <TouchableOpacity onPress={closePublishModal} style={{ padding: 6 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              {publishStep === 'choose' ? (
                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={handlePublicPublish}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                      borderRadius: radii.card, borderWidth: 1, borderColor: '#EBEBEB', backgroundColor: '#fff',
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 48, height: 48, borderRadius: 14, backgroundColor: '#ecfdf5',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Globe size={24} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 2 }}>Share Openly</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
                        Anyone with the link can view your story.
                      </Text>
                    </View>
                    <ArrowRight size={18} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPublishStep('enter-code')}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                      borderRadius: radii.card, borderWidth: 1, borderColor: '#EBEBEB', backgroundColor: '#fff',
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 48, height: 48, borderRadius: 14, backgroundColor: '#f5f3ff',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Lock size={24} color="#7c3aed" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 2 }}>Keep It Private</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
                        Only people with your secret code can view.
                      </Text>
                    </View>
                    <ArrowRight size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  <View style={{
                    backgroundColor: '#f5f3ff', borderRadius: 14, padding: 14,
                    flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: '#e9d5ff',
                  }}>
                    <Lock size={18} color="#7c3aed" style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#6d28d9', marginBottom: 2 }}>Create a memorable code</Text>
                      <Text style={{ fontSize: 12, color: '#7c3aed', lineHeight: 17 }}>
                        You'll share this code with anyone you want to view your story.
                      </Text>
                    </View>
                  </View>

                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6 }}>
                      Secret Code <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <TextInput
                      value={secretCode}
                      onChangeText={setSecretCode}
                      placeholder="Enter your secret code (min. 4 characters)"
                      placeholderTextColor={colors.textFaint}
                      autoFocus
                      style={{
                        fontSize: 15, color: colors.primary, padding: 14,
                        backgroundColor: colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB',
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6 }}>
                      Confirm Code <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <TextInput
                      value={confirmCode}
                      onChangeText={setConfirmCode}
                      placeholder="Re-enter your secret code"
                      placeholderTextColor={colors.textFaint}
                      style={{
                        fontSize: 15, color: colors.primary, padding: 14,
                        backgroundColor: colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB',
                      }}
                    />
                    {confirmCode.length > 0 && secretCode !== confirmCode && (
                      <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>Codes don't match</Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => { setPublishStep('choose'); setSecretCode(''); setConfirmCode('') }}
                      style={{
                        flex: 1, paddingVertical: 14, borderRadius: radii.button,
                        backgroundColor: colors.surface1, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handlePrivatePublish}
                      disabled={secretCode.trim().length < 4 || secretCode !== confirmCode}
                      style={{
                        flex: 1, paddingVertical: 14, borderRadius: radii.button, alignItems: 'center',
                        backgroundColor: (secretCode.trim().length >= 4 && secretCode === confirmCode) ? '#7c3aed' : colors.disabled,
                      }}
                    >
                      <Text style={{
                        fontSize: 15, fontWeight: '600',
                        color: (secretCode.trim().length >= 4 && secretCode === confirmCode) ? '#fff' : colors.textSecondary,
                      }}>
                        Publish with Code
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* SECRET CODE MODAL */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={codeModalVisible} animationType="fade" transparent onRequestClose={() => setCodeModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, width: '100%', maxWidth: 400 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 20, borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f3ff',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Lock size={18} color="#7c3aed" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>Secret Code</Text>
              </View>
              <TouchableOpacity onPress={() => setCodeModalVisible(false)} style={{ padding: 6 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20, gap: 16 }}>
              {!!codeModalStory?.secret_code && (
                <View style={{
                  backgroundColor: '#f5f3ff', borderRadius: 12, padding: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  borderWidth: 1, borderColor: '#e9d5ff',
                }}>
                  <Lock size={16} color="#7c3aed" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#7c3aed', fontWeight: '600' }}>Current Code</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#6d28d9', marginTop: 2 }}>
                      {codeModalStory.secret_code}
                    </Text>
                  </View>
                </View>
              )}

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6 }}>
                  {codeModalStory?.secret_code ? 'New Code' : 'Secret Code'}{' '}
                  <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(min. 4 characters)</Text>
                </Text>
                <TextInput
                  value={newCode}
                  onChangeText={setNewCode}
                  placeholder="Enter a secret code"
                  placeholderTextColor={colors.textFaint}
                  style={{
                    fontSize: 15, color: colors.primary, padding: 14,
                    backgroundColor: colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB',
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6 }}>Confirm Code</Text>
                <TextInput
                  value={confirmNewCode}
                  onChangeText={setConfirmNewCode}
                  placeholder="Re-enter the code"
                  placeholderTextColor={colors.textFaint}
                  style={{
                    fontSize: 15, color: colors.primary, padding: 14,
                    backgroundColor: colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB',
                  }}
                />
                {confirmNewCode.length > 0 && newCode !== confirmNewCode && (
                  <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>Codes don't match</Text>
                )}
              </View>

              <View style={{ gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={saveCode}
                  disabled={codeSaving || (newCode.trim().length > 0 && (newCode.trim().length < 4 || newCode !== confirmNewCode))}
                  style={{
                    paddingVertical: 14, borderRadius: radii.button, alignItems: 'center',
                    backgroundColor: (newCode.trim().length >= 4 && newCode === confirmNewCode) ? '#7c3aed' : colors.disabled,
                  }}
                >
                  <Text style={{
                    fontSize: 15, fontWeight: '600',
                    color: (newCode.trim().length >= 4 && newCode === confirmNewCode) ? '#fff' : colors.textSecondary,
                  }}>
                    {codeSaving ? 'Saving...' : newCode.trim() ? 'Save Code' : 'Make Public (Remove Code)'}
                  </Text>
                </TouchableOpacity>
                {!!codeModalStory?.secret_code && (
                  <TouchableOpacity
                    onPress={removeCode}
                    disabled={codeSaving}
                    style={{ paddingVertical: 12, borderRadius: radii.button, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.error }}>Remove Code (Make Public)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* CHAPTER EDITOR MODAL */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={chapterEditorVisible} animationType="fade" transparent onRequestClose={() => setChapterEditorVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, width: '100%', maxWidth: 400 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 20, borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
            }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>
                {editingChapter ? (t.chapters?.editChapter || 'Edit Chapter') : (t.chapters?.newChapter || 'New Chapter')}
              </Text>
              <TouchableOpacity onPress={() => setChapterEditorVisible(false)} style={{ padding: 6 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20, gap: 16 }}>
              {/* Icon picker */}
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
                  Icon
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {CHAPTER_ICONS.map(({ name, icon: Icon }) => (
                      <TouchableOpacity
                        key={name}
                        onPress={() => setChapterIcon(name)}
                        style={{
                          width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: chapterIcon === name ? colors.bloom + '18' : colors.surface1,
                          borderWidth: chapterIcon === name ? 2 : 0,
                          borderColor: colors.bloom,
                        }}
                      >
                        <Icon size={22} color={chapterIcon === name ? colors.bloom : colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Title */}
              <TextInput
                value={chapterTitle}
                onChangeText={setChapterTitle}
                placeholder={t.chapters?.chapterTitle || 'Chapter title'}
                placeholderTextColor={colors.textFaint}
                style={{
                  fontSize: 16, fontWeight: '600', color: colors.primary, padding: 14,
                  backgroundColor: colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB',
                }}
              />

              {/* Description */}
              <TextInput
                value={chapterDescription}
                onChangeText={setChapterDescription}
                placeholder={t.chapters?.chapterDescription || 'Description (optional)'}
                placeholderTextColor={colors.textFaint}
                multiline
                numberOfLines={3}
                style={{
                  fontSize: 14, color: colors.primary, padding: 14, minHeight: 72, textAlignVertical: 'top',
                  backgroundColor: colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB',
                }}
              />

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {editingChapter && (
                  <TouchableOpacity
                    onPress={() => { setChapterEditorVisible(false); confirmDeleteChapter(editingChapter) }}
                    style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: radii.button }}
                  >
                    <Trash2 size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={saveChapter}
                  disabled={chapterSaving || !chapterTitle.trim()}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: radii.button, alignItems: 'center',
                    backgroundColor: chapterTitle.trim() ? colors.bloom : colors.disabled,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: chapterTitle.trim() ? '#fff' : colors.textSecondary }}>
                    {chapterSaving ? '...' : editingChapter ? 'Save' : (t.chapters?.newChapter || 'Create')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* ASSIGN TO CHAPTER SHEET */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={assignSheetVisible} animationType="fade" transparent onRequestClose={() => setAssignSheetVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setAssignSheetVisible(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{
              backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingTop: 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 16,
            }}>
              <View style={{ width: 36, height: 4, backgroundColor: colors.divider, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary, marginBottom: 16 }}>
                {t.chapters?.assignToChapter || 'Add to Chapter'}
              </Text>

              {/* Remove from chapter */}
              {assigningStory?.chapter_id && (
                <TouchableOpacity
                  onPress={() => assigningStory && assignStoryToChapter(assigningStory.id, null)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
                  }}
                >
                  <Minus size={20} color={colors.error} />
                  <Text style={{ fontSize: 15, color: colors.error }}>
                    {t.chapters?.removeFromChapter || 'Remove from chapter'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Chapter list */}
              {chapters.map(chapter => {
                const isCurrentChapter = assigningStory?.chapter_id === chapter.id
                return (
                  <TouchableOpacity
                    key={chapter.id}
                    onPress={() => assigningStory && assignStoryToChapter(assigningStory.id, chapter.id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
                      borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
                      backgroundColor: isCurrentChapter ? colors.bloom + '08' : 'transparent',
                    }}
                  >
                    <ChapterIcon name={chapter.cover_icon || 'BookOpen'} size={22} />
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary }}>{chapter.title}</Text>
                    {isCurrentChapter && <Check size={18} color={colors.bloom} />}
                  </TouchableOpacity>
                )
              })}

              {/* Create new chapter */}
              <TouchableOpacity
                onPress={() => { setAssignSheetVisible(false); openChapterEditor() }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}
              >
                <FolderPlus size={20} color={colors.bloom} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bloom }}>
                  {t.chapters?.newChapter || 'New Chapter'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* CHAPTER READER MODAL */}
      {/* ═══════════════════════════════════════════ */}
      <Modal visible={chapterReaderVisible} animationType="slide" onRequestClose={() => setChapterReaderVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
          {readingChapter && (() => {
            const chapterStories = stories
              .filter(s => s.chapter_id === readingChapter.id)
              .sort((a, b) => (a.chapter_order || 0) - (b.chapter_order || 0))
            return (
              <>
                {/* Header */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', padding: 16,
                  borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
                }}>
                  <TouchableOpacity onPress={() => setChapterReaderVisible(false)} style={{ padding: 4, marginRight: 12 }}>
                    <ArrowLeft size={24} color={colors.primary} />
                  </TouchableOpacity>
                  <View style={{ marginRight: 8 }}><ChapterIcon name={readingChapter.cover_icon || 'BookOpen'} size={22} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
                      {readingChapter.title}
                    </Text>
                    {readingChapter.description ? (
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                        {readingChapter.description}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Stories list */}
                <ScrollView contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 40 }}>
                  {chapterStories.map((story, idx) => {
                    const blocks = parseContent(story.content)
                    return (
                      <View key={story.id} style={{ marginBottom: 32 }}>
                        {/* Story divider */}
                        {idx > 0 && (
                          <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ width: 40, height: 2, backgroundColor: colors.divider, borderRadius: 1 }} />
                          </View>
                        )}
                        <TouchableOpacity onPress={() => { setChapterReaderVisible(false); setViewingStory(story) }}>
                          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary, marginBottom: 8 }}>
                            {story.title}
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                          {formatDate(story.updated_at)}
                        </Text>
                        {/* Render blocks preview */}
                        {blocks.slice(0, 5).map(block => {
                          if (block.type === 'heading') {
                            return (
                              <Text key={block.id} style={{ fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 8 }}>
                                {block.content?.text || ''}
                              </Text>
                            )
                          }
                          if (block.type === 'text') {
                            return (
                              <Text key={block.id} style={{ fontSize: 15, color: '#444', lineHeight: 24, marginBottom: 8 }}>
                                {block.content?.text || ''}
                              </Text>
                            )
                          }
                          if (block.type === 'media' && block.content?.items?.length > 0) {
                            const firstMedia = block.content.items[0]
                            if (firstMedia.fileType === 'image' || firstMedia.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
                              return (
                                <Image
                                  key={block.id}
                                  source={{ uri: firstMedia.url }}
                                  style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 8 }}
                                  resizeMode="cover"
                                />
                              )
                            }
                          }
                          return null
                        })}
                        {blocks.length > 5 && (
                          <TouchableOpacity onPress={() => { setChapterReaderVisible(false); setViewingStory(story) }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.bloom, marginTop: 4 }}>
                              Continue reading →
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )
                  })}
                </ScrollView>
              </>
            )
          })()}
        </View>
      </Modal>
    </View>
  )
}
