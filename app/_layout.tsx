import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider } from '@/lib/i18n'
import { DesktopWrapper } from '@/components/DesktopWrapper'
import { PostHogProvider } from 'posthog-react-native'
import { posthog, initSentry } from '@/lib/analytics'

// Inject PostHog web snippet for session recordings (web/PWA only)
function usePostHogWeb() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY
    const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
    if (!key) return

    const script = document.createElement('script')
    script.innerHTML = `
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId setPersonProperties".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init('${key}', {
        api_host: '${host}',
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: true,
        enable_recording_console_log: true,
      });
    `
    document.head.appendChild(script)
  }, [])
}

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
  usePostHogWeb()

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
