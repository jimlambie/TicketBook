import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFriends } from '@/hooks/useFriends'
import { C, F } from '@/constants/design'
import type { Visibility } from '@/lib/database.types'

const VIS_ICONS: Record<Visibility, keyof typeof Ionicons.glyphMap> = {
  public: 'earth-outline',
  friends: 'people-outline',
  private: 'lock-closed-outline',
}

interface StepPublishProps {
  visibility: Visibility
  onChangeVisibility: (v: Visibility) => void
  taggedFriendIds: string[]
  onChangeTaggedFriendIds: (ids: string[]) => void
  onPublish: () => void
  onBack: () => void
  isPublishing: boolean
  publishError: string | null
}

export default function StepPublish({
  visibility, onChangeVisibility,
  taggedFriendIds, onChangeTaggedFriendIds,
  onPublish, onBack, isPublishing, publishError,
}: StepPublishProps) {
  const { data: friends = [] } = useFriends()

  function toggleFriend(id: string) {
    if (taggedFriendIds.includes(id)) {
      onChangeTaggedFriendIds(taggedFriendIds.filter(f => f !== id))
    } else {
      onChangeTaggedFriendIds([...taggedFriendIds, id])
    }
  }

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={C.muted} />
      </TouchableOpacity>

      <View style={s.headingArea}>
        <Text style={s.headingItalic}>one last thing</Text>
        <Text style={s.headingBold}>publish</Text>
      </View>

      {/* Visibility */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>who can see this?</Text>
        <View style={s.visRow}>
          {(['public', 'friends', 'private'] as Visibility[]).map(v => (
            <TouchableOpacity
              key={v}
              style={[s.visOption, visibility === v && s.visOptionActive]}
              onPress={() => onChangeVisibility(v)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={VIS_ICONS[v]}
                size={14}
                color={visibility === v ? C.accent : C.muted}
              />
              <Text style={[s.visLabel, visibility === v && s.visLabelActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tag friends */}
      {friends.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>who was there?</Text>
          <View style={s.tagList}>
            {friends.map(friend => {
              const selected = taggedFriendIds.includes(friend.id)
              return (
                <TouchableOpacity
                  key={friend.id}
                  style={[s.tagChip, selected && s.tagChipSelected]}
                  onPress={() => toggleFriend(friend.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={selected ? C.accent : C.muted}
                  />
                  <Text style={[s.tagChipText, selected && s.tagChipTextSelected]}>
                    @{friend.username}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {publishError && (
        <Text style={s.error}>{publishError}</Text>
      )}

      <TouchableOpacity
        style={[s.publishBtn, isPublishing && s.publishBtnDisabled]}
        onPress={onPublish}
        disabled={isPublishing}
        activeOpacity={0.85}
      >
        {isPublishing
          ? <ActivityIndicator color={C.bg} />
          : <Text style={s.publishBtnText}>publish stub</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginTop: 4,
  },
  headingArea: {
    marginTop: 20,
    marginBottom: 28,
  },
  headingItalic: {
    fontFamily: F.displayItalic,
    fontSize: 18,
    color: C.accent,
    marginBottom: 4,
  },
  headingBold: {
    fontFamily: F.display,
    fontSize: 28,
    letterSpacing: -0.56,
    color: C.text,
    lineHeight: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  visRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border2,
    backgroundColor: C.surface,
  },
  visOptionActive: {
    borderColor: C.accent,
    backgroundColor: 'rgba(232,197,71,0.08)',
  },
  visLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  visLabelActive: {
    color: C.accent,
  },
  tagList: {
    gap: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border2,
    backgroundColor: C.surface,
  },
  tagChipSelected: {
    borderColor: 'rgba(232,197,71,0.4)',
    backgroundColor: 'rgba(232,197,71,0.08)',
  },
  tagChipText: {
    fontFamily: F.mono,
    fontSize: 14,
    color: C.muted,
  },
  tagChipTextSelected: {
    color: C.accent,
  },
  error: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.red,
    textAlign: 'center',
    marginBottom: 12,
  },
  publishBtn: {
    height: 50,
    backgroundColor: C.accent,
    borderRadius: C.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnDisabled: {
    backgroundColor: C.surface2,
  },
  publishBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
})
