// Supabase Edge Function: notify-tag
// Called via a Database Webhook when a row is inserted into event_attendees.
// Sends a push notification to the tagged user via the Expo Push API.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    event_id: string
    tagged_by_user_id: string
    tagged_user_id: string
    status: string
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const payload: WebhookPayload = await req.json()
  const { record } = payload

  if (record.status !== 'pending') {
    return new Response('ok', { status: 200 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const [taggedUserResult, taggerResult, eventResult] = await Promise.all([
    supabase
      .from('users')
      .select('push_token')
      .eq('id', record.tagged_user_id)
      .single(),
    supabase
      .from('users')
      .select('username')
      .eq('id', record.tagged_by_user_id)
      .single(),
    supabase
      .from('events')
      .select('title')
      .eq('id', record.event_id)
      .single(),
  ])

  const pushToken = taggedUserResult.data?.push_token
  const taggerUsername = taggerResult.data?.username
  const eventTitle = eventResult.data?.title

  if (!pushToken) {
    return new Response('no push token', { status: 200 })
  }

  const message = {
    to: pushToken,
    title: `@${taggerUsername ?? 'someone'} tagged you`,
    body: eventTitle ?? 'in an event',
    data: { eventId: record.event_id },
    sound: 'default',
  }

  const expoPushRes = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  if (!expoPushRes.ok) {
    console.error('Expo push failed:', await expoPushRes.text())
    return new Response('push failed', { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
