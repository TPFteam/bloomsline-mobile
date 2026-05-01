/**
 * Secure web storage adapter for Supabase auth tokens.
 * Uses in-memory Map + sessionStorage (tab-scoped, dies on tab close).
 * Much more secure than localStorage which persists forever and is easily accessible via XSS.
 */

const memoryStore = new Map<string, string>()

export const SecureWebStorageAdapter = {
  getItem(key: string): string | null {
    // Check in-memory first (fastest, most secure)
    const memValue = memoryStore.get(key)
    if (memValue !== undefined) return memValue

    // Fall back to sessionStorage (survives page refresh within same tab)
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(key)
      if (stored) {
        memoryStore.set(key, stored) // cache in memory
        return stored
      }
    }
    return null
  },

  setItem(key: string, value: string): void {
    memoryStore.set(key, value)
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(key, value)
      } catch {
        // sessionStorage full or blocked — in-memory still works
      }
    }
  },

  removeItem(key: string): void {
    memoryStore.delete(key)
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(key)
    }
  },
}
