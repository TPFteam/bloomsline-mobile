import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image, Animated, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createMoment } from '@/lib/services/moments'
import * as ImagePicker from 'expo-image-picker'
import { Audio } from 'expo-av'
import { Camera, ImageIcon, X, Plus, Check, Mic, Play, Pause, Trash2, RotateCcw, Leaf, Heart, Sparkles, HeartHandshake, Trophy, Sun, Wind, Waves, Moon, CloudRain, Laugh, TreePalm, Zap, CloudDrizzle, Flame, UserX } from 'lucide-react-native'
import { useI18n } from '@/lib/i18n'
import { colors } from '@/lib/theme'

const MOOD_ICONS: Record<string, any> = {
  calm: Leaf,
  grateful: Heart,
  inspired: Sparkles,
  loved: HeartHandshake,
  proud: Trophy,
  hopeful: Sun,
  funny: Laugh,
  peaceful: TreePalm,
  playful: Zap,
  anxious: Wind,
  overwhelmed: Waves,
  tired: Moon,
  heavy: CloudRain,
  sad: CloudDrizzle,
  angry: Flame,
  lonely: UserX,
}

const MOODS = [
  // Positive — gentle to energetic
  { key: 'peaceful', label: 'Peaceful', color: '#06B6D4' },
  { key: 'calm', label: 'Calm', color: '#4A9A86' },
  { key: 'grateful', label: 'Grateful', color: '#10B981' },
  { key: 'hopeful', label: 'Hopeful', color: '#F97316' },
  { key: 'loved', label: 'Loved', color: '#F43F5E' },
  { key: 'proud', label: 'Proud', color: '#EC4899' },
  { key: 'inspired', label: 'Inspired', color: '#8B5CF6' },
  { key: 'funny', label: 'Funny', color: '#FBBF24' },
  { key: 'playful', label: 'Playful', color: '#F59E0B' },
  // Difficult — mild to intense
  { key: 'tired', label: 'Tired', color: '#64748B' },
  { key: 'anxious', label: 'Anxious', color: '#3B82F6' },
  { key: 'sad', label: 'Sad', color: '#6B7280' },
  { key: 'lonely', label: 'Lonely', color: '#7C3AED' },
  { key: 'overwhelmed', label: 'Overwhelmed', color: '#EF4444' },
  { key: 'heavy', label: 'Heavy', color: '#475569' },
  { key: 'angry', label: 'Angry', color: '#DC2626' },
]

type CaptureType = 'photo' | 'video' | 'voice' | 'write'
type Step = 'capture' | 'mood' | 'save'

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// ─── Audio Player Component ───────────────────────────
function AudioPlayer({ uri, duration, compact }: { uri: string; duration: number; compact?: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      sound?.unloadAsync()
    }
  }, [sound])

  const handlePlayPause = async () => {
    if (playing && sound) {
      await sound.pauseAsync()
      setPlaying(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    if (sound) {
      await sound.playAsync()
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri })
      setSound(newSound)
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false)
          setPosition(0)
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      })
      await newSound.playAsync()
    }

    setPlaying(true)
    intervalRef.current = setInterval(async () => {
      if (sound) {
        const status = await sound.getStatusAsync()
        if (status.isLoaded) setPosition(status.positionMillis)
      }
    }, 200)
  }

  const progress = duration > 0 ? position / duration : 0

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handlePlayPause}
        style={{
          width: 64, height: 64, borderRadius: 12, backgroundColor: '#000',
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        {playing ? <Pause size={22} color="#fff" /> : <Play size={22} color="#fff" style={{ marginLeft: 2 }} />}
      </TouchableOpacity>
    )
  }

  return (
    <View style={{
      backgroundColor: '#f5f5f5', borderRadius: 20, padding: 20,
      flexDirection: 'row', alignItems: 'center', gap: 16,
    }}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={{
          width: 52, height: 52, borderRadius: 26, backgroundColor: '#000',
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        {playing ? <Pause size={20} color="#fff" /> : <Play size={20} color="#fff" style={{ marginLeft: 2 }} />}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, marginBottom: 8 }}>
          <View style={{ height: 4, backgroundColor: '#000', borderRadius: 2, width: `${Math.min(progress * 100, 100)}%` }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: '#999', fontVariant: ['tabular-nums'] }}>{formatDuration(position)}</Text>
          <Text style={{ fontSize: 12, color: '#999', fontVariant: ['tabular-nums'] }}>{formatDuration(duration)}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Main Capture Component ───────────────────────────
