# Village — Agent Guide

This file is the **single shared brief** for every AI coding tool used on this
repo. Claude Code reads it via `CLAUDE.md` (which imports `@AGENTS.md`); Codex
reads it natively. Keep tool-specific config out of here — anything written here
must be true no matter which assistant is driving.

## ⚠️ Expo has changed

This app is on **Expo SDK 54 / React Native 0.81 / React 19 / Expo Router v6**.
APIs have shifted a lot across recent SDKs. **Read the exact versioned docs at**
**https://docs.expo.dev/versions/v54.0.0/ before writing any code** — do not rely
on training memory for Expo/RN APIs, and do not copy patterns from older SDKs.

## What this is

Village is an Expo (React Native) app for parents — a feed ("Buzz"), plans,
IRL/venue discovery, prompts, and profiles — backed by Supabase (auth, Postgres
with RLS, Storage, Edge Functions).

## Stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript (strict)
- expo-router v6 (file-based routing, typed routes enabled)
- Supabase JS v2 (`@supabase/supabase-js`) — auth, DB, Storage
- Zustand for local UI state
- FlashList for lists, Reanimated v4, react-native-svg, react-native-maps

## Layout

```
src/
  app/            expo-router routes (file-based)
    (auth)/       sign-in, onboarding
    (tabs)/       buzz, plans, irl, you
    profile/      profile screens
    compose.tsx   post creation flow
  components/     UI by feature: feed, plans, irl, prompts, profile, ui
  lib/            supabase client, data access, formatting, storage, constants
  store/          zustand stores
  types/          shared TS types (barrel in index.ts)
  hooks/          shared hooks
  ai/             AI helpers (currently empty)
  mocks/          mock data
supabase/
  migrations/     SQL schema, RLS, storage (timestamp-prefixed)
  functions/      edge functions (generate-story, discover-activities, classify-prompt)
  seed/           hand-run SQL (not migrations) — e.g. demo data. Never
                  auto-applied; run manually in the SQL editor when needed.
```

Import alias: `@/*` → `src/*` (see `tsconfig.json`).

## Commands

- `npm install` — install deps (run after every branch switch/pull)
- `npm run typecheck` — `tsc --noEmit`; **run before every commit**
- `npx expo start` — dev server; connects to a **development build**, not Expo Go
- `npx expo run:ios` — build + launch the dev client on the iOS Simulator (needs Xcode)
- `eas build --profile development --platform ios` — cloud dev build for a physical device
- `eas build --profile production --platform ios` + `eas submit -p ios` — TestFlight

**Expo Go does not work for this app** — react-native-maps (and push
notifications) require a development build. Profiles live in `eas.json`.
The generated `ios/`/`android/` folders are gitignored (CNG/prebuild);
never edit them by hand — change `app.json` plugins/config instead.

## Environment

Runtime needs a local `.env` (gitignored). See `.env.example`. Required:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Only `EXPO_PUBLIC_`-prefixed vars are exposed to the app. Never commit real keys.

For **EAS cloud builds** the `.env` file isn't uploaded — the same two vars must
also exist as EAS environment variables (`eas env:create`, or the project's
Environment Variables page on expo.dev) or release builds ship with an
unconfigured Supabase client.

## Auth email delivery

- Production auth email is sent through Resend custom SMTP from
  `Village <login@auth.withvillage.app>`; the verified Resend domain is
  `auth.withvillage.app`.
- Keep custom SMTP enabled in Supabase Authentication email settings. SMTP
  credentials live only in Supabase and Resend — never commit or copy them into
  `.env` or EAS variables.
- The app verifies an 8-digit email OTP. Both Supabase templates named
  **Confirm sign up** and **Magic link or OTP** must include `{{ .Token }}` and
  must not send `{{ .ConfirmationURL }}` as the primary sign-in action.
- Supabase is configured for an 8-digit OTP with a 3600-second expiry. Keep
  `validateLoginCode` and the sign-in screen in sync if that server setting
  changes.

## Conventions

- **TypeScript is strict** (`noUncheckedIndexedAccess`, `noImplicitOverride`,
  no fallthrough). No `any` escape hatches without a comment saying why.
- Design tokens live in `src/lib/constants.ts` (`colors`, `fonts`, `radii`,
  `spacing`, `avatarTones`). Use them — don't hardcode hex/px in components.
- Data access goes through `src/lib/` (e.g. `data.ts`, `supabase.ts`), not
  ad-hoc `supabase.from()` calls scattered in components.
- Match the style of the file you're editing; keep components small and typed.
- DB changes are new timestamp-prefixed files in `supabase/migrations/` — never
  edit an already-applied migration.
- **Never upload local files via `fetch(uri).blob()` to Supabase Storage** —
  React Native's Blob doesn't serialize correctly and silently uploads
  zero-byte objects (no error). Get base64 from the picker/camera API and
  upload decoded `ArrayBuffer` bytes instead (see `src/lib/storage.ts`).
- When a query needs to check visibility across the connection graph that
  RLS wouldn't otherwise allow the caller to see (e.g. mutual-friend counts,
  "can this parent see this post"), add a `security definer` SQL function
  rather than computing it client-side — client-side joins only ever see
  rows RLS already exposes to the caller, which silently produces wrong
  results instead of an error. See `current_parent_id()`, `are_connected()`,
  `can_see_post()` in the migrations for the pattern.

## Working interchangeably (Claude Code ⇄ Codex)

This repo is edited by both tools. To keep handoffs clean:

- `git pull` and `npm install` **before** starting a session; commit + push
  **before** switching tools. Never leave uncommitted work when handing off.
- One logical change per commit, with a clear message. Small commits make it
  obvious which tool did what.
- Both tools must leave `npm run typecheck` green before committing.
- Put durable project knowledge **here**, so both tools inherit it.
