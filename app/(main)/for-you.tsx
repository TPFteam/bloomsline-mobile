import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Sparkles, Heart, ChevronRight, LifeBuoy, PenLine } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { useMobileFeatures } from '@/lib/use-mobile-features'
import { colors } from '@/lib/theme'
import { BottomNav } from '@/components/BottomNav'
import { SAVE_ENABLED } from '@/lib/for-you'

export default function ForYou() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { member } = useAuth()
  const { locale } = useI18n()
  const mobileFeatures = useMobileFeatures(member?.practitioner_id)
  const fr = locale === 'fr'

  const Card = ({ icon: Icon, color, bg, title, subtitle, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: '#fff', borderRadius: 20, padding: 18,
        borderWidth: 1, borderColor: '#EEE', marginBottom: 14,
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <Icon size={22} color={color} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>{title}</Text>
        <Text style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color="#CCC" />
    </TouchableOpacity>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 130 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 }}>
          {fr ? 'Pour vous' : 'For You'}
        </Text>
        <Text style={{ fontSize: 15, color: '#999', marginTop: 6, marginBottom: 28 }}>
          {fr ? 'Quelques instants rien que pour vous.' : 'A few moments, just for you.'}
        </Text>

        {mobileFeatures?.affirmations !== false && (
          <Card
            icon={Sparkles}
            color="#8B5CF6"
            bg="#F3EEFF"
            title={fr ? 'Quelques mots' : 'A few words'}
            subtitle={fr ? 'Quelques mots doux, pour maintenant' : 'A few gentle words for right now'}
            onPress={() => router.push('/(main)/affirmations')}
          />
        )}
        {mobileFeatures?.stories !== false && (
          <Card
            icon={PenLine}
            color="#4A9A86"
            bg="#E8F5F2"
            title={fr ? 'Journal' : 'Journal'}
            subtitle={fr ? 'Écrivez et explorez votre histoire' : 'Write and explore your story'}
            onPress={() => router.push('/(main)/stories')}
          />
        )}
        {SAVE_ENABLED && (
          <Card
            icon={Heart}
            color="#F43F5E"
            bg="#FFE8EC"
            title={fr ? 'Enregistrées' : 'Saved'}
            subtitle={fr ? 'Les mots qui vous ont touché(e)' : 'The words that landed for you'}
            onPress={() => router.push('/(main)/saved-affirmations')}
          />
        )}

        {/* Always-available crisis support */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(main)/affirmations', params: { crisis: '1' } })}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}
        >
          <LifeBuoy size={15} color="#999" />
          <Text style={{ fontSize: 13, color: '#999' }}>
            {fr ? 'Besoin d’aide urgente ?' : 'Need urgent help?'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: insets.bottom + 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10, zIndex: 10 }}>
        <BottomNav active="forYou" member={member} mobileFeatures={mobileFeatures} />
        <View style={{ width: 56 }} />
      </View>
    </View>
  )
}
