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
place, and saves a manual place name. The fixture returns **Maple Playground in
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
