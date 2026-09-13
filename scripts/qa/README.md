# Local native QA

This pass uses the real native screens and Supabase client against an **in-memory
HTTP test double**, never a production account. This verifies UI, client requests,
and recovery, not Supabase authentication, RLS, push delivery, or device geofencing.

1. `node scripts/qa/server.mjs`
2. `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 EXPO_PUBLIC_SUPABASE_ANON_KEY=local-qa-only npx expo start --dev-client --localhost --port 8082 --no-dev`
3. Open the development build in an iOS simulator. Sign in as
   `parent@example.test`, using code `12345678`.

The server listens only on loopback. Data resets on restart. Unknown endpoints fail
explicitly. It supports the specific journeys covered in this pass, not arbitrary
Supabase queries. Do not configure a release build with these environment values.
Fixture timestamps use `America/Los_Angeles` regardless of the server host's zone.
The native scenarios assume the simulator and Maestro driver also use that zone;
time-zone conversion cases are covered by the separate schedule regression tests.

To simulate failures, POST JSON to `http://127.0.0.1:54329/__qa/control`, for example
`{"fail":["posts"]}` or `{"fail":["post_comments:POST"]}`. Clear with `{"fail":[]}`.
GET `/__qa/state` shows only fictional fixture data and recorded local mutations.

Use the SQL regression files separately to verify database authorization; this
server deliberately makes no claim to implement PostgreSQL policies.

## Native journey checks

The `flows/` directory contains Maestro flows. Use the installed Maestro CLI with
Java 17 or newer and pass the simulator UUID explicitly. Run `login.yaml` once on
a fresh app, then `irl.yaml`, `plans.yaml`, `feed.yaml`, `feed-recovery.yaml`, and
`memory.yaml`. Run these sequentially: their failure injection shares one server.
Run only one Maestro process at a time, including across simulator UUIDs: this
local toolchain shares its iOS driver port and concurrent runs can read the wrong
simulator's accessibility tree. Use `small-screen.yaml` after the Plans flow has
saved its RSVP note; `plan-edit.yaml` can repeat the edit-return check separately.

Example on this workspace's toolchain:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
MAESTRO_CLI_NO_ANALYTICS=1 maestro --udid SIMULATOR_UUID test \
  scripts/qa/flows/irl.yaml --test-output-dir /tmp/village-qa/screenshots
```

`photo.yaml` exercises the native picker and cropper twice: first switching a
selected photo to a thought and verifying no upload, then sharing a photo and
verifying the stored bytes, exact post fields, and caption in Buzz. Seed a safe
repository image into the target simulator's photo library first:

```sh
xcrun simctl addmedia SIMULATOR_UUID assets/icon-village.png
```

Open the app's Add photo picker and capture that asset's accessibility label
using `maestro --udid SIMULATOR_UUID hierarchy` while the picker is open. Labels include the asset's date/time,
so use the observed label from this simulator, not a date copied from another run.
Cancel back to the app before running the flow. Pass the label as a Maestro regex
parameter (the wildcard below tolerates the space before PM):

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
MAESTRO_CLI_NO_ANALYTICS=1 maestro --udid SIMULATOR_UUID test \
  -e 'QA_PHOTO_SELECTOR=Photo, September 07, 9:46.*PM' \
  scripts/qa/flows/photo.yaml --test-output-dir /tmp/village-qa/photo
```

The flow starts each composition from Buzz and expects to return there. It leaves
two uniquely captioned QA posts and one uploaded image for inspection; restarting
the local server clears them. Run it sequentially with the other flows.

`--no-dev` exercises production-mode JavaScript in the development native build.
Use Xcode's simulator signing, even for local ad-hoc builds: disabling signing
also omits the simulated Keychain entitlements. Do not manually sign the simulator
binary with device entitlements; macOS AMFI rejects those restricted capabilities.
The working local build command (after Expo prebuild/CocoaPods setup) is:

```sh
EXPO_NO_DOTENV=1 SKIP_BUNDLING=1 xcodebuild \
  -workspace ios/Village.xcworkspace -scheme Village \
  -configuration Debug -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=SIMULATOR_UUID' \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=756X7G9F7X build
```

This exercises local simulator entitlements, not real push delivery or distribution
signing. Close the development client's first-run menu before starting the flows.

The control endpoint also accepts `failAfterMutation`, e.g.
`{"failAfterMutation":{"trigger":"parent_locations:POST","fail":["parent_locations:GET"]}}`
to prove a successfully saved visit remains stoppable when its next refresh fails.
The same mechanism works for RPC writes: use trigger `set_plan_rsvp:POST` with
failure `activities:GET` to retain a successful response while its refresh fails.
Failures occur after recording/persisting the triggering write; resetting the
control does not roll back the saved fictional data.

## Database policies

Install the ephemeral PostgreSQL runtime outside the app's dependencies:

