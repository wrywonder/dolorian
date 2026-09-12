# Plans: product spec and design

Status: implemented locally. The implementation uses explicit gathering/signup intent, optional dates, bounded weekday repeats, a compact editor and response-first detail. [The concrete mobile designs](plans-design.html) show the hierarchy and visual language. Baseline findings below describe the pre-change repository; [delivery and verification notes](plans-improvement-pass.md) record the final results and release boundary. No production state was inspected or changed for this review.

## Product job

Help a parent answer three questions quickly: **What could we do with our friends? Who will be there? What do I need to do next?** A successful plan replaces a coordination text thread with one shared, understandable card. It does not become a booking system, team-management product, or calendar administration tool.

The two meaningful situations are a gathering people can attend and an activity people must sign up for elsewhere. House hangouts and park birthdays are gatherings. Soccer leagues and summer camps are usually signup activities. These should share one editor and one detail page, with small differences in response language and scheduling.

## Current experience, confirmed in code

| Journey | Working foundation | Friction or mismatch |
| --- | --- | --- |
| Create a house hangout | Name, details, manual/private place entry, start/end, connections or chosen invitees, keyboard helpers | The first full section explains link import. Emoji is an editable input beside the name. Publishing and three large audience choices are at the bottom of a long form. |
| Share a soccer league | External listing import, duplicate detection, dates, notes and signup status | No repeat schedule exists. A season is represented as one continuous interval and appears on every intervening calendar day. There is no distinction between season dates and session timing. |
| Share a summer camp | Date range, place, imported facts, signup notes for child/week/group | The editor suggests an all-day plan for camp weeks. This obscures useful daily hours and can misleadingly imply overnight attendance if entered as a timed range. |
| Invite friends to a birthday at a park | Place autocomplete, timed gathering, selected individual connections | Any external URL, including a park page or invitation information, turns the response into “Signed up.” Host identity is absent from cards and detail. |
| Decide whether to join | Three response states; saved details survive refresh; participant notes; original listing link | A tall hero/title/description precedes response and people. An unanswered plan offers “I'm in” on its card but opens another choice sheet. Counts say “families” even though storage represents individual parents. |
| Keep up with a changed plan | Owner edits and cancellation persist; focus refreshes load updated data; cancellation stays visible | Existing invitees are not notified of time/place changes or cancellation. The existing notification path handles newly invited people only. |

Evidence: `src/components/plans/plan-editor-screen.tsx`, `plan-detail-screen.tsx`, `ActivityCard.tsx`, `InterestSheet.tsx`, `SocialProofRow.tsx`; `src/app/(tabs)/plans.tsx`; `src/lib/plan-rsvp-copy.ts`, `plan-dates.ts`, `plan-import-draft.ts`, `data.ts`; `src/types/activities.ts`; plan create/update/cancel functions in `supabase/migrations/20260801010000_plan_visibility_and_rsvp.sql`.

Important existing conventions to retain: connections are the default audience; invited plans select individual accepted connections; no circles; source imports remain editable and honest when extraction fails; place lookup is explicit with private manual entry available; `KeyboardFrame` and `FormScrollView` handle forms; an RSVP is a parent's self-report, not proof of provider registration.

## Chosen coherent pass

### 1. Make creating a normal plan feel like sending a good invitation

Open directly into the useful fields, with the title focused only when doing so does not conceal context. Keep a single scrolling editor; avoid a wizard or mandatory category screen.

Editor hierarchy, shown after choosing a date:

```text
‹                         new plan

What's happening?
[ Pizza at ours                      ]
              have a signup link? add it

When
[ Sat, Sep 19 ] [ 4:00 pm ]  + end time
                         + more than one day

Where
[ Find a place or enter one          ]

With
[ My connections                ›   ]

+ a few details

[ Share plan                       → ]
Visible to your connections
```

