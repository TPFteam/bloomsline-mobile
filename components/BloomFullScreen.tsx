import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBloomChat } from '@/lib/hooks/useBloomChat'
import { useI18n } from '@/lib/i18n'
import { ArrowUp, Mic } from 'lucide-react-native'
import { colors } from '@/lib/theme'

interface BloomFullScreenProps {
    onClose: () => void
    firstName: string
}

export function BloomFullScreen({ onClose, firstName }: BloomFullScreenProps) {
    const insets = useSafeAreaInsets()
    const { t, locale } = useI18n()
    const chatScrollRef = useRef<ScrollView>(null)
    const [chatInput, setChatInput] = useState('')
    const fadeAnim = useRef(new Animated.Value(0)).current
    const logoFloat = useRef(new Animated.Value(0)).current
    const [greeting] = useState(() => t.bloom.greetings[Math.floor(Math.random() * t.bloom.greetings.length)])

    const {
        messages,
        isLoading,
        sendUserMessage,
        suggestions,
        error,
    } = useBloomChat({ locale, entryPoint: 'general' })

    const displaySuggestions = suggestions.length > 0 ? suggestions : t.bloom.suggestions
    const hasMessages = messages.length > 1

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()

        Animated.loop(
            Animated.sequence([
                Animated.timing(logoFloat, { toValue: -8, duration: 2500, useNativeDriver: true }),
                Animated.timing(logoFloat, { toValue: 8, duration: 2500, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    useEffect(() => {
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100)
    }, [messages, isLoading])

    const handleSend = async () => {
        if (!chatInput.trim() || isLoading) return
        const msg = chatInput
        setChatInput('')
        await sendUserMessage(msg)
    }

    const handleSuggestion = async (s: string) => {
        if (isLoading) return
        await sendUserMessage(s)
    }

    return (
        <Animated.View
            style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: colors.bg,
                opacity: fadeAnim,
            }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {/* Main content area */}
                <ScrollView
                    ref={chatScrollRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {!hasMessages ? (
                        /* Welcome state */
                        <View style={{
                            flex: 1, justifyContent: 'center', alignItems: 'center',
                            paddingTop: insets.top + 80,
                            paddingHorizontal: 40,
                        }}>
                            {/* Bloom logo — soft float */}
                            <Animated.View style={{
                                marginBottom: 40,
                                transform: [{ translateY: logoFloat }],
                            }}>
                                <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                                    <View style={{
                                        width: 28, height: 28, borderRadius: 14,
                                        backgroundColor: colors.bloom,
                                    }} />
                                </View>
                            </Animated.View>

                            {/* Greeting */}
                            <Text style={{
                                fontSize: 28, fontWeight: '700', color: colors.primary,
                                textAlign: 'center', lineHeight: 36, letterSpacing: -0.5,
                            }}>
                                {firstName ? `${locale === 'fr' ? 'Salut' : 'Hey'} ${firstName}. ` : ''}{greeting}
                            </Text>

                            {/* Suggestion cards */}
                            <View style={{ marginTop: 48, width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                                {displaySuggestions.map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        onPress={() => handleSuggestion(s)}
                                        activeOpacity={0.7}
                                        style={{
                                            paddingHorizontal: 18, paddingVertical: 12,
                                            borderRadius: 20,
                                            backgroundColor: colors.surface1,
                                        }}
                                    >
                                        <Text style={{ fontSize: 14, color: '#666', fontWeight: '500' }}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : (
                        /* Chat messages */
                        <View style={{ paddingTop: insets.top + 60, paddingHorizontal: 20, paddingBottom: 16 }}>
                            {/* Small Bloom logo in chat mode */}
                            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bloom }} />
                            </View>

                            {messages.map(msg => {
                                if (msg.role === 'user') {
                                    return (
                                        <View key={msg.id} style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
                                            <View style={{
                                                maxWidth: '75%',
                                                paddingHorizontal: 16, paddingVertical: 10,
                                                borderRadius: 20, borderBottomRightRadius: 4,
                                                backgroundColor: colors.primary,
                                            }}>
                                                <Text style={{ fontSize: 15, lineHeight: 22, color: '#fff' }}>{msg.content}</Text>
                                            </View>
                                        </View>
                                    )
                                }
                                return (
                                    <View key={msg.id} style={{ marginBottom: 12, maxWidth: '85%' }}>
                                        <Text style={{ fontSize: 16, lineHeight: 24, color: '#374151' }}>{msg.content}</Text>
                                    </View>
                                )
                            })}
                            {isLoading && (
                                <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 8 }}>
                                    {[0, 1, 2].map(i => (
                                        <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.bloom, opacity: 0.4 }} />
                                    ))}
                                </View>
                            )}
                            {error && (
                                <View style={{ backgroundColor: colors.errorBg, padding: 12, borderRadius: 12, marginTop: 8 }}>
                                    <Text style={{ color: colors.error, fontSize: 14 }}>{error}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Bottom action bar */}
                <View style={{
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 12 : 20,
                    backgroundColor: colors.bg,
                }}>
                    {/* Text input — always visible */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: '#f0f0f0',
                        borderRadius: 28,
                        paddingLeft: 20, paddingRight: 6,
                        paddingVertical: 6,
                        marginBottom: 16,
                    }}>
                        <TextInput
                            value={chatInput}
                            onChangeText={setChatInput}
                            placeholder={t.bloom.placeholder}
                            placeholderTextColor={colors.textTertiary}
                            editable={!isLoading}
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                fontSize: 16,
                                color: colors.primary,
                                outlineStyle: 'none',
                            } as any}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!chatInput.trim() || isLoading}
                            activeOpacity={0.7}
                            style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: chatInput.trim() && !isLoading ? colors.primary : '#ddd',
                                justifyContent: 'center', alignItems: 'center',
                            }}
                        >
                            <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
                        {/* Close */}
                        <TouchableOpacity
                            onPress={onClose}
                            activeOpacity={0.7}
                            style={{
                                width: 48, height: 48, borderRadius: 24,
                                backgroundColor: '#f3f3f3',
                                justifyContent: 'center', alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 18, color: colors.textSecondary, fontWeight: '300' }}>✕</Text>
                        </TouchableOpacity>

                        {/* Push to talk — mic */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={{
                                width: 60, height: 60, borderRadius: 30,
                                backgroundColor: colors.primary,
                                justifyContent: 'center', alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 12,
                                elevation: 6,
                            }}
                        >
                            <Mic size={24} color="#fff" strokeWidth={2} />
                        </TouchableOpacity>

                        {/* Spacer to balance layout */}
                        <View style={{ width: 48, height: 48 }} />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Animated.View>
    )
}
