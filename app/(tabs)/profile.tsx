import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { C, F } from '@/constants/design'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useFriends, useRemoveFriend } from '@/hooks/useFriends'
import UserCard from '@/components/UserCard'

function useMyLeaderboardEntry(userId: string) {
  return useQuery({
    queryKey: ['leaderboard', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('leaderboard_total')
        .select('total_events, rank')
        .eq('user_id', userId)
        .maybeSingle()
      return data
    },
    enabled: !!userId,
  })
}

export default function ProfileScreen() {
  const { profile, signOut, updateProfile } = useAuthStore()
  const [editOpen, setEditOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: friends = [] } = useFriends()
  const { data: stats } = useMyLeaderboardEntry(profile?.id ?? '')
  const removeFriend = useRemoveFriend()

  if (!profile) {
    return null
  }

  const initials = profile.username.slice(0, 2).toUpperCase()

  function openEdit() {
    setDisplayName(profile?.display_name ?? '')
    setBio(profile?.bio ?? '')
    setEditOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      setEditOpen(false)
    } catch {
      Alert.alert('Error', 'Could not update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ])
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>profile</Text>
        <TouchableOpacity onPress={openEdit} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="pencil-outline" size={20} color={C.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + info */}
        <View style={s.profileBlock}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.profileInfo}>
            {!!profile.display_name && (
              <Text style={s.displayName}>{profile.display_name}</Text>
            )}
            <Text style={s.username}>@{profile.username}</Text>
            {!!profile.bio && (
              <Text style={s.bio} numberOfLines={3}>{profile.bio}</Text>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statPrimary}>
            <Text style={s.statPrimaryValue}>{stats?.total_events ?? 0}</Text>
            <Text style={s.statPrimaryLabel}>stubs</Text>
          </View>
          <View style={s.statSecondary}>
            <View style={s.statSecondaryLine}>
              <Text style={s.statSecondaryValue}>{friends.length}</Text>
              <Text style={s.statSecondaryLabel}> friends</Text>
            </View>
            {stats?.rank != null && (
              <View style={s.statSecondaryLine}>
                <Text style={s.statSecondaryValue}>#{stats.rank}</Text>
                <Text style={s.statSecondaryLabel}> rank</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.separator} />

        {/* Friends list */}
        {friends.length > 0 && (
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>Friends</Text>
            <View style={s.section}>
              {friends.map((friend, i) => (
                <View key={friend.id}>
                  {i > 0 && <View style={s.divider} />}
                  <UserCard
                    user={friend}
                    onRemove={() =>
                      friend.friendshipId && removeFriend.mutate(friend.friendshipId)
                    }
                    isLoading={
                      removeFriend.isPending && removeFriend.variables === friend.friendshipId
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {friends.length === 0 && (
          <TouchableOpacity
            style={s.addFriendsHint}
            onPress={() => router.push('/(tabs)/explore' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color={C.muted} />
            <View style={s.hintText}>
              <Text style={s.hintTitle}>Find friends</Text>
              <Text style={s.hintSub}>Search by username or share your QR code</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={C.muted} />
          </TouchableOpacity>
        )}

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={s.signOutText}>sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit profile bottom sheet */}
      <Modal visible={editOpen} transparent animationType="slide">
        <View style={s.overlay}>
          <TouchableOpacity style={s.overlayDismiss} onPress={() => setEditOpen(false)} />
          <SafeAreaView style={s.sheet} edges={['bottom']}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Edit profile</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={s.fieldInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={C.muted}
              autoCorrect={false}
            />

            <Text style={s.fieldLabel}>BIO</Text>
            <TextInput
              style={[s.fieldInput, s.fieldInputMulti]}
              value={bio}
              onChangeText={setBio}
              placeholder="A few words about you"
              placeholderTextColor={C.muted}
              multiline
            />

            <TouchableOpacity
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <Text style={s.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontFamily: F.display,
    fontSize: 22,
    letterSpacing: -0.44,
    color: C.text,
  },
  // Profile block
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: F.mono,
    fontSize: 20,
    color: C.bg,
    letterSpacing: 1,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
    paddingTop: 4,
  },
  displayName: {
    fontFamily: F.display,
    fontSize: 20,
    color: C.text,
    letterSpacing: -0.3,
  },
  username: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },
  bio: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
    lineHeight: 18,
    marginTop: 4,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 20,
  },
  statPrimary: {
    gap: 2,
  },
  statPrimaryValue: {
    fontFamily: F.display,
    fontSize: 40,
    letterSpacing: -0.8,
    color: C.text,
    lineHeight: 44,
  },
  statPrimaryLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
  },
  statSecondary: {
    flex: 1,
    gap: 5,
    paddingBottom: 6,
  },
  statSecondaryLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statSecondaryValue: {
    fontFamily: F.display,
    fontSize: 18,
    letterSpacing: -0.36,
    color: C.text,
  },
  statSecondaryLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    paddingLeft: 4,
  },
  separator: {
    height: 0.5,
    backgroundColor: C.border2,
    marginBottom: 16,
  },
  // Friends
  sectionBlock: {
    marginBottom: 16,
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
  // Hint
  addFriendsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border2,
  },
  hintText: {
    flex: 1,
    gap: 2,
  },
  hintTitle: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.text,
  },
  hintSub: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  // Sign out
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 40,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border2,
  },
  signOutText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },
  // Edit modal
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayDismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border2,
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.text,
  },
  fieldLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 14,
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
    marginBottom: 16,
  },
  fieldInputMulti: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
})
