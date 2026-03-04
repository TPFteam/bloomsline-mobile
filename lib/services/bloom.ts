import { supabase } from '@/lib/supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bloomsline.com'

export interface ChatRequest {
  message: string
  conversationId?: string
  locale?: string
  entryPoint?: string
}

export interface ChatResponse {
  message: string
  conversationId: string
  suggestions?: string[]
}

export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_URL}/api/bloom/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let errorMessage = 'Failed to send message'
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      errorMessage = `Server error: ${response.status}`
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

export async function getGreeting(locale: string = 'en', entryPoint: string = 'general'): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/bloom/greeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, entryPoint }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.greeting
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback greeting
  const hour = new Date().getHours()
  if (locale === 'fr') return hour < 12 ? 'Bonjour. Comment vas-tu ?' : 'Bonsoir. Comment vas-tu ?'
  if (locale === 'es') return hour < 12 ? 'Buenos dias. Como estas?' : 'Buenas noches. Como estas?'
  return hour < 12 ? 'Good morning. How are you?' : 'Good evening. How are you?'
}
