import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider } from '@/lib/i18n'
import { DesktopWrapper } from '@/components/DesktopWrapper'
import { PostHogProvider } from 'posthog-react-native'
import { posthog, initSentry } from '@/lib/analytics'

function AppContent() {
  return (
    <I18nProvider>
      <AuthProvider>
        <DesktopWrapper>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
          </Stack>
        </DesktopWrapper>
      </AuthProvider>
    </I18nProvider>
  )
}

export default function RootLayout() {
  useEffect(() => {
    initSentry()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {posthog ? (
        <PostHogProvider client={posthog}>
          <AppContent />
        </PostHogProvider>
      ) : (
        <AppContent />
      )}
    </GestureHandlerRootView>
  )
}
