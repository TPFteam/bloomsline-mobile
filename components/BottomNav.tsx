import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Heart, User, HandHeart } from 'lucide-react-native'
import { getNavOrder, type MobileFeatures } from '@/lib/nav-order'
import { useI18n } from '@/lib/i18n'
import { colors } from '@/lib/theme'

// Shared bottom tab pill used by Moments / My Care / Journal / For You.
// `active` is the current screen's nav key (its tab is highlighted and inert).
export function BottomNav({
  active,
  member,
  mobileFeatures,
}: {
  active: 'moments' | 'practitioner' | 'stories' | 'forYou'
  member: any
  mobileFeatures?: MobileFeatures | null
}) {
  const router = useRouter()
  const { t, locale } = useI18n()

  const order = getNavOrder(member, mobileFeatures)
  if (order.length <= 1) return null

  const CONFIG: Record<string, { icon: any; label: string; route: string }> = {
    moments: { icon: Heart, label: (t.home as any)?.moments || 'Moments', route: '/(main)/home' },
    practitioner: { icon: User, label: locale === 'fr' ? 'Mon Suivi' : 'My Care', route: '/(main)/practitioner' },
    forYou: { icon: HandHeart, label: locale === 'fr' ? 'Pour vous' : 'For You', route: '/(main)/for-you' },
  }

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 16,
      backgroundColor: '#fff',
      paddingHorizontal: 20, paddingVertical: 12,
      borderRadius: 40,
      borderWidth: 1, borderColor: '#EBEBEB',
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    }}>
      {order.map((key) => {
        const config = CONFIG[key]
        if (!config) return null
        const isActive = key === active
        const Icon = config.icon
        return (
          <TouchableOpacity
            key={key}
            onPress={isActive ? undefined : () => router.push(config.route as any)}
            activeOpacity={0.8}
            style={{ alignItems: 'center', gap: 6 }}
          >
            <View style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: isActive ? colors.bloom : '#fff',
              borderWidth: isActive ? 0 : 1, borderColor: '#E5E5E3',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Icon size={22} color={isActive ? '#fff' : '#999'} strokeWidth={isActive ? 2 : 1.5} />
            </View>
            <Text style={{ fontSize: 11, color: isActive ? colors.bloom : '#8A8A8A', fontWeight: isActive ? '700' : '500' }}>{config.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
