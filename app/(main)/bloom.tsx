import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Animated as RNAnimated } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBloomChat, BloomMessage } from '@/lib/hooks/useBloomChat'
import { useAuth } from '@/lib/auth-context'
import { Send } from 'lucide-react-native'

const TAGLINES = [
  'Listening to you',
  'Here for you',
  'Always by your side',
  'You matter',
  'Take your time',
  "I'm here",
]

const STARTERS = [
  { icon: '🌿', label: 'Something on my mind' },
  { icon: '📈', label: 'How my week is going' },
  { icon: '🌊', label: "I'm feeling heavy" },
  { icon: '✨', label: 'Just want to talk' },
]

const DEFAULT_SUGGESTIONS = [
  'How am I feeling today',
  'What have you noticed about me',
  'Help me reflect',
  'I need encouragement',
]

// ─── Typing Dots ────────────────────────────────────

function TypingDots() {
  const anims = useRef([
    new RNAnimated.Value(0.3),
    new RNAnimated.Value(0.3),
    new RNAnimated.Value(0.3),
  ]).current

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(anim, { toValue: 1, duration: 400, delay: i * 200, useNativeDriver: true }),
          RNAnimated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    )
    animations.forEach(a => a.start())
    return () => animations.forEach(a => a.stop())
  }, [])

  return (
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      <View style={{ borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f4f6' }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {anims.map((anim, i) => (
            <RNAnimated.View
              key={i}
              style={{
                width: 7, height: 7, borderRadius: 4,
                backgroundColor: '#4A9A86',
                opacity: anim,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

// ─── Chat Bubble ────────────────────────────────────

function ChatBubble({ message }: { message: BloomMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
        <View style={{
          maxWidth: '78%',
          paddingHorizontal: 16, paddingVertical: 10,
          borderRadius: 20, borderBottomRightRadius: 6,
          backgroundColor: '#4A9A86',
        }}>
          <Text style={{ fontSize: 15, lineHeight: 22, color: '#fff' }}>
            {message.content}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ marginBottom: 16, maxWidth: '85%' }}>
      <Text style={{ fontSize: 15, lineHeight: 24, color: '#1f2937' }}>
        {message.content}
      </Text>
    </View>
  )
}

// ─── Breathing Orb ──────────────────────────────────

function BreathingOrb({ size = 56 }: { size?: number }) {
  const scale = useRef(new RNAnimated.Value(1)).current

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(scale, { toValue: 1.12, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(scale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const dot = size * 0.6
  return (
    <RNAnimated.View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', transform: [{ scale }] }}>
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: '#4A9A86' }} />
    </RNAnimated.View>
  )
}

// ─── Main Screen ────────────────────────────────────

export default function Bloom() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { member } = useAuth()
  const scrollRef = useRef<ScrollView>(null)
  const [inputValue, setInputValue] = useState('')
  const [taglineIdx, setTaglineIdx] = useState(0)
  const taglineFade = useRef(new RNAnimated.Value(1)).current
  const [hasStarted, setHasStarted] = useState(false)

  const {
    messages,
    isLoading,
    sendUserMessage,
    error,
    suggestions,
  } = useBloomChat({ locale: 'en', entryPoint: 'general' })

  const displaySuggestions = suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS
  const firstName = member?.first_name || 'there'

  // Rotate taglines
  useEffect(() => {
    const interval = setInterval(() => {
      RNAnimated.timing(taglineFade, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setTaglineIdx(prev => (prev + 1) % TAGLINES.length)
        RNAnimated.timing(taglineFade, { toValue: 1, duration: 250, useNativeDriver: true }).start()
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    const msg = inputValue
    setInputValue('')
    setHasStarted(true)
    await sendUserMessage(msg)
  }

  const handleStarter = async (label: string) => {
    setHasStarted(true)
    await sendUserMessage(label)
  }

  const handleSuggestion = async (suggestion: string) => {
    if (isLoading) return
    await sendUserMessage(suggestion)
  }

  // Only greeting message exists and user hasn't typed yet
  const showOnboarding = !hasStarted && messages.length <= 1

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4A9A86' }} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>Bloom</Text>
            <RNAnimated.Text style={{ fontSize: 11, color: '#bbb', opacity: taglineFade }}>
              {TAGLINES[taglineIdx]}
            </RNAnimated.Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, color: '#999' }}>✕</Text>
        </TouchableOpacity>
      </View>

      {showOnboarding ? (
        /* ─── Onboarding / Empty State ─────────────── */
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <BreathingOrb size={72} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: '600', color: '#000', textAlign: 'center', marginBottom: 6 }}>
            Hi {firstName}.
          </Text>
          <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', marginBottom: 40, lineHeight: 24 }}>
            What would you like to{'\n'}explore today?
          </Text>

          <View style={{ gap: 10 }}>
            {STARTERS.map(s => (
              <TouchableOpacity
                key={s.label}
                onPress={() => handleStarter(s.label)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: '#fafafa', borderRadius: 16,
                  paddingHorizontal: 20, paddingVertical: 16,
                  borderWidth: 1, borderColor: '#f0f0f0',
                }}
              >
                <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#333' }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Or type */}
          <TouchableOpacity
            onPress={() => setHasStarted(true)}
            activeOpacity={0.6}
            style={{ alignSelf: 'center', marginTop: 24 }}
          >
            <Text style={{ fontSize: 13, color: '#ccc' }}>or type something</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ─── Chat Stream ──────────────────────────── */
        <>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingDots />}
            {error && (
              <Text style={{ textAlign: 'center', fontSize: 12, color: '#f87171', paddingVertical: 8 }}>
                {error}
              </Text>
            )}
          </ScrollView>

          {/* Suggestions */}
          {!isLoading && messages.length > 1 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                {displaySuggestions.map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleSuggestion(s)}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8,
                      borderRadius: 20, backgroundColor: '#f5f5f5',
                      borderWidth: 1, borderColor: '#eee',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#666' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Input */}
          <View style={{
            paddingHorizontal: 16, paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom + 4 : 16,
            borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Write a message..."
                placeholderTextColor="#bbb"
                editable={!isLoading}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                style={{
                  flex: 1,
                  paddingHorizontal: 18, paddingVertical: 12,
                  borderRadius: 24, fontSize: 15,
                  backgroundColor: '#f5f5f5',
                  color: '#000',
                }}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputValue.trim() || isLoading}
                activeOpacity={0.7}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: '#4A9A86',
                  justifyContent: 'center', alignItems: 'center',
                  opacity: (!inputValue.trim() || isLoading) ? 0.35 : 1,
                }}
              >
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )
}
