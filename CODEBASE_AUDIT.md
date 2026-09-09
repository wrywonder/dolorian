# Dolorian Codebase Audit — 2026-07-14

This handoff note is intentionally repo-local so Claude Code can read it next session. Keep durable, tool-agnostic learnings in `AGENTS.md`; keep time-boxed audit findings here.

## Current architecture snapshot

- Expo SDK 54 / React Native 0.81 / React 19 / Expo Router v6 app with custom `(tabs)` shell and custom `RouterTabBar`.
- Supabase is the live backend: auth, Postgres/RLS, Storage. Client data access is centralized in `src/lib/data.ts`; avoid new ad-hoc `supabase.from()` calls in components unless moving that logic into `src/lib/` immediately after.
- Main routes:
  - `src/app/(auth)/sign-in.tsx` and `src/app/(auth)/onboard.tsx` handle OTP/review-account login and first parent profile creation.
  - `src/app/(tabs)/buzz.tsx` loads feed posts, one prompt, and visible-connection avatars.
  - `src/app/(tabs)/plans.tsx` loads published activities plus AI-discovered drafts.
  - `src/app/(tabs)/irl.tsx` loads visible nearby parents, warming venues, and add-spot check-ins.
  - `src/app/(tabs)/you.tsx` and `src/app/profile/[id].tsx` share `ProfileBody`.
- Migrations are timestamp-prefixed in `supabase/migrations/`. Do not edit applied migrations; add new migrations.

## Top 3 bug fixes to prioritize

1. **Fail fast when Supabase env vars are missing.** `src/lib/supabase.ts` uses non-null assertions on `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; a missing EAS env value can create an opaque runtime failure. Add a small config guard with a clear developer/user-facing error state.
2. **Fix incoming connection requests.** `ProfileBody` currently treats every pending connection as if the current user initiated it, so the accept/decline state in `ConnectCTA` is unreachable. `getProfile()` should return `initiated_by` (or derived direction), and `data` should expose accept/decline methods that update `connections.status`.
3. **Make visibility/check-in expiry real.** `parent_locations.expires_at` exists but queries only filter `visible = true`. Old check-ins can remain visible forever unless users manually toggle off. Set expiry during `setMyVisibility()`/`checkInAtVenue()` and filter/select only non-expired locations.

## Top 3 feature improvements to prioritize

1. **Replace the decorative IRL map with a live location map.** `IllustratedMap` is intentionally a stylized mock: it draws hardcoded blobs/roads/trees and hashes venue IDs into pixel positions rather than plotting real lat/lng. Replace it with a `react-native-maps`-backed component that requests foreground location, centers on the user or Dolores Park fallback, renders venue/parent markers from real coordinates, clusters co-located parents, and keeps RLS-backed visibility/expiry behavior intact.
2. **Add profile/settings editing.** The You tab passes a no-op `onSettings`, onboarding only collects name/neighborhood/avatar tone, and the profile empty state says adding kids is coming soon. A settings/profile editor for parent info + kids would make the app feel usable after first login.
3. **Add Plans search/filter.** The Plans header renders a search icon with no interaction. Implement search and lightweight filters by date/category/friend activity so the Plans tab scales beyond a short seeded list.

## Live map implementation plan

- Read Expo SDK 54 docs for `expo-location` and confirm the installed `react-native-maps` API before coding. This app uses development builds, not Expo Go, so native map support is already aligned with the project constraints.
- Introduce a new IRL map component, likely `LiveMap`, behind the existing `src/app/(tabs)/irl.tsx` data contract first, then remove or demote `IllustratedMap` to a storybook/demo component.
- Use `venues.lat`/`venues.lng` from Supabase for venue markers and `parent_locations.venue_id` for parent clusters; only use raw current device location for centering/check-in creation unless the product explicitly decides to store live coordinates.
- Add empty/error states for denied location permission, missing native map support, and no visible connections nearby.
- Coordinate with the expiry bug fix above so a live map does not display stale check-ins as if they were current.

## Audit notes / implementation cautions

- Read the exact Expo SDK 54 docs before Expo/RN API changes: https://docs.expo.dev/versions/v54.0.0/.
- Keep using design tokens from `src/lib/constants.ts`.
- For Storage uploads, preserve the base64-to-ArrayBuffer path in `src/lib/storage.ts`; do not use `fetch(uri).blob()` in React Native.
- If an RLS-protected feature needs graph-aware visibility beyond rows visible to the caller, add a `security definer` SQL helper in a new migration rather than joining client-side.
- `npm run typecheck` is currently green after this audit.
