# Local database regression tests

Run from the repository root on macOS or Linux, as a non-root user:

```sh
npm --prefix supabase/tests/local ci
npm --prefix supabase/tests/local test
```

The separate locked test package downloads PostgreSQL 17 and the Node client.
It does not change the mobile app's dependencies. Its install script restores
the binary distribution's library symlinks; do not disable that script.

The runner creates a new PostgreSQL cluster in a private temporary directory,
disables TCP, connects through its own Unix socket, and removes the cluster
afterward. It does not read `.env`, use Supabase CLI link metadata, or accept a
database URL. It never connects to an existing database. Sandboxed environments
may need permission for PostgreSQL's local shared memory and Unix socket.

## What is exercised

The bootstrap supplies the API roles, `auth.uid()`, and minimal Storage
tables/functions needed to replay every repository migration unchanged. Before
the first application migration, it establishes then revokes the legacy default
table and sequence privileges, using the behavior described in the
[Supabase announcement](https://github.com/orgs/supabase/discussions/45329).
A probe verifies that newly created objects receive no automatic API grants.

The new grants migration is applied twice to check repeatability. Catalog
snapshots verify that RLS policies/enforcement, function/default privileges, and
the existing client column permissions on parents/notifications are preserved.
Every `*.test.sql` in this directory then runs transactionally.

`api_grants.test.sql` uses actual `SET ROLE authenticated`, `anon`, and
`service_role` queries, rather than merely setting a JWT claim while retaining
superuser privileges. It checks:

- Feed joins, posts, reactions, comments, kid upserts/deletes, presence and
  hangout upserts, plan reads/interactions, prompts and calendar reads.
- Restricted parent columns, own-row writes and cross-user denials.
- RPC connection transitions, venue creation, plan creation/RSVP, private phone
  updates, reports, and push registration.
- Anonymous venue-directory reads and denial of private-table access.
- Push lookup, token cleanup, delivery acknowledgement, venue-photo cache
  updates, and the security-invoker admin report view's underlying grants.

To prove the new tests detect the original regression:

```sh
npm --prefix supabase/tests/local test -- --without-grants
```

This command **must exit nonzero** with the missing reaction-upsert grant
assertion from the new API test.
It skips only `20261020000000_explicit_api_grants.sql`. A setup error is not a
successful negative control.

To check compatibility with databases created under the previous defaults:

```sh
npm --prefix supabase/tests/local test -- --legacy-defaults
```

This also uses a fresh disposable cluster, but enables legacy grants before
replaying application migrations. It checks security-catalog preservation and
runs the existing RPC tests. It intentionally skips `api_grants.test.sql`'s
strict grant assertions: the additive migration does not remove old privileges.

## Grant scope

The migration adds the operations used by the current client and Edge Functions.
Parents' existing authenticated column grants and all Your Village/RPC grants
stay in their original migrations.

| Role | Relation | Added access |
| --- | --- | --- |
| authenticated | kids | SELECT, INSERT, UPDATE, DELETE |
| authenticated | posts, post_reactions | SELECT, INSERT, DELETE |
| authenticated | post_reactions | UPDATE post_id, parent_id, emoji (the client's upsert fields) |
| authenticated | post_comments | SELECT, INSERT |
| authenticated | parent_locations, parent_hangout_spots, activity_interactions | SELECT, INSERT, UPDATE |
| authenticated | connections, calendar_events | SELECT |
| authenticated | activities | SELECT, INSERT, UPDATE (legacy clients; existing RLS and schedule trigger apply) |
| authenticated | prompts | SELECT; UPDATE state only |
| anon, authenticated | venues | SELECT |
| service_role | parents | SELECT id, auth_user_id, display_name |
| service_role | connection_notifications | SELECT id, push_claimed_at; UPDATE push_sent_at, push_claimed_at |
| service_role | parent_push_tokens | SELECT token, parent_id; DELETE |
| service_role | venues | SELECT id; UPDATE google_place_id only |
| service_role | connection_reports | SELECT (required by the existing admin view) |
| service_role | activities | INSERT (admin directory entries) |

No current API caller uses stories/story_moments, so no access is added. No
sequence grants are needed for the application's UUID keys. No direct
connection, invite, private-contact, report or audit mutations are added. The
current schema explicitly supports legacy direct activity creation/updates and
service-role directory inserts in its policies and `plan_schedules.test.sql`;
those operations are included here without changing the validation trigger.

This is an additive compatibility migration, not a cleanup of old grants.
Existing databases keep any broader legacy privileges they already had; their
RLS and existing explicit revocations continue to enforce access. Future
migrations that create or recreate a table must include that table's intended
grants themselves.

## Limits

This is native PostgreSQL SQL/ACL/RLS coverage, not a full Supabase stack.
Auth HTTP, JWT verification, PostgREST embedding/schema cache behavior, Storage
HTTP, Realtime, and actual Edge Function/push delivery are not exercised.
The minimal bootstrap is test-only and is never a production migration.
The SQL tests contain PL/pgSQL assertions, not pgTAP output; this runner executes
them directly and treats any SQL error as failure.

The older `scripts/qa/test-database.mjs` PGlite runner retains legacy default
grants for historical RLS regression checks and explicitly skips this new strict
grant test. Use the native runner above for the full permissions suite.

## Release scope

This migration targets the schema released from `codex/coordination-quality-pass`,
including the service-only notification claim RPC and `push_claimed_at` lease
column. The [build 28 release record](../../docs/releases/2026-09-13-build-28.md)
identifies the existing Village project as `ymmvdepipjmqlustbdkr`.

Deployment requires separate approval. Before applying the migration, confirm
the target and hosted migration ledger, and verify that the pending SQL contains
only `20261020000000_explicit_api_grants.sql`. Apply no fixtures, seeds, role
definitions, or default-privilege changes. The application and Edge Function
code are unchanged, so this fix does not require a new TestFlight build or
function deployment.
