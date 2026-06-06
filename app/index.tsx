import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const { session, isLoading, isOnboarded } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0e0c' }}>
        <ActivityIndicator color="#e8c547" />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/auth/onboarding" />
  }

  if (!isOnboarded) {
    // return <Redirect href="/auth/username" />
  }

  return <Redirect href="/(tabs)/feed" />
}
