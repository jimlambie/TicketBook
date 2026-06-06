import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F, eventTypeStyle } from '@/constants/design'
import type { EventType } from '@/lib/database.types'

const TYPE_ICONS: Record<EventType, keyof typeof Ionicons.glyphMap> = {
  concert: 'musical-notes-outline',
  sport: 'football-outline',
  festival: 'sparkles-outline',
  other: 'pricetag-outline',
}

interface StepTypeProps {
  onSelect: (type: EventType) => void
  onClose: () => void
  hasDraft: boolean
  onResumeDraft: () => void
  onDiscardDraft: () => void
}

export default function StepType({ onSelect, onClose, hasDraft, onResumeDraft, onDiscardDraft }: StepTypeProps) {
  return (
    <View style={s.root}>
      <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
        <Ionicons name="close" size={22} color={C.muted} />
      </TouchableOpacity>

      {hasDraft && (
        <View style={s.draftBanner}>
          <Text style={s.draftText}>you have an unfinished stub</Text>
          <View style={s.draftActions}>
            <TouchableOpacity style={s.draftBtn} onPress={onResumeDraft} activeOpacity={0.8}>
              <Text style={s.draftBtnPrimary}>continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.draftBtn} onPress={onDiscardDraft} activeOpacity={0.8}>
              <Text style={s.draftBtnSecondary}>start fresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={s.headingArea}>
        <Text style={s.headingItalic}>what are you logging?</Text>
        <Text style={s.headingBold}>new stub</Text>
      </View>

      <View style={s.typeGrid}>
        {(Object.keys(TYPE_ICONS) as EventType[]).map(t => {
          const ts = eventTypeStyle[t]
          return (
            <TouchableOpacity
              key={t}
              style={[s.typeTile, { backgroundColor: ts.heroBg, borderColor: ts.border }]}
              onPress={() => onSelect(t)}
              activeOpacity={0.8}
            >
              <Ionicons name={TYPE_ICONS[t]} size={30} color={ts.text} />
              <Text style={[s.typeTileLabel, { color: ts.text }]}>{ts.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export { TYPE_ICONS }

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 4,
    marginTop: 4,
  },
  draftBanner: {
    backgroundColor: 'rgba(232,197,71,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,197,71,0.3)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  draftText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    marginBottom: 10,
  },
  draftActions: {
    flexDirection: 'row',
    gap: 10,
  },
  draftBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnPrimary: {
    fontFamily: F.monoMedium,
    fontSize: 12,
    color: C.accent,
  },
  draftBtnSecondary: {
    fontFamily: F.monoMedium,
    fontSize: 12,
    color: C.muted,
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  typeTile: {
    width: '47%',
    aspectRatio: 1.15,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  typeTileLabel: {
    fontFamily: F.monoMedium,
    fontSize: 13,
  },
})
