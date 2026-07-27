import { create } from 'zustand'
import Purchases, {
  CustomerInfo,
  PurchasesError,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases'
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui'
import { configurePurchases, PRO_ENTITLEMENT_ID } from '@/lib/revenuecat'

interface PurchasesState {
  customerInfo: CustomerInfo | null
  offering: PurchasesOffering | null
  isPro: boolean
  isLoading: boolean
  isInitialized: boolean

  initialize: () => Promise<void>
  identify: (userId: string) => Promise<void>
  reset: () => Promise<void>
  fetchOfferings: () => Promise<void>
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>
  restorePurchases: () => Promise<void>
  presentPaywallIfNeeded: () => Promise<boolean>
  presentPaywall: () => Promise<boolean>
  presentCustomerCenter: () => Promise<void>
}

function deriveIsPro(customerInfo: CustomerInfo | null): boolean {
  return !!customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]
}

// Held outside the store so identify()/reset() can await the in-flight
// initialize() call instead of racing it — authStore.initialize() and
// purchasesStore.initialize() both fire from the same effect in
// app/_layout.tsx, so identify() can otherwise run before configure() lands.
let initPromise: Promise<void> | null = null

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
  customerInfo: null,
  offering: null,
  isPro: false,
  isLoading: true,
  isInitialized: false,

  initialize: () => {
    if (initPromise) {
      return initPromise
    }

    initPromise = (async () => {
      try {
        configurePurchases()

        Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          set({ customerInfo, isPro: deriveIsPro(customerInfo) })
        })

        const customerInfo = await Purchases.getCustomerInfo()
        set({
          customerInfo,
          isPro: deriveIsPro(customerInfo),
          isLoading: false,
          isInitialized: true,
        })

        await get().fetchOfferings()
      } catch (error) {
        console.error('RevenueCat initialization error:', error)
        set({ isLoading: false, isInitialized: true })
      }
    })()

    return initPromise
  },

  identify: async (userId: string) => {
    if (initPromise) {
      await initPromise
    }

    try {
      const { customerInfo } = await Purchases.logIn(userId)
      set({ customerInfo, isPro: deriveIsPro(customerInfo) })
    } catch (error) {
      console.error('RevenueCat logIn error:', error)
    }
  },

  reset: async () => {
    if (initPromise) {
      await initPromise
    }

    try {
      const customerInfo = await Purchases.logOut()
      set({ customerInfo, isPro: deriveIsPro(customerInfo) })
    } catch (error) {
      console.error('RevenueCat logOut error:', error)
    }
  },

  fetchOfferings: async () => {
    try {
      const offerings = await Purchases.getOfferings()
      set({ offering: offerings.current })
    } catch (error) {
      console.error('Failed to fetch RevenueCat offerings:', error)
    }
  },

  purchasePackage: async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg)
      set({ customerInfo, isPro: deriveIsPro(customerInfo) })
    } catch (error) {
      const purchasesError = error as PurchasesError
      if (purchasesError.userCancelled) {
        return
      }
      console.error('RevenueCat purchase error:', purchasesError)
      throw purchasesError
    }
  },

  restorePurchases: async () => {
    try {
      const customerInfo = await Purchases.restorePurchases()
      set({ customerInfo, isPro: deriveIsPro(customerInfo) })
    } catch (error) {
      console.error('RevenueCat restore error:', error)
      throw error
    }
  },

  presentPaywallIfNeeded: async () => {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
    })

    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      const customerInfo = await Purchases.getCustomerInfo()
      set({ customerInfo, isPro: deriveIsPro(customerInfo) })
      return true
    }
    return false
  },

  presentPaywall: async () => {
    const result = await RevenueCatUI.presentPaywall()

    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      const customerInfo = await Purchases.getCustomerInfo()
      set({ customerInfo, isPro: deriveIsPro(customerInfo) })
      return true
    }
    return false
  },

  presentCustomerCenter: async () => {
    await RevenueCatUI.presentCustomerCenter()
    const customerInfo = await Purchases.getCustomerInfo()
    set({ customerInfo, isPro: deriveIsPro(customerInfo) })
  },
}))
