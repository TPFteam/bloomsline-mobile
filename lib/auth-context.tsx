import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Platform } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { supabase } from './supabase'
import { identifyUser, resetUser, trackEvent } from './analytics'
import { clearPushToken } from './notifications'

const ACTIVE_MEMBER_KEY = 'bloomsline_active_member_id'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'

function getRedirectUri(): string {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/auth/callback`
  }
  // In Expo Go, use the exp:// scheme with the dev server address
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    return `exp://${hostUri}/--/`
  }
  // Standalone / dev build — use the app scheme
  return 'bloomsline://'
}

type MagicLinkResult = { error: any; redirectTo?: string }

type AuthContextType = {
  session: Session | null
  user: User | null
  member: any | null
  allMembers: any[]
  setActiveMemberId: (id: string) => void
  loading: boolean
  isPractitioner: boolean
  notEligible: string | null
  clearNotEligible: () => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signInWithAzure: () => Promise<{ error: any }>
  sendMagicLink: (email: string, flow: 'signin' | 'signup') => Promise<MagicLinkResult>
  signOut: () => Promise<void>
  updateMember: (updates: Record<string, any>) => void
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  member: null,
  allMembers: [],
  setActiveMemberId: () => {},
  loading: true,
  isPractitioner: false,
  notEligible: null,
  clearNotEligible: () => {},
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithAzure: async () => ({ error: null }),
  sendMagicLink: async () => ({ error: null }),
  signOut: async () => {},
  updateMember: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<any | null>(null)
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPractitioner, setIsPractitioner] = useState(false)
  const [notEligible, setNotEligible] = useState<string | null>(null)
  const savedActiveMemberIdRef = useRef<string | null>(null)

  // Load saved active member ID on mount
  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_MEMBER_KEY).then((id) => {
      if (id) savedActiveMemberIdRef.current = id
    }).catch(() => {})
  }, [])

  useEffect(() => {
    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION first (which handles token refresh),
    // then subsequent events. This avoids the race condition where
    // getSession() returns null before auto-refresh completes.
    let initialReceived = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialReceived && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        initialReceived = true
      }

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchMember(session.user.id, session.access_token)
      } else {
        setMember(null)
        setupCalledRef.current = null
        // Only stop loading after we've received the initial session event
        if (initialReceived || event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
          setLoading(false)
        }
      }
    })

    // Safety timeout — if no auth event fires within 5s, stop loading
    const timeout = setTimeout(() => {
      if (!initialReceived) {
        initialReceived = true
        setLoading(false)
      }
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  // Track whether we've already called setup-member for this session
  const setupCalledRef = useRef<string | null>(null)
  // Prevent concurrent fetchMember calls from racing
  const fetchingRef = useRef(false)

  async function fetchMember(userId: string, accessToken?: string) {
    // If already fetching, skip — the in-flight call will handle everything
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      // Check if user is a practitioner
      const { data: userData } = await supabase
        .from('users')
        .select('user_type, signup_source')
        .eq('id', userId)
        .single()

      if (userData?.user_type === 'mentor') {
        setIsPractitioner(true)
        setLoading(false)
        return
      }

      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', userId)

      if (membersData && membersData.length > 0) {
        const enriched = membersData.map(m => ({ ...m, signup_source: userData?.signup_source || null }))
        setAllMembers(enriched)
        // Pick active: saved ID > first with practitioner > first
        const savedId = savedActiveMemberIdRef.current
        const active = (savedId && enriched.find(m => m.id === savedId))
          || enriched.find(m => m.practitioner_id)
          || enriched[0]
        setMember(active)
        identifyUser(userId, { email: user?.email, member_id: active.id })
        trackEvent('session_started')
        setLoading(false)
        return
      }

      // No member record found — call setup-member API (handles new signups)
      if (accessToken && setupCalledRef.current !== userId) {
        setupCalledRef.current = userId
        try {
          const res = await fetch(`${API_URL}/api/auth/setup-member`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          })
          const result = await res.json()

          if (result.ok) {
            // Re-fetch members after setup
            const { data: newMembers } = await supabase
              .from('members')
              .select('*')
              .eq('user_id', userId)
            if (newMembers && newMembers.length > 0) {
              const enriched = newMembers.map(m => ({ ...m, signup_source: userData?.signup_source || null }))
              setAllMembers(enriched)
              setMember(enriched[0])
              setLoading(false)
              return
            }
          }

          // Not eligible or setup failed — sign out (account deleted server-side)
          const fallbackMsg = result.reason === 'not_eligible'
            ? 'We\'re currently in early access. Request an invite to join us.'
            : 'Could not set up your account. Please try again.'
          setNotEligible(result.message || fallbackMsg)
          await supabase.auth.signOut()
        } catch (err) {
          console.error('setup-member failed:', err)
          setNotEligible('Could not verify your account. Please try again.')
          await supabase.auth.signOut()
        }
        setLoading(false)
        return
      }

      // setup-member already called but still no member — don't set loading false,
      // let the in-flight call finish. If we get here repeatedly, bail out.
      if (setupCalledRef.current === userId) {
        // Already tried setup, still no member — sign out
        setNotEligible('Account setup failed. Please try again.')
        await supabase.auth.signOut()
        setLoading(false)
      }
    } finally {
      fetchingRef.current = false
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error }
  }

  async function signInWithGoogle() {
    try {
      const redirectUrl = getRedirectUri()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: { access_type: 'offline', prompt: 'consent' },
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      })

      if (error) return { error }

      // On native, open the auth URL in a browser
      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        if (result.type === 'success') {
          const url = new URL(result.url)
          const params = new URLSearchParams(url.hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          }
        }
      }

      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  async function signInWithAzure() {
    try {
      const redirectUrl = getRedirectUri()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectUrl,
          scopes: 'openid profile email',
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      })

      if (error) return { error }

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        if (result.type === 'success') {
          const url = new URL(result.url)
          const params = new URLSearchParams(url.hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          }
        }
      }

      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  async function sendMagicLink(email: string, flow: 'signin' | 'signup'): Promise<MagicLinkResult> {
    try {
      // 1. Pre-flight check via care app API
      const res = await fetch(`${API_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), flow }),
      })
      const data = await res.json()

      if (!res.ok) {
        const redirectTo = data.error === 'no_account' ? 'signup' : data.error === 'account_exists' ? 'signin' : undefined
        return { error: data.message || data.error, redirectTo }
      }

      // 2. Send OTP from client (PKCE flow)
      const redirectUrl = getRedirectUri()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${redirectUrl}?flow=${flow}`,
          shouldCreateUser: flow === 'signup',
        },
      })

      if (error) return { error }
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  function clearNotEligible() {
    setNotEligible(null)
  }

  function setActiveMemberId(id: string) {
    const target = allMembers.find(m => m.id === id)
    if (target) {
      setMember(target)
      savedActiveMemberIdRef.current = id
      AsyncStorage.setItem(ACTIVE_MEMBER_KEY, id).catch(() => {})
    }
  }

  async function signOut() {
    // Clear push token before signing out
    const currentMember = allMembers.find(m => m.id === member?.id)
    if (currentMember?.id) clearPushToken(currentMember.id)
    trackEvent('signed_out')
    resetUser()
    await supabase.auth.signOut()
    setMember(null)
    setAllMembers([])
    setIsPractitioner(false)
    AsyncStorage.removeItem(ACTIVE_MEMBER_KEY).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{
      session, user, member, allMembers, setActiveMemberId, loading, isPractitioner, notEligible, clearNotEligible,
      signIn, signUp, signInWithGoogle, signInWithAzure, sendMagicLink, signOut,
      updateMember: (updates: Record<string, any>) => {
        setMember((prev: any) => prev ? { ...prev, ...updates } : prev)
        setAllMembers((prev) => prev.map(m => m.id === member?.id ? { ...m, ...updates } : m))
      },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
