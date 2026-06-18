# TicketBook.io

Your personal digital ticket stub archive.

## Stack

- **Framework**: Expo (SDK 51) with Expo Router
- **Backend**: Supabase (Auth, Postgres, Storage, Edge Functions)
- **State**: Zustand (auth/global), React Query (server data)
- **CI/CD**: EAS Build + EAS Update

## Project Structure

```
ticketbook/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout, providers
│   ├── index.tsx               # Auth gate / redirect
│   ├── (tabs)/                 # Bottom tab navigator
│   │   ├── _layout.tsx
│   │   ├── feed.tsx
│   │   ├── explore.tsx
│   │   ├── stats.tsx
│   │   └── profile.tsx
│   ├── auth/                   # Auth screens (outside tabs)
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── username.tsx        # Onboarding username selection
│   └── event/                  # Event screens (modal/stack)
│       ├── new.tsx             # Add event flow
│       └── [id].tsx            # Event detail
├── components/                 # Shared UI components
│   ├── cards/
│   │   ├── EventCard.tsx       # Concert ticket card
│   │   └── SportCard.tsx       # Sport match card
│   ├── ui/                     # Primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Typography.tsx
│   └── media/
│       └── MediaUploader.tsx
├── hooks/                      # React Query hooks
│   ├── useEvents.ts
│   ├── useFriends.ts
│   └── useStats.ts
├── stores/                     # Zustand stores
│   └── authStore.ts
├── lib/                        # Utilities
│   ├── supabase.ts
│   └── database.types.ts
├── supabase/
│   └── migrations/
│       ├── 001_core_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_functions_and_views.sql
├── app.config.ts
├── eas.json
└── package.json
```

## Getting Started

### 1. Prerequisites

```bash
node >= 20.x
npm install -g eas-cli
```

### 2. Clone and install

```bash
git clone <repo>
cd ticketbook
npm install
```

### 3. Supabase setup

1. Create a new Supabase project at supabase.com
2. Run migrations in order via the SQL editor or Supabase CLI:
   ```bash
   supabase db push
   ```
3. Create storage bucket `event-media` with public read for approved files
4. Copy your project URL and anon key

### 4. Environment

Create `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ENV=development
```

Update `eas.json` with your Supabase URLs per environment.

### 5. EAS setup

```bash
eas login
eas build:configure    # links to your EAS project, generates project ID
```

Update `app.config.ts` with your `eas.projectId`.

### 6. Development build

```bash
# iOS simulator
eas build --profile development --platform ios

# Android emulator
eas build --profile development --platform android
```

Then start the dev server:
```bash
npm start
```

### 7. Running migrations

Via Supabase CLI:
```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Or paste each migration file into the Supabase SQL editor in order.

## EAS Build Profiles

| Profile | Purpose | Distribution |
|---|---|---|
| `development` | Local dev with dev client | Internal (simulator/emulator) |
| `staging` | QA builds for internal testers | Internal (TestFlight / Play internal) |
| `production` | App Store / Play Store releases | Public |

## Key Conventions

- **Server data**: always via React Query hooks in `/hooks`
- **Auth/session state**: Zustand `authStore`
- **Types**: generated from `lib/database.types.ts` — keep in sync with schema
- **Soft deletes**: never hard-delete events, set `deleted_at` timestamp
- **Media**: always upload to Supabase Storage, store path in `event_media` table. Moderation status starts as `pending`.
- **Stats**: never aggregate at query time — read from materialised `user_stats` table

## Supabase Storage Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `event-media` | All user-uploaded media | Authenticated upload, public read (approved only via RLS) |
| `avatars` | User profile photos | Authenticated upload, public read |

## Phase Roadmap

- **Phase 1** (current): Auth, add event, feed, event detail
- **Phase 2**: Friends, tagging, social feed
- **Phase 3**: Stats dashboard, achievements, leaderboards
- **Phase 4**: Setlists, OCR scanning, sport details, map view
