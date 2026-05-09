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
import { ErrorBoundary } from '@/components/ErrorBoundary'

// PostHog web bootstrap. Builds the queueing stub directly in bundled JS
// (not inline <script>) and loads the real SDK from PostHog's CDN as an
// external script. This satisfies a strict CSP — `script-src` only needs
// to allow `'self' + posthog.com`, never `'unsafe-inline'`.
function usePostHogWeb() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY
    const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
    if (!key) return

    const w = window as any
    if (w.posthog?.__SV) return // already loaded

    // Build the queueing stub. PostHog's array.js looks for window.posthog
    // and replays the queue once it loads.
    const stub: any = w.posthog || []
    if (!stub.__SV) {
      w.posthog = stub
      stub._i = []
      stub.init = function (i: string, s: any, a?: string) {
        function g(target: any, name: string) {
          const parts = name.split('.')
          if (parts.length === 2) { target = target[parts[0]]; name = parts[1] }
          target[name] = function (...args: any[]) { target.push([name, ...args]) }
        }
        const u = a !== undefined ? (stub[a] = []) : (a = 'posthog', stub)
        u.people = u.people || []
        const methods = 'init capture register register_once register_for_session unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId setPersonProperties'.split(' ')
        for (const m of methods) g(u, m)
        stub._i.push([i, s, a])
      }
      stub.__SV = 1
    }

    const script = document.createElement('script')
    script.src = `${host}/static/array.js`
    script.async = true
    document.head.appendChild(script)

    w.posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
      enable_recording_console_log: true,
    })
  }, [])
}

// Content Security Policy for the PWA. Native iOS/Android skip this — they
// don't run a browser context. We inject the meta tag at runtime so the
// directive is colocated with the web init code; if PostHog or Sentry add
// new endpoints the change lives in one file.
//
// Why each directive matters:
//   script-src       — blocks XSS payloads from executing. No 'unsafe-inline'.
//   connect-src      — narrows exfiltration paths. Auth-stolen-token attacks
//                      can't POST elsewhere.
//   style-src        — 'unsafe-inline' is required because react-native-web
//                      injects styles inline. Style-XSS is far less impactful
//                      than script-XSS so this is an acceptable trade-off.
//   object-src/base-uri — closes legacy attack vectors (Flash, <base> hijack).
function useWebCSP() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    // Skip in dev — Metro hot-reload uses blob: scripts and ws: connections
    // that would be CSP-blocked. Production builds (__DEV__ === false) get
    // the strict policy.
    if (typeof __DEV__ !== 'undefined' && __DEV__) return
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return

    const directives = [
      "default-src 'self'",
      "script-src 'self' https://*.i.posthog.com https://*.posthog.com",
      // `blob:` is required because image/video pickers hand back blob:
      // URLs that the upload code reads via fetch() before pushing to
      // Supabase storage. Without it, every photo or video moment fails.
      "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.i.posthog.com https://*.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]

    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = directives.join('; ')
    document.head.appendChild(meta)
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
  useWebCSP()
  usePostHogWeb()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        {posthog ? (
          <PostHogProvider client={posthog}>
            <AppContent />
          </PostHogProvider>
        ) : (
          <AppContent />
        )}
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
