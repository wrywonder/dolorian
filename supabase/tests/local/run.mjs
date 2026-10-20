import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const here = fileURLToPath(new URL('.', import.meta.url));
const supabase = resolve(here, '../..');
const grantMigration = '20261020000000_explicit_api_grants.sql';
const withoutGrants = process.argv.includes('--without-grants');
const legacyDefaults = process.argv.includes('--legacy-defaults');
if (process.argv.slice(2).some((arg) => !['--without-grants', '--legacy-defaults'].includes(arg))
  || (withoutGrants && legacyDefaults)) {
  throw new Error('Choose at most one of --without-grants or --legacy-defaults; no database URL is accepted.');
}
if (process.platform === 'win32') {
  throw new Error('This socket-only runner requires macOS or Linux.');
}

// No env files, remote URLs, Supabase project links, or production credentials.
// A new private temporary directory contains both the cluster and Unix socket.
const temp = await mkdtemp(join(tmpdir(), 'village-grants-'));
const server = new EmbeddedPostgres({
  databaseDir: join(temp, 'data'),
  user: 'postgres',
  password: 'local-test-only',
  persistent: false,
  createPostgresUser: false,
  postgresFlags: ['-c', 'listen_addresses=', '-k', temp],
  onLog: () => {},
  onError: (error) => console.error(error),
});
const client = new pg.Client({
  host: temp,
  port: 5432,
  user: 'postgres',
  password: 'local-test-only',
  database: 'postgres',
  ssl: false,
  connectionTimeoutMillis: 10000,
});
let connected = false;
let stage = 'initializing disposable PostgreSQL';

async function file(path) {
  stage = path;
  await client.query(await readFile(path, 'utf8'));
}

try {
  await server.initialise();
  await server.start();
  await client.connect();
  connected = true;
  await client.query('set plpgsql.check_asserts = on');
  console.log((await client.query('select version()')).rows[0].version);
  await file(join(here, 'bootstrap.sql'));
  console.log('PASS: default table and sequence grants are disabled');
  if (legacyDefaults) {
    await client.query(`
      alter default privileges for role postgres in schema public
        grant select, insert, update, delete on tables to anon, authenticated, service_role;
      alter default privileges for role postgres in schema public
        grant usage, select on sequences to anon, authenticated, service_role;
    `);
    console.log('Legacy compatibility scenario: defaults restored before application migrations');
  }

  const migrations = (await readdir(join(supabase, 'migrations'))).filter((name) => name.endsWith('.sql')).sort();
  assert(migrations.includes(grantMigration), 'grants migration must be present');
  for (const name of migrations) {
    if (name === grantMigration) continue;
    await file(join(supabase, 'migrations', name));
  }
  console.log(`PASS: ${migrations.length - 1} existing migrations replayed`);

  // The patch must not rewrite RLS, function permissions, default privileges,
  // or existing restricted client column grants. Reapplying it must be harmless.
  const snapshot = async () => (await client.query(`
    select 'policy:' || oid::text as key, row_to_json(p)::text as value
    from pg_policy p
    union all
    select 'function:' || p.oid::text, coalesce(proacl::text, '')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
    union all
    select 'default:' || oid::text, row_to_json(d)::text from pg_default_acl d
    union all
    select 'rls:' || c.oid::text, relrowsecurity::text || ':' || relforcerowsecurity::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
    union all
    select 'client-column:' || attrelid::text || ':' || attname || ':' || role || ':' || operation,
      has_column_privilege(role, attrelid, attname, operation)::text
    from pg_attribute
    cross join (values ('anon'), ('authenticated')) roles(role)
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE')) operations(operation)
    where attrelid in ('public.parents'::regclass, 'public.connection_notifications'::regclass)
      and attnum > 0 and not attisdropped
    order by key
  `)).rows;
  const before = await snapshot();
  if (!withoutGrants) {
    await file(join(supabase, 'migrations', grantMigration));
    await file(join(supabase, 'migrations', grantMigration));
    assert.deepEqual(await snapshot(), before, 'Existing security boundaries must stay unchanged');
    console.log('PASS: repeatable migration preserves RLS, function/default ACLs and restricted client columns');
  }
  for (const name of (await readdir(resolve(here, '..'))).filter((name) => name.endsWith('.test.sql')).sort()) {
    if (legacyDefaults && name === 'api_grants.test.sql') {
      console.log('SKIP: strict fresh-grants assertions under legacy defaults (existing broad grants are retained)');
      continue;
    }
    await file(resolve(here, '..', name));
    console.log(`PASS: ${name}`);
  }
  if (withoutGrants) throw new Error('Negative control unexpectedly passed without the grants migration');
} catch (error) {
  console.error(`FAIL during ${stage}: ${error.message}`);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally {
  if (connected) await client.end();
  await server.stop();
  await rm(temp, { recursive: true, force: true });
}
// embedded-postgres's beforeExit hook otherwise replaces a failed exitCode with
// zero. All asynchronous cleanup is complete before this explicit exit.
process.exit(process.exitCode ?? 0);
