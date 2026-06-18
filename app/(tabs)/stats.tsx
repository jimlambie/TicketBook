import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format, parseISO } from 'date-fns'
import { C, F, eventTypeStyle } from '@/constants/design'
import { useAuthStore } from '@/stores/authStore'
import { useArchiveInsights } from '@/hooks/useArchiveInsights'
import { supabase } from '@/lib/supabase'
import type { UserStat, Achievement } from '@/lib/database.types'

function useStatsData(userId: string) {
  return useQuery({
    queryKey: ['stats-screen', userId],
    queryFn: async () => {
      const [statsRes, rankRes, achievementsRes] = await Promise.all([
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('leaderboard_total')
          .select('rank, total_events, last_event_date')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('achievements')
          .select('*')
          .eq('user_id', userId)
          .order('awarded_at', { ascending: true }),
      ])

      const stats: UserStat[] = statsRes.data ?? []

      return {
        total: stats.find(s => s.dimension === 'total' && s.key === 'all') ?? null,
        artists: stats
          .filter(s => s.dimension === 'artist')
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        venues: stats
          .filter(s => s.dimension === 'venue')
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
        byType: stats.filter(s => s.dimension === 'event_type'),
        rank: rankRes.data ?? null,
        achievements: (achievementsRes.data ?? []) as Achievement[],
      }
    },
    enabled: !!userId,
  })
}

