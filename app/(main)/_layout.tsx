import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { getHomeScreen } from '@/lib/nav-order'
import { ConsentModal } from '@/components/ConsentModal'

export default function MainLayout() {
  const { session, member, loading, user } = useAuth()
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
      // 'moments' is the default (home.tsx), no redirect needed
    }
  }, [session, member, loading])

  const handleConsent = async () => {
    if (!user?.id) return
    await supabase.from('users').update({ has_consented: true }).eq('id', user.id)
    setHasConsented(true)
  }

  // Don't render main screens until we have a valid member
  if (!session || !member) return null

  return (
    <>
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
      </Stack>
    </>
  )
}
