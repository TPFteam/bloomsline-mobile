import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getHomeScreen } from '@/lib/nav-order'

export default function MainLayout() {
  const { session, member, loading } = useAuth()
  const router = useRouter()
  const hasRedirected = useRef(false)

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

  // Don't render main screens until we have a valid member
  if (!session || !member) return null

  return (
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
  )
}
