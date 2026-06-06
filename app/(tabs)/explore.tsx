import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/constants/design'
import {
  useSearchUsers,
  useFriendRequests,
  useSendFriendRequest,
  useRespondToRequest,
  useRemoveFriend,
} from '@/hooks/useFriends'
import UserCard from '@/components/UserCard'
import type { UserCardUser } from '@/components/UserCard'

export default function ExploreScreen() {
  const [query, setQuery] = useState('')

  const { results, isLoading: searching } = useSearchUsers(query)
  const { data: requests = [] } = useFriendRequests()
  const sendRequest = useSendFriendRequest()
  const respondToRequest = useRespondToRequest()
  const removeFriend = useRemoveFriend()

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>explore</Text>
        <TouchableOpacity
          onPress={() => router.push('/friends/scan' as any)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="scan-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Search */}
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color={C.muted} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="find friends by username"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={C.muted} />}
        </View>

        {/* Search results */}
        {results.length > 0 && (
          <View style={s.section}>
            {results.map((user, i) => (
              <View key={user.id}>
                {i > 0 && <View style={s.divider} />}
                <UserCard
                  user={user}
                  onAdd={() => sendRequest.mutate(user.id)}
                  onAccept={() =>
                    user.friendshipId &&
                    respondToRequest.mutate({ id: user.friendshipId, accept: true })
                  }
                  onDecline={() =>
                    user.friendshipId &&
                    respondToRequest.mutate({ id: user.friendshipId, accept: false })
                  }
                  onRemove={() =>
                    user.friendshipId && removeFriend.mutate(user.friendshipId)
                  }
                  isLoading={
                    (sendRequest.isPending && sendRequest.variables === user.id) ||
                    (respondToRequest.isPending &&
                      respondToRequest.variables?.id === user.friendshipId) ||
                    (removeFriend.isPending && removeFriend.variables === user.friendshipId)
                  }
                />
              </View>
            ))}
          </View>
        )}

        {/* Friend requests inbox */}
        {requests.length > 0 && (
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>Friend requests</Text>
            <View style={s.section}>
              {requests.map((req, i) => {
                const userCard: UserCardUser = {
                  id: req.requester.id,
                  username: req.requester.username,
                  display_name: req.requester.display_name,
                  friendshipId: req.id,
                  friendshipRelation: 'pending_received',
                }
                return (
                  <View key={req.id}>
                    {i > 0 && <View style={s.divider} />}
                    <UserCard
                      user={userCard}
                      onAccept={() =>
                        respondToRequest.mutate({ id: req.id, accept: true })
                      }
                      onDecline={() =>
                        respondToRequest.mutate({ id: req.id, accept: false })
                      }
                      isLoading={
                        respondToRequest.isPending &&
                        respondToRequest.variables?.id === req.id
                      }
                    />
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* QR hint — shown when idle */}
        {query.length === 0 && requests.length === 0 && (
          <TouchableOpacity
            style={s.qrHint}
            onPress={() => router.push('/friends/qr' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={22} color={C.muted} />
            <View style={s.qrHintText}>
              <Text style={s.qrHintTitle}>Add via QR code</Text>
              <Text style={s.qrHintSub}>Show your code or scan a friend's</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={C.muted} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.1 * 10,
    textTransform: 'uppercase',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.surface2,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border2,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
  },
  sectionBlock: {
    marginTop: 16,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 6,
  },
  section: {
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.border2,
  },
  divider: {
    height: 0.5,
    backgroundColor: C.border,
    marginLeft: 68,
  },
  qrHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border2,
  },
  qrHintText: {
    flex: 1,
    gap: 2,
  },
  qrHintTitle: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.text,
  },
  qrHintSub: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
})
