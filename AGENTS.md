# Dolorian — Agent Guide

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

Dolorian is an Expo (React Native) app for parents — a feed ("Buzz"), plans,
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
```

Import alias: `@/*` → `src/*` (see `tsconfig.json`).

## Commands

- `npm install` — install deps (run after every branch switch/pull)
- `npm run typecheck` — `tsc --noEmit`; **run before every commit**
- `npm start` / `npm run ios` / `npm run android` / `npm run web` — Expo dev server

## Environment

Runtime needs a local `.env` (gitignored). See `.env.example`. Required:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Only `EXPO_PUBLIC_`-prefixed vars are exposed to the app. Never commit real keys.

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

## Working interchangeably (Claude Code ⇄ Codex)

This repo is edited by both tools. To keep handoffs clean:

- `git pull` and `npm install` **before** starting a session; commit + push
  **before** switching tools. Never leave uncommitted work when handing off.
- One logical change per commit, with a clear message. Small commits make it
  obvious which tool did what.
- Both tools must leave `npm run typecheck` green before committing.
- Put durable project knowledge **here**, so both tools inherit it.
