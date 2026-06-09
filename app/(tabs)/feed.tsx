import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMyFeed, useFriendsFeed, useSearchMyEvents } from '@/hooks/useEvents'
import { useFriends } from '@/hooks/useFriends'
import EventCard from '@/components/EventCard'
import SportCard from '@/components/SportCard'
import type { EventFeedRow } from '@/lib/database.types'
import { C, F, eventTypeStyle } from '@/constants/design'

type FeedTab = 'mine' | 'friends'
type TypeFilter = 'all' | 'concert' | 'sport' | 'festival' | 'other'

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'all' },
  { key: 'concert', label: 'concerts' },
  { key: 'sport', label: 'sport' },
  { key: 'festival', label: 'festivals' },
  { key: 'other', label: 'other' },
]

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<FeedTab>('mine')
  const [searchActive, setSearchActive] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const inputRef = useRef<TextInput>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useFocusEffect(useCallback(() => {
    setActiveTab('mine')
  }, []))

  const myFeed = useMyFeed()
  const friendsFeed = useFriendsFeed()
  const searchResults = useSearchMyEvents(searchQuery, typeFilter)
  const { data: friends = [] } = useFriends()

  const friendProfileMap = useMemo(() => {
    const m = new Map<string, { username: string; display_name: string | null }>()
    for (const f of friends) {
      m.set(f.id, { username: f.username, display_name: f.display_name })
    }
    return m
  }, [friends])

  const isSearchMode = searchActive && activeTab === 'mine'
  const showSearchResults = isSearchMode && (searchQuery.trim().length > 0 || typeFilter !== 'all')

  const active = activeTab === 'mine' ? myFeed : friendsFeed
  const feedEvents: EventFeedRow[] = active.data?.pages.flatMap(page => page) ?? []
  const displayEvents: EventFeedRow[] = showSearchResults
    ? (searchResults.data ?? [])
    : feedEvents

  const isRefreshing = !showSearchResults && active.isRefetching && !active.isFetchingNextPage

  // Debounce search input → query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  function openSearch() {
    setSearchActive(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function closeSearch() {
    setSearchActive(false)
    setSearchInput('')
    setSearchQuery('')
    setTypeFilter('all')
  }

  const handleRefresh = useCallback(() => {
    active.refetch()
  }, [active])

  const handleLoadMore = useCallback(() => {
    if (!showSearchResults && active.hasNextPage && !active.isFetchingNextPage) {
      active.fetchNextPage()
    }
  }, [active, showSearchResults])

  const renderItem = useCallback(({ item }: { item: EventFeedRow }) => {
    const onPress = () => router.push(`/event/${item.id}`)
    const owner = activeTab === 'friends' ? friendProfileMap.get(item.user_id) : undefined
    return (
      <View style={s.item}>
        {item.type === 'sport'
          ? <SportCard event={item} onPress={onPress} owner={owner} />
          : <EventCard event={item} onPress={onPress} owner={owner} />
        }
      </View>
    )
  }, [activeTab, friendProfileMap])

  if (!searchActive && active.isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.accent} />
      </View>
    )
  }

  if (!searchActive && active.isError) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>couldn't load feed</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => active.refetch()} activeOpacity={0.7}>
          <Text style={s.retryBtnText}>try again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      {searchActive ? (
        <View style={s.searchHeader}>
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="artist, venue, city…"
            placeholderTextColor={C.muted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          <TouchableOpacity onPress={closeSearch} activeOpacity={0.7} hitSlop={8}>
            <Text style={s.cancelText}>cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.header}>
          <Text style={s.wordmark}>TicketBook</Text>
          <TouchableOpacity onPress={openSearch} activeOpacity={0.7} hitSlop={8}>
            <Ionicons name="search-outline" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Segment tabs */}
      <View style={s.segmentRow}>
        {(['mine', 'friends'] as FeedTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={s.segmentTab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[s.segmentText, activeTab === tab && s.segmentTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={s.segmentIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.segmentDivider} />

      {/* Type filter — mine tab + search active */}
      {isSearchMode && (
        <View style={s.filterRow}>
          {TYPE_FILTERS.map(f => {
            const isActive = typeFilter === f.key
            const ts = f.key !== 'all' ? eventTypeStyle[f.key as keyof typeof eventTypeStyle] : null
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  s.filterChip,
                  isActive && ts && { backgroundColor: ts.bg, borderColor: ts.border },
                  isActive && !ts && s.filterChipActive,
                ]}
                onPress={() => setTypeFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[
                  s.filterChipText,
                  isActive && ts && { color: ts.text },
                  isActive && !ts && s.filterChipTextActive,
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Loading state for search */}
      {showSearchResults && searchResults.isLoading && (
        <View style={s.searchLoading}>
          <ActivityIndicator color={C.accent} size="small" />
        </View>
      )}

      <FlashList
        data={displayEvents}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={s.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          !showSearchResults ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          ) : undefined
        }
        ListEmptyComponent={
          !showSearchResults || !searchResults.isLoading
            ? <EmptyState
                tab={activeTab}
                isSearch={showSearchResults}
                query={searchQuery}
              />
            : null
        }
        ListFooterComponent={
          !showSearchResults && active.isFetchingNextPage
            ? <ActivityIndicator color={C.accent} style={s.footerLoader} />
            : null
        }
      />
    </SafeAreaView>
  )
}

function EmptyState({
  tab,
  isSearch,
  query,
}: {
  tab: FeedTab
  isSearch: boolean
  query: string
}) {
  if (isSearch) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyTitle}>no results</Text>
        <Text style={s.emptySubtitle}>
          nothing matched{query.trim() ? ` "${query.trim()}"` : ' those filters'}
        </Text>
      </View>
    )
  }
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>
        {tab === 'mine' ? 'no stubs yet' : 'nothing here yet'}
      </Text>
      <Text style={s.emptySubtitle}>
        {tab === 'mine'
          ? 'tap + to log your first event'
          : "your friends haven't added any events"}
      </Text>
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
  errorText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: C.radius,
    borderWidth: 0.5,
    borderColor: C.border2,
  },
  retryBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },
  wordmark: {
    fontFamily: F.display,
    fontSize: 16,
    letterSpacing: -0.32,
    color: C.text,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border2,
    paddingHorizontal: 12,
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  cancelText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.accent,
  },
  // Segments
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
  },
  segmentTab: {
    paddingBottom: 10,
    position: 'relative',
  },
  segmentText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.04 * 12,
  },
  segmentTextActive: {
    color: C.text,
  },
  segmentIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: C.accent,
    borderRadius: 1,
  },
  segmentDivider: {
    height: 0.5,
    backgroundColor: C.border,
    marginBottom: 8,
  },
  // Type filter
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  filterChip: {
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterChipActive: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  filterChipText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
    color: C.text,
  },
  // Search loading
  searchLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  // List
  listContent: {
    padding: 12,
  },
  item: {
    marginBottom: 10,
  },
  footerLoader: {
    padding: 16,
  },
  empty: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: F.displayItalic,
    fontSize: 20,
    color: C.muted,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
})
