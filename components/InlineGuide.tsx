import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { X } from 'lucide-react-native'
import { colors } from '@/lib/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface InlineGuideProps {
  guideKey: string // 'care' | 'moments' | 'stories'
  icon: any
  title: string
  description: string
}

export function InlineGuide({ guideKey, icon: Icon, title, description }: InlineGuideProps) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('users')
      .select('guides_seen')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const seen = data?.guides_seen || {}
        if (!seen[guideKey]) setVisible(true)
      })
  }, [user?.id, guideKey])

  const dismiss = async () => {
    setVisible(false)
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
      backgroundColor: `${colors.bloom}08`,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: `${colors.bloom}20`,
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
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: '#888', lineHeight: 19 }}>
            {description}
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} style={{ padding: 4 }}>
          <X size={16} color="#BBB" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={dismiss} style={{ alignSelf: 'flex-end', marginTop: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>
          Got it
        </Text>
      </TouchableOpacity>
    </View>
  )
}