Use the current serif, warm surface colors, a small emoji flourish and terracotta action. Let the visual personality come from a few existing details, rather than extra cards, helper paragraphs or configuration controls. Keep a visible action within the keyboard-aware layout. Essential information should be understandable without opening another screen.

The optional details section holds description and a supporting link. Emoji customization can be a small tappable decoration rather than a default form field. Place name is enough; do not require or infer a street address for a friend's home. Dates can be explicit or **Date to decide**; do not force a fake date to share a camp idea or a casual invitation. Show the chosen state clearly before sharing. An import without a reliable date remains undated until the parent chooses one.

An undated plan belongs after dated upcoming plans under a small “Date to decide” label, and is absent from calendar dots. Going/Maybe still express general intent; the UI must not suggest a calendar commitment. Clearing a date also clears its time/end schedule in the saved record. This provides flexibility without introducing a poll or another scheduling workflow.

Show a compact audience row rather than three large cards. Selecting it reveals “My connections” and “Choose friends”; public remains an explicit secondary option to preserve old behavior. Never silently widen visibility, including when switching between creation routes. Selected friends must remain visible as a count or short name summary before sharing.

### 2. Distinguish an invitation from registration

Make response intent explicit in the stored plan, independent of the existence of a URL. A supporting restaurant/park/party link must not turn a meetup into registration. An activity can need registration even when its link is unavailable.

Default to a gathering. The clear “have a signup link?” action may select signup intent because that action states what the link is for; a generic supporting-link field must preserve the current intent. The user can change intent in a short, understandable row, such as “Friends sign up separately.” Do not add several event types or category-specific forms.

Gathering responses: **Going / Maybe / Can't make it**. Signup responses: **Signed up / Considering / Not this time**. Show a provider action such as **Open signup page** beside a short, precise sentence: “Sign up with the organizer, then let friends know.” Opening a provider page must never mark a parent signed up. Creation also must not assert that a parent is registered.

An optional family note remains the simplest adequate answer to “which child, team, week or group?” Keep this free text, with a relevant example, and an explicit save action. Do not introduce child selection, attendance quantities, household profiles or pickup matching in this pass. Label counts “people” or “parents,” not “families,” until the data model actually identifies households.

Retain old plans without destructive conversion. When the new intent is absent, preserve their current URL-based behavior as a legacy fallback; editing can make it explicit. Carry the resolved intent consistently through list cards, the response sheet, detail, prompts and social proof.

### 3. Make multi-day plans honest and useful

The product needs a small schedule model, not a full recurrence engine. The recommended boundary is:

- **Once**: current start date/time, optional end, optional all-day.
- **Several days**: a genuine continuous trip/weekend or an all-day range, clearly labeled as a range.
- **Repeats weekly**: selected weekdays, daily start/end time, first date and required last date. This covers Saturday soccer and Monday–Friday camp sessions with one shared plan and response list.

Only reveal these options after “more than one day.” For repeats, render a plain summary such as “Saturdays, 9–10 am · Sep 19–Nov 14” or “Mon–Fri, 9 am–3 pm · Jul 6–10.” The calendar should mark actual selected weekdays; the list should identify the next occurrence. One plan-level response means the family's general participation, with exceptions in its note; communicate this and do not suggest per-session attendance tracking.

Persist the schedule in an explicit, validated shape. Keep existing rows and old RPC callers compatible. Make date rules one shared source for cards, details, filtering and calendar. A season boundary must never be silently interpreted as daily attendance. Daylight-saving transitions must retain the intended local start time.

The chosen implementation includes bounded weekday repeats, persisted and interpreted by shared schedule helpers. Repeat ranges are limited to one year. It does not add per-session RSVPs, exceptions, indefinite recurrence or a provider's complete timetable. Keep imported schedules editable; never convert unrelated listing sessions into an inferred repeat pattern.

### 4. Put the coordination answer first

