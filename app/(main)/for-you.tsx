import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, LifeBuoy, PenLine, Sprout, Settings } from 'lucide-react-native'
import NotificationBell from '@/components/NotificationBell'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { useMobileFeatures } from '@/lib/use-mobile-features'
import { colors } from '@/lib/theme'
import { BottomNav } from '@/components/BottomNav'
import { getForYouResources } from '@/lib/services/for-you-resources'

export default function ForYou() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { member, allMembers } = useAuth()
  const { locale } = useI18n()
  const mobileFeatures = useMobileFeatures(member?.practitioner_id)
  const fr = locale === 'fr'

  // Whether the patient's practitioner(s) published any self-guided activities
  // — gates the "Practices" card. The full list lives on its own screen.
  const [practiceCount, setPracticeCount] = useState(0)

  const loadPractices = useCallback(async () => {
    const practitionerIds = (allMembers || []).map((m: any) => m.practitioner_id).filter(Boolean)
    const list = await getForYouResources(practitionerIds)
    setPracticeCount(list.length)
  }, [allMembers])

  useFocusEffect(useCallback(() => { loadPractices() }, [loadPractices]))

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
        {/* Header — notification bell + settings (mirrors Home) */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <NotificationBell onOpenResource={(resourceId) => {
              router.push({ pathname: '/(main)/practitioner', params: { openResourceId: resourceId } })
            }} />
            <TouchableOpacity
              onPress={() => router.push('/(main)/settings')}
              activeOpacity={0.7}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}
            >
              <Settings size={18} color="#666" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 }}>
          {fr ? 'Pour vous' : 'For You'}
        </Text>
        <Text style={{ fontSize: 15, color: '#999', marginTop: 6, marginBottom: 28 }}>
          {fr ? 'Un petit espace, rien que pour vous.' : 'A little space, just for you.'}
        </Text>

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

        {/* Practices — self-guided activities from the practitioner. Single
            card (like Journal) that opens the full list on its own screen. */}
        {practiceCount > 0 && (
          <Card
            icon={Sprout}
            color="#4A9A86"
            bg="#E8F5F2"
            title={fr ? 'Pratiques' : 'Practices'}
            subtitle={fr ? 'Des exercices doux, à votre rythme' : 'Gentle exercises, at your own pace'}
            onPress={() => router.push('/(main)/for-you-activities')}
          />
        )}

        {/* Always-available crisis support */}
        <TouchableOpacity
          onPress={() => router.push('/(main)/help')}
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
