import { useEffect } from 'react'
import { Platform } from 'react-native'
import type * as NotificationsModule from 'expo-notifications'
import Constants, { AppOwnership } from 'expo-constants'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { attendeeKeys } from '@/hooks/useAttendees'

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

// Responses already acted on, so the cold-start response isn't replayed
// when the effect re-runs (e.g. sign out and back in).
const handledResponseIds = new Set<string>()

function eventIdFromResponse(
  response: NotificationsModule.NotificationResponse
): string | null {
  const data = response.notification.request.content.data as
    | { eventId?: unknown }
    | undefined
  return typeof data?.eventId === 'string' ? data.eventId : null
}

export function useSetupNotifications() {
  const { supabaseUser } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isExpoGo || !supabaseUser) {
      return
    }

    let cancelled = false
    const subs: { remove: () => void }[] = []

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

      // Tag notifications carry { eventId }: open that event so the user
      // can confirm or decline.
      const openFromResponse = (response: NotificationsModule.NotificationResponse) => {
        const responseId = response.notification.request.identifier
        if (handledResponseIds.has(responseId)) {
          return
        }
        handledResponseIds.add(responseId)

        const eventId = eventIdFromResponse(response)
        if (!eventId) {
          return
        }
        queryClient.invalidateQueries({ queryKey: attendeeKeys.all })
        router.push(`/event/${eventId}`)
      }

      // Cold start: the app was launched by tapping a notification.
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (cancelled || !response) {
          return
        }
        openFromResponse(response)
        Notifications.clearLastNotificationResponseAsync().catch(() => {})
      })

      // Warm start: tapped while the app was running or backgrounded.
      subs.push(Notifications.addNotificationResponseReceivedListener(openFromResponse))

      subs.push(Notifications.addNotificationReceivedListener(() => {
        // A new tag may have arrived; refresh the pending tags list.
        queryClient.invalidateQueries({ queryKey: attendeeKeys.all })
      }))
    })

    return () => {
      cancelled = true
      subs.forEach(sub => sub.remove())
    }
    // Depends on the user id, not the supabaseUser object, so an unrelated
    // store update with the same user doesn't re-register notifications.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseUser?.id])
}
