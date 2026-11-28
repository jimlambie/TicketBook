import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')

// Native sign-in flows. Each returns the provider's ID token for
// supabase.auth.signInWithIdToken, or null if the user cancelled.

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

let googleModule: GoogleSigninModule | null = null
let googleConfigured = false

// The native module is loaded on first use rather than at import time.
// Binaries built without it (Expo Go, or dev builds that predate Google
// sign-in) throw when it loads, which would otherwise crash the whole
// app through authStore's import chain.
function loadGoogleSignin(): GoogleSigninModule {
  if (googleModule) {
    return googleModule
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    googleModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule
  } catch {
    throw new Error('Google sign-in isn’t available in this build')
  }
  return googleModule
}

function ensureGoogleConfigured(): GoogleSigninModule {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google sign-in is not configured')
  }
  const google = loadGoogleSignin()
  if (!googleConfigured) {
    // webClientId is what Supabase validates the ID token's audience against.
    google.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    })
    googleConfigured = true
  }
  return google
}

export async function getGoogleIdToken(): Promise<string | null> {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
    ensureGoogleConfigured()
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

  try {
    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) {
      return null
    }
    if (!response.data.idToken) {
      throw new Error('Google did not return an ID token')
    }
    return response.data.idToken
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) {
      return null
    }
    throw e
  }
}

// Revoke the app's Google access when an account is deleted. Best effort:
// the account is deleted server-side regardless.
export async function revokeGoogleAccess() {
  try {
    const { GoogleSignin } = ensureGoogleConfigured()
    await GoogleSignin.revokeAccess()
  } catch {
    // Module missing, not configured, or not signed in with Google.
  }
}

export async function signOutGoogle() {
  if (!googleConfigured || !googleModule) {
    return
  }
  try {
    await googleModule.GoogleSignin.signOut()
  } catch {
    // Not signed in with Google; nothing to do.
  }
}

export interface AppleCredential {
  idToken: string
  // Raw nonce: Apple receives its SHA-256 hash, Supabase verifies against this.
  nonce: string
  // Apple only shares the user's name on their first sign-in.
  fullName: string | null
}

export async function getAppleCredential(): Promise<AppleCredential | null> {
  const nonce = Crypto.randomUUID()
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce
  )

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })
    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token')
    }
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
    return { idToken: credential.identityToken, nonce, fullName: fullName || null }
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') {
      return null
    }
    throw e
  }
}

// A fresh authorization code, which the delete-account function exchanges
// for a refresh token and revokes (required by Apple on account deletion).
// Returns null if the user cancels.
export async function getAppleAuthorizationCode(): Promise<string | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] })
    return credential.authorizationCode ?? null
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') {
      return null
    }
    throw e
  }
}
