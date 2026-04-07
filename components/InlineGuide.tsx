import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { X } from 'lucide-react-native'
import { colors } from '@/lib/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'

interface InlineGuideProps {
  guideKey: string // 'care' | 'moments' | 'stories'
  icon: any
  title: string
  description: string
  spotlight?: boolean
  onDismiss?: () => void
  onVisibilityChange?: (visible: boolean) => void
}

export function InlineGuide({ guideKey, icon: Icon, title, description, spotlight, onDismiss, onVisibilityChange }: InlineGuideProps) {
  const { locale } = useI18n()
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)

  // For moments guide, override text with better onboarding copy
  const isMoments = guideKey === 'moments'
  const displayTitle = isMoments
    ? (locale === 'fr' ? 'Vous êtes là. C\'est important.' : 'You\'re here. That matters.')
    : title
  const displayDesc = isMoments
    ? (locale === 'fr'
      ? 'Quand vous ressentez quelque chose, écrivez-le, photographiez-le, ou dites-le. Ça ne prend qu\'un instant.'
      : 'Whenever you feel something, write it, snap it, or say it. It only takes a moment.')
    : description

  useEffect(() => {
    // In spotlight mode, always show — parent controls visibility
    if (spotlight) { setVisible(true); onVisibilityChange?.(true); return }
    if (!user?.id) return
    // Assume visible until check completes (prevents content flash)
    onVisibilityChange?.(true)
    supabase
      .from('users')
      .select('guides_seen')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const seen = data?.guides_seen || {}
        const show = !seen[guideKey]
        setVisible(show)
        onVisibilityChange?.(show)
      })
  }, [user?.id, guideKey, spotlight])

  const dismiss = async () => {
    setVisible(false)
    onVisibilityChange?.(false)
    onDismiss?.()
    if (!user?.id) return
    const { data } = await supabase
      .from('users')
      .select('guides_seen')
      .eq('id', user.id)
      .single()
    const seen = data?.guides_seen || {}
    await supabase
      .from('users')
      .update({ guides_seen: { ...seen, [guideKey]: true } })
      .eq('id', user.id)
  }

  if (!visible) return null

  return (
    <View style={{
      backgroundColor: spotlight ? '#fff' : '#fff',
      borderRadius: 20,
      padding: 20,
      marginBottom: spotlight ? 0 : 20,
      borderWidth: spotlight ? 2 : 1.5,
      borderColor: spotlight ? colors.bloom : `${colors.bloom}40`,
      shadowColor: colors.bloom,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: spotlight ? 0.4 : 0.35,
      shadowRadius: spotlight ? 20 : 16,
      elevation: spotlight ? 12 : 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: colors.bloom,
          justifyContent: 'center', alignItems: 'center',
          marginTop: 2,
        }}>
          <Icon size={20} color="#fff" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>
            {displayTitle}
          </Text>
          <Text style={{ fontSize: 13, color: '#888', lineHeight: 19 }}>
            {displayDesc}
          </Text>
        </View>
        {!spotlight && (
          <TouchableOpacity onPress={dismiss} style={{ padding: 4 }}>
            <X size={16} color="#BBB" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={dismiss} style={{ alignSelf: 'flex-end', marginTop: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>
          {spotlight
            ? (locale === 'fr' ? 'C\'est parti' : 'Let\'s go')
            : (locale === 'fr' ? 'Compris' : 'Got it')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
