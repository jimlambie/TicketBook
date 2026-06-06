import { useEffect, useRef } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useSetupNotifications } from '@/hooks/useNotifications'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

function NotificationsSetup() {
  useSetupNotifications()
  return null
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Fraunces-Regular': require('../assets/fonts/Fraunces-Regular.ttf'),
    'Fraunces-SemiBold': require('../assets/fonts/Fraunces-SemiBold.ttf'),
    'Fraunces-Italic': require('../assets/fonts/Fraunces-Italic.ttf'),
    'DMMono-Regular': require('../assets/fonts/DMMono-Regular.ttf'),
    'DMMono-Medium': require('../assets/fonts/DMMono-Medium.ttf'),
  })

  const { initialize, session, isLoading } = useAuthStore()
  const didInit = useRef(false)

  useEffect(() => {
    initialize()
  }, [])

  // Navigate on session changes after the initial load.
  // index.tsx handles routing on first render; this effect handles
  // subsequent changes: OAuth callback, email sign-in, sign-out.
  useEffect(() => {
    if (isLoading) return
    if (!didInit.current) {
      didInit.current = true
      return
    }
    if (session) {
      router.replace('/(tabs)/feed')
    } else {
      router.replace('/auth/onboarding')
    }
  }, [session?.user?.id, isLoading])

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <NotificationsSetup />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
