# Dolorian — Orchestration State

> This file is the engine of the loop. Agents read it at the start of every
> session and write to it before stopping. Keep it terse and current.

## Mission
Parent social-networking app. Four tabs: Buzz (feed), IRL (map), Plans
(activities), You (profile). Core primitive: mutual-connection graph.
Design: warm cream + terracotta. Stack: React Native (Expo) + Supabase
(Edge Functions for privacy-first calendar import).

## Current phase
Phase: 0 — STABILIZATION (precedes resuming feature work)

> The 10-phase build is NOT done. It is unverified. Bugs have silently
> reintroduced (e.g. login email reverted from OTP code to magic link, app
> unusable). No phase is "done" until a test proves it and that test runs in
> the gate. This phase gives the loop the ability to verify its own work.

Phase goal (definition of done):
- [ ] App launches on the iOS simulator from a dev build
- [ ] Email OTP login works end-to-end (code arrives, verifies, lands on Buzz)
- [ ] A Maestro smoke test covers launch -> login -> Buzz and is GREEN in the
      TaskCompleted gate
- [ ] Supabase auth config (email templates) lives in version-controlled
      config, not only the dashboard
- [ ] All other known reintroduced regressions are enumerated as tasks

## Task queue (builder works top unblocked item; TEST BEFORE FIX)
| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 1 | Stand up the harness: install Maestro, write `.maestro/login_smoke.yaml` (launch -> enter test email -> enter OTP -> assert Buzz visible). Configure a fixed test OTP for a designated test email in Supabase so the flow is deterministic (no real inbox). **Expected to FAIL now -- that's the goal.** | in-progress | builder | DoD: `maestro test .maestro/login_smoke.yaml` runs against the simulator and goes red on the broken login |
| 2 | Restore email OTP login: Magic Link template renders `{{ .Token }}` not `{{ .ConfirmationURL }}`; remove any `emailRedirectTo` from `signInWithOtp`; `verifyOtp({ email, token, type: 'email' })`. | todo | builder | DoD: task-1 smoke test goes GREEN |
| 3 | Wire the smoke test into the `TaskCompleted` gate in settings.json | todo | builder | DoD: a deliberately broken login fails the gate |
| 4 | Move Supabase auth config (email templates) into `supabase/config.toml` + repo so a rebuild can't silently revert it | todo | builder | This is why #2 regressed in the first place |
| 5 | Regression sweep: enumerate every other reintroduced bug Drew has hit, each with a repro, triage into this queue | todo | reviewer | Don't resume feature phases until this is empty or scoped |

## Needs Drew (the "pull me in" queue)
- [ ] Is Dolorian runnable in the iOS simulator from an Expo dev build, or have
      you only been testing on your physical iPhone? The loop needs a simulator
      to run its own tests headlessly. If device-only, THIS becomes task 0.
- [ ] Pick a designated test email + confirm using Supabase's fixed test-OTP
      so the smoke test never depends on a real inbox.

## Definition of done (global gates -- every task must pass)
- `npm run lint` clean
- `maestro test .maestro/` green (once the harness exists)
- Reviewer filed no BLOCKING findings

## Decision log (append-only -- the project's real memory)
- (seed) Stabilization precedes feature work. Verification harness before fixes.
  Test-first ordering chosen specifically to stop silent regressions.

## FYI log (surfaced to Drew at session end, no action needed)
-
