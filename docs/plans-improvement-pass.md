# Plans improvement pass

## Product outcome

Village's useful foundation was already present: individual connections, shared
plans, place lookup, editable link imports and RSVP notes. The largest friction
was the hierarchy: importing a listing came before making a normal invitation,
links implicitly meant registration, and a soccer season appeared on every day
between its start and end.

[Product spec and acceptance scenarios](plans-product-review.md) ·
[Mobile design references](plans-design.html)

This pass keeps one editor and one shared response list. House hangouts and park
birthdays remain gatherings; camp and league plans can explicitly ask friends to
sign up elsewhere. There is no new group concept, booking system, poll or chat.

## Implemented

- **An invitation first:** name, when, where, with. Signup import, descriptions,
  supporting links, emoji choice, public visibility and repeating days are
  optional. Share stays above the keyboard; Back protects an unfinished draft.
- **Honest intent:** a supporting park or invitation link keeps Going/Maybe.
  Signup activities use Signed up/Considering, with a separate organizer link.
  Sharing a plan and opening a listing do not create an RSVP.
- **Date to decide:** new drafts have no invented date. Undated ideas are grouped
  last in the list and absent from calendar dots; clearing dates clears the old
  end and recurrence too.
- **Soccer and camp schedules:** selected weekdays, daily hours, first/last dates
  and a stored time zone. Saturday soccer marks Saturdays; weekday camp retains
  pickup time. Repeats are limited to 366 days and same-day sessions. Daylight
  saving changes preserve local hours; nonexistent clock times are rejected.
- **People and responses first:** compact cards and detail, Shared by identity,
  accurate parent counts, and My plans for things shared, joined or considered.
  The list orders repeats by their next session. Optional details follow the
  coordination controls; one quiet empty state replaces separate empty response
  panels, and an address has an explicit directions action.
- **Recovery and privacy:** saved responses survive refresh failures. Push
  delivery has a 2.5-second deadline after the durable write. New guarded RPCs
  validate schedules and save invitations atomically; a focused RLS fix closes
  ownerless inserts by ordinary API users.
- **Place search:** native testing caught search suggestions below the fixed
  footer. Results now open in a dedicated native modal, with their own keyboard
  frame, safe-area provider and reachable Cancel. Share is unavailable during
  search; cancellation and provider failures preserve the existing place and form.
- **Editable imports:** rereading the same listing preserves manual changes,
  cleared dates and weekly choices. Switching listings clears stale imported
  facts. Failed imports show a useful recovery message and keep the draft.

## Verification

Baseline: clean working tree at `a1fb729`; existing 68 Node tests and typecheck
passed. Inspected the original native editor and preserved the app's fonts,
colors, playful artwork, connection model and import fallback behavior.

| Check | Observed result |
| --- | --- |
| `npm test` | 107/107 passed, up from 68 at baseline. Includes intent, editor drafts, import ownership, actual weekdays, DST gaps/folds, overnight gatherings, shared labels, next-session sorting and bounded push delivery. |
| `npm run typecheck` and `git diff --check` | Passed. This repository has no lint script. |
| `scripts/qa/test-database.mjs` | All 23 migrations applied and all 8 SQL regression files passed, including authorization, invitations, legacy compatibility and schedule constraints. |
| `scripts/qa/test-server.mjs` | Passed against its own isolated loopback server, including exact mutation and post-write failure behavior. |
| `npx expo export --platform ios --platform android` | Passed; Hermes bundles approximately 6.64 MB for iOS and 6.65 MB for Android. This is a JS export, not a distribution-signed native build. |
| Design reference | Opened and inspected the rendered HTML in the browser. |

All native test data is fictional and served only on loopback. SQL tests use
ephemeral PostgreSQL with real authenticated/anonymous roles and Supabase
infrastructure stubs; they do not verify hosted configuration or external delivery.

Native acceptance uses an installed development build with production-mode
JavaScript on iOS 26.3. Assertions check the recorded request and persisted fixture
state as well as visible UI. Confirmed runs on iPhone 17 Pro:

- House gathering and park birthday: exact chosen friends, private manual place,
  unsaved Back protection, failed-save retry, autocomplete, first-tap Share and
  gathering wording despite a supporting URL.
- Soccer and camp: Saturday-only season, weekday daily hours and a saved family
  note that leaves the shared camp schedule unchanged.
- RSVP recovery: a durable save survives failed refresh; retry does not repeat
  the mutation; a rejected response change retains the confirmed state and note.
- Date editing: changed a day with the actual native picker, verified the exact
  saved start and two-hour duration, then cleared both bounds while preserving
  the plan's details. Keyboard Share leaves no stale Done bar on the destination.
- Calendar: selected Saturday shows soccer; Sunday does not; Wednesday shows
  camp with its daily hours and no soccer. Exact saved plan names were checked.
