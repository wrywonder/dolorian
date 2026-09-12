# Coordination quality pass — September 8, 2026

Release follow-up, September 11: per the product decision, circles have been
removed from navigation, connection settings and plan invitations. Invitations
choose people directly; existing circle data is preserved for older clients.
The 3 shortcut-specific tests were removed with that feature; all 62 remaining
regressions and 7 SQL suites pass. Native individual selection, exact invitation
persistence, and edit-to-list refresh also pass on iPhone 17 Pro. Earlier circle
screenshots below are historical. A release check also found that trailing
newlines made saved RSVP notes appear unsaved; writes and comparisons now use
the same whitespace normalization, including notes saved by older clients.

## Product intent and current architecture

Village helps connected parents meet spontaneously, join each other's plans, and
share the resulting memories. The existing cream/terracotta palette, serif type,
striped placeholders, stickers and imperfect card angles are retained.

- Entry: Expo Router root resolves fonts/session, then profile/onboarding.
- Buzz: 50 recent posts, optional prompt, reactions and comments; Supabase joins
  plus connection preferences determine visible content.
- IRL: venue-level `parent_locations` with a two-hour expiry, accepted-connection
  RLS, optional device geofences and a five-minute automatic-share warning.
- Plans: `activities`, invitations and family RSVP details; SQL RPCs enforce
  visibility and ownership. An Edge Function imports external listing facts.
- Village/You: mutual connections, private organizational circles, profiles,
  per-connection location preferences, blocks, contact consent and invite links.
- UI state: component state plus Zustand; data access lives in `src/lib/data.ts`.
- Existing checks: TypeScript, Node tests and SQL tests; no lint script is defined.

## Selected pass and acceptance criteria

| Priority | Evidence / opportunity | Implemented outcome | Verification |
| --- | --- | --- | --- |
| 1 | `checkInAtVenue` had no UI caller; IRL centered background setup | Explicit venue check-in, visible audience/expiry, stop action; automatic sharing remains optional | Native fixture journey, expiry/order tests |
| 1 | Nearby errors became empty arrays; visits refreshed only at mount | Focus/resume refresh, bounded foreground polling, local expiry, retry and last-good data | Failure injection and time boundaries |
| 1 | Cached identity and device geofences could outlive an account switch | Shared identity-scoped lookup, stale-result guards, account-owned automatic monitoring and reminders | Account-switch and failed-registration regressions |
| 1 | Direct venue INSERT policy bypassed validated RPC | New migration removes direct insert permission | Real PostgreSQL authenticated-role regression |
| 1 | Broad interaction policy bypassed RSVP-note redaction | Direct reads use the intended note audience; RPC still returns redacted public attendees | Regression fails on baseline, passes after migration |
| 2 | All-day/no-end plans disappeared when their start time passed | Shared schedule rules, inclusive all-day ends and accurate card labels | Date regressions including multi-day ranges |
| 2 | Returning from edits left Plans stale; import responses could overwrite another draft | Focus/resume refresh, request version guards, mutation locks, safe reimport and retries | Regression helpers and native journeys |
| 2 | Circles could not help invite an existing friend group | Circle selection shortcuts in invited-only plans, with visible individual choices | Overlap/stale-member tests and native picker |
| 2 | Feed/comments hid failures; captions were inaccessible after truncation | Retained feed/retry, readable expandable captions, preserved failed comment drafts | Native failure injection and validation tests |
| 2 | Native keyboards obscured RSVP actions and consumed the first comment Send tap | Keyboard-aware plan forms and handled feed taps; shorter decorative plan banner | Rendered keyboard checks and native first-tap send |
| 2 | Reactions could race; hidden selected photos still uploaded after switching post type | Idempotent reaction writes and per-post state; only visible media is uploaded | Mutation tests and native interaction |
| 2 | Plans and memories lacked a direct user journey | Past plans can open a linked memory composer; feed links to accessible plans | Native compose-to-feed journey |
| 2 | FlashList kept the old card visible while a new memory was inserted above it | Near-top refresh reveals new posts while deeper readers keep their place | Observed hidden post before fix; complete native memory flow passes after fix |

The privacy bypasses, stale state, keyboard failures and hidden-new-post behavior
were confirmed in code or native execution. Manual check-in, circle shortcuts,
linked memories and shorter placeholders are product judgments aligned with the
coordination goal. Client changes are reversible and reuse existing tables and
components; the two narrow SQL policies have the highest rollout risk and require
staging/legacy-client verification before deployment. No SDK or dependency upgrade
was included.

## Baseline and environment

- Clean detached checkout at `f07a75c`, equal to fetched `origin/master`; isolated
  local branch `codex/coordination-quality-pass`. No pre-existing user edits.
- Installed locked dependencies without changing the lockfile.
- Baseline: typecheck passed; 26 Node tests passed; iOS production JS export passed
  (6.54 MB Hermes bundle). No performance claim is inferred from this bundle size.
- No local backend `.env`. Native UI checks use the real app and Supabase client
  against the loopback-only fictional fixture server in `scripts/qa/`.
- Existing installed simulator build lacked ExpoCrypto and ExpoClipboard. A fresh
  local Xcode simulator build succeeded with all current native modules. Xcode's
  simulator signing is required for simulated Keychain entitlements; disabling
  signing caused a notification-registration error. The reproducible working
  command is in [the QA guide](../scripts/qa/README.md). Generated native folders
  remain ignored.
