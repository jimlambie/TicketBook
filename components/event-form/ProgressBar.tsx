import { View, StyleSheet } from 'react-native'
import { C } from '@/constants/design'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <View style={s.container}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={[s.segment, { backgroundColor: i < currentStep ? C.accent : C.border2 }]}
        />
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
})