export default function Capture() {
  const router = useRouter()
  const { type, walkthrough, prefill } = useLocalSearchParams<{ type?: string; walkthrough?: string; prefill?: string }>()
  const captureType = (type as CaptureType) || 'photo'
  const isWalkthrough = walkthrough === '1'
  const insets = useSafeAreaInsets()
  const { t, locale } = useI18n()

  // If walkthrough capture is loaded directly (refresh), go back to home
  useEffect(() => {
    if (isWalkthrough && !router.canGoBack()) {
      router.replace('/(main)/home')
    }
  }, [])

  const [step, setStep] = useState<Step>(captureType === 'write' ? 'capture' : 'capture')
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [typingDone, setTypingDone] = useState(!isWalkthrough)
  const typingIndex = useRef(0)
  const [mediaItems, setMediaItems] = useState<{ uri: string; mimeType: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Walkthrough typing animation — slow, thoughtful
  useEffect(() => {
    if (!isWalkthrough || !prefill) return
    typingIndex.current = 0
    setNote('')
    let cancelled = false

    const typeNext = () => {
      if (cancelled) return
      typingIndex.current++
      if (typingIndex.current >= prefill.length) {
        setNote(prefill)
        setTimeout(() => { if (!cancelled) setTypingDone(true) }, 600)
        return
      }
      setNote(prefill.slice(0, typingIndex.current))
      const nextChar = prefill[typingIndex.current]
      const delay = nextChar === '.' || nextChar === ',' ? 150 : nextChar === ' ' ? 100 : 65
      setTimeout(typeNext, delay)
    }

    // Pause before starting
    const startDelay = setTimeout(typeNext, 800)
    return () => { cancelled = true; clearTimeout(startDelay) }
  }, [isWalkthrough, prefill])

  // For voice recording pulse
  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [recording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) clearInterval(durationInterval.current)
      recordingInstance?.stopAndUnloadAsync().catch(() => {})
    }
  }, [])

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    )
  }

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index))
  }

  // Photo/Video: open camera
  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: captureType === 'video' ? ['videos'] : ['images'],
      quality: 0.8,
      videoMaxDuration: 60,
    })
    if (!result.canceled) {
      setMediaItems(prev => [...prev, { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType || 'image/jpeg' }])
    }
  }

  // Photo/Video: pick from gallery
  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: captureType === 'video' ? ['videos'] : captureType === 'photo' ? ['images'] : ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 7 - mediaItems.length,
    })
    if (!result.canceled) {
      const newItems = result.assets.map((a: ImagePicker.ImagePickerAsset) => ({
        uri: a.uri,
        mimeType: a.mimeType || 'image/jpeg',
      }))
      setMediaItems(prev => [...prev, ...newItems].slice(0, 7))
    }
  }

  // Voice: toggle recording
  const toggleRecording = async () => {
    if (recording && recordingInstance) {
      // Stop recording
      if (durationInterval.current) clearInterval(durationInterval.current)
      try {
        await recordingInstance.stopAndUnloadAsync()
        const uri = recordingInstance.getURI()
        if (uri) {
          // Get actual duration
          const { sound } = await Audio.Sound.createAsync({ uri })
          const status = await sound.getStatusAsync()
          const dur = status.isLoaded ? status.durationMillis || recordingDuration : recordingDuration
          await sound.unloadAsync()

          setAudioUri(uri)
          setAudioDuration(dur)
          setMediaItems([{ uri, mimeType: 'audio/m4a' }])
        }
      } catch (e) {
        console.error('Error stopping recording:', e)
      }
      setRecording(false)
      setRecordingInstance(null)
    } else {
      // Start recording
      try {
        const permission = await Audio.requestPermissionsAsync()
        if (!permission.granted) return

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        })

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        )
        setRecordingInstance(newRecording)
        setRecording(true)
        setRecordingDuration(0)

        // Track duration
        const start = Date.now()
        durationInterval.current = setInterval(() => {
          setRecordingDuration(Date.now() - start)
        }, 100)
      } catch (e) {
        console.error('Error starting recording:', e)
      }
    }
  }

  const deleteRecording = () => {
    setAudioUri(null)
    setAudioDuration(0)
    setMediaItems([])
    setRecordingDuration(0)
  }

  const reRecord = async () => {
    deleteRecording()
    // Small delay then start recording again
    setTimeout(() => toggleRecording(), 300)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await createMoment({
        mediaItems,
        textContent: note || undefined,
        moods: selectedMoods,
      })
      if (!result) {
        Alert.alert('Save failed', 'Could not save your moment. Please try again.')
        setSaving(false)
        return
      }
      setSaving(false)
      router.back()
    } catch (err) {
      console.error('Save moment error:', err)
      Alert.alert('Save failed', 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const canProceedFromCapture = captureType === 'write'
    ? note.trim().length > 0 && typingDone
    : captureType === 'voice'
    ? !recording && mediaItems.length > 0
    : mediaItems.length > 0 // photo/video require at least one item

  const stepLabels: Step[] = ['capture', 'mood', 'save']
  const currentStepIndex = stepLabels.indexOf(step)

  const title = isWalkthrough && step === 'capture'
    ? (locale === 'fr' ? 'Votre premier moment' : 'Your first moment')
    : {
        photo: t.capture.titlePhoto,
        video: t.capture.titleVideo,
        voice: t.capture.titleVoice,
        write: t.capture.titleWrite,
      }[captureType]

  const subtitle = isWalkthrough && step === 'capture'
    ? (locale === 'fr' ? 'Modifiez le texte ou continuez' : 'Edit the text or continue')
    : {
        photo: t.capture.subtitlePhoto,
        video: t.capture.subtitleVideo,
        voice: audioUri ? t.capture.subtitleVoiceDone : t.capture.subtitleVoice,
        write: t.capture.subtitleWrite,
      }[captureType]

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        {isWalkthrough ? (
          <View style={{ width: 40 }} />
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
            <X size={20} color="#000" />
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {stepLabels.map((s, i) => (
            <View
              key={s}
              style={{
                width: i <= currentStepIndex ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i <= currentStepIndex ? '#000' : '#e5e5e5',
              }}
            />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Step: Capture ─── */}
        {step === 'capture' && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#000', marginTop: 24, marginBottom: 6 }}>
              {title}
            </Text>
            <Text style={{ fontSize: 15, color: '#999', marginBottom: 32 }}>
              {subtitle}
            </Text>

            {/* Photo / Video capture */}
            {(captureType === 'photo' || captureType === 'video') && (
              <View style={{ flex: 1 }}>
                {/* Media preview grid */}
                {mediaItems.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {mediaItems.map((item, i) => (
                      <View key={i} style={{ width: 100, height: 100, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                        <Image source={{ uri: item.uri }} style={{ width: 100, height: 100 }} />
                        <TouchableOpacity
                          onPress={() => removeMedia(i)}
                          style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
                        >
                          <X size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {mediaItems.length < 7 && (
                      <TouchableOpacity
                        onPress={openGallery}
                        style={{ width: 100, height: 100, borderRadius: 16, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e5e5e5', borderStyle: 'dashed' }}
                      >
                        <Plus size={24} color="#bbb" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Action buttons */}
                {mediaItems.length === 0 && (
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      onPress={openCamera}
                      style={{
                        backgroundColor: '#000',
                        borderRadius: 20,
                        padding: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                        <Camera size={22} color="#fff" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>
                          {captureType === 'video' ? t.capture.recordVideo : t.capture.takePhoto}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                          {captureType === 'video' ? t.capture.upTo60Seconds : t.capture.openCamera}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={openGallery}
                      style={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: 20,
                        padding: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#e8e8e8', justifyContent: 'center', alignItems: 'center' }}>
                        <ImageIcon size={22} color="#666" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>{t.capture.chooseGallery}</Text>
                        <Text style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{t.capture.upTo7Items}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Voice capture */}
            {captureType === 'voice' && (
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 40 }}>
                {audioUri ? (
                  /* ── Recording complete: show player ── */
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    {/* Mic icon */}
                    <View style={{
                      width: 100, height: 100, borderRadius: 50, backgroundColor: '#f5f5f5',
                      justifyContent: 'center', alignItems: 'center', marginBottom: 24,
                    }}>
                      <Mic size={40} color="#000" />
                    </View>

                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 4 }}>
                      {t.capture.voiceRecording}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>
                      {formatDuration(audioDuration)}
                    </Text>

                    {/* Audio player */}
                    <View style={{ width: '100%', marginBottom: 24 }}>
                      <AudioPlayer uri={audioUri} duration={audioDuration} />
                    </View>

                    {/* Re-record / Delete actions */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity
                        onPress={reRecord}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                          backgroundColor: '#f5f5f5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16,
                        }}
                      >
                        <RotateCcw size={16} color="#666" />
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#333' }}>{t.capture.reRecord}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={deleteRecording}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                          backgroundColor: '#FEF2F2', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16,
                        }}
                      >
                        <Trash2 size={16} color="#EF4444" />
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#EF4444' }}>{t.common.delete}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* ── Not yet recorded: show record button ── */
                  <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
                    <Animated.View
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 70,
                        backgroundColor: recording ? '#EF4444' : '#000',
                        justifyContent: 'center',
                        alignItems: 'center',
                        transform: [{ scale: recording ? pulseAnim : 1 }],
                        shadowColor: recording ? '#EF4444' : '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                      }}
                    >
                      <TouchableOpacity onPress={toggleRecording} style={{ width: 140, height: 140, justifyContent: 'center', alignItems: 'center' }}>
                        {recording ? (
                          <View style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#fff' }} />
                        ) : (
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444' }} />
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: '#000', marginTop: 32 }}>
                      {recording ? t.capture.recording : t.capture.tapToRecord}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
                      {recording ? formatDuration(recordingDuration) : t.capture.shareYourMind}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Write */}
            {captureType === 'write' && (
              <View style={{ flex: 1 }}>
                {isWalkthrough && !typingDone ? (
                  /* Typing animation — read-only while text appears */
                  <View style={{
                    flex: 1,
                    minHeight: 280,
                    backgroundColor: '#f8f8f8',
                    borderRadius: 20,
                    padding: 20,
                  }}>
                    <Text style={{ fontSize: 18, color: '#000', lineHeight: 28 }}>
                      {note}
                      {!typingDone && <Text style={{ color: colors.bloom }}>|</Text>}
                    </Text>
                  </View>
                ) : (
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={t.capture.writePlaceholder}
                  placeholderTextColor="#ccc"
                  multiline
                  autoFocus={!isWalkthrough}
                  style={{
                    flex: 1,
                    minHeight: 280,
                    fontSize: 18,
                    color: '#000',
                    textAlignVertical: 'top',
                    lineHeight: 28,
                    backgroundColor: '#f8f8f8',
                    borderRadius: 20,
                    padding: 20,
                    outlineStyle: 'none',
                  } as any}
                />
                )}
              </View>
            )}
          </View>
        )}

        {/* ─── Step: Mood ─── */}
        {step === 'mood' && (
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#000', marginTop: 24, marginBottom: 6 }}>
              {t.capture.moodTitle}
            </Text>
            <Text style={{ fontSize: 15, color: '#999', marginBottom: 32 }}>
              {t.capture.moodSubtitle}
            </Text>

            {/* Audio preview on mood step */}
            {audioUri && captureType === 'voice' && (
              <View style={{ marginBottom: 24 }}>
                <AudioPlayer uri={audioUri} duration={audioDuration} />
              </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {MOODS.map(mood => {
                const selected = selectedMoods.includes(mood.key)
                return (
                  <TouchableOpacity
                    key={mood.key}
                    onPress={() => toggleMood(mood.key)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 20,
                      backgroundColor: selected ? '#000' : '#f5f5f5',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {MOOD_ICONS[mood.key] && (() => {
                      const Icon = MOOD_ICONS[mood.key]
                      return <Icon size={18} color={selected ? '#fff' : mood.color} strokeWidth={2} />
                    })()}
                    <Text style={{ fontSize: 15, fontWeight: '500', color: selected ? '#fff' : '#333' }}>
                      {t.moods[mood.key as keyof typeof t.moods] || mood.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ─── Step: Save (review) ─── */}
        {step === 'save' && (
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#000', marginTop: 24, marginBottom: 6 }}>
              {captureType === 'write'
                ? (locale === 'fr' ? 'Votre moment' : 'Your moment')
                : t.capture.saveTitle}
            </Text>
            <Text style={{ fontSize: 15, color: '#999', marginBottom: 24 }}>
              {captureType === 'write'
                ? (locale === 'fr' ? 'Voici ce que vous avez capturé' : 'Here\'s what you captured')
                : t.capture.saveSubtitle}
            </Text>

            {/* Write preview */}
            {captureType === 'write' && note ? (
              <View style={{ backgroundColor: '#f8f8f8', borderRadius: 16, padding: 16, marginBottom: 20 }}>
                <Text style={{ fontSize: 15, color: '#333', lineHeight: 22 }}>{note}</Text>
              </View>
            ) : null}

            {/* Media preview — images/video */}
            {mediaItems.length > 0 && !audioUri && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {mediaItems.map((item, i) => (
                  <View key={i} style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                    <Image source={{ uri: item.uri }} style={{ width: 64, height: 64 }} />
                  </View>
                ))}
              </View>
            )}

            {/* Audio preview on save step */}
            {audioUri && captureType === 'voice' && (
              <View style={{ marginBottom: 20 }}>
                <AudioPlayer uri={audioUri} duration={audioDuration} />
              </View>
            )}

            {/* Mood pills */}
            {selectedMoods.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {selectedMoods.map(m => {
                  const mood = MOODS.find(mo => mo.key === m)
                  return (
                    <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}>
                      {mood && MOOD_ICONS[mood.key] && (() => {
                        const Icon = MOOD_ICONS[mood.key]
                        return <Icon size={14} color={mood.color} strokeWidth={2} />
                      })()}
                      <Text style={{ fontSize: 13, color: '#333', fontWeight: '500' }}>{t.moods[mood?.key as keyof typeof t.moods] || mood?.label}</Text>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Note — only show for non-write types (write already captured note in step 1) */}
            {captureType !== 'write' && (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t.capture.notePlaceholder}
                placeholderTextColor="#ccc"
                multiline
                style={{
                  minHeight: 120,
                  backgroundColor: '#f8f8f8',
                  borderRadius: 20,
                  padding: 20,
                  fontSize: 17,
                  color: '#000',
                  textAlignVertical: 'top',
                  lineHeight: 26,
                }}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom action */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        {step === 'capture' && (
          <TouchableOpacity
            onPress={() => setStep('mood')}
            disabled={!canProceedFromCapture}
            style={{
              backgroundColor: canProceedFromCapture ? '#000' : '#e5e5e5',
              height: 56,
              borderRadius: 28,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{t.common.continue}</Text>
          </TouchableOpacity>
        )}

        {step === 'mood' && (
          <TouchableOpacity
            onPress={() => setStep('save')}
            disabled={selectedMoods.length === 0}
            style={{
              backgroundColor: selectedMoods.length > 0 ? '#000' : '#e5e5e5',
              height: 56,
              borderRadius: 28,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{t.common.continue}</Text>
          </TouchableOpacity>
        )}

        {step === 'save' && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: '#000',
              height: 56,
              borderRadius: 28,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Check size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{t.capture.saveMoment}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
