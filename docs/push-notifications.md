# Push notifications

TicketBook sends push notifications via Expo's push service. The flow has
three parts: client-side registration, a stored push token, and a Supabase
Edge Function triggered by a Database Webhook on the relevant table insert.

## 1. Client registration — `hooks/useNotifications.ts`

`useSetupNotifications` (wired up in `app/_layout.tsx`) runs on app load once
a user is signed in. It requests notification permissions, fetches an Expo
push token (`getExpoPushTokenAsync`), and writes it to `users.push_token`
(added in migration `004_push_tokens.sql`).

It's skipped inside Expo Go — `expo-notifications` throws at import time
there on Android (removed from Expo Go in SDK 53+), so the module is loaded
dynamically and only outside Expo Go.

## 2. Edge functions — `supabase/functions/`

Each notification type has its own Edge Function that:

1. Receives a Database Webhook payload (`{ type, table, record }`) on row
   insert
2. Looks up the recipient's `push_token` and any context needed for the
   message copy (e.g. the other user's username)
3. POSTs to the Expo Push API (`https://exp.host/--/api/v2/push/send`)

Existing functions:

- **`notify-tag`** — fires on insert into `event_attendees`, notifies the
  tagged user
- **`notify-friend-request`** — fires on insert into `friendships`, notifies
  the addressee that they've received a friend request

Both early-return with `200 ok` (no push sent) when the recipient has no
`push_token`, so missing tokens aren't treated as errors.

Deploy a function with:

```bash
supabase functions deploy notify-friend-request
```

## 3. Database Webhooks (manual dashboard setup)

Webhooks are **not** captured in migrations — they're configured by hand in
the Supabase dashboard under *Database → Webhooks*. For each function:

1. Create a new webhook
2. Table: the table the function listens on (`event_attendees`,
   `friendships`, …)
3. Events: `Insert`
4. Type: `Supabase Edge Functions`
5. Edge Function: select the deployed function (e.g. `notify-friend-request`)
6. HTTP method: `POST`

If you redeploy the project to a new Supabase instance, these webhooks need
to be recreated manually — they won't come back via `supabase db push`.

## Adding a new notification type

1. Copy `notify-tag` or `notify-friend-request` as a starting point
2. Update the `WebhookPayload.record` shape to match the trigger table's
   columns
3. Look up whatever context the message copy needs, build the Expo push
   `message` object, and POST it
4. Deploy the function and add a matching Database Webhook (step 3 above)
