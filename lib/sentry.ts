import * as Sentry from '@sentry/react-native'

// Imported first thing in app/_layout.tsx so Sentry's global handlers are
// registered before any other module (e.g. native modules that throw at
// import time) gets evaluated.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'production',
  tracesSampleRate: 0.2,
})

export { Sentry }
