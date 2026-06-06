import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

async function registerForPushNotificationsAsync(): Promise<string | null> {
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
    if (!supabaseUser) {
      return
    }

    registerForPushNotificationsAsync().then(token => {
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

    const sub = Notifications.addNotificationReceivedListener(notification => {
      console.log('[notifications] received:', notification.request.content.title)
    })

    return () => sub.remove()
  }, [supabaseUser?.id])
}
