# Plan places and keyboard pass

The manual plan editor now offers place autocomplete, resolves a selected place's
full address, and saves it through the existing plan fields. Imported locations
remain editable. Opening and cancelling search preserves the draft, and manual
entry works without the search service. Only explicit place-search text goes to
the provider; private meetup notes do not trigger a search or location permission.

The new `place-search` Edge Function authenticates the user, validates bounded
requests, calls only fixed Google Places API endpoints, uses a search session
across autocomplete/detail calls, and returns generic errors without leaking the
provider key or query. The client debounces queries, cancels superseded work,
rejects stale responses, and times out unavailable requests. Suggestions are not
persisted. The selected name/address use the existing plan persistence model;
there is no new table or schema migration.

All 14 existing input screens/sheets use `KeyboardFrame`: it accounts for the
actual safe-area/header position, provides a Done control for multiline and number
keyboards, and keeps content above the keyboard. `FormScrollView` also measures the focused
field after resizing and scrolls it into the visible viewport. Form scroll views dismiss on drag
and allow a button's first tap through. Date controls dismiss text entry on touch.
No new native dependency or framework upgrade was needed.

## Release dependency

Deploy `supabase/functions/place-search` before releasing this client. It uses the
existing server-only `GOOGLE_MAPS_API_KEY` and requires Places API (New) access.
Use the project's normal authenticated-function deployment workflow (the handler
validates the bearer token with Supabase Auth even when gateway JWT verification
is disabled). Never expose the key in Expo public environment variables.

The function was deployed to the existing Village project and verified ACTIVE
(version 1). Its server-only Google secret is present, and a live request without
a user session returns 401. No database migration or application-data write was
performed. Authenticated live Google search remains unverified: automatic
approval review rejected using the owner's emailed OTP for this smoke test, so
that sign-in was not completed.

The app fixes were committed and pushed as `7dc04d9` on
`codex/coordination-quality-pass`. EAS production build 1.0.0 (25),
`f4799e82-f43d-42da-a294-c9e51b74f584`, built successfully from that exact commit.
Submission `73e59935-7eed-4a8b-9160-f6e7a7710468` uploaded successfully to Apple.
Apple processed build `beb065fc-7551-478e-849e-12d38e617c8e`; build 1.0.0 (25)
was then assigned to DCK Club and verified **Testing** with eight group members.
Testing notes were saved in App Store Connect. Both newly invited testers were
sent separate setup emails only after this availability check, with TestFlight
installation, invitation/update, Village email-code login, and feedback steps.
EAS Doctor passed 17/18 checks and flagged newer patch releases of Expo
(54.0.37 versus installed 54.0.36) and expo-constants (18.0.14 versus 18.0.13).
Dependencies were unchanged in this pass; the native production build succeeded.

## Verification

- TypeScript, 68 Node regression tests, Deno check of the Edge Function, and the
  iOS production-mode bundle export passed.
- Native checks use the real iOS development build with fictional loopback HTTP
  fixtures. The provider transport is covered by protocol tests, not a live
  Google request. Hosted deployment and secret presence are verified; live
  authenticated Google responses/key restrictions remain unverified.
- Focused-field native check passed on iPhone 16e: the entire lower report
  textarea stays above the keyboard, and scrolling exposes Submit.
- Android, physical-device keyboards, and VoiceOver have not been exercised in
  this pass.

The QA fixture initially used `cream` as a profile palette value. Native profile
QA exposed that invalid fixture; it now uses `peach`, matching the real database
check constraint. No production profile data was changed.

The complete `forms-keyboard.yaml` flow passed on iPhone 16e, including persisted
fictional report submission, the phone pad's Done control, lower profile controls,
and check-in search/select/share/stop. Screenshots were visually inspected:

- [Focused lower field](qa/keyboard-focused-field.png)
- [Phone pad dismissal](qa/keyboard-phone-pad.png)
- [Check-in search](qa/keyboard-check-in.png)

The complete `plan-place-keyboard.yaml` flow passed on iPhone 17 Pro: one-tap
selection while typing, full-address resolution, manual address editing, keyboard
dismissal by dragging, publish, reopen with the exact saved address, simulated
search failure/cancel preserving that place, and saved manual replacement.

- [Place suggestions while typing](qa/plan-place-autocomplete.png)
- [Publish after scrolling](qa/plan-keyboard-publish.png)

The existing full feed flow also passed on iPhone 17 Pro, including comment
submission with the keyboard open, failure/draft retention, successful retry,
reactions, expandable captions, and the linked-plan return path.

The existing full Plans flow passed on iPhone 17 Pro: today's all-day plan stays
upcoming, RSVP notes save and reopen exactly, individual invitations persist,
and editing refreshes both the detail screen and list with the correct Back path.

Final checks: `npm run typecheck`, `npm test` (68/68),
`npx deno check supabase/functions/place-search/index.ts`,
`npx expo export --platform ios`, and `git diff --check` all passed.
