/**
 * Web storage adapter for Supabase auth tokens (PWA / mobile-web only;
 * native uses Expo SecureStore).
 *
 * Behavior:
 *   - Tokens persist across browser sessions (localStorage) so patients
 *     don't have to re-login every time they close the app — closing
 *     the tab and reopening 30 minutes later should pick up where they
 *     left off, like any normal app.
 *   - Each persisted entry carries an absolute expiry timestamp. After
 *     the cap (2 days), getItem returns null and Supabase falls through
 *     to the sign-in flow. Every successful setItem (which Supabase
 *     calls on every token refresh) resets the clock — so an actively-
 *     used app stays logged in indefinitely; an idle one expires after
 *     two days and forces a fresh login.
 *   - In-memory Map sits in front of localStorage for two reasons:
 *     (1) faster reads on hot paths;
 *     (2) modest hardening against XSS — the attacker needs a reference
 *         to this module's variable, not just `window.localStorage`.
 *
 * Defense-in-depth context: the strict CSP shipped in app/_layout.tsx
 * (`script-src 'self' https://*.posthog.com`, no `'unsafe-inline'`)
 * already blocks the realistic XSS-token-exfil paths. Reverting from
 * sessionStorage to localStorage here is a deliberate UX-vs-security
 * trade — see this file's git history for the prior sessionStorage
 * variant if we ever need to flip back.
 */

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

interface StoredEntry {
  v: string
  exp: number // epoch ms, when the entry should be treated as missing
}

const memoryStore = new Map<string, string>()

function readPersisted(key: string): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null

  // Try the wrapped {v, exp} shape first.
  try {
    const parsed = JSON.parse(raw) as StoredEntry
    if (parsed && typeof parsed.v === 'string' && typeof parsed.exp === 'number') {
      if (Date.now() < parsed.exp) return parsed.v
      // Expired — clean up so we don't keep returning stale data.
      window.localStorage.removeItem(key)
      return null
    }
  } catch {
    // Fall through.
  }

  // Legacy / unwrapped value (bare string from a prior version of this
  // adapter, or another writer). Return as-is; the next setItem will
  // upgrade it to the wrapped shape.
  return raw
}

export const SecureWebStorageAdapter = {
  getItem(key: string): string | null {
    const memValue = memoryStore.get(key)
    if (memValue !== undefined) return memValue

    const stored = readPersisted(key)
    if (stored !== null) memoryStore.set(key, stored)
    return stored
  },

  setItem(key: string, value: string): void {
    memoryStore.set(key, value)
    if (typeof window !== 'undefined') {
      try {
        const entry: StoredEntry = { v: value, exp: Date.now() + TWO_DAYS_MS }
        window.localStorage.setItem(key, JSON.stringify(entry))
      } catch {
        // localStorage full or blocked — in-memory still works for the
        // current session.
      }
    }
  },

  removeItem(key: string): void {
    memoryStore.delete(key)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key)
    }
  },
}