export default function StatsScreen() {
  const { profile } = useAuthStore()
  const { data, isLoading } = useStatsData(profile?.id ?? '')
  const isPremium = profile?.plan === 'premium'
  const { data: insights, isLoading: insightsLoading } = useArchiveInsights(profile?.id ?? '', isPremium)
  const [showInsightsInfo, setShowInsightsInfo] = useState(false)

  const totalCount = data?.total?.count ?? 0
  const lastDate = data?.rank?.last_event_date ?? data?.total?.last_event_date

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.accent} />
      </View>
    )
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <View style={s.header}>
          <Text style={s.title}>stats</Text>
        </View>

        {/* ── Total + rank ─────────────────────────────────── */}
        <View style={s.summaryBlock}>
          <View style={s.summaryMain}>
            <Text style={s.summaryCount}>{totalCount}</Text>
            <Text style={s.summaryLabel}>stubs</Text>
          </View>
          <View style={s.summaryMeta}>
            {data?.rank?.rank != null && (
              <View style={s.rankPill}>
                <Text style={s.rankText}>#{data.rank.rank} overall</Text>
              </View>
            )}
            {lastDate && (
              <Text style={s.lastEventText}>
                last show {format(parseISO(lastDate), 'd MMM yyyy')}
              </Text>
            )}
          </View>
        </View>

        {totalCount === 0 && (
          <View style={s.emptyBlock}>
            <Text style={s.emptyTitle}>no stubs yet</Text>
            <Text style={s.emptySub}>log your first event and your archive starts here</Text>
          </View>
        )}

        {/* ── By type ──────────────────────────────────────── */}
        {data?.byType && data.byType.length > 0 && (
          <Section label="by type">
            <View style={s.typeRow}>
              {data.byType
                .sort((a, b) => b.count - a.count)
                .map(t => {
                  const key = t.key as keyof typeof eventTypeStyle
                  const ts = eventTypeStyle[key] ?? eventTypeStyle.other
                  return (
                    <View key={t.key} style={[s.typePill, { backgroundColor: ts.bg, borderColor: ts.border }]}>
                      <Text style={[s.typePillCount, { color: ts.text }]}>{t.count}</Text>
                      <Text style={[s.typePillLabel, { color: ts.text }]}>{t.label.toLowerCase()}</Text>
                    </View>
                  )
                })}
            </View>
          </Section>
        )}

        {/* ── Top artists ──────────────────────────────────── */}
        {data?.artists && data.artists.length > 0 && (
          <Section label="top artists">
            {data.artists.map((a, i) => (
              <StatRow
                key={a.key}
                rank={i + 1}
                label={a.label}
                count={a.count}
                sub={a.last_event_date ? format(parseISO(a.last_event_date), 'MMM yyyy') : undefined}
                isLast={i === data.artists.length - 1}
              />
            ))}
          </Section>
        )}

        {/* ── Top venues ───────────────────────────────────── */}
        {data?.venues && data.venues.length > 0 && (
          <Section label="top venues">
            {data.venues.map((v, i) => (
              <StatRow
                key={v.key}
                rank={i + 1}
                label={v.label}
                count={v.count}
                sub={v.last_event_date ? format(parseISO(v.last_event_date), 'MMM yyyy') : undefined}
                isLast={i === data.venues.length - 1}
              />
            ))}
          </Section>
        )}

        {/* ── Achievements ─────────────────────────────────── */}
        {data?.achievements && data.achievements.length > 0 && (
          <Section label="achievements">
            <View style={s.achievementsWrap}>
              {data.achievements.map(a => (
                <View key={a.id} style={s.achievementPill}>
                  <Text style={s.achievementText}>{a.label}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ── Archive insights ─────────────────────────────── */}
        {totalCount > 0 && (
          <Section label="archive insights">
            {isPremium ? (
              insightsLoading ? (
                <View style={s.insightsLoading}>
                  <ActivityIndicator color={C.accent} />
                </View>
              ) : insights && (
                <>
                  {insights.longest_gap && (
                    <InsightRow
                      label="longest gap"
                      value={`${insights.longest_gap.days} days`}
                      sub={`${format(parseISO(insights.longest_gap.from_date), 'MMM yyyy')} – ${format(parseISO(insights.longest_gap.to_date), 'MMM yyyy')}`}
                    />
                  )}
                  {insights.artist_streak && (
                    <InsightRow
                      label="longest streak"
                      value={insights.artist_streak.artist_name}
                      sub={`${insights.artist_streak.start_year}–${insights.artist_streak.end_year} · ${insights.artist_streak.length} years running`}
                    />
                  )}
                  {insights.busiest_month && (
                    <InsightRow
                      label="busiest month"
                      value={insights.busiest_month.month}
                      sub={`${insights.busiest_month.count} shows`}
                    />
                  )}
                  {insights.highest_rated_show && (
                    <InsightRow
                      label="highest rated"
                      value={insights.highest_rated_show.title}
                      sub={`${insights.highest_rated_show.rating}/5 · ${format(parseISO(insights.highest_rated_show.event_date), 'MMM yyyy')}`}
                    />
                  )}
                  <InsightRow
                    label="seen around"
                    value={`${insights.cities_count} ${insights.cities_count === 1 ? 'city' : 'cities'}`}
                    sub={`${insights.countries_count} ${insights.countries_count === 1 ? 'country' : 'countries'}`}
                    isLast
                  />
                </>
              )
            ) : (
              <View style={s.insightsLockedWrap}>
                <TouchableOpacity style={s.lockedBtn} onPress={() => setShowInsightsInfo(v => !v)} activeOpacity={0.8}>
                  <Ionicons name="lock-closed-outline" size={16} color={C.muted} />
                  <Text style={s.lockedBtnText}>collector</Text>
                </TouchableOpacity>
                {showInsightsInfo && (
                  <View>
                    <Text style={s.lockedInfo}>collector unlocks deep stats — longest gaps, artist streaks, busiest months and more</Text>
                    <TouchableOpacity onPress={() => router.push('/collector' as any)} activeOpacity={0.8}>
                      <Text style={s.lockedLink}>become a collector →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </Section>
        )}

        {isPremium && insights?.years_active && insights.years_active.length > 0 && (
          <TouchableOpacity style={s.recapLink} onPress={() => router.push('/recap' as any)} activeOpacity={0.8}>
            <Text style={s.recapLinkText}>year in review</Text>
            <Ionicons name="chevron-forward" size={14} color={C.accent} />
          </TouchableOpacity>
        )}

        <View style={s.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label.toUpperCase()}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  )
}

function StatRow({
  rank,
  label,
  count,
  sub,
  isLast,
}: {
  rank: number
  label: string
  count: number
  sub?: string
  isLast: boolean
}) {
  return (
    <View style={[s.statRow, !isLast && s.statRowDivider]}>
      <Text style={s.statRowRank}>{rank}</Text>
      <View style={s.statRowInfo}>
        <Text style={s.statRowLabel} numberOfLines={1}>{label}</Text>
        {!!sub && <Text style={s.statRowSub}>{sub}</Text>}
      </View>
      <Text style={s.statRowCount}>{count}</Text>
    </View>
  )
}

function InsightRow({
  label,
  value,
  sub,
  isLast,
}: {
  label: string
  value: string
  sub?: string
  isLast?: boolean
}) {
  return (
    <View style={[s.insightRow, !isLast && s.insightRowDivider]}>
      <Text style={s.insightLabel}>{label}</Text>
      <Text style={s.insightValue} numberOfLines={1}>{value}</Text>
      {!!sub && <Text style={s.insightSub}>{sub}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontFamily: F.display,
    fontSize: 22,
    letterSpacing: -0.44,
    color: C.text,
  },

  // Summary
  summaryBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  summaryMain: {
    gap: 2,
  },
  summaryCount: {
    fontFamily: F.display,
    fontSize: 64,
    color: C.text,
    letterSpacing: -1.28,
    lineHeight: 68,
  },
  summaryLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
  },
  summaryMeta: {
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 8,
  },
  rankPill: {
    backgroundColor: 'rgba(232,197,71,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,197,71,0.3)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rankText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.accent,
    letterSpacing: 0.22,
  },
  lastEventText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.2,
  },

  // Empty
  emptyBlock: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: F.displayItalic,
    fontSize: 18,
    color: C.muted,
  },
  emptySub: {
    fontFamily: F.mono,
    fontSize: 12,
    color: 'rgba(138,135,128,0.6)',
    lineHeight: 18,
  },

  // Sections
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionBody: {
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // Type pills
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  typePill: {
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
    minWidth: 72,
  },
  typePillCount: {
    fontFamily: F.display,
    fontSize: 22,
    letterSpacing: -0.44,
    lineHeight: 24,
  },
  typePillLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 0.36,
  },

  // Stat rows
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statRowRank: {
    fontFamily: F.mono,
    fontSize: 11,
    color: 'rgba(138,135,128,0.5)',
    width: 16,
    textAlign: 'right',
  },
  statRowInfo: {
    flex: 1,
    gap: 2,
  },
  statRowLabel: {
    fontFamily: F.display,
    fontSize: 15,
    color: C.text,
    letterSpacing: -0.2,
  },
  statRowSub: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.2,
  },
  statRowCount: {
    fontFamily: F.display,
    fontSize: 18,
    color: C.text,
    letterSpacing: -0.36,
  },

  // Achievements
  achievementsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  achievementPill: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  achievementText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.text,
    letterSpacing: 0.11,
  },

  bottomPad: {
    height: 20,
  },

  // Archive insights
  insightRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  insightRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  insightLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
  },
  insightValue: {
    fontFamily: F.display,
    fontSize: 16,
    color: C.text,
    letterSpacing: -0.32,
  },
  insightSub: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  insightsLockedWrap: {
    padding: 14,
  },
  insightsLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  lockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    borderStyle: 'dashed',
    height: 48,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  lockedBtnText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 13,
  },
  lockedInfo: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginTop: 10,
  },
  lockedLink: {
    fontFamily: F.monoMedium,
    fontSize: 12,
    color: C.accent,
    marginTop: 6,
  },
  recapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(232,197,71,0.3)',
    backgroundColor: 'rgba(232,197,71,0.06)',
  },
  recapLinkText: {
    fontFamily: F.monoMedium,
    fontSize: 12,
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 12,
  },
})