Use a compact header or small artwork in detail, then title, date/schedule, place and the parent who shared it. A parent sharing an activity is not necessarily its organizer, so use **Shared by Alex**, not automatically “Hosted by Alex.” Keep this identity separate from attendance: a host need not invent an RSVP and a sharer need not be signed up.

Place the response choices and people immediately after these facts; optional prose and source material can follow. Collapse negative responses into a subdued summary when there are many. Make visible address text actionable with **Directions** when there is a usable address, with a recoverable error if maps cannot open. Do not send a private place to a provider until the user chooses that action.

On the main list, prioritize all upcoming visible plans/from-friends, with a prominent “My plans” shortcut that includes created plans plus going/interested responses. Keep calendar as a secondary view and keep existing advanced filters tucked away. A current personal response must be clear without opening a sheet. A fresh card should say **Respond** or **Who's in?** if it opens response choices; reserve **Going** for an actual persisted response.

## Acceptance scenarios

| Scenario | Expected outcome and verification |
| --- | --- |
| Pizza at a friend's house | Create a named, timed plan with a private manual place and two selected connections without interacting with import, registration, repeat or public controls. Reopen and verify the same audience/address. |
| Birthday at a park | Autocomplete a park, add a start/end and a supporting park URL; responses remain Going/Maybe. Keyboard dismissal and first-tap Share work on a small iPhone. Directions uses the selected address. |
| Soccer league | Share a registration URL, select Saturdays through season end, add the team in a saved note. Card/detail describe Saturday timing; calendar has Saturday dots and no Monday dot. Opening signup leaves RSVP unchanged. |
| Summer camp | Choose the actual camp week and Mon–Fri daily hours, or clearly labeled all-day dates if hours are unknown. Two parents can record distinct weeks/groups in notes without creating misleading household counts. |
| Sharing without attending | Parent creates a signup activity and remains uncommitted until explicitly responding. Shared-by identity appears independently of participant totals. |
| Date still to decide | Share a named plan without inventing a date; it appears after dated plans and is absent from calendar dots. Add a date later, then clear it again; the editor/detail/list remain consistent and old end times do not survive. |
| Edit and interruption | Reopen a legacy imported plan and preserve facts; failed import or place search keeps the manually entered draft; failed response save keeps the note and offers retry; saved status survives a failed refresh. |
| Schedule edge cases | Verify same-day end, midnight end, same-year and cross-year ranges, weekly next occurrence after today's session ends, no date outside the season, daylight-saving boundary and all-day inclusion. |
| Privacy | Public does not become the default. Chosen friends remain individually authorized. RSVP notes remain restricted by the existing server audience. No new private-address or child data is copied into analytics or automatic searches. |

Native QA should cover the four named user scenarios with existing fictional fixtures, plus focused regression tests for intent resolution and shared schedule helpers. Add SQL checks for any new persisted fields/RPCs. Compile and native rendering do not establish notification delivery or production RLS correctness.

## Deferred, in priority order

1. **Reliable plan-change delivery:** time/place edits and cancellation should create durable recipient notifications, with push as best effort. Include RSVP participants and invitees while honoring audience, blocks and preferences. High value, but needs a deliberate server/notification pass and delivery testing.
2. **External calendar handoff:** useful after the schedule model is correct. If added, create one user-confirmed event or a correctly bounded recurrence rather than a silent calendar write.
3. **Draft restoration and distant plans:** restore account-scoped drafts after app termination and allow an explicit time-zone choice when useful.
4. **Plan conversation:** a small question/update thread can prevent secondary texting, but it requires moderation/privacy/notification decisions. Free-text participant notes are sufficient for this pass; confirm the need in real usage before adding a shared conversation.
5. **Date polling, per-session attendance and exceptions:** only if repeated real usage demonstrates a need. Neither the camp nor league scenario justifies a team-management system yet.

Success should be judged by complete, low-friction user journeys rather than feature count: an ordinary invitation should be quick to make, the next useful action should be obvious, and the people/date information should be trustworthy.
