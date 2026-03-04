import { useState, useCallback, useEffect, useRef } from 'react'
import { sendMessage, getGreeting } from '@/lib/services/bloom'

export interface BloomMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface UseBloomChatOptions {
  locale?: 'en' | 'fr' | 'es'
  entryPoint?: string
}

interface UseBloomChatReturn {
  messages: BloomMessage[]
  isLoading: boolean
  conversationId: string | null
  error: string | null
  suggestions: string[]
  sendUserMessage: (message: string) => Promise<void>
  clearChat: () => void
}

export function useBloomChat(options: UseBloomChatOptions = {}): UseBloomChatReturn {
  const { locale = 'en', entryPoint = 'general' } = options

  const [messages, setMessages] = useState<BloomMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const initRef = useRef(false)

  // Initialize with greeting
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function initializeChat() {
      const greeting = await getGreeting(locale, entryPoint)
      const greetingMessage: BloomMessage = {
        id: 'greeting',
        role: 'assistant',
        content: greeting,
        created_at: new Date().toISOString(),
      }
      setMessages([greetingMessage])
    }

    initializeChat()
  }, [locale, entryPoint])

  const sendUserMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    setIsLoading(true)
    setError(null)

    const tempUserMessage: BloomMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const response = await sendMessage({
        message,
        conversationId: conversationId || undefined,
        locale,
        entryPoint,
      })

      setConversationId(response.conversationId)

      if (response.suggestions) {
        setSuggestions(response.suggestions)
      }

      const assistantMessage: BloomMessage = {
        id: `response-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, locale, entryPoint])

  const clearChat = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
    setSuggestions([])
    initRef.current = false
  }, [])

  return {
    messages,
    isLoading,
    conversationId,
    error,
    suggestions,
    sendUserMessage,
    clearChat,
  }
}
