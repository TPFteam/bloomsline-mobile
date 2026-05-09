import { Platform } from 'react-native'
import PostHog from 'posthog-react-native'
import * as Sentry from '@sentry/react-native'
import { scrubPII, scrubSentryEvent, scrubSentryBreadcrumb } from './analytics-scrub'

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
          maskAllTextInputs: true,
          maskAllImages: true,
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
    // Patient data (moment captions, journal text, emails) routinely sits
    // in closures around throwing code. Scrub before the event leaves the
    // device. See lib/analytics-scrub.ts for the redaction policy.
    beforeSend: scrubSentryEvent,
    beforeBreadcrumb: scrubSentryBreadcrumb,
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

/**
 * Centralised error reporter — call from error boundaries (and any catch
 * block worth capturing). Sends to both PostHog (queryable as a
 * `client_error` event) and Sentry (full stack + breadcrumbs). Both calls
 * are best-effort: failures are swallowed so the error UI still renders.
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
) {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown error')

  // Caller-supplied context can carry whole domain objects; scrub before
  // anything leaves the device. Sentry's beforeSend will scrub again as
  // defense-in-depth, but PostHog events bypass that hook so we scrub here.
  const safeContext = context ? (scrubPII(context) as Record<string, unknown>) : undefined

  try {
    posthog?.capture('client_error', {
      error_name: err.name,
      error_message: typeof err.message === 'string' ? (scrubPII(err.message) as string) : err.message,
      error_stack: err.stack || null,
      platform: Platform.OS,
      ...safeContext,
    })
  } catch {
    /* ignore */
  }

  try {
    Sentry.captureException(err, safeContext ? { extra: safeContext } : undefined)
  } catch {
    /* ignore */
  }
}
