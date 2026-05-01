import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { getHomeScreen } from '@/lib/nav-order'
import { ConsentModal } from '@/components/ConsentModal'
import { registerForPushNotifications } from '@/lib/notifications'
import { useInactivityTimeout } from '@/lib/hooks/useInactivityTimeout'

export default function MainLayout() {
  const { session, member, loading, user, signOut } = useAuth()
  const { locale } = useI18n()
  const router = useRouter()
  const hasRedirected = useRef(false)
  const [hasConsented, setHasConsented] = useState<boolean | null>(null)

  // Check consent status
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('users')
      .select('has_consented')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setHasConsented(data?.has_consented ?? false)
      })
  }, [user?.id])

  // Bounce users back to welcome if they have no session or no member
  useEffect(() => {
    if (loading) return
    if (!session || !member) {
      router.replace('/(auth)/welcome')
      return
    }
    // Redirect to preferred home screen (once)
    if (!hasRedirected.current) {
      const home = getHomeScreen(member as any)
      hasRedirected.current = true
      if (home === 'practitioner') {
        router.replace('/(main)/practitioner')
      } else if (home === 'stories') {
        router.replace('/(main)/stories')
      }
    }
  }, [session, member, loading])

  // Register push notifications after auth is confirmed
  const pushRegistered = useRef(false)
  useEffect(() => {
    if (!member?.id || pushRegistered.current) return
    pushRegistered.current = true
    registerForPushNotifications(member.id)
  }, [member?.id])

  const handleConsent = async () => {
    if (!user?.id) return
    await supabase.from('users').update({ has_consented: true }).eq('id', user.id)
    setHasConsented(true)
  }

  // Inactivity timeout — auto-logout after 15 min idle
  const { showWarning, expired, dismissWarning } = useInactivityTimeout(!!session && !!member && !loading)

  useEffect(() => {
    if (expired) {
      signOut()
    }
  }, [expired])

  // Don't render main screens until we have a valid member
  if (!session || !member) return null

  return (
    <>
      {/* Inactivity warning modal */}
      <Modal visible={showWarning} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Êtes-vous toujours là ?</Text>
            <Text style={styles.message}>
              Votre session va expirer dans 2 minutes par mesure de sécurité.
            </Text>
            <TouchableOpacity style={styles.button} onPress={dismissWarning}>
              <Text style={styles.buttonText}>Rester connecté(e)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConsentModal
        visible={hasConsented === false}
        onAccept={handleConsent}
        locale={locale}
      />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="capture" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="evolution" />
        <Stack.Screen name="practitioner" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="practitioner-profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="booking" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="stories" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tips" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 28, maxWidth: 340, width: '100%', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  button: { backgroundColor: '#0d9488', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
