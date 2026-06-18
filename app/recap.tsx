import { useState } from 'react'
import { View, Text, TouchableOpacity, Share, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/constants/design'
import { useAuthStore } from '@/stores/authStore'
import { useYearInReview } from '@/hooks/useArchiveInsights'

export default function RecapScreen() {
  const { profile } = useAuthStore()
  const [year, setYear] = useState<number | null>(null)
  const { data, isLoading } = useYearInReview(profile?.id ?? '', year)

  const years = data?.years_active ?? []
  const currentYear = year ?? data?.year ?? null
  const currentIndex = currentYear !== null ? years.indexOf(currentYear) : -1
  const canGoOlder = currentIndex !== -1 && currentIndex < years.length - 1
  const canGoNewer = currentIndex > 0

  function goOlder() {
    if (canGoOlder) {
      setYear(years[currentIndex + 1])
    }
  }

  function goNewer() {
    if (canGoNewer) {
      setYear(years[currentIndex - 1])
    }
  }

  function handleShare() {
    if (!data || currentYear === null) {
      return
    }
    const lines = [`My ${currentYear} in review on TicketBook`, `${data.total_shows ?? 0} shows logged`]
    if (data.top_artist) {
      lines.push(`Top artist: ${data.top_artist.name} (${data.top_artist.count}x)`)
    }
    if (data.top_venue) {
      lines.push(`Top venue: ${data.top_venue.name}`)
    }
    if (data.highest_rated_show) {
      lines.push(`Highest rated: ${data.highest_rated_show.title} (${data.highest_rated_show.rating}/5)`)
    }
    Share.share({ message: lines.join('\n') })
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.muted} />
        </TouchableOpacity>
        <Text style={s.title}>year in review</Text>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      {isLoading && !data ? (
        <View style={s.centered}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <View style={s.content}>
          <View style={s.yearNav}>
            <TouchableOpacity onPress={goOlder} disabled={!canGoOlder} hitSlop={12} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={canGoOlder ? C.text : C.border2} />
            </TouchableOpacity>
            <Text style={s.yearText}>{currentYear}</Text>
            <TouchableOpacity onPress={goNewer} disabled={!canGoNewer} hitSlop={12} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={22} color={canGoNewer ? C.text : C.border2} />
            </TouchableOpacity>
          </View>

          <View style={s.heroWrapper}>
            <View style={s.hero}>
              <View style={s.heroTopRow}>
                <Text style={s.stubLabel}>ticketbook · {currentYear}</Text>
                <Text style={s.stubNumber}>recap</Text>
              </View>

              <View style={s.totalBlock}>
                <Text style={s.totalCount}>{data?.total_shows ?? 0}</Text>
                <Text style={s.totalLabel}>shows</Text>
              </View>
              {currentYear !== null && (
                <Text style={s.comparisonText}>
                  {data?.prev_year_total ?? 0} the year before
                </Text>
              )}

              <View style={s.divider} />

              {data?.top_artist && (
                <View style={s.statLine}>
                  <Text style={s.statLineLabel}>top artist</Text>
                  <Text style={s.statLineValue} numberOfLines={1}>{data.top_artist.name}</Text>
                </View>
              )}
              {data?.top_venue && (
                <View style={s.statLine}>
                  <Text style={s.statLineLabel}>top venue</Text>
                  <Text style={s.statLineValue} numberOfLines={1}>{data.top_venue.name}</Text>
                </View>
              )}
              {data?.highest_rated_show && (
                <View style={s.statLine}>
                  <Text style={s.statLineLabel}>highest rated</Text>
                  <Text style={s.statLineValue} numberOfLines={1}>
                    {data.highest_rated_show.title} · {data.highest_rated_show.rating}/5
                  </Text>
                </View>
              )}
            </View>
            <View style={[s.notchLeft, { backgroundColor: C.bg }]} />
            <View style={[s.notchRight, { backgroundColor: C.bg }]} />
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.08 * 12,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  yearText: {
    fontFamily: F.display,
    fontSize: 32,
    letterSpacing: -0.64,
    color: C.text,
    minWidth: 100,
    textAlign: 'center',
  },
  heroWrapper: {
    overflow: 'hidden',
    borderRadius: C.radius,
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border2,
  },
  hero: {
    padding: 20,
    paddingBottom: 28,
    position: 'relative',
  },
  notchLeft: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  notchRight: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stubLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    textTransform: 'uppercase',
  },
  stubNumber: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    textTransform: 'uppercase',
  },
  totalBlock: {
    alignItems: 'center',
    marginBottom: 4,
  },
  totalCount: {
    fontFamily: F.display,
    fontSize: 56,
    color: C.text,
    letterSpacing: -1.12,
    lineHeight: 60,
  },
  totalLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
  },
  comparisonText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    marginBottom: 16,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  statLineLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    textTransform: 'uppercase',
  },
  statLineValue: {
    flex: 1,
    fontFamily: F.display,
    fontSize: 15,
    color: C.text,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
})
