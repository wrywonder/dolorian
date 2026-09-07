-- Stable source keys let connected parents converge on one visible plan even
-- when a listing URL contains tracking parameters or reordered filters.
-- They are deliberately not globally unique: an invited-only plan must not
-- prevent an unrelated parent from creating a private plan or reveal that one
-- exists. RLS remains the visibility boundary.

alter table public.activities
  add column if not exists external_source_key text
  check (external_source_key is null or char_length(external_source_key) <= 700);

create index if not exists activities_external_source_key_idx
  on public.activities (external_source_key, created_at desc)
  where external_source_key is not null and published and cancelled_at is null;

create or replace function public.create_plan_v2(
  p_name text,
  p_description text,
  p_emoji text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean,
  p_visibility text,
  p_invited_parent_ids uuid[] default '{}'::uuid[],
  p_location_name text default null,
  p_location_address text default null,
  p_external_url text default null,
  p_cover_image_url text default null,
  p_external_source_key text default null
)
returns jsonb
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    payload jsonb;
    created_id uuid;
    created public.activities;
  begin
    if p_external_source_key is not null
      and char_length(btrim(p_external_source_key)) > 700 then
      raise exception 'Plan source key is too long';
    end if;

    payload := public.create_plan(
      p_name, p_description, p_emoji, p_starts_at, p_ends_at, p_all_day,
      p_visibility, p_invited_parent_ids, p_location_name, p_location_address,
      p_external_url, p_cover_image_url
    );
    created_id := (payload #>> '{plan,id}')::uuid;

    update public.activities
    set external_source_key = nullif(btrim(coalesce(p_external_source_key, '')), '')
    where id = created_id and created_by = public.current_parent_id()
    returning * into created;

    return payload || jsonb_build_object('plan', to_jsonb(created));
  end;
  $$;

create or replace function public.update_plan_v2(
  p_plan uuid,
  p_name text,
  p_description text,
  p_emoji text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean,
  p_visibility text,
  p_invited_parent_ids uuid[] default '{}'::uuid[],
  p_location_name text default null,
  p_location_address text default null,
  p_external_url text default null,
  p_cover_image_url text default null,
  p_external_source_key text default null
)
returns jsonb
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    payload jsonb;
    updated public.activities;
  begin
    if p_external_source_key is not null
      and char_length(btrim(p_external_source_key)) > 700 then
      raise exception 'Plan source key is too long';
    end if;

    payload := public.update_plan(
      p_plan, p_name, p_description, p_emoji, p_starts_at, p_ends_at,
      p_all_day, p_visibility, p_invited_parent_ids, p_location_name,
      p_location_address, p_external_url, p_cover_image_url
    );

    update public.activities
    set external_source_key = nullif(btrim(coalesce(p_external_source_key, '')), '')
    where id = p_plan and created_by = public.current_parent_id()
    returning * into updated;

    return payload || jsonb_build_object('plan', to_jsonb(updated));
  end;
  $$;

revoke all on function public.create_plan_v2(
  text, text, text, timestamptz, timestamptz, boolean, text, uuid[], text,
  text, text, text, text
), public.update_plan_v2(
  uuid, text, text, text, timestamptz, timestamptz, boolean, text, uuid[],
  text, text, text, text, text
) from public, anon;

grant execute on function public.create_plan_v2(
  text, text, text, timestamptz, timestamptz, boolean, text, uuid[], text,
  text, text, text, text
), public.update_plan_v2(
  uuid, text, text, text, timestamptz, timestamptz, boolean, text, uuid[],
  text, text, text, text, text
) to authenticated;