```sh
npm install --prefix /tmp/village-qa-pg --no-save @electric-sql/pglite@0.5.8
PGLITE_PACKAGE=/tmp/village-qa-pg/node_modules/@electric-sql/pglite \
  node scripts/qa/test-database.mjs
```

The harness applies every unmodified application migration and all SQL tests. It
supplies Supabase's platform auth/storage schemas and API role grants. New policy
tests switch to actual `authenticated`/`anon` PostgreSQL roles. This verifies SQL
and RLS, not the complete hosted Supabase service or external integrations.

`SQL_TEST=file.test.sql` selects one suite; `MIGRATION_CUTOFF=20260819999999`
reproduces the baseline failures before this pass's privacy migrations.

## Place picker and keyboard regression

`plan-place-keyboard.yaml` creates a plan through place search, resolves and edits
its address, saves/reopens it, checks search failure without losing the previous
place, rejects an address-details request after suggestions have loaded, and
saves a manual place name. Cancellation must also remove the keyboard's Done
toolbar. The fixture returns **Maple Playground in
Test City**, not a live Google result. Provider authentication/request/response
and failure contracts are separately tested in `tests/place-search.test.ts`.

`forms-keyboard.yaml` covers the lower safety-report field and submit control,
profile phone-pad dismissal and lower controls, and the IRL search sheet. It
submits only a fictional report, leaves the fictional phone edit unsaved, and
stops its test visit. Run sequentially with the existing Plans and feed flows.
Use iPhone 16e for the smaller screen and iPhone 17 Pro for a second layout size.

Inspect screenshots as well as accessibility assertions: iOS can report a button
as visible while it is partly behind the keyboard. Centre a lower control before
asserting/tapping it, and inspect the saved frame. Native text inputs can expose
their label and value separately; use the actual field value when checking a
reopened address. Select All before replacing an address so a cursor in the
middle cannot split the old text.

## Simple Plans coordination

Run these flows sequentially after login against the updated local server:

1. `plans-gatherings.yaml`: private house gathering with individual friends,
   unsaved Back protection, failed save/draft retry, date-to-decide edit, and park
   birthday with autocomplete, meetup instructions and a supporting link that
   keeps gathering attendance wording.
2. `plans-programs.yaml`: imported soccer on Saturdays, camp on weekdays with
   daily hours, and family-specific attendance notes that do not change the
   shared schedule.
3. `plans-import-recovery.yaml`: open existing coordination for a duplicate
   listing, replace a complete import with a partial one without retaining its
   facts, and recover an editable draft from a failed import.
4. `plans-recovery.yaml`: save an RSVP note, fail its immediate refresh, retry
   without a duplicate write, then reject/retry a response change.
5. `plans-calendar.yaml`: after the programs flow, open Saturday soccer, verify
   it is absent on Sunday, and find camp on Wednesday. It reloads the app first
   to reset the calendar month while keeping the fictional server data.
6. `plans-date-edit.yaml`: change the installed native date picker, create a
   dated plan with an end time, then explicitly change it to date-to-decide.
   It verifies the exact selected timestamp, that hidden date bounds were cleared and
   that sharing while typing does not leave a stale Done toolbar on detail.
7. `plans-reimport.yaml`: after the programs flow, save personal camp details
   and meetup instructions, then reopen and reread the same listing. The exact
   title, recurring schedule, local edits and family RSVP note must survive.
8. `plans-enlarged-text.yaml`: with the simulator set to `accessibility-medium`,
   create an undated plan using Share above the keyboard and open the existing
   picnic's response sheet. Inspect the editor and every response choice, then
   close the sheet. Restore the simulator's previous size after the run, including
   on failure. This is a bounded Dynamic Type check, not a VoiceOver audit.

Keep the existing `plans.yaml` and `plan-place-keyboard.yaml` as regressions for
today's all-day plans, invitation toggling, editing/navigation, and place-search
failure. Inspect the new screenshots on both supported simulator sizes; a
successful accessibility assertion alone does not establish keyboard clearance.

The explicit listing fixtures all use `https://example.test/`: `summer-camp`
returns next Monday–Friday 9–3, `soccer-league` returns a Saturday season 10–11,
`art-club` matches an existing plan, `partial-camp` returns no reliable schedule
or place, and `unavailable` returns a provider failure. The server never fetches
these URLs. Unknown listings fail rather than producing a success fixture.

`node scripts/qa/test-server.mjs` checks these HTTP fixture contracts on isolated
loopback port 54330, including v3 persistence, exact invites, sharer identity,
null/omitted/empty RSVP notes, local schedule hours and post-write failure
injection. `TZ=UTC node scripts/qa/test-server.mjs` also verifies that fixture
timestamps keep their Los Angeles interpretation on a different host. It starts
and stops its own server; it does not
touch a running native fixture server on 54329. Set `VILLAGE_QA_TEST_PORT` to use
another free local port. These checks establish the fixture's behavior, while
Node schedule tests and the separate SQL harness verify application logic and
database authorization. They do not verify hosted Supabase or Google services.
