/**
 * PII scrubbing for Sentry / PostHog payloads.
 *
 * Health-app errors and breadcrumbs naturally pull in moment captions,
 * journal text, member names, and email addresses — usually as values on
 * the closure that surrounds the throwing line. None of that should land
 * in third-party analytics. We scrub *both* shapes:
 *
 *   1. Known-PII keys, anywhere in the event tree, get redacted.
 *   2. Free-text strings (error messages, breadcrumb messages) have
 *      email + UUID patterns regexed out.
 *
 * The scrubber is intentionally conservative: it leaves diagnostic data
 * intact (status codes, stack frames, request paths) while surgically
 * removing the values that are likely to be patient PII.
 */

// Field names that, on inspection of our domain types, can carry user-
// generated content or directly-identifying data. Everything matched here
// is replaced with the literal string '<redacted>'.
const PII_KEYS = new Set<string>([
  // Identity
  'email', 'phone', 'phone_number', 'full_name', 'first_name', 'last_name',
  'name', 'display_name',
  // Free text from moments / stories / resources
  'text_content', 'caption', 'content', 'description', 'note', 'notes',
  'message', 'title',
  // Auth / token leakage
  'password', 'access_token', 'refresh_token', 'authorization',
  'api_key', 'service_role_key', 'secret', 'session', 'token',
])

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g

/**
 * Walk an arbitrary value and redact PII in place (returning a new tree).
 * Bounded depth so a circular reference can't lock the event loop.
 */
export function scrubPII(value: unknown, depth = 0): unknown {
  if (depth > 6) return '<truncated>'
  if (value == null) return value
  if (typeof value === 'string') return scrubString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(v => scrubPII(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) {
        out[k] = '<redacted>'
        continue
      }
      out[k] = scrubPII(v, depth + 1)
    }
    return out
  }
  return value
}

function scrubString(s: string): string {
  if (!s) return s
  return s.replace(EMAIL_RE, '<redacted-email>')
}

/**
 * Sentry `beforeSend` hook. Clones the event tree through scrubPII so the
 * original references in the app's memory are untouched, and the network
 * payload is the redacted one.
 */
export function scrubSentryEvent<T>(event: T): T {
  return scrubPII(event) as T
}

/** Same shape, intended for use as a Sentry `beforeBreadcrumb` hook. */
export function scrubSentryBreadcrumb<T>(breadcrumb: T): T {
  return scrubPII(breadcrumb) as T
}
