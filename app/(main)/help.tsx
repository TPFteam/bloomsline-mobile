import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LifeBuoy, Phone, X } from 'lucide-react-native'
import { useI18n } from '@/lib/i18n'
import { colors } from '@/lib/theme'
import { HELPLINES } from '@/lib/helplines'

export default function Help() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { locale } = useI18n()
  const fr = locale === 'fr'
  const back = () => (router.canGoBack() ? router.back() : router.push('/(main)/for-you'))

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 8 }}>
      <TouchableOpacity onPress={back} style={{ alignSelf: 'flex-end', padding: 18 }}>
        <X size={24} color="#999" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 40 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFE8EC', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <LifeBuoy size={26} color="#F43F5E" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>
          {fr ? 'Vous n’êtes pas seul(e)' : 'You don’t have to face this alone'}
        </Text>
        <Text style={{ fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 28 }}>
          {fr
            ? 'Si vous traversez un moment vraiment difficile, parler à quelqu’un maintenant peut aider. Ces lignes sont gratuites et confidentielles.'
            : 'If you’re going through something really hard right now, talking to someone can help. These lines are free and confidential.'}
        </Text>
        {HELPLINES.map((h) => (
          <TouchableOpacity
            key={h.tel}
            onPress={() => Linking.openURL(`tel:${h.tel}`)}
            activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#EEE', borderRadius: 16, padding: 16, marginBottom: 12 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDF9', justifyContent: 'center', alignItems: 'center' }}>
              <Phone size={20} color={colors.bloom} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>{fr ? h.label.fr : h.label.en}</Text>
              <Text style={{ fontSize: 13, color: '#999' }}>{fr ? h.sub.fr : h.sub.en}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={back} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#999' }}>{fr ? 'Je vais mieux, revenir' : 'I’m okay, go back'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
