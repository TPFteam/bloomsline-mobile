import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Dimensions, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'

const { width } = Dimensions.get('window')

function BloomLogo({ size = 40 }: { size?: number }) {
  const dot = size * 0.28
  const gap = size * 0.36
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={{ position: 'absolute', top: 0, left: (size - dot) / 2, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: '#000' }} />
      <View style={{ position: 'absolute', top: gap, left: 0, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: '#000' }} />
      <View style={{ position: 'absolute', top: gap, left: size - dot, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: '#000' }} />
      <View style={{ position: 'absolute', top: gap * 2, left: (size - dot) / 2, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: '#000' }} />
    </View>
  )
}

function getGreetingText(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, member, signOut } = useAuth()
  const [moments, setMoments] = useState<Moment[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const firstName = member?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || ''

  const fetchMoments = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const data = await getMemberMoments(20, 0, today)
    setMoments(data)
  }, [])

  useEffect(() => {
    fetchMoments()
  }, [fetchMoments])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchMoments()
    setRefreshing(false)
  }

  const todayMomentCount = moments.length

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120, paddingHorizontal: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
          <BloomLogo size={36} />
          <TouchableOpacity
            onPress={() => router.push('/(main)/settings')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 16 }}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={{ marginBottom: 48 }}>
          <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 }}>
            {getGreetingText()},{'\n'}
            <Text style={{ color: '#999' }}>{firstName}.</Text>
          </Text>
        </View>

        {/* Today's pulse */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#bbb', textTransform: 'uppercase', marginBottom: 16 }}>
            Today
          </Text>

          {todayMomentCount === 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/(main)/capture')}
              style={{
                backgroundColor: '#f8f8f8',
                borderRadius: 24,
                padding: 32,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: 16 }}>✦</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#000', textAlign: 'center', marginBottom: 8 }}>
                Capture your first moment
              </Text>
              <Text style={{ fontSize: 15, color: '#999', textAlign: 'center' }}>
                How are you feeling right now?
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{
                backgroundColor: '#f8f8f8',
                borderRadius: 20,
                padding: 24,
              }}>
                <Text style={{ fontSize: 48, fontWeight: '700', color: '#000' }}>{todayMomentCount}</Text>
                <Text style={{ fontSize: 15, color: '#999', marginTop: 4 }}>
                  {todayMomentCount === 1 ? 'moment captured' : 'moments captured'}
                </Text>
              </View>

              {/* Mood summary — latest mood */}
              {moments[0]?.moods?.[0] && (
                <View style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: 20,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <Text style={{ fontSize: 28 }}>
                    {getMoodEmoji(moments[0].moods[0])}
                  </Text>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#000' }}>
                      Feeling {moments[0].moods[0]}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#999' }}>
                      {formatTime(moments[0].created_at)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/evolution')}
            style={{
              backgroundColor: '#000',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>
              My Evolution
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#fff' }}>
              See your emotional arc →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/practitioner')}
            style={{
              backgroundColor: '#f8f8f8',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#bbb', textTransform: 'uppercase', marginBottom: 8 }}>
              My Practitioner
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#000' }}>
              Connect with your guide →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FAB — Capture */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 24, left: 0, right: 0, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => router.push('/(main)/capture')}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#000',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function getMoodEmoji(mood: string): string {
  const map: Record<string, string> = {
    grateful: '🙏', peaceful: '🌿', joyful: '✨', inspired: '🌱',
    loved: '💕', calm: '🧘', hopeful: '☀️', proud: '🏆',
    overwhelmed: '😮‍💨', tired: '🌙', uncertain: '🌫️',
    tender: '🌸', restless: '💬', heavy: '🌊',
  }
  return map[mood] || '✦'
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
