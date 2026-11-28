// Supabase Edge Function: delete-account
// Called by the signed-in user from the app. Permanently deletes their
// account:
//   1. Revokes their Sign in with Apple token, if an authorization code
//      is supplied (required by Apple when an app offers Apple sign-in)
//   2. Removes their files from the event-media and avatars buckets
//   3. Deletes the auth user, which cascades to public.users and all of
//      their events, media rows, notes, friendships, tags and stats.
//      Friends' stubs copied from their events are kept
//      (events.source_event_id is set null).
//
// Required secrets for Apple revocation:
//   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8 contents),
//   APPLE_CLIENT_ID (the iOS bundle identifier)

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { importPKCS8, SignJWT } from 'https://esm.sh/jose@5.9.6'

const BUCKETS = ['event-media', 'avatars']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ------------------------------------------------------------
// Apple token revocation
// ------------------------------------------------------------

async function appleClientSecret(): Promise<{ clientId: string; secret: string } | null> {
  const teamId = Deno.env.get('APPLE_TEAM_ID')
  const keyId = Deno.env.get('APPLE_KEY_ID')
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY')
  const clientId = Deno.env.get('APPLE_CLIENT_ID')
  if (!teamId || !keyId || !privateKey || !clientId) {
    return null
  }

  const key = await importPKCS8(privateKey.replace(/\\n/g, '\n'), 'ES256')
  const secret = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .sign(key)

  return { clientId, secret }
}

async function revokeApple(authorizationCode: string): Promise<void> {
  const creds = await appleClientSecret()
  if (!creds) {
    throw new Error('apple_not_configured')
  }

  // Exchange the fresh authorization code for a refresh token...
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.secret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) {
    throw new Error(`apple_token_exchange_failed: ${await tokenRes.text()}`)
  }
  const { refresh_token: refreshToken } = await tokenRes.json()
  if (!refreshToken) {
    throw new Error('apple_no_refresh_token')
  }

  // ...then revoke it, which ends the app's Apple ID authorization.
  const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.secret,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  })
  if (!revokeRes.ok) {
    throw new Error(`apple_revoke_failed: ${await revokeRes.text()}`)
  }
}

// ------------------------------------------------------------
// Storage cleanup
// ------------------------------------------------------------

// storage.list isn't recursive: walk folders under the user's prefix.
async function listAllPaths(
  admin: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = []
  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset })
    if (error) {
      throw error
    }
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`
      // Folders have no id.
      if (item.id === null) {
        paths.push(...(await listAllPaths(admin, bucket, path)))
      } else {
        paths.push(path)
      }
    }
    if (!data || data.length < pageSize) {
      break
    }
    offset += pageSize
  }

  return paths
}

async function deleteUserFiles(admin: SupabaseClient, userId: string): Promise<void> {
  for (const bucket of BUCKETS) {
    const paths = await listAllPaths(admin, bucket, userId)
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100))
      if (error) {
        throw error
      }
    }
  }
}

// ------------------------------------------------------------
// Handler
// ------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'not_authenticated' }, 401)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  // Identify the caller from their JWT; never trust a user id in the body.
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData.user) {
    return json({ error: 'not_authenticated' }, 401)
  }
  const user = userData.user

  let body: { appleAuthorizationCode?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Empty body is fine.
  }

  const usesApple = (user.identities ?? []).some(i => i.provider === 'apple')

  // Revocation failures are logged but don't block deletion: the user
  // asked for their data to be removed, and that must still happen.
  if (usesApple && body.appleAuthorizationCode) {
    try {
      await revokeApple(body.appleAuthorizationCode)
    } catch (e) {
      console.error('delete-account: Apple revocation failed', user.id, e)
    }
  } else if (usesApple) {
    // No code, e.g. deleting from Android.
    console.warn('delete-account: no Apple authorization code', user.id)
  }

  try {
    await deleteUserFiles(admin, user.id)

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      throw deleteError
    }
  } catch (e) {
    console.error('delete-account failed', user.id, e)
    const message = e instanceof Error ? e.message : String(e)
    return json({ error: 'delete_failed', detail: message }, 500)
  }

  return json({ ok: true })
})
