import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { BackButton } from '@/components/ui/BackButton'
import { colors } from '@/lib/theme'

export default function SignIn() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message || 'Sign in failed')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError('Google sign in failed')
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Back */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
          <BackButton />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#000', marginBottom: 8 }}>
            Welcome back.
          </Text>
          <Text style={{ fontSize: 17, color: '#999', marginBottom: 40 }}>
            Pick up where you left off.
          </Text>

          {error ? (
            <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 16 }}>
              <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ gap: 12, marginBottom: 24 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#bbb"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                height: 56,
                backgroundColor: '#f5f5f5',
                borderRadius: 16,
                paddingHorizontal: 20,
                fontSize: 17,
                color: '#000',
              }}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#bbb"
              secureTextEntry
              style={{
                height: 56,
                backgroundColor: '#f5f5f5',
                borderRadius: 16,
                paddingHorizontal: 20,
                fontSize: 17,
                color: '#000',
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            style={{
              backgroundColor: '#000',
              height: 56,
              borderRadius: 28,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#eee' }} />
            <Text style={{ marginHorizontal: 16, color: '#bbb', fontSize: 13 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#eee' }} />
          </View>

          <TouchableOpacity
            onPress={handleGoogle}
            style={{
              backgroundColor: '#f5f5f5',
              height: 56,
              borderRadius: 28,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#000', fontSize: 17, fontWeight: '600' }}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
