# New plans from friends

Creating a plan shared with **My connections** alerts the creator's current
connections by default. Legacy public audiences also notify only connections.
The notification names the parent and plan: “Alex shared Picnic. Want to join?”
Tapping opens that exact plan, where the parent can respond normally. It never
records an RSVP or registers a child with an organizer.

Invited-only plans alert just the selected people. Edits do not broadcast again;
newly added private invitees keep the existing invitation behavior. Pending
connection requests, strangers, the author, blocked relationships and parents who
turned off plan notifications are excluded. The existing preference is now
labeled **New plans & invitations**, under Your Village → Requests → notifications.
“Mute their posts” continues to apply only to Buzz, as its existing copy promises.

## Implementation and privacy

`create_plan_v3` creates the plan and eligible notification rows in one database
transaction. Its existing `notified_parent_ids` return field drives best-effort
remote delivery. Older v1/v2 creation RPCs remain unchanged. Build 26 and newer
already use v3; legacy private invitation requests remain compatible.

The app includes the plan ID in each delivery request. The Edge Function resolves
the authenticated parent and claims only an existing recent notification for that
actor, recipient, and plan. It never accepts caller-supplied notification copy.
The database checks current visibility, blocks, cancellation and the recipient's
preference at claim time. The recipient's foreground fallback applies the same
privacy boundaries through RLS. Already presented notifications cannot be recalled.

A one-minute lease prevents concurrent remote requests from claiming the same row.
Failures/no devices release it; crashed workers leave an expiring lease. The new
client's foreground fallback waits for active leases rather than racing delivery.
Expo requests have deadlines and batches of at most 100 devices. Invalid tokens
are removed. The existing 2.5-second client delivery budget ensures a slow push
service cannot make a successfully saved plan appear unsaved.

This retains the existing best-effort architecture: no new job queue, scheduler,
provider, credentials or notification category. A sender who closes the app before
dispatch or a push outage may leave a notification for the recipient's foreground
fallback. There is no durable background retry worker or push-receipt monitoring.
Those are the most useful follow-up if beta delivery proves unreliable. Expo
acceptance is not proof that a phone displayed the alert; notification permission
and a registered device are required.

## Verification

- 122 Node tests passed, including seven notification-handler regressions for auth,
  malformed requests, exact-plan/copy binding, old clients, failures, token removal
  and batching.
- All 25 migrations applied unchanged to ephemeral PostgreSQL; all ten SQL suites
  passed. The new suite exercises both connection directions, private audiences,
  opt-out, pending/blocked relationships, no edit spam, service-only claims,
  lease exclusion/recovery, sent deduplication, and privacy changes after creation.
- App TypeScript and the actual Deno Edge Function type checks passed.
- The loopback HTTP fixture contract passed. It explicitly records native push
  requests with `delivered: 0`; it never contacts Expo or real testers.
- iPhone 16e native flow passed against the loopback fixture: create a connections
  plan → two delivery requests with matching plan ID; edit → no additional
  requests; disable alerts → leave/reopen → re-enable, with persisted preference
  assertions. Notification switches now have accessibility labels. The initial
  fixture lacked blocked/suggested-parent reads; those explicit empty cases and
  preference defaults were added before the final successful run.
- Screenshots: [created plan](qa/plan-notifications/created.png) and
  [notification setting](qa/plan-notifications/setting.png).

A [synthetic APNs notification](qa/plan-notifications/synthetic-alert.png) appeared
in the iPhone 16e notification center.
The automated driver's taps did not open the system card. Direct computer-use
verification was then blocked because the Mac was locked. Actual notification-tap
navigation therefore remains unverified; the same plan route was exercised by
native deep links in the sharing pass, and exact payload routing is covered by
handler tests. No real tester or production push was sent.

The user authorized production publication on September 13. Both the plan-sharing
and notification migrations are live, and `connection-push` version 4 is active
with JWT verification enabled. Build 28 is approved and available to DCK Club.
See the [release record](releases/2026-09-13-build-28.md) for verified deployment
states and the separate pending website copy update.

Relevant official references: [SDK 54 notifications](https://docs.expo.dev/versions/v54.0.0/sdk/notifications/)
and [Expo push requests and tickets](https://docs.expo.dev/push-notifications/sending-notifications/).
