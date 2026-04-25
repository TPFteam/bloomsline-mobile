import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, Platform, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Heart, User, PenLine, MessageCircleQuestion, X, Bug, Lightbulb, HelpCircle, Send } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

const NAV_OPTIONS = [
  { key: 'moments', icon: Heart, label: { en: 'Moments', fr: 'Moments' } },
  { key: 'practitioner', icon: User, label: { en: 'My Care', fr: 'Mon Suivi' } },
] as const

export default function Settings() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, member, signOut, updateMember } = useAuth()
  const { t, locale, setLocale } = useI18n()

  const currentFirst = (member as any)?.nav_order?.[0] || (member?.practitioner_id ? 'practitioner' : 'moments')
  const [selectedFirst, setSelectedFirst] = useState(currentFirst)
  const [saving, setSaving] = useState(false)

  // Help & Support
  const [showSupport, setShowSupport] = useState(false)
  const [supportType, setSupportType] = useState<'bug' | 'feature' | 'question'>('question')
  const [supportSubject, setSupportSubject] = useState('')
  const [supportDescription, setSupportDescription] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent] = useState(false)

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'

  const handleSubmitSupport = async () => {
    if (!supportSubject.trim() || !supportDescription.trim()) return
    setSupportSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          type: supportType,
          subject: supportSubject.trim(),
          description: supportDescription.trim(),
          userEmail: user?.email,
          userName: member?.first_name ? `${member.first_name} ${member.last_name || ''}`.trim() : user?.email,
          source: 'mobile-app',
        }),
      })
      setSupportSent(true)
      setTimeout(() => {
        setShowSupport(false)
        setSupportSent(false)
        setSupportSubject('')
        setSupportDescription('')
        setSupportType('question')
      }, 2000)
    } catch {
      if (Platform.OS === 'web') window.alert('Failed to send. Please try again.')
      else Alert.alert('Error', 'Failed to send. Please try again.')
    }
    setSupportSending(false)
  }

  const doSignOut = async () => {
    await signOut()
    router.replace('/(auth)/welcome')
  }

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t.settings.signOutConfirm)) doSignOut()
    } else {
      Alert.alert(t.settings.signOut, t.settings.signOutConfirm, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.settings.signOut, style: 'destructive', onPress: doSignOut },
      ])
    }
  }

  const handleChangeFirst = async (key: string) => {
    setSelectedFirst(key)
    setSaving(true)
    // Build order: selected first, then the other two in default order
    const others = ['moments', 'practitioner', 'stories'].filter(k => k !== key)
    const newOrder = [key, ...others]
    try {
      await supabase
        .from('members')
        .update({ nav_order: newOrder })
        .eq('id', member?.id)
      // Update local state so nav bars reflect immediately
      updateMember({ nav_order: newOrder })
    } catch (e) {
      console.error('Failed to save nav order:', e)
    }
    setSaving(false)
  }

  const displayName = member?.first_name
    ? `${member.first_name} ${member.last_name || ''}`
    : user?.user_metadata?.full_name || user?.email || ''

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
      {/* Header */}
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.push('/(main)/home')}
        activeOpacity={0.7}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}
      >
        <Text style={{ fontSize: 18, color: '#000', marginTop: -1 }}>‹</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5, marginBottom: 32 }}>
        {t.settings.title}
      </Text>

      {/* Profile card */}
      <View style={{ backgroundColor: '#f8f8f8', borderRadius: 20, padding: 20, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5e5e5', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#666' }}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>{displayName}</Text>
          <Text style={{ fontSize: 13, color: '#999' }}>{user?.email}</Text>
        </View>
      </View>

      {/* Home screen picker */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          {locale === 'fr' ? 'Écran d\'accueil' : 'Home screen'}
        </Text>
        <View style={{ gap: 8 }}>
          {NAV_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isSelected = selectedFirst === opt.key
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => handleChangeFirst(opt.key)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  padding: 16, borderRadius: 16,
                  backgroundColor: isSelected ? `${colors.bloom}10` : '#f8f8f8',
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.bloom : 'transparent',
                }}
              >
                <Icon size={20} color={isSelected ? colors.bloom : '#999'} strokeWidth={isSelected ? 2 : 1.5} />
                <Text style={{ fontSize: 16, fontWeight: isSelected ? '600' : '400', color: isSelected ? colors.bloom : '#333', flex: 1 }}>
                  {opt.label[locale as 'en' | 'fr'] || opt.label.en}
                </Text>
                {isSelected && (
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bloom, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Language picker */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          {t.settings.language}
        </Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 16, padding: 4 }}>
          <TouchableOpacity
            onPress={() => setLocale('en')}
            activeOpacity={0.7}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12,
              backgroundColor: locale === 'en' ? '#fff' : 'transparent',
              alignItems: 'center',
              shadowColor: locale === 'en' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: locale === 'en' ? 0.08 : 0,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: locale === 'en' ? '600' : '400', color: locale === 'en' ? '#000' : '#999' }}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLocale('fr')}
            activeOpacity={0.7}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12,
              backgroundColor: locale === 'fr' ? '#fff' : 'transparent',
              alignItems: 'center',
              shadowColor: locale === 'fr' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: locale === 'fr' ? 0.08 : 0,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: locale === 'fr' ? '600' : '400', color: locale === 'fr' ? '#000' : '#999' }}>
              Français
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View style={{ gap: 2 }}>
        {/* Help & Support */}
        <TouchableOpacity
          onPress={() => setShowSupport(true)}
          style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MessageCircleQuestion size={20} color={colors.bloom} strokeWidth={1.8} />
            <Text style={{ fontSize: 17, color: '#333' }}>{locale === 'fr' ? 'Aide & Support' : 'Help & Support'}</Text>
          </View>
          <Text style={{ fontSize: 17, color: '#999' }}>›</Text>
        </TouchableOpacity>

        {/* WhatsApp */}
        <TouchableOpacity
          onPress={() => {
            const url = 'https://wa.me/33671482004?text=' + encodeURIComponent(locale === 'fr' ? 'Bonjour Bloomsline 👋' : 'Hi Bloomsline 👋')
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.open(url, '_blank')
            } else {
              import('expo-linking').then(Linking => Linking.openURL(url)).catch(() => {})
            }
          }}
          style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>💬</Text>
            <Text style={{ fontSize: 17, color: '#333' }}>{locale === 'fr' ? 'Parler avec Bloomsline' : 'Talk with Bloomsline'}</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#25D366', fontWeight: '600' }}>WhatsApp</Text>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 17, color: '#DC2626' }}>{t.settings.signOut}</Text>
          <Text style={{ fontSize: 17, color: '#DC2626' }}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 24, left: 24, right: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#ccc' }}>{t.settings.version}</Text>
      </View>

      {/* Help & Support Modal */}
      <Modal visible={showSupport} animationType="slide" transparent onRequestClose={() => setShowSupport(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111' }}>
                  {locale === 'fr' ? 'Aide & Support' : 'Help & Support'}
                </Text>
                <Text style={{ fontSize: 13, color: '#999', marginTop: 2 }}>
                  {locale === 'fr' ? 'Bugs, idées, questions — on vous écoute' : 'Bugs, ideas, questions — we\'re listening'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSupport(false)} style={{ padding: 6 }}>
                <X size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {supportSent ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 24 }}>✓</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 4 }}>
                    {locale === 'fr' ? 'Message envoyé !' : 'Message sent!'}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
                    {locale === 'fr' ? 'Merci, on vous recontacte rapidement.' : 'Thanks, we\'ll get back to you soon.'}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Type selector */}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 }}>
                    {locale === 'fr' ? 'Type' : 'Type'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                    {([
                      { key: 'bug' as const, icon: Bug, label: 'Bug' },
                      { key: 'feature' as const, icon: Lightbulb, label: locale === 'fr' ? 'Idée' : 'Feature' },
                      { key: 'question' as const, icon: HelpCircle, label: 'Question' },
                    ]).map((t) => {
                      const Icon = t.icon
                      const selected = supportType === t.key
                      return (
                        <TouchableOpacity
                          key={t.key}
                          onPress={() => setSupportType(t.key)}
                          style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                            paddingVertical: 10, borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: selected ? colors.bloom : '#e5e5e5',
                            backgroundColor: selected ? `${colors.bloom}08` : '#fff',
                          }}
                        >
                          <Icon size={16} color={selected ? colors.bloom : '#999'} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? colors.bloom : '#666' }}>{t.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Subject */}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 }}>
                    {locale === 'fr' ? 'Sujet' : 'Subject'}
                  </Text>
                  <TextInput
                    value={supportSubject}
                    onChangeText={setSupportSubject}
                    placeholder={locale === 'fr' ? 'Décrivez brièvement...' : 'Briefly describe...'}
                    placeholderTextColor="#ccc"
                    style={{
                      borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 12,
                      padding: 14, fontSize: 15, color: '#111', marginBottom: 16,
                    }}
                  />

                  {/* Description */}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 }}>
                    {locale === 'fr' ? 'Description' : 'Description'}
                  </Text>
                  <TextInput
                    value={supportDescription}
                    onChangeText={setSupportDescription}
                    placeholder={locale === 'fr' ? 'Donnez-nous plus de détails...' : 'Tell us more details...'}
                    placeholderTextColor="#ccc"
                    multiline
                    numberOfLines={4}
                    style={{
                      borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 12,
                      padding: 14, fontSize: 15, color: '#111', minHeight: 120,
                      textAlignVertical: 'top', marginBottom: 8,
                    }}
                  />

                  <Text style={{ fontSize: 12, color: '#ccc', marginBottom: 20 }}>
                    {locale === 'fr' ? `Envoi en tant que ${user?.email}` : `Sending as ${user?.email}`}
                  </Text>

                  {/* Submit */}
                  <TouchableOpacity
                    onPress={handleSubmitSupport}
                    disabled={supportSending || !supportSubject.trim() || !supportDescription.trim()}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      backgroundColor: (supportSubject.trim() && supportDescription.trim() && !supportSending) ? '#111' : '#e5e5e5',
                      borderRadius: 14, paddingVertical: 16, marginBottom: 30,
                    }}
                  >
                    {supportSending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Send size={16} color="#fff" />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                          {locale === 'fr' ? 'Envoyer' : 'Submit'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}
