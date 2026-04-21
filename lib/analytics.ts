import { Platform } from 'react-native'
import PostHog from 'posthog-react-native'
import * as Sentry from '@sentry/react-native'

// PostHog
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

export const posthog = POSTHOG_KEY
  ? new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      // Enable session recording on web (PWA)
      ...(Platform.OS === 'web' ? {
        enableSessionReplay: true,
        sessionReplayConfig: {
          maskAllTextInputs: false,
          maskAllImages: false,
        },
      } : {}),
    })
  : null

// Sentry
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || ''

export function initSentry() {
  if (!SENTRY_DSN) return
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
  })
}

// Analytics helpers
export function identifyUser(userId: string, properties?: Record<string, any>) {
  posthog?.identify(userId, properties)
  Sentry.setUser({ id: userId, ...properties })
  // Also identify in the web JS snippet (separate instance for recordings)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.identify(userId, properties)
  }
}

export function resetUser() {
  posthog?.reset()
  Sentry.setUser(null)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.reset()
  }
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  posthog?.capture(event, properties)
}

export function trackScreen(screenName: string) {
  posthog?.screen(screenName)
}
