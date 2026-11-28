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
  ScrollView,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMyFeed, useFriendsFeed, useSearchEvents } from '@/hooks/useEvents'
import { useFriends } from '@/hooks/useFriends'
import { useMyPendingTags, type PendingTag } from '@/hooks/useAttendees'
import EventCard from '@/components/EventCard'
import SportCard from '@/components/SportCard'
import type { CardOwner } from '@/components/OwnerBadge'
import { avatarColor } from '@/components/UserCard'
import type { EventFeedRow } from '@/lib/database.types'
import { groupByYear, type FeedItem } from '@/lib/feedGrouping'
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

interface FriendOption extends CardOwner {
  id: string
}

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<FeedTab>('mine')
  const [searchActive, setSearchActive] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Set when opening an event so returning from it keeps the current tab
  // instead of snapping back to "mine".
  const returningFromEventRef = useRef(false)

  useFocusEffect(useCallback(() => {
    if (returningFromEventRef.current) {
      returningFromEventRef.current = false
      return
    }
    setActiveTab('mine')
  }, []))

  const { data: friends = [] } = useFriends()
  const { data: pendingTags = [] } = useMyPendingTags()

  const friendOptions = useMemo<FriendOption[]>(() => {
    return friends
      .map(f => ({ id: f.id, username: f.username, display_name: f.display_name, avatar_url: f.avatar_url }))
      .sort((a, b) => a.username.localeCompare(b.username))
  }, [friends])

  const friendProfileMap = useMemo(() => {
    const m = new Map<string, CardOwner>()
    for (const f of friendOptions) {
      m.set(f.id, f)
    }
    return m
  }, [friendOptions])

  // Drop the selection if that person is no longer a friend.
  const friendId = selectedFriendId && friendProfileMap.has(selectedFriendId)
    ? selectedFriendId
    : null

  const myFeed = useMyFeed()
  const friendsFeed = useFriendsFeed(friendId)
  const searchResults = useSearchEvents({
    scope: activeTab,
    friendId: activeTab === 'friends' ? friendId : null,
    query: searchQuery,
    type: typeFilter,
  })

  const showSearchResults = searchActive && (searchQuery.trim().length > 0 || typeFilter !== 'all')

  const active = activeTab === 'mine' ? myFeed : friendsFeed
  const { items: listItems, stickyIndices } = useMemo(() => {
    const events: EventFeedRow[] = showSearchResults
      ? (searchResults.data ?? [])
      : (active.data?.pages.flatMap(page => page) ?? [])
    return groupByYear(events)
  }, [showSearchResults, searchResults.data, active.data])

  const isRefreshing = !showSearchResults && active.isRefetching && !active.isFetchingNextPage

  // Debounce search input → query
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
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

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.kind === 'year') {
      return (
        <View style={s.yearHeader}>
          <Text style={s.yearText}>{item.year}</Text>
        </View>
      )
    }
    const event = item.event
    const onPress = () => {
      returningFromEventRef.current = true
      router.push(`/event/${event.id}`)
    }
    const owner = activeTab === 'friends' ? friendProfileMap.get(event.user_id) : undefined
    return (
      <View style={s.item}>
        {event.type === 'sport'
          ? <SportCard event={event} onPress={onPress} owner={owner} />
          : <EventCard event={event} onPress={onPress} owner={owner} />
        }
      </View>
    )
  }, [activeTab, friendProfileMap])

  const selectedFriend = friendId ? friendProfileMap.get(friendId) : undefined

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
        <Text style={s.errorText}>couldn&apos;t load feed</Text>
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
          <Text style={s.wordmark}>TicketBook.io</Text>
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

      {/* Friend filter — friends tab */}
      {activeTab === 'friends' && friendOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.friendScroll}
          contentContainerStyle={s.friendRow}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[s.filterChip, s.friendChip, !friendId && s.filterChipActive]}
            onPress={() => setSelectedFriendId(null)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterChipText, !friendId && s.filterChipTextActive]}>everyone</Text>
          </TouchableOpacity>
          {friendOptions.map(f => {
            const isActive = friendId === f.id
            return (
              <TouchableOpacity
                key={f.id}
                style={[s.filterChip, s.friendChip, isActive && s.filterChipActive]}
                onPress={() => setSelectedFriendId(isActive ? null : f.id)}
                activeOpacity={0.7}
              >
                <View style={[s.friendAvatar, { backgroundColor: avatarColor(f.username) }]}>
                  {f.avatar_url ? (
                    <Image source={{ uri: f.avatar_url }} style={s.friendAvatarImage} resizeMode="cover" />
                  ) : (
                    <Text style={s.friendAvatarText}>{f.username.slice(0, 1).toUpperCase()}</Text>
                  )}
                </View>
                <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>
                  @{f.username}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* Type filter — while searching */}
      {searchActive && (
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
        data={listItems}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        getItemType={item => item.kind}
        stickyHeaderIndices={stickyIndices}
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
        ListHeaderComponent={
          activeTab === 'mine' && !showSearchResults && pendingTags.length > 0
            ? <PendingTags
                tags={pendingTags}
                onOpen={eventId => {
                  returningFromEventRef.current = true
                  router.push(`/event/${eventId}`)
                }}
              />
            : null
        }
        ListEmptyComponent={
          !showSearchResults || !searchResults.isLoading
            ? <EmptyState
                tab={activeTab}
                isSearch={showSearchResults}
                query={searchQuery}
                friendUsername={selectedFriend?.username}
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

function PendingTags({
  tags,
  onOpen,
}: {
  tags: PendingTag[]
  onOpen: (eventId: string) => void
}) {
  return (
    <View style={s.pendingBlock}>
      <Text style={s.pendingLabel}>
        {tags.length === 1 ? '1 tag to confirm' : `${tags.length} tags to confirm`}
      </Text>
      {tags.map((t, i) => (
        <TouchableOpacity
          key={t.id}
          style={[s.pendingRow, i > 0 && s.pendingRowDivider]}
          onPress={() => onOpen(t.event_id)}
          activeOpacity={0.7}
        >
          <View style={s.pendingText}>
            <Text style={s.pendingTitle} numberOfLines={1}>{t.event?.title}</Text>
            <Text style={s.pendingMeta} numberOfLines={1}>
              @{t.tagged_by?.username ?? '?'} tagged you
              {t.event?.event_date ? ` · ${t.event.event_date.slice(0, 4)}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.muted} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

function EmptyState({
  tab,
  isSearch,
  query,
  friendUsername,
}: {
  tab: FeedTab
  isSearch: boolean
  query: string
  friendUsername?: string
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
          : friendUsername
            ? `@${friendUsername} hasn't shared any events`
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
  // Friend filter
  friendScroll: {
    flexGrow: 0,
  },
  friendRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarImage: {
    width: 16,
    height: 16,
  },
  friendAvatarText: {
    fontFamily: F.monoMedium,
    fontSize: 8,
    color: C.text,
  },
  // Pending tags
  pendingBlock: {
    backgroundColor: 'rgba(232,197,71,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,197,71,0.25)',
    borderRadius: C.radius,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    marginBottom: 12,
  },
  pendingLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.accent,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  pendingRowDivider: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(232,197,71,0.15)',
  },
  pendingText: {
    flex: 1,
    gap: 2,
  },
  pendingTitle: {
    fontFamily: F.display,
    fontSize: 14,
    color: C.text,
  },
  pendingMeta: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  // Year headers
  yearHeader: {
    backgroundColor: C.bg,
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 2,
  },
  yearText: {
    fontFamily: F.display,
    fontSize: 15,
    letterSpacing: -0.2,
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
