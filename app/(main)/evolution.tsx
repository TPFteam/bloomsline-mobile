import { useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { PullToRefreshScrollView } from '@/components/PullToRefresh'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMemberMoments, Moment } from '@/lib/services/moments'
import { PageLoader } from '@/components/PageLoader'
import { GalleryVerticalEnd as GitBranch, LayoutGrid } from 'lucide-react-native'
import { MOOD_COLORS, colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

// Extracted components
import { BackButton } from '@/components/ui/BackButton'
import { MomentDetail } from '@/components/MomentDetail'
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
  const [displayLimit, setDisplayLimit] = useState(20)
  const { t, locale } = useI18n()

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

  // Filtered moments for library
  const filteredMoments = useMemo(() => {
    let filtered = allMoments
    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType)
    }
    if (filterMood) {
      filtered = filtered.filter(m => m.moods?.includes(filterMood))
    }
    setDisplayLimit(20) // reset on filter change
    return filtered
  }, [allMoments, filterType, filterMood])

  const displayedMoments = useMemo(() =>
    filteredMoments.slice(0, displayLimit),
    [filteredMoments, displayLimit]
  )
  const hasMore = displayLimit < filteredMoments.length

  const allMoodCounts: Record<string, number> = {}
  allMoments.forEach(m => { m.moods?.forEach(mood => { allMoodCounts[mood] = (allMoodCounts[mood] || 0) + 1 }) })
  const availableMoods = Object.entries(allMoodCounts).sort((a, b) => b[1] - a[1]).map(([mood]) => mood)

  if (loading) return <PageLoader />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sticky header */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24, backgroundColor: colors.bg, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(main)/home')} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
            {t.evolution?.title || 'My Journey'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Time range picker */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['7d', '30d', '90d'] as TimeRange[]).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: range === r ? colors.primary : '#fff',
                borderWidth: range === r ? 0 : 1,
                borderColor: '#EBEBEB',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: range === r ? '#fff' : colors.textSecondary }}>
                {r === '7d' ? t.evolution.days7 : r === '30d' ? t.evolution.days30 : t.evolution.days90}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <PullToRefreshScrollView
        onRefresh={onRefresh}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Personal insight */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#EBEBEB',
        }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.primary, lineHeight: 28 }}>
            {moments.length === 0
              ? (locale === 'fr' ? 'Pas encore de moments cette période.' : 'No moments yet this period.')
              : activeDays === 1
                ? (locale === 'fr' ? `Vous avez capturé ${moments.length} moment${moments.length > 1 ? 's' : ''} en ${activeDays} jour.` : `You captured ${moments.length} moment${moments.length > 1 ? 's' : ''} in ${activeDays} day.`)
                : (locale === 'fr' ? `Vous avez capturé ${moments.length} moment${moments.length > 1 ? 's' : ''} en ${activeDays} jours.` : `You captured ${moments.length} moment${moments.length > 1 ? 's' : ''} across ${activeDays} days.`)
            }
          </Text>
          {activeDays > 0 && (
            <Text style={{ fontSize: 14, color: '#999', marginTop: 8, lineHeight: 20 }}>
              {activeDays >= days * 0.7
                ? (locale === 'fr' ? 'Belle régularité. Continuez comme ça.' : "That's great consistency. Keep it up.")
                : activeDays >= days * 0.4
                  ? (locale === 'fr' ? 'Vous prenez le rythme.' : "You're building a rhythm.")
                  : (locale === 'fr' ? 'Chaque moment compte.' : 'Every moment counts.')}
            </Text>
          )}
        </View>

        {/* Mood bars — conversational */}
        {sortedMoods.length > 0 && (
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#EBEBEB',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 16 }}>
              {locale === 'fr' ? 'Ce que vous avez ressenti' : 'How you felt'}
            </Text>
            {sortedMoods.slice(0, 5).map(([mood, count], i) => {
              const moodColor = MOOD_COLORS[mood] || '#888'
              const pct = Math.round((count / totalMoodEntries) * 100)
              const moodLabel = t.moods[mood as keyof typeof t.moods] || mood
              return (
                <View key={mood} style={{ marginBottom: i < Math.min(sortedMoods.length, 5) - 1 ? 14 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, textTransform: 'capitalize' }}>
                      {moodLabel}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#BBB' }}>
                      {count}×
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: '#F5F5F3' }}>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: moodColor, width: `${Math.max(pct, 8)}%` }} />
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Mood Calendar */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 20,
          marginBottom: 28,
          borderWidth: 1,
          borderColor: '#EBEBEB',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 16 }}>
            {locale === 'fr' ? 'Votre rythme' : 'Your rhythm'}
          </Text>
          <MoodCalendar moments={moments} days={days} />
        </View>

        {/* ─── Moments Library ─── */}
        <View style={{ height: 1, backgroundColor: '#f0f0f0', marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: colors.textTertiary, textTransform: 'uppercase' }}>
            {t.evolution.yourMoments}
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
            moments={displayedMoments}
            onMomentPress={setViewingMoment}
          />
        ) : (
          <MomentsGrid
            moments={displayedMoments}
            onMomentPress={setViewingMoment}
          />
        )}

        {/* Load more */}
        {hasMore && (
          <TouchableOpacity
            onPress={() => setDisplayLimit(prev => prev + 80)}
            activeOpacity={0.8}
            style={{
              alignSelf: 'center',
              marginTop: 20,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 20,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#EBEBEB',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
              {locale === 'fr' ? 'Voir plus' : 'Load more'}
            </Text>
          </TouchableOpacity>
        )}
      </PullToRefreshScrollView>

      {/* Moment detail sheet */}
      {viewingMoment && (
        <MomentDetail moment={viewingMoment} onClose={() => setViewingMoment(null)} />
      )}
    </View>
  )
}
