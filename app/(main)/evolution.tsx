import { useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'
import { PageLoader } from '@/components/PageLoader'
import { GalleryVerticalEnd as GitBranch, LayoutGrid } from 'lucide-react-native'
import { MOOD_SCORES, colors } from '@/lib/theme'

// Extracted components
import { BackButton } from '@/components/ui/BackButton'
import { MomentDetail } from '@/components/MomentDetail'
import { BloomScoreRing } from '@/components/evolution/BloomScoreRing'
import { EmotionalLandscape } from '@/components/evolution/EmotionalLandscape'
import { MoodRing } from '@/components/evolution/MoodRing'
import { MoodCalendar } from '@/components/evolution/MoodCalendar'
import { RememberThisCard } from '@/components/evolution/RememberThisCard'
import { FilterRow } from '@/components/evolution/FilterRow'
import { EmotionalRiver, MomentsGrid } from '@/components/evolution/MomentCards'

type TimeRange = '7d' | '30d' | '90d'

export default function Evolution() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [range, setRange] = useState<TimeRange>('7d')
  const [allMoments, setAllMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterMood, setFilterMood] = useState<string | null>(null)
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null)
  const [viewMode, setViewMode] = useState<'river' | 'grid'>('river')

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90

  const fetchData = useCallback(async () => {
    const data = await getMemberMoments(500, 0)
    setAllMoments(data)
  }, [])

  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true)
      await fetchData()
      setLoading(false)
    }
    initialFetch()
  }, [fetchData])

  const onRefresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Range-filtered moments for analytics
  const rangeSince = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.getTime()
  }, [days])

  const moments = useMemo(() =>
    allMoments.filter(m => new Date(m.created_at).getTime() >= rangeSince),
    [allMoments, rangeSince]
  )

  // ─── Computed stats ────────────────────────────────

  const moodCounts: Record<string, number> = {}
  let totalMoodEntries = 0
  moments.forEach(m => {
    m.moods?.forEach(mood => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1
      totalMoodEntries++
    })
  })
  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])

  const daySet = new Set<string>()
  moments.forEach(m => daySet.add(m.created_at.split('T')[0]))
  const activeDays = daySet.size

  // Bloom Score calculation
  const frequencyScore = Math.min(100, (moments.length / (days * 2)) * 100)
  const consistencyScore = (activeDays / days) * 100

  let valenceSum = 0
  let valenceCount = 0
  moments.forEach(m => {
    m.moods?.forEach(mood => {
      valenceSum += MOOD_SCORES[mood] ?? 50
      valenceCount++
    })
  })
  const valenceScore = valenceCount > 0 ? valenceSum / valenceCount : 50

  const bloomScore = moments.length === 0 ? 0 : Math.round(
    frequencyScore * 0.3 + valenceScore * 0.35 + consistencyScore * 0.35
  )

  const scoreLabel = bloomScore >= 80 ? 'Amazing week' :
    bloomScore >= 60 ? 'Going strong' :
      bloomScore >= 40 ? 'Building up' :
        bloomScore >= 20 ? 'Keep going' : 'Just starting'

  // Filtered moments for library
  const filteredMoments = useMemo(() => {
    let filtered = allMoments
    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType)
    }
    if (filterMood) {
      filtered = filtered.filter(m => m.moods?.includes(filterMood))
    }
    return filtered
  }, [allMoments, filterType, filterMood])

  const allMoodCounts: Record<string, number> = {}
  allMoments.forEach(m => { m.moods?.forEach(mood => { allMoodCounts[mood] = (allMoodCounts[mood] || 0) + 1 }) })
  const availableMoods = Object.entries(allMoodCounts).sort((a, b) => b[1] - a[1]).map(([mood]) => mood)

  if (loading) return <PageLoader />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PullToRefreshScrollView
        onRefresh={onRefresh}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(main)/home')} />

        {/* Time range picker */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20, marginBottom: 28 }}>
          {(['7d', '30d', '90d'] as TimeRange[]).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: range === r ? colors.primary : colors.surface1,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: range === r ? '#fff' : colors.textSecondary }}>
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bloom Score */}
        <View style={{ marginBottom: 28 }}>
          <BloomScoreRing score={bloomScore} trend={0} label={scoreLabel} />
        </View>

        {/* Mood Ring */}
        {sortedMoods.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 16 }}>
              Mood spectrum
            </Text>
            <MoodRing moodCounts={sortedMoods} totalMoments={totalMoodEntries} />
          </View>
        )}

        {/* Emotional Landscape */}
        {moments.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <EmotionalLandscape moments={moments} days={days} />
          </View>
        )}

        {/* Mood Calendar */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 16 }}>
            Mood calendar
          </Text>
          <MoodCalendar moments={moments} days={days} />
        </View>

        {/* ─── Moments Library ─── */}
        <View style={{ height: 1, backgroundColor: '#f0f0f0', marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: colors.textTertiary, textTransform: 'uppercase' }}>
            Your moments
          </Text>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface1, borderRadius: 12, padding: 3 }}>
            <TouchableOpacity
              onPress={() => setViewMode('river')}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                backgroundColor: viewMode === 'river' ? colors.bg : 'transparent',
              }}
            >
              <GitBranch size={16} color={viewMode === 'river' ? colors.primary : colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('grid')}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                backgroundColor: viewMode === 'grid' ? colors.bg : 'transparent',
              }}
            >
              <LayoutGrid size={16} color={viewMode === 'grid' ? colors.primary : colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Remember This */}
        <RememberThisCard moments={allMoments} onPress={setViewingMoment} />

        {/* Filters */}
        <View style={{ marginBottom: 24 }}>
          <FilterRow
            activeType={filterType}
            onTypeChange={setFilterType}
            activeMood={filterMood}
            onMoodChange={setFilterMood}
            availableMoods={availableMoods}
          />
        </View>

        {/* River or Grid view */}
        {viewMode === 'river' ? (
          <EmotionalRiver
            moments={filteredMoments}
            onMomentPress={setViewingMoment}
          />
        ) : (
          <MomentsGrid
            moments={filteredMoments}
            onMomentPress={setViewingMoment}
          />
        )}
      </PullToRefreshScrollView>

      {/* Moment detail sheet */}
      {viewingMoment && (
        <MomentDetail moment={viewingMoment} onClose={() => setViewingMoment(null)} />
      )}
    </View>
  )
}
