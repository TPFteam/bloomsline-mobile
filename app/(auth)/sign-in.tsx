import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Mail, ArrowRight } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { BackButton } from '@/components/ui/BackButton'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

export default function SignIn() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signInWithGoogle, signInWithAzure, sendMagicLink } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<'google' | 'azure' | 'magic' | null>(null)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const handleGoogle = async () => {
    setLoading('google')
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError('Google sign in failed')
    setLoading(null)
  }

  const handleAzure = async () => {
    setLoading('azure')
    setError('')
    const { error } = await signInWithAzure()
    if (error) setError('Outlook sign in failed')
    setLoading(null)
  }

  const handleMagicLink = async () => {
    if (!email.trim() || loading) return
    setLoading('magic')
    setError('')
    const { error, redirectTo } = await sendMagicLink(email.trim(), 'signin')
    if (error) {
      if (redirectTo === 'signup') {
        router.push('/(auth)/sign-up')
      } else if (typeof error === 'string') {
        setError(error)
      } else {
        setError(error?.message || t.auth.noAccount)
      }
      setLoading(null)
      return
    }
    setMagicSent(true)
    setLoading(null)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
          <BackButton />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#000', marginBottom: 8 }}>
            {t.auth.signInTitle}
          </Text>
          <Text style={{ fontSize: 17, color: '#999', marginBottom: 40 }}>
            {t.auth.signInSubtitle}
          </Text>

          {error ? (
            <View style={{ backgroundColor: colors.errorBg, padding: 12, borderRadius: 12, marginBottom: 16 }}>
              <Text style={{ color: colors.error, fontSize: 14 }}>{error}</Text>
            </View>
          ) : null}

          {/* Google */}
          <TouchableOpacity
            onPress={handleGoogle}
            disabled={loading !== null}
            style={{
              backgroundColor: '#000', height: 56, borderRadius: 28,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
              marginBottom: 12, opacity: loading && loading !== 'google' ? 0.5 : 1,
            }}
          >
            {loading === 'google' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <GoogleIcon />
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{t.auth.continueWithGoogle}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#eee' }} />
            <Text style={{ marginHorizontal: 16, color: '#bbb', fontSize: 13 }}>{t.auth.or}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#eee' }} />
          </View>

          {/* Outlook */}
          <TouchableOpacity
            onPress={handleAzure}
            disabled={loading !== null}
            style={{
              backgroundColor: '#f5f5f5', height: 56, borderRadius: 28,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
              marginBottom: 12, opacity: loading && loading !== 'azure' ? 0.5 : 1,
            }}
          >
            {loading === 'azure' ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <MicrosoftIcon />
                <Text style={{ color: '#000', fontSize: 17, fontWeight: '600' }}>{t.auth.continueWithOutlook}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#eee' }} />
            <Text style={{ marginHorizontal: 16, color: '#bbb', fontSize: 13 }}>{t.auth.or}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#eee' }} />
          </View>

          {/* Magic Link */}
          {magicSent ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Mail size={32} color={colors.bloom} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 }}>
                {t.auth.checkEmail}
              </Text>
              <Text style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
                {t.auth.magicLinkSent.replace('{email}', email)}
              </Text>
              <TouchableOpacity onPress={() => { setMagicSent(false); setEmail('') }} style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.bloom }}>{t.auth.useDifferentEmail}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t.auth.emailPlaceholder}
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={handleMagicLink}
                style={{
                  flex: 1, height: 56, backgroundColor: '#f5f5f5', borderRadius: 28,
                  paddingHorizontal: 20, fontSize: 17, color: '#000',
                }}
                editable={loading === null}
              />
              <TouchableOpacity
                onPress={handleMagicLink}
                disabled={!email.trim() || loading !== null}
                style={{
                  width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bloom,
                  justifyContent: 'center', alignItems: 'center',
                  opacity: !email.trim() || loading !== null ? 0.5 : 1,
                }}
              >
                {loading === 'magic' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ArrowRight size={22} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Sign up link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32, gap: 4 }}>
            <Text style={{ fontSize: 15, color: '#999' }}>{t.auth.dontHaveAccount}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bloom }}>{t.auth.getStarted}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Inline SVG Icons ───────────────────────────────

function GoogleIcon() {
  // Simple "G" text as placeholder since we can't use SVG paths easily in RN
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>G</Text>
    </View>
  )
}

function MicrosoftIcon() {
  return (
    <View style={{ width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
      <View style={{ width: 8, height: 8, backgroundColor: '#f35325' }} />
      <View style={{ width: 8, height: 8, backgroundColor: '#81bc06' }} />
      <View style={{ width: 8, height: 8, backgroundColor: '#05a6f0' }} />
      <View style={{ width: 8, height: 8, backgroundColor: '#ffba08' }} />
    </View>
  )
}
