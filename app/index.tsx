import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'expo-router'
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { colors } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

export default function Index() {
  const { session, loading, isPractitioner, member, signOut } = useAuth()
  const router = useRouter()
  const { t } = useI18n()
  const [showPractitioner, setShowPractitioner] = useState(false)
  const [settingSession, setSettingSession] = useState(false)
  const hashHandled = useRef(false)

  // Handle session tokens from URL hash (care app redirect)
  useEffect(() => {
    if (Platform.OS !== 'web' || hashHandled.current) return
    hashHandled.current = true

    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      setSettingSession(true)
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
          setSettingSession(false)
        })
        .catch(() => setSettingSession(false))
    }
  }, [])

  useEffect(() => {
    if (loading || settingSession) return
    if (session) {
      if (isPractitioner) {
        setShowPractitioner(true)
      } else if (member) {
        router.replace('/(main)/home')
      }
      // session exists but no member yet — stay on loading spinner
      // (fetchMember will either set member or sign out)
    } else {
      router.replace('/(auth)/welcome')
    }
  }, [session, loading, isPractitioner, member, settingSession])

  if (showPractitioner) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 8, textAlign: 'center' }}>
          {t.auth?.practitionerRedirect || 'Welcome, practitioner!'}
        </Text>
        <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
          {t.auth?.practitionerRedirectBody || 'This app is for members. Please use the care dashboard to manage your practice.'}
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://www.bloomsline.com')}
          style={{
            backgroundColor: colors.bloom, height: 56, borderRadius: 28,
            paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
            {t.auth?.openDashboard || 'Open Care Dashboard'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bloom }}>
            {t.auth?.signOut || 'Sign out'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  )
}
