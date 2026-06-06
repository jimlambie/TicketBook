import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { C, F } from '@/constants/design'

export default function StatsScreen() {
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.content}>
        <Text style={s.label}>stats</Text>
        <Text style={s.coming}>coming soon</Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.1 * 10,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  coming: { fontFamily: F.displayItalic, fontSize: 20, color: C.muted },
})
