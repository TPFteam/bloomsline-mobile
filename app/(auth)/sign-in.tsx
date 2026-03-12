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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t.auth.emailPlaceholder}
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={handleMagicLink}
                style={{
                  flex: 1, minWidth: 0, height: 56, backgroundColor: '#f5f5f5', borderRadius: 28,
                  paddingHorizontal: 20, fontSize: 17, color: '#000',
                }}
                editable={loading === null}
              />
              <TouchableOpacity
                onPress={handleMagicLink}
                disabled={!email.trim() || loading !== null}
                style={{
                  width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bloom,
                  justifyContent: 'center', alignItems: 'center', flexShrink: 0,
                  opacity: !email.trim() || loading !== null ? 0.5 : 1,
                }}
              >
                {loading === 'magic' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ArrowRight size={20} color="#fff" />
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

import Svg, { Path } from 'react-native-svg'

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
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
