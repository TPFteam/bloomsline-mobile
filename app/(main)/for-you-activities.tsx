import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, ChevronRight, Sprout, Settings } from 'lucide-react-native'
import NotificationBell from '@/components/NotificationBell'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import { getForYouResources, getForYouRunCounts, type ForYouResource } from '@/lib/services/for-you-resources'

export default function ForYouActivities() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { allMembers } = useAuth()
  const { locale } = useI18n()
  const fr = locale === 'fr'

  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<ForYouResource[]>([])
  const [runCounts, setRunCounts] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    const practitionerIds = (allMembers || []).map((m: any) => m.practitioner_id).filter(Boolean)
    const list = await getForYouResources(practitionerIds)
    setActivities(list)
    if (list.length > 0) {
      setRunCounts(await getForYouRunCounts(list.map(r => r.id)))
    }
    setLoading(false)
  }, [allMembers])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: back + notification bell + settings */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={20} color="#999" />
            <Text style={{ fontSize: 15, color: '#999' }}>{fr ? 'Pour vous' : 'For You'}</Text>
          </TouchableOpacity>
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

        <Text style={{ fontSize: 30, fontWeight: '700', color: '#000', letterSpacing: -0.5 }}>
          {fr ? 'Pratiques' : 'Practices'}
        </Text>
        <Text style={{ fontSize: 15, color: '#999', marginTop: 6, marginBottom: 24 }}>
          {fr ? 'Des exercices doux, à votre rythme.' : 'Gentle exercises, at your own pace.'}
        </Text>

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#4A9A86" />
          </View>
        ) : (
          <>
            {activities.map(activity => {
              const count = runCounts[activity.id] || 0
              return (
                <TouchableOpacity
                  key={activity.id}
                  onPress={() => router.push({ pathname: '/(main)/for-you-activity', params: { id: activity.id, title: activity.title } })}
                  activeOpacity={0.85}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#EEE', marginBottom: 14 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#E8F5F2', justifyContent: 'center', alignItems: 'center' }}>
                    <Sprout size={22} color="#4A9A86" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>{activity.title}</Text>
                    {!!activity.description && (
                      <Text style={{ fontSize: 13, color: '#999', marginTop: 2 }} numberOfLines={1}>{activity.description}</Text>
                    )}
                    {count > 0 && (
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#4A9A86', marginTop: 6 }}>
                        {fr ? `Fait ${count}×` : `Done ${count}×`}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={20} color="#CCC" />
                </TouchableOpacity>
              )
            })}
          </>
        )}
      </ScrollView>
    </View>
  )
}
