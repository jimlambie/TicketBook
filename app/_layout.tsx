import { Sentry } from '@/lib/sentry'
import { useEffect, useRef, useState } from 'react'
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

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Fraunces-Regular': require('../assets/fonts/Fraunces-Regular.ttf'),
    'Fraunces-SemiBold': require('../assets/fonts/Fraunces-SemiBold.ttf'),
    'Fraunces-Italic': require('../assets/fonts/Fraunces-Italic.ttf'),
    'DMMono-Regular': require('../assets/fonts/DMMono-Regular.ttf'),
    'DMMono-Medium': require('../assets/fonts/DMMono-Medium.ttf'),
  })
  const [fontTimedOut, setFontTimedOut] = useState(false)
  const ready = fontsLoaded || !!fontError || fontTimedOut

  const { initialize, session, isLoading } = useAuthStore()
  const didInit = useRef(false)

  useEffect(() => {
    initialize()
  }, [])

  // Diagnoses the splash-screen hang reported on physical devices: useFonts
  // never settles there, and a swallowed error/pending promise throws
  // nothing, so neither a JS exception nor an ANR ever reaches Sentry. This
  // forces a report (with the underlying error, if any) and unblocks the UI
  // instead of hanging on the splash screen forever.
  useEffect(() => {
    if (fontsLoaded || fontError) return

    const timer = setTimeout(() => {
      Sentry.captureMessage('Splash hang: useFonts unresolved after 8s', 'warning')
      setFontTimedOut(true)
    }, 8000)

    return () => clearTimeout(timer)
  }, [fontsLoaded, fontError])

  useEffect(() => {
    if (fontError) {
      Sentry.captureException(fontError)
    }
  }, [fontError])

  // Handles sign-out only. Sign-in navigation is handled by the individual
  // auth screens (login.tsx explicit redirect, welcome.tsx session watcher).
  // index.tsx covers the cold-start case.
  useEffect(() => {
    if (isLoading) return
    if (!didInit.current) {
      didInit.current = true
      return
    }
    if (!session) {
      router.replace('/auth/onboarding')
    }
  }, [session?.user?.id, isLoading])

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync()
    }
  }, [ready])

  if (!ready) return null

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

export default Sentry.wrap(RootLayout)
