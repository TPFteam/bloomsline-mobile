import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { getHomeScreen } from '@/lib/nav-order'
import { ConsentModal } from '@/components/ConsentModal'
import { WelcomeGuide } from '@/components/WelcomeGuide'

export default function MainLayout() {
  const { session, member, loading, user } = useAuth()
  const { locale } = useI18n()
  const router = useRouter()
  const hasRedirected = useRef(false)
  const [hasConsented, setHasConsented] = useState<boolean | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [practitionerName, setPractitionerName] = useState<string | undefined>(undefined)

  // Check consent + guide status
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('users')
      .select('has_consented, guides_seen')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setHasConsented(data?.has_consented ?? false)
        const seen = data?.guides_seen || {}
        if (data?.has_consented && !seen.welcome) {
          setShowGuide(true)
        }
      })
    // Fetch practitioner name if invited
    if (member?.practitioner_id) {
      supabase
        .from('users')
        .select('full_name')
        .eq('id', member.practitioner_id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setPractitionerName(data.full_name)
        })
    }
  }, [user?.id, member?.practitioner_id])

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

  const handleConsent = async () => {
    if (!user?.id) return
    await supabase.from('users').update({ has_consented: true }).eq('id', user.id)
    setHasConsented(true)
  }

  const handleDismissGuide = async () => {
    setShowGuide(false)
    if (!user?.id) return
    const { data } = await supabase.from('users').select('guides_seen').eq('id', user.id).single()
    const seen = data?.guides_seen || {}
    await supabase.from('users').update({ guides_seen: { ...seen, welcome: true } }).eq('id', user.id)
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
      <WelcomeGuide
        visible={showGuide && hasConsented === true}
        onDismiss={handleDismissGuide}
        locale={locale}
        hasPractitioner={!!member?.practitioner_id}
        practitionerName={practitionerName}
        memberFirstName={member?.first_name}
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
