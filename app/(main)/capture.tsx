import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image, Animated } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createMoment } from '@/lib/services/moments'
import * as ImagePicker from 'expo-image-picker'
import { Camera, ImageIcon, X, Plus, Check } from 'lucide-react-native'

const MOODS = [
  { key: 'grateful', emoji: '🙏', label: 'Grateful' },
  { key: 'peaceful', emoji: '🌿', label: 'Peaceful' },
  { key: 'joyful', emoji: '✨', label: 'Joyful' },
  { key: 'inspired', emoji: '🌱', label: 'Inspired' },
  { key: 'loved', emoji: '💕', label: 'Loved' },
  { key: 'calm', emoji: '🧘', label: 'Calm' },
  { key: 'hopeful', emoji: '☀️', label: 'Hopeful' },
  { key: 'proud', emoji: '🏆', label: 'Proud' },
  { key: 'overwhelmed', emoji: '😮‍💨', label: 'Overwhelmed' },
  { key: 'tired', emoji: '🌙', label: 'Tired' },
  { key: 'uncertain', emoji: '🌫️', label: 'Uncertain' },
  { key: 'tender', emoji: '🌸', label: 'Tender' },
  { key: 'restless', emoji: '💬', label: 'Restless' },
  { key: 'heavy', emoji: '🌊', label: 'Heavy' },
]

type CaptureType = 'photo' | 'video' | 'voice' | 'write'
type Step = 'capture' | 'mood' | 'save'

export default function Capture() {
  const router = useRouter()
  const { type } = useLocalSearchParams<{ type?: string }>()
  const captureType = (type as CaptureType) || 'photo'
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState<Step>(captureType === 'write' ? 'capture' : 'capture')
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [mediaItems, setMediaItems] = useState<{ uri: string; mimeType: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current

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

  // Voice: toggle recording (placeholder — needs expo-av integration)
  const toggleRecording = () => {
    if (recording) {
      setRecording(false)
      // TODO: stop recording, get URI, add to mediaItems
    } else {
      setRecording(true)
      // TODO: start recording with expo-av
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await createMoment({
      mediaItems,
      textContent: note || undefined,
      moods: selectedMoods,
    })
    setSaving(false)
    router.back()
  }

  const canProceedFromCapture = captureType === 'write'
    ? note.trim().length > 0
    : captureType === 'voice'
    ? !recording // can proceed if not currently recording
    : true // photo/video can always proceed (media optional with note)

  const stepLabels: Step[] = ['capture', 'mood', 'save']
  const currentStepIndex = stepLabels.indexOf(step)

  const title = {
    photo: 'Capture a photo',
    video: 'Record a video',
    voice: 'Record your thoughts',
    write: 'Write it down',
  }[captureType]

  const subtitle = {
    photo: 'Take a photo or choose from your gallery',
    video: 'Record a clip or upload from gallery',
    voice: 'Tap to start recording',
    write: 'Let your thoughts flow freely',
  }[captureType]

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
          <X size={20} color="#000" />
        </TouchableOpacity>
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
                          {captureType === 'video' ? 'Record video' : 'Take a photo'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                          {captureType === 'video' ? 'Up to 60 seconds' : 'Open camera'}
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
                        <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>Choose from gallery</Text>
                        <Text style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Up to 7 items</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Voice capture */}
            {captureType === 'voice' && (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
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
                  {recording ? 'Recording...' : 'Tap to record'}
                </Text>
                <Text style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
                  {recording ? 'Tap the button to stop' : 'Share what\'s on your mind'}
                </Text>
              </View>
            )}

            {/* Write */}
            {captureType === 'write' && (
              <View style={{ flex: 1 }}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Start writing..."
                  placeholderTextColor="#ccc"
                  multiline
                  autoFocus
                  style={{
                    flex: 1,
                    minHeight: 280,
                    fontSize: 18,
                    color: '#000',
                    textAlignVertical: 'top',
                    lineHeight: 28,
                    paddingTop: 0,
                  }}
                />
              </View>
            )}
          </View>
        )}

        {/* ─── Step: Mood ─── */}
        {step === 'mood' && (
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#000', marginTop: 24, marginBottom: 6 }}>
              How are you feeling?
            </Text>
            <Text style={{ fontSize: 15, color: '#999', marginBottom: 32 }}>
              Select one or more
            </Text>

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
                    <Text style={{ fontSize: 18 }}>{mood.emoji}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: selected ? '#fff' : '#333' }}>
                      {mood.label}
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
              Add a note
            </Text>
            <Text style={{ fontSize: 15, color: '#999', marginBottom: 32 }}>
              Optional — a thought, a feeling, anything.
            </Text>

            {/* Media preview */}
            {mediaItems.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {mediaItems.map((item, i) => (
                  <View key={i} style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                    <Image source={{ uri: item.uri }} style={{ width: 64, height: 64 }} />
                  </View>
                ))}
              </View>
            )}

            {/* Mood pills */}
            {selectedMoods.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {selectedMoods.map(m => {
                  const mood = MOODS.find(mo => mo.key === m)
                  return (
                    <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}>
                      <Text style={{ fontSize: 14 }}>{mood?.emoji}</Text>
                      <Text style={{ fontSize: 13, color: '#333', fontWeight: '500' }}>{mood?.label}</Text>
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
                placeholder="Write something..."
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
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              {(captureType === 'photo' || captureType === 'video') && mediaItems.length === 0 ? 'Skip media' : 'Continue'}
            </Text>
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
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Continue</Text>
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
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Save moment</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
