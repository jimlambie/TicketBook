import { ExpoConfig, ConfigContext } from 'expo/config'

const IS_DEV = process.env.EXPO_PUBLIC_ENV === 'development'
const IS_STAGING = process.env.EXPO_PUBLIC_ENV === 'staging'

const getUniqueIdentifier = () => {
  if (IS_DEV) return 'com.bricksandgiggles.ticketbook.dev'
  if (IS_STAGING) return 'com.bricksandgiggles.ticketbook.staging'
  return 'com.bricksandgiggles.ticketbook'
}

const getAppName = () => {
  if (IS_DEV) return 'TicketBook (Dev)'
  if (IS_STAGING) return 'TicketBook (Staging)'
  return 'TicketBook'
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'ticketbook',
  version: '1.0.0',
  owner: 'jimlambie',
  orientation: 'portrait',
  scheme: 'ticketbook',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0f0e0c'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: getUniqueIdentifier(),
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription:
        'Used to scan and upload ticket photos and event images.',
      NSPhotoLibraryUsageDescription:
        'Used to upload photos and tickets from your library.',
      NSContactsUsageDescription: 'Used to find friends already on TicketBook.'
    }
  },
  android: {
    package: getUniqueIdentifier(),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f0e0c'
    },
    permissions: [
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'READ_MEDIA_VIDEO',
      'READ_CONTACTS',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE'
    ]
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Used to upload photos and tickets from your library.',
        cameraPermission: 'Used to scan and upload ticket photos.'
      }
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Used to scan QR codes to add friends.'
      }
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#e8c547'
      }
    ],
    'expo-font',
    'expo-localization',
    '@sentry/react-native/expo'
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    eas: {
      projectId: 'a935452d-42f0-4cd1-80c5-94efdc0ee4b6'
    },
    router: {
      origin: false
    }
  },
  updates: {
    url: 'https://u.expo.dev/a935452d-42f0-4cd1-80c5-94efdc0ee4b6',
    fallbackToCacheTimeout: 0
  },
  runtimeVersion: {
    policy: 'appVersion'
  }
})
