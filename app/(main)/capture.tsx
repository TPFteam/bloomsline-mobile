import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createMoment } from '@/lib/services/moments'
import * as ImagePicker from 'expo-image-picker'

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

type Step = 'mood' | 'capture' | 'note'

export default function Capture() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<Step>('mood')
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [mediaItems, setMediaItems] = useState<{ uri: string; mimeType: string }[]>([])
  const [saving, setSaving] = useState(false)

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    )
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 7,
    })
    if (!result.canceled) {
      setMediaItems(result.assets.map((a: ImagePicker.ImagePickerAsset) => ({ uri: a.uri, mimeType: a.mimeType || 'image/jpeg' })))
    }
  }

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled) {
      setMediaItems([{ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType || 'image/jpeg' }])
    }
  }

  const handleSave = async () => {
    if (selectedMoods.length === 0) return
    setSaving(true)
    await createMoment({
      mediaItems,
      textContent: note || undefined,
      moods: selectedMoods,
    })
    setSaving(false)
    router.back()
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 28, color: '#000' }}>×</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['mood', 'capture', 'note'] as Step[]).map((s, i) => (
            <View
              key={s}
              style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: step === s ? '#000' : '#e5e5e5',
              }}
            />
          ))}
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step: Mood */}
        {step === 'mood' && (
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#000', textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
              How are you feeling?
            </Text>
            <Text style={{ fontSize: 15, color: '#999', textAlign: 'center', marginBottom: 40 }}>
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

        {/* Step: Capture */}
        {step === 'capture' && (
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#000', textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
              Add a photo or video
            </Text>
            <Text style={{ fontSize: 15, color: '#999', textAlign: 'center', marginBottom: 40 }}>
              Optional — you can skip this
            </Text>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={takePhoto}
                style={{ backgroundColor: '#f5f5f5', borderRadius: 20, padding: 24, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>Take a photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickImage}
                style={{ backgroundColor: '#f5f5f5', borderRadius: 20, padding: 24, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🖼</Text>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>Choose from gallery</Text>
              </TouchableOpacity>

              {mediaItems.length > 0 && (
                <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, color: '#16a34a', fontWeight: '600' }}>
                    {mediaItems.length} {mediaItems.length === 1 ? 'item' : 'items'} selected
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Step: Note */}
        {step === 'note' && (
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#000', textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
              Anything on your mind?
            </Text>
            <Text style={{ fontSize: 15, color: '#999', textAlign: 'center', marginBottom: 40 }}>
              A thought, a feeling, anything.
            </Text>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Write something..."
              placeholderTextColor="#ccc"
              multiline
              style={{
                minHeight: 160,
                backgroundColor: '#f8f8f8',
                borderRadius: 20,
                padding: 20,
                fontSize: 17,
                color: '#000',
                textAlignVertical: 'top',
                lineHeight: 26,
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom action */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 12 }}>
        {step === 'mood' && (
          <TouchableOpacity
            onPress={() => setStep('capture')}
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

        {step === 'capture' && (
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => setStep('note')}
              style={{
                backgroundColor: '#000',
                height: 56,
                borderRadius: 28,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                {mediaItems.length > 0 ? 'Continue' : 'Skip'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'note' && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: '#000',
              height: 56,
              borderRadius: 28,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Save moment</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
