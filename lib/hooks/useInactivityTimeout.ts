import { useEffect, useRef, useState, useCallback } from 'react'
import { AppState, Platform } from 'react-native'

const TIMEOUT_MS = parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MS || '172800000') // 2 days
const WARNING_MS = 120000 // 2 min before timeout

export function useInactivityTimeout(enabled: boolean) {
  const [showWarning, setShowWarning] = useState(false)
  const [expired, setExpired] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const backgroundedAtRef = useRef<number | null>(null)

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowWarning(false)
  }, [])

  // Native: AppState listener for background/foreground
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAtRef.current = Date.now()
      } else if (state === 'active' && backgroundedAtRef.current) {
        const bgTime = Date.now() - backgroundedAtRef.current
        backgroundedAtRef.current = null
        if (bgTime >= TIMEOUT_MS) {
          setExpired(true)
        } else {
          lastActivityRef.current = Date.now()
        }
      }
    })

    return () => sub.remove()
  }, [enabled])

  // Web: document event listeners
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return

    const handle = () => { lastActivityRef.current = Date.now() }
    const events = ['click', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => document.addEventListener(e, handle, { passive: true }))
    return () => { events.forEach(e => document.removeEventListener(e, handle)) }
  }, [enabled])

  // Periodic check
  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current
      if (idle >= TIMEOUT_MS) {
        setExpired(true)
        setShowWarning(false)
      } else if (idle >= TIMEOUT_MS - WARNING_MS) {
        setShowWarning(true)
      } else {
        setShowWarning(false)
      }
    }, 30000)

    return () => clearInterval(timer)
  }, [enabled])

  return { showWarning, expired, resetTimer, dismissWarning: resetTimer }
}
