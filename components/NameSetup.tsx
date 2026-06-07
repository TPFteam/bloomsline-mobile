import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { colors } from '@/lib/theme'

const content = {
  en: {
    title: 'What should we call you?',
    subtitle: 'Just checking in 👋 — tell us how you’d like your name to appear. You can change it anytime in Settings.',
    first: 'First name',
    last: 'Last name',
    save: 'Looks good',
    cancel: 'Cancel',
  },
  fr: {
    title: 'Comment vous appeler ?',
    subtitle: 'Petit coucou 👋 — dites-nous comment vous aimeriez que votre nom apparaisse. Modifiable à tout moment dans les Réglages.',
    first: 'Prénom',
    last: 'Nom',
    save: 'C’est bon',
    cancel: 'Annuler',
  },
}

interface NameSetupProps {
  visible: boolean
  initialFirst?: string
  initialLast?: string
  locale: string
  onSave: (first: string, last: string) => Promise<{ error: any }>
  /** When provided, the modal is dismissable (shows Cancel). Omit for the
   *  mandatory onboarding gate. */
  onClose?: () => void
  title?: string
  subtitle?: string
  ctaLabel?: string
}

export function NameSetup({ visible, initialFirst = '', initialLast = '', locale, onSave, onClose, title, subtitle, ctaLabel }: NameSetupProps) {
  const t = content[locale as keyof typeof content] || content.en
  const [first, setFirst] = useState(initialFirst)
  const [last, setLast] = useState(initialLast)
  const [saving, setSaving] = useState(false)

  // Re-seed from the latest pre-fill each time the modal opens.
  useEffect(() => {
    if (visible) {
      setFirst(initialFirst)
      setLast(initialLast)
    }
  }, [visible, initialFirst, initialLast])

  const handleSave = async () => {
    if (!first.trim() || saving) return
    setSaving(true)
    const { error } = await onSave(first, last)
    setSaving(false)
    if (!error && onClose) onClose()
  }

  const input = (value: string, setValue: (s: string) => void, placeholder: string) => (
    <TextInput
      value={value}
      onChangeText={setValue}
      placeholder={placeholder}
      placeholderTextColor="#B0B0B0"
      autoCapitalize="words"
      style={{
        borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1A1A1A',
        backgroundColor: '#fff',
      }}
    />
  )

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, padding: 24,
            shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
          }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 }}>
              {title || t.title}
            </Text>
            <Text style={{ fontSize: 14, color: '#999', marginBottom: 20, lineHeight: 20 }}>
              {subtitle || t.subtitle}
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 }}>{t.first}</Text>
            {input(first, setFirst, t.first)}

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#888', marginTop: 14, marginBottom: 6 }}>{t.last}</Text>
            {input(last, setLast, t.last)}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              {onClose && (
                <TouchableOpacity
                  onPress={onClose}
                  disabled={saving}
                  activeOpacity={0.85}
                  style={{ flex: 1, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#555' }}>{t.cancel}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                disabled={!first.trim() || saving}
                activeOpacity={0.85}
                style={{
                  flex: 1, height: 50, borderRadius: 25,
                  backgroundColor: first.trim() ? colors.bloom : '#E5E5E5',
                  justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8,
                }}
              >
                {saving && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ fontSize: 16, fontWeight: '600', color: first.trim() ? '#fff' : '#999' }}>{ctaLabel || t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
