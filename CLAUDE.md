# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Start Expo dev server
npm run start:dev      # Dev server with EXPO_PUBLIC_ENV=development
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run lint           # ESLint on .ts/.tsx files
npm run typecheck      # TypeScript type check (no emit)
npm test               # Jest (single run, no watch)
```

Run a single test file:
```bash
npx jest path/to/file.test.ts
```

EAS builds (requires EAS CLI):
```bash
npm run build:dev      # Development build
npm run build:staging  # Staging build
npm run build:prod     # Production build
```

## Architecture

**TicketBook** is a mobile-first digital ticket stub archive — users log concerts/events they've attended. Built with React Native + Expo (SDK 51), Supabase for backend, and Expo Router for file-based navigation.

### Navigation (app/)

Expo Router with two route groups:

- `app/index.tsx` — auth gate that redirects to auth flow, username onboarding, or the main tabs based on session/onboarding state
- `app/auth/` — welcome, login, signup, username screens
- `app/(tabs)/` — five-tab main app (feed, explore, add, stats, profile)
- `app/event/` — event creation and detail screens (modal/stack)

### State Management

Two layers that serve distinct purposes:

- **Zustand** (`stores/authStore.ts`) — auth session, user profile, and onboarding status. Initialized once on app load and persisted via Supabase's AsyncStorage-backed client.
- **React Query** (`hooks/`) — all server data (events, friends, stats). The primary hook is `hooks/useEvents.ts` which exposes queries and mutations; mutations invalidate related queries on success.

### Backend (Supabase)

- `lib/supabase.ts` — Supabase client, initialized with AsyncStorage for session persistence
- `lib/database.types.ts` — TypeScript types auto-generated from the Supabase schema (do not edit manually)
- `supabase/migrations/` — three migration files in order:
  1. `001_core_schema.sql` — tables, enums, indexes (soft deletes via `deleted_at`)
  2. `002_rls_policies.sql` — row-level security policies
  3. `003_functions_and_views.sql` — stored procedures and materialized views (used for `user_stats`)

**Key schema conventions:**
- Soft deletes on all user-content tables (`deleted_at` timestamp)
- Media goes through a moderation workflow: `pending → approved/rejected` via `moderation_status` enum
- `user_stats` is a materialized table — read from it rather than aggregating at query time
- Artists and venues use `gin_trgm` indexes for fuzzy search (Spotify/MusicBrainz IDs on artists)

### Environment & Config

- `app.config.ts` — Expo config, reads `EXPO_PUBLIC_*` env vars; branches on `dev/staging/prod`
- `eas.json` — three EAS profiles: `development`, `staging`, `production`
- Sentry is configured for error tracking in production/staging builds
