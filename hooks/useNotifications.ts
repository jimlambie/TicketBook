import { useEffect } from 'react'
import { Platform } from 'react-native'
import type * as NotificationsModule from 'expo-notifications'
import Constants, { AppOwnership } from 'expo-constants'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// expo-notifications throws at import time on Android when running inside
// Expo Go (removed from Expo Go in SDK 53+), which crashes the whole module
// graph and hangs the app on the splash screen. Load it dynamically and only
// outside Expo Go so the static import never runs there.
const isExpoGo = Constants.appOwnership === AppOwnership.Expo

async function registerForPushNotificationsAsync(
  Notifications: typeof NotificationsModule,
): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  type Perms = { granted: boolean }
  const existing = (await Notifications.getPermissionsAsync()) as unknown as Perms
  let finalGranted = existing.granted

  if (!finalGranted) {
    const requested = (await Notifications.requestPermissionsAsync()) as unknown as Perms
    finalGranted = requested.granted
  }

  if (!finalGranted) {
    return null
  }

  const projectId: string | undefined =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    Constants.easConfig?.projectId

  if (!projectId) {
    console.warn('[notifications] No Expo project ID — push notifications disabled')
    return null
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    return token
  } catch (err) {
    console.warn('[notifications] Failed to get push token:', err)
    return null
  }
}

export function useSetupNotifications() {
  const { supabaseUser } = useAuthStore()

  useEffect(() => {
    if (isExpoGo || !supabaseUser) {
      return
    }

    let cancelled = false
    let sub: { remove: () => void } | undefined

    import('expo-notifications').then(Notifications => {
      if (cancelled) {
        return
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      })

      registerForPushNotificationsAsync(Notifications).then(token => {
        if (!token) {
          return
        }
        supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', supabaseUser.id)
          .then(({ error }) => {
            if (error) {
              console.warn('[notifications] Failed to save push token:', error.message)
            }
          })
      })

      sub = Notifications.addNotificationReceivedListener(notification => {
        console.log('[notifications] received:', notification.request.content.title)
      })
    })

    return () => {
      cancelled = true
      sub?.remove()
    }
  }, [supabaseUser?.id])
}
