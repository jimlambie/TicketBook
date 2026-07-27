import { Platform } from 'react-native'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'

// Identifier of the entitlement configured in the RevenueCat dashboard for
// "TicketBook.io Pro". Update this if the dashboard identifier differs from
// the entitlement's display name.
export const PRO_ENTITLEMENT_ID = 'pro'

// Identifier of the one-time, non-expiring product configured in the
// RevenueCat dashboard (attached to PRO_ENTITLEMENT_ID as a lifetime grant).
export const LIFETIME_PRODUCT_ID = 'lifetime'

let configured = false

export function configurePurchases() {
  if (configured) {
    return
  }

  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
  })

  if (!apiKey) {
    throw new Error(
      `Missing RevenueCat API key for platform "${Platform.OS}". Set ` +
        `EXPO_PUBLIC_REVENUECAT_API_KEY_${Platform.OS.toUpperCase()} in your environment.`
    )
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  }

  Purchases.configure({ apiKey })
  configured = true
}

export function isPurchasesConfigured() {
  return configured
}
