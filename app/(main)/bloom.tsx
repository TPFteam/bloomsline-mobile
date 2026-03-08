import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Animated as RNAnimated } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBloomChat, BloomMessage } from '@/lib/hooks/useBloomChat'
import { useAuth } from '@/lib/auth-context'
import { ArrowUp } from 'lucide-react-native'
import { colors } from '@/lib/theme'

const TAGLINES = [
  'Listening to you',
  'Here for you',
  'Always by your side',
  'You matter',
  'Take your time',
  "I'm here",
]

const STARTERS = [
  { icon: '🌿', label: 'Something on my mind', subtitle: 'Process a thought' },
  { icon: '📈', label: 'How my week is going', subtitle: 'Check in together' },
  { icon: '🌊', label: "I'm feeling heavy", subtitle: 'Let it out' },
  { icon: '✨', label: 'Just want to talk', subtitle: 'No agenda needed' },
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
                backgroundColor: colors.bloom,
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
          paddingHorizontal: 18, paddingVertical: 12,
          borderRadius: 22, borderBottomRightRadius: 6,
          backgroundColor: colors.bloom,
        }}>
          <Text style={{ fontSize: 16, lineHeight: 23, color: '#fff' }}>
            {message.content}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ marginBottom: 16, maxWidth: '85%' }}>
      <Text style={{ fontSize: 16, lineHeight: 25, color: '#1f2937' }}>
        {message.content}
      </Text>
    </View>
  )
}

// ─── Breathing Orb ──────────────────────────────────

function BreathingOrb({ size = 56 }: { size?: number }) {
  const scale = useRef(new RNAnimated.Value(1)).current
  const glowOpacity = useRef(new RNAnimated.Value(0.2)).current

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(scale, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(scale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start()

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(glowOpacity, { toValue: 0.45, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(glowOpacity, { toValue: 0.15, duration: 2000, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const dot = size * 0.55
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Glow ring */}
      <RNAnimated.View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: colors.bloom,
        opacity: glowOpacity,
      }} />
      {/* Core orb */}
      <RNAnimated.View style={{ transform: [{ scale }] }}>
        <View style={{
          width: dot, height: dot, borderRadius: dot / 2,
          backgroundColor: colors.bloom,
        }} />
      </RNAnimated.View>
    </View>
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

  const showOnboarding = !hasStarted && messages.length <= 1

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FAFAF8' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.bloom }} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>Bloom</Text>
            <RNAnimated.Text style={{ fontSize: 11, color: colors.textTertiary, opacity: taglineFade }}>
              {TAGLINES[taglineIdx]}
            </RNAnimated.Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: colors.surface1,
            justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>✕</Text>
        </TouchableOpacity>
      </View>

      {showOnboarding ? (
        /* ─── Onboarding / Empty State ─────────────── */
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
          {/* Breathing Orb — larger, centered */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <BreathingOrb size={88} />
          </View>

          <Text style={{
            fontSize: 26, fontWeight: '700', color: colors.primary,
            textAlign: 'center', marginBottom: 8, letterSpacing: -0.5,
          }}>
            Hi {firstName}.
          </Text>
          <Text style={{
            fontSize: 17, color: '#8A8A8A', textAlign: 'center',
            marginBottom: 44, lineHeight: 26,
          }}>
            What would you like to{'\n'}explore today?
          </Text>

          {/* Starter cards — redesigned with subtitle */}
          <View style={{ gap: 10 }}>
            {STARTERS.map(s => (
              <TouchableOpacity
                key={s.label}
                onPress={() => handleStarter(s.label)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 16,
                  backgroundColor: '#fff', borderRadius: 18,
                  paddingHorizontal: 20, paddingVertical: 18,
                  borderWidth: 1, borderColor: '#f0f0f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: '#f5f5f3',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary, marginBottom: 2 }}>{s.label}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{s.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
            {/* Small Bloom orb indicator in chat */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.bloom, opacity: 0.6 }} />
            </View>

            {messages.map(msg => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingDots />}
            {error && (
              <View style={{
                backgroundColor: colors.errorBg,
                borderRadius: 14, padding: 14, marginTop: 8,
              }}>
                <Text style={{ fontSize: 14, color: colors.error }}>{error}</Text>
              </View>
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
                      paddingHorizontal: 16, paddingVertical: 10,
                      borderRadius: 20, backgroundColor: '#fff',
                      borderWidth: 1, borderColor: '#EBEBEB',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#555', fontWeight: '500' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Input — pill style */}
          <View style={{
            paddingHorizontal: 16, paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom + 6 : 16,
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#f0f0ee',
              borderRadius: 28,
              paddingLeft: 20, paddingRight: 6,
              paddingVertical: 6,
            }}>
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Type a message..."
                placeholderTextColor={colors.textTertiary}
                editable={!isLoading}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: colors.primary,
                }}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputValue.trim() || isLoading}
                activeOpacity={0.7}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: inputValue.trim() && !isLoading ? colors.bloom : '#ddd',
                  justifyContent: 'center', alignItems: 'center',
                }}
              >
                <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )
}
