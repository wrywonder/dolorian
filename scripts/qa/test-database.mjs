/** Run repository SQL against ephemeral PostgreSQL (PGlite), with Supabase
 * infrastructure schemas bootstrapped below. No network or production access.
 * PGLITE_PACKAGE must point at an independently installed @electric-sql/pglite.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '../..');
const pkg = process.env.PGLITE_PACKAGE;
if (!pkg) throw new Error('Set PGLITE_PACKAGE to an absolute installed @electric-sql/pglite directory.');
const { PGlite } = await import(pathToFileURL(resolve(pkg, 'dist/index.js')));
const { uuid_ossp } = await import(pathToFileURL(resolve(pkg, 'dist/contrib/uuid_ossp.js')));
const { pgcrypto } = await import(pathToFileURL(resolve(pkg, 'dist/contrib/pgcrypto.js')));
const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
try {
  // These are platform-provided objects, not application migrations. Broad
  // Supabase API grants are intentional so the tests exercise real RLS.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean default false);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
    $$;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant all on all tables in schema storage to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
  const migrations = (await readdir(resolve(root, 'supabase/migrations')))
    .filter((f) => f.endsWith('.sql') && (!process.env.MIGRATION_CUTOFF || f <= process.env.MIGRATION_CUTOFF)).sort();
  for (const file of migrations) {
    try { await db.exec(await readFile(resolve(root, 'supabase/migrations', file), 'utf8')); }
    catch (error) { throw new Error(`Migration ${file}: ${error.message}`, { cause: error }); }
  }
  console.log(`Applied ${migrations.length} unmodified migrations to embedded PostgreSQL.`);
  const files = (await readdir(resolve(root, 'supabase/tests')))
    .filter((f) => f.endsWith('.test.sql') && (!process.env.SQL_TEST || f === process.env.SQL_TEST)).sort();
  for (const file of files) {
    try { await db.exec(await readFile(resolve(root, 'supabase/tests', file), 'utf8')); }
    catch (error) { throw new Error(`SQL regression ${file}: ${error.message}`, { cause: error }); }
    console.log(`PASS ${file}`);
  }
} finally { await db.close(); }
