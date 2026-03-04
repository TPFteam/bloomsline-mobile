import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'

type TimeRange = '7d' | '30d' | '90d'

export default function Evolution() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [range, setRange] = useState<TimeRange>('7d')
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [range])

  const fetchData = async () => {
    setLoading(true)
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const since = new Date()
    since.setDate(since.getDate() - days)
    const data = await getMemberMoments(200, 0, since)
    setMoments(data)
    setLoading(false)
  }

  // Compute mood distribution
  const moodCounts: Record<string, number> = {}
  moments.forEach(m => {
    m.moods?.forEach(mood => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1
    })
  })
  const topMoods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Group by day
  const dayMap: Record<string, number> = {}
  moments.forEach(m => {
    const day = m.created_at.split('T')[0]
    dayMap[day] = (dayMap[day] || 0) + 1
  })
  const activeDays = Object.keys(dayMap).length
  const totalDays = range === '7d' ? 7 : range === '30d' ? 30 : 90

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 17, color: '#000' }}>← Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5, marginBottom: 8 }}>
          My Evolution
        </Text>
        <Text style={{ fontSize: 15, color: '#999', marginBottom: 32 }}>
          The shape of your emotional journey.
        </Text>

        {/* Time range picker */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          {(['7d', '30d', '90d'] as TimeRange[]).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: range === r ? '#000' : '#f5f5f5',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: range === r ? '#fff' : '#666' }}>
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          <View style={{ flex: 1, backgroundColor: '#f8f8f8', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 36, fontWeight: '700', color: '#000' }}>{moments.length}</Text>
            <Text style={{ fontSize: 13, color: '#999', marginTop: 4 }}>moments</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#f8f8f8', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 36, fontWeight: '700', color: '#000' }}>{activeDays}</Text>
            <Text style={{ fontSize: 13, color: '#999', marginTop: 4 }}>active days</Text>
          </View>
        </View>

        {/* Top moods */}
        {topMoods.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#bbb', textTransform: 'uppercase', marginBottom: 16 }}>
              Most felt
            </Text>
            <View style={{ gap: 8 }}>
              {topMoods.map(([mood, count]) => {
                const maxCount = topMoods[0][1] as number
                const pct = (count / maxCount) * 100
                return (
                  <View key={mood}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: '#000', textTransform: 'capitalize' }}>
                        {getMoodEmoji(mood)} {mood}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#999' }}>{count}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#f0f0f0', borderRadius: 3 }}>
                      <View style={{ height: 6, backgroundColor: '#000', borderRadius: 3, width: `${pct}%` }} />
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Consistency */}
        <View style={{ backgroundColor: '#f8f8f8', borderRadius: 20, padding: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#bbb', textTransform: 'uppercase', marginBottom: 12 }}>
            Consistency
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#000' }}>
            {activeDays} of {totalDays} days
          </Text>
          <View style={{ height: 8, backgroundColor: '#e5e5e5', borderRadius: 4, marginTop: 12 }}>
            <View
              style={{
                height: 8,
                backgroundColor: '#000',
                borderRadius: 4,
                width: `${Math.round((activeDays / totalDays) * 100)}%`,
              }}
            />
          </View>
        </View>
      </ScrollView>
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
