import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { router } from 'expo-router'
import { useMyFeed, useFriendsFeed } from '@/hooks/useEvents'
import EventCard from '@/components/EventCard'
import SportCard from '@/components/SportCard'
import type { EventFeedRow } from '@/lib/database.types'
import { C, F } from '@/constants/design'

type FeedTab = 'mine' | 'friends'

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<FeedTab>('mine')

  const myFeed = useMyFeed()
  const friendsFeed = useFriendsFeed()

  const active = activeTab === 'mine' ? myFeed : friendsFeed
  const events: EventFeedRow[] = active.data?.pages.flatMap(page => page) ?? []
  const isRefreshing = active.isRefetching && !active.isFetchingNextPage

  const handleRefresh = useCallback(() => {
    active.refetch()
  }, [active])

  const handleLoadMore = useCallback(() => {
    if (active.hasNextPage && !active.isFetchingNextPage) {
      active.fetchNextPage()
    }
  }, [active])

  const renderItem = useCallback(({ item }: { item: EventFeedRow }) => {
    const onPress = () => router.push(`/event/${item.id}`)
    return (
      <View style={s.item}>
        {item.type === 'sport'
          ? <SportCard event={item} onPress={onPress} />
          : <EventCard event={item} onPress={onPress} />
        }
      </View>
    )
  }, [])

  if (active.isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.accent} />
      </View>
    )
  }

  if (active.isError) {
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
      <View style={s.header}>
        <Text style={s.wordmark}>TicketBook</Text>
      </View>
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

      <FlashList
        data={events}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={s.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        ListEmptyComponent={<EmptyState tab={activeTab} />}
        ListFooterComponent={
          active.isFetchingNextPage
            ? <ActivityIndicator color={C.accent} style={s.footerLoader} />
            : null
        }
      />
    </SafeAreaView>
  )
}

function EmptyState({ tab }: { tab: FeedTab }) {
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
  header: {
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
    marginBottom: 12,
  },
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
