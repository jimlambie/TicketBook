import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin'

// Native sign-in flows. Each returns the provider's ID token for
// supabase.auth.signInWithIdToken, or null if the user cancelled.

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

let googleConfigured = false

function ensureGoogleConfigured() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google sign-in is not configured')
  }
  if (!googleConfigured) {
    // webClientId is what Supabase validates the ID token's audience against.
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    })
    googleConfigured = true
  }
}

export async function getGoogleIdToken(): Promise<string | null> {
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

export async function signOutGoogle() {
  if (!googleConfigured) {
    return
  }
  try {
    await GoogleSignin.signOut()
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