- SQL checks apply unmodified migrations to embedded PostgreSQL using PGlite.
  The harness supplies Supabase's auth/storage schemas and API role grants; it is
  not a full Supabase service stack.

## Compatibility and verification limits

- Both new privacy migrations are local and **not deployed**. Their server-side
  protections take effect only after a separately authorized migration rollout.
- Existing automatic-location registrations have no account owner. They are
  intentionally inactive until the user explicitly sets up automatic sharing
  once again. Manual check-ins do not require this setup.
- Simulator runs use fictional identities and local data, not production auth,
  remote storage, external listing imports, realtime delivery or push services.
- Several emoji rendered as missing-glyph boxes in this iOS simulator runtime,
  including plain system-font emoji. Layout and interaction evidence is useful,
  but emoji appearance needs a real-device check. No Android runtime was available.
- The new comment retry handles a confirmed failed write. A connection lost after
  the server commits can still make a retry ambiguous; a future client-generated
  comment ID would make that edge case idempotent.

## Verification performed

- `npm run typecheck`: passed. `npm test`: **65 passed**, zero failures (baseline:
  26). Coverage includes all-day boundaries, stale imports/requests, circle
  overlap, comment limits, reaction counts, hidden photos, visit expiry,
  warning/write ordering, account switches and failed geofence registration.
- Full local Xcode iOS simulator build: passed. Production-mode iOS JavaScript
  export: passed, 6.61 MB Hermes bundle. Bundle size is not a startup benchmark.
- Embedded PostgreSQL: **22 unmodified migrations and 7 SQL suites passed**.
  The new venue and RSVP-note regressions also reproduced their failures before
  the two new migrations. Authenticated/anonymous roles, pending connections,
  blocks, expiry, idempotent reaction writes and Unicode comment boundaries are covered.
- Native iPhone 17 Pro and iPhone 16e, iOS 26.3, fictional backend: exercised
  sign-in, manual visit share/stop, failed refresh after a confirmed share,
  failed stop and retry, all-day Plans, RSVP note persistence, circle selection,
  edit/save/back with the updated title in the list, reactions, failed comment/retry, retained feed/retry, and
  linked memory composition. Actual saved rows were checked independently.
- Native picker/crop and photo upload: a real 896,290-byte image reached local
  storage and appeared in Buzz. Switching a selected photo to a thought saved
  no media and produced no upload.
- iPhone 16e at the largest standard Dynamic Type setting: check-in search and
  share action, plan details, and RSVP input/save remain usable with the keyboard.
  This is a targeted layout check, not a complete VoiceOver or accessibility audit.

The complete IRL, linked-memory, feed-recovery and small-screen flows passed.
Other native checks use both reusable flows and focused continuation flows where
test selectors needed correction. They are not a claim that every possible
screen, state, backend integration or device has been covered.

## Selected native evidence

All screenshots contain fictional QA data; emoji rendering has the simulator
limitation described above.

| Journey | Evidence |
| --- | --- |
| Explicit check-in | [Place picker](qa/irl-check-in.png), [confirmed visit despite failed refresh](qa/irl-confirmed-visit-refresh-failure.png) |
| Friend-group invitations and edits | [Circle selection](qa/plans-circle-invites.png), [updated plan in list](qa/plan-edited-list.png) |
| Easier RSVP | [Keyboard and save](qa/plans-rsvp-keyboard.png), [larger text](qa/plan-large-text-keyboard.png) |
| Read and respond | [Expanded memory](qa/feed-expanded-caption.png), [failed draft](qa/feed-comment-failure.png), [saved retry](qa/feed-comment-retry.png), [retained feed](qa/feed-refresh-failure.png), [after retry](qa/feed-refresh-retry.png) |
| Plans into memories | [Linked composer](qa/memory-linked-composer.png), [new post in Buzz](qa/memory-linked-feed.png) |
| Media and accessibility | [Uploaded image](qa/photo-uploaded-feed.png), [check-in with larger text](qa/irl-large-text-keyboard.png) |

## Deferred work, in priority order

1. **Private media delivery.** Existing public post/profile image buckets expose
   copied URLs beyond row-level post/profile visibility. Plan a coordinated move
   to private objects and authorized image URLs, preserving old clients and files.
2. **Validate the simpler sharing model.** Connections are the default audience;
   private plans select individuals. Reconsider saved groups only if real usage
   shows repeated selection becoming burdensome.
3. **Real-device/background verification.** Exercise Always/denied/revoked location,
   notification delivery, arrival/exit, app termination and multiple devices against
   a staging backend. A simulator and HTTP fixture cannot establish those guarantees.
4. **Retained tab navigation.** The current `Slot` plus `replace()` remounts tab
   screens and loses scroll/filter state. A native Tabs change needs a separate navigation regression
   pass, including links, nested routes and sheets.
5. **Dependency maintenance.** npm audit reported 37 entries (14 high, 23 moderate),
   many propagated through Expo/Metro build tooling. No reachable app exploit was
   established. Review advisories and SDK-compatible patches separately; npm's
   suggested automatic fixes include major Expo changes and a Router downgrade.
6. **VoiceOver and post actions.** Own posts currently use a long-press wrapper
   that groups their accessibility labels. Check individual reaction/comment
   reachability with VoiceOver and provide an accessible post-options control.
7. **Scale and startup.** Plans currently reads every visible published activity;
   profiles ignore some constituent query errors. Measure representative datasets
   before pagination/caching changes, and extend component/integration coverage.

No deployment, production data mutation, push, or release is included in this pass.
