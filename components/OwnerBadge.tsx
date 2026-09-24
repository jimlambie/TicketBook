import { View, Text, Image, StyleSheet } from 'react-native'
import { avatarColor } from '@/components/UserCard'
import { C, F } from '@/constants/design'

export interface CardOwner {
  username: string
  display_name: string | null
  avatar_url?: string | null
}

// Pill shown next to the event type badge on friends' stubs.
export default function OwnerBadge({ owner }: { owner: CardOwner }) {
  return (
    <View style={s.pill}>
      <View style={[s.avatar, { backgroundColor: avatarColor(owner.username) }]}>
        {owner.avatar_url ? (
          <Image source={{ uri: owner.avatar_url }} style={s.avatarImage} resizeMode="cover" />
        ) : (
          <Text style={s.avatarText}>{owner.username.slice(0, 1).toUpperCase()}</Text>
        )}
      </View>
      <Text style={s.username} numberOfLines={1}>@{owner.username}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 4,
    paddingLeft: 3,
    paddingRight: 8,
    paddingVertical: 2,
  },
  avatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 14,
    height: 14,
  },
  avatarText: {
    fontFamily: F.monoMedium,
    fontSize: 8,
    color: C.text,
  },
  username: {
    flexShrink: 1,
    fontFamily: F.mono,
    fontSize: 10,
    color: C.text,
  },
})