- Saved-plan reread: unique title, edited meetup instructions/description, exact
  weekly bounds/days and the family RSVP note survive a fresh editor and reread.
- Import recovery: a duplicate opens existing coordination without another row;
  replacing a complete listing with a partial one clears stale imported facts;
  the friendly failure message keeps an editable undated draft that can be saved.
- Existing Plans regression: today's all-day plan, trimmed RSVP note saved and
  reopened, exact selected-friend invitations, and an edited title found in search
  after returning to the list.

Confirmed runs on the smaller iPhone 16e:

- Place selection, exact edited address persistence, provider-details and search
  failures, both cancellation paths, manual fallback and saved place. Visual QA
  caught a status-bar overlap; the modal now measures its own safe area. Both
  Cancel paths close the modal and retain the prior place without a stale Done bar.
- Shared keyboard regression: report field/submit, profile phone pad/Done/lower
  controls, and IRL search/share/stop.
- Enlarged text (`accessibility-medium`): editor title and fields remained
  readable; Share and Done stayed above the keyboard; the undated plan saved;
  all response choices and the close action fit and worked. Restored and verified
  standard `large` afterward. This is a bounded check, not full Dynamic Type or
  VoiceOver coverage.

Screenshots inspected during QA:

| Before / after and key states | Evidence |
| --- | --- |
| Original editor | [Before](qa/plans/editor-before.png) |
| Four essential sections on the initial screen | [New editor](qa/plans/editor-after.png) |
| Text field, Share and Done above the keyboard | [Keyboard Share](qa/plans/keyboard-share.png) |
| Selected camp weekdays and pickup time | [Camp schedule](qa/plans/camp-schedule.png) |
| Compact cards, personal response and sharer | [Plans list](qa/plans/plans-list.png) |
| Search result and Cancel clear of the keyboard/status bar on iPhone 16e | [Place search](qa/plans/place-search-small-iphone.png) |
| Saved camp details after rereading the listing | [Camp detail](qa/plans/camp-detail.png) |
| Response choices and close action at enlarged text size | [Enlarged text](qa/plans/response-enlarged-text.png) |

The reproducible commands, fictional fixture contracts and named Maestro flows
are in [the local QA guide](../scripts/qa/README.md). Several early Maestro attempts
failed because XCTest exposed offscreen elements or a text-selection menu had
not opened. Those attempts were not counted as passes. The final flows retain
exact persistence assertions and use explicit scrolling/visible-state checks.
Actual UI regressions caught during this pass—place results behind Share, a stale
Done bar, and the modal status-bar overlap—were fixed and retested.

## Release boundary and remaining work

This is a local implementation. Production database state, tester emails and
TestFlight distribution were not changed by this pass. The new client requires
`20260912000000_plan_intent_and_schedules.sql` before distribution. Reconcile the
hosted migration ledger before release: the earlier presence/RSVP privacy
migrations also have local QA and must not be assumed deployed.
Older builds do not understand explicit intent or selected weekdays. Testers
must update to the new build before evaluating these plans; preserving the old
RPC signatures and date bounds does not add the new presentation to old clients.

New plans use the creator's device time zone; edits preserve the stored zone.
An explicit time-zone picker for planning a distant trip is deferred. Repeating
overnight sessions, holidays, per-date RSVP exceptions and monthly schedules are
outside this pass. Existing rows keep their original continuous date semantics.
Unsaved drafts survive failed requests and protected navigation, not app removal
or a process kill. Full VoiceOver, Android runtime and physical-device coverage
remain separate from simulator checks. Both iOS 26.3 simulators displayed fallback
glyphs for emoji in the baseline and changed app. Native CoreText logs confirm a
lookup for absent `Fonts/Core/AppleColorEmoji.ttc`, followed by `fallback to
LastResort`; the runtime instead contains `Fonts/CoreAddition/AppleColorEmoji-160px.ttc`.
The app's Unicode is intact. Verify rendering on a physical device before release.

Next improvements, in priority order:

1. Durable notifications for time/place changes and cancellations, tested through
   delivery and respecting visibility, blocks and notification preferences.
2. A deliberate calendar handoff. Android's installed Expo Calendar implementation
   does not preserve selected weekdays in a weekly rule; do not silently export
   a camp with the wrong schedule.
3. Account-scoped draft restoration after app termination and a simple time-zone
   choice for distant plans.
4. A small plan conversation if real usage demonstrates that RSVP notes leave
   important coordination questions unanswered. Date polls and per-session
   attendance should follow demonstrated need.

## Implementation references

- [SDK 54 documentation](https://docs.expo.dev/versions/v54.0.0/)
- [React Navigation removal protection](https://reactnavigation.org/docs/use-prevent-remove/)
- [React Native 0.81 modal behavior](https://reactnative.dev/docs/0.81/modal)
- [SDK 54 safe areas in native modals](https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/)

No framework upgrades or app dependencies were added.
