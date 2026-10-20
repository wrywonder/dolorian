-- Minimal Supabase prerequisites for a disposable PostgreSQL cluster only.
-- Auth, Storage HTTP services and PostgREST are NOT emulated.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;

create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;
grant usage on schema auth to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$$;
grant usage on schema storage to anon, authenticated, service_role;

-- Establish the previous defaults first, then explicitly disable them before
-- any application migration. This is the vendor's new-object opt-in behavior.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

create table public.default_grants_probe (id serial primary key);
do $$
begin
  assert not has_table_privilege('anon', 'public.default_grants_probe', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.default_grants_probe', 'INSERT');
  assert not has_table_privilege('service_role', 'public.default_grants_probe', 'SELECT');
  assert not has_sequence_privilege('authenticated', 'public.default_grants_probe_id_seq', 'USAGE');
end;
$$;
drop table public.default_grants_probe;
