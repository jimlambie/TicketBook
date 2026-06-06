import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { C, F } from '@/constants/design'
import type { FriendshipRelation } from '@/hooks/useFriends'

export interface UserCardUser {
  id: string
  username: string
  display_name: string | null
  friendshipId?: string
  friendshipRelation: FriendshipRelation
}

const AVATAR_COLORS = ['#5a944a', '#4a6cb8', '#b8764a', '#8b4ab8', '#4ab8a0', '#b84a4a']

function avatarColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface UserCardProps {
  user: UserCardUser
  onAdd?: () => void
  onAccept?: () => void
  onDecline?: () => void
  onRemove?: () => void
  isLoading?: boolean
}

export default function UserCard({
  user,
  onAdd,
  onAccept,
  onDecline,
  onRemove,
  isLoading = false,
}: UserCardProps) {
  const initials = user.username.slice(0, 2).toUpperCase()
  const color = avatarColor(user.username)

  return (
    <View style={s.row}>
      <View style={[s.avatar, { backgroundColor: color }]}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>

      <View style={s.info}>
        <Text style={s.username}>@{user.username}</Text>
        {!!user.display_name && (
          <Text style={s.displayName} numberOfLines={1}>{user.display_name}</Text>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={C.accent} />
      ) : (
        <ActionButton
          relation={user.friendshipRelation}
          onAdd={onAdd}
          onAccept={onAccept}
          onDecline={onDecline}
          onRemove={onRemove}
        />
      )}
    </View>
  )
}

function ActionButton({
  relation,
  onAdd,
  onAccept,
  onDecline,
  onRemove,
}: {
  relation: FriendshipRelation
  onAdd?: () => void
  onAccept?: () => void
  onDecline?: () => void
  onRemove?: () => void
}) {
  if (relation === 'none') {
    return (
      <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={onAdd} activeOpacity={0.7}>
        <Text style={[s.btnText, s.btnTextPrimary]}>Add</Text>
      </TouchableOpacity>
    )
  }

  if (relation === 'pending_sent') {
    return (
      <View style={[s.btn, s.btnMuted]}>
        <Text style={[s.btnText, s.btnTextMuted]}>Pending</Text>
      </View>
    )
  }

  if (relation === 'pending_received') {
    return (
      <View style={s.btnGroup}>
        <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={onAccept} activeOpacity={0.7}>
          <Text style={[s.btnText, s.btnTextPrimary]}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnMuted]} onPress={onDecline} activeOpacity={0.7}>
          <Text style={[s.btnText, s.btnTextMuted]}>Decline</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // accepted
  return (
    <TouchableOpacity style={[s.btn, s.btnGreen]} onPress={onRemove} activeOpacity={0.7}>
      <Text style={[s.btnText, s.btnTextGreen]}>Friends</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.text,
  },
  displayName: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  btnPrimary: {
    backgroundColor: 'rgba(232,197,71,0.12)',
    borderColor: 'rgba(232,197,71,0.4)',
  },
  btnMuted: {
    backgroundColor: 'transparent',
    borderColor: C.border2,
  },
  btnGreen: {
    backgroundColor: 'rgba(82,196,122,0.1)',
    borderColor: 'rgba(82,196,122,0.3)',
  },
  btnText: {
    fontFamily: F.mono,
    fontSize: 11,
  },
  btnTextPrimary: {
    color: C.accent,
  },
  btnTextMuted: {
    color: C.muted,
  },
  btnTextGreen: {
    color: C.green,
  },
})
