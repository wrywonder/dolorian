-- Explicit gathering/signup intent and bounded weekday schedules. Null metadata
-- preserves old-client contiguous date ranges and URL-based intent.
alter table public.activities
  add column plan_kind text check (plan_kind in ('gathering', 'signup')),
  add column schedule_kind text check (schedule_kind in ('once', 'weekly')),
  add column schedule_days smallint[],
  add column schedule_timezone text;

-- Ordinary parents cannot publish ownerless directory entries that bypass the
-- creator's connection/block boundary. Service-role discovery remains supported.
drop policy if exists activities_insert_self on public.activities;
create policy activities_insert_self on public.activities
  for insert to authenticated with check (created_by = public.current_parent_id());

-- Resolve a local wall time without depending on PostgreSQL's default choice
-- of the later instant during a repeated DST hour. Match the client: earlier
-- matching instant wins, and a missing spring-forward time is rejected.
create or replace function public.plan_local_instant(p_local timestamp, p_timezone text)
returns timestamptz language sql stable
set search_path = public, pg_temp
as $$
  with samples as (
    select (p_local at time zone 'UTC') + delta * interval '1 hour' as instant
    from unnest(array[-36, 0, 36]) delta
  ), candidates as (
    select (p_local at time zone 'UTC') - ((instant at time zone p_timezone) - (instant at time zone 'UTC')) as instant
    from samples
  )
  select min(instant) from candidates where instant at time zone p_timezone = p_local;
$$;

create or replace function public.validate_plan_schedule(
  p_plan_kind text, p_schedule_kind text, p_schedule_days smallint[],
  p_timezone text, p_start timestamptz, p_end timestamptz, p_all_day boolean
)
returns void
language plpgsql stable
set search_path = public, pg_temp
as $$
declare
  first_local timestamp;
  last_local timestamp;
  occurrence timestamp;
  candidate timestamptz;
  day_cursor date;
begin
  if p_plan_kind is null or p_plan_kind not in ('gathering', 'signup') then raise exception 'Choose a valid plan type'; end if;
  if p_schedule_kind is null or p_schedule_kind not in ('once', 'weekly') then raise exception 'Choose a valid schedule'; end if;
  if p_timezone is null or char_length(p_timezone) > 100 or not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Choose a valid time zone';
  end if;
  if p_all_day is null then raise exception 'Choose whether the plan is all day'; end if;
  if p_schedule_days is null then raise exception 'Choose the days this plan repeats'; end if;
  if (p_start is not null and not isfinite(p_start)) or (p_end is not null and not isfinite(p_end)) then raise exception 'Choose a valid date'; end if;
  if p_end is not null and (p_start is null or p_end < p_start or (not p_all_day and p_end = p_start)) then raise exception 'Choose an end after the start of the plan'; end if;
  first_local := p_start at time zone p_timezone;
  last_local := p_end at time zone p_timezone;
  if p_all_day and ((first_local is not null and first_local::time <> time '00:00') or (last_local is not null and last_local::time <> time '00:00')) then
    raise exception 'All-day dates must start at midnight in the plan time zone';
  end if;
  if p_schedule_kind = 'once' then
    if cardinality(p_schedule_days) <> 0 then raise exception 'Choose repeating days only for a repeating plan'; end if;
    return;
  end if;
  if p_start is null or p_end is null then raise exception 'Repeating plans need a first date and a final date'; end if;
  if cardinality(p_schedule_days) < 1 or cardinality(p_schedule_days) > 7 or array_ndims(p_schedule_days) > 1
    or exists (select 1 from unnest(p_schedule_days) d where d is null or d < 0 or d > 6)
    or (select count(distinct d) from unnest(p_schedule_days) d) <> cardinality(p_schedule_days) then
    raise exception 'Choose the days this plan repeats';
  end if;
  if last_local::date - first_local::date > 366 then raise exception 'Choose a final date within one year of the first date'; end if;
  if not (extract(dow from first_local)::smallint = any(p_schedule_days)) or not (extract(dow from last_local)::smallint = any(p_schedule_days)) then
    raise exception 'The first and final dates must fall on one of the repeating days';
  end if;
  if not p_all_day and last_local::time <= first_local::time then raise exception 'Each repeated session needs an end time after its start on the same day'; end if;
  if date_trunc('minute', first_local) <> first_local or date_trunc('minute', last_local) <> last_local
    or public.plan_local_instant(first_local, p_timezone) <> p_start or public.plan_local_instant(last_local, p_timezone) <> p_end then
    raise exception 'Choose the first occurrence of that time when the clocks change, using whole minutes';
  end if;
  day_cursor := first_local::date;
  while day_cursor <= last_local::date loop
    if extract(dow from day_cursor)::smallint = any(p_schedule_days) then
      foreach occurrence in array array[day_cursor + first_local::time, day_cursor + last_local::time] loop
        candidate := public.plan_local_instant(occurrence, p_timezone);
        if candidate is null then
          raise exception 'A repeated session falls in a daylight-saving clock change. Choose another time';
        end if;
      end loop;
    end if;
    day_cursor := day_cursor + 1;
  end loop;
end;
$$;

-- Guard direct own-row edits too. Existing null-metadata activities are left
-- unchanged; invalid partial metadata cannot evade the new validation.
create or replace function public.validate_activity_schedule()
returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.plan_kind is not null or new.schedule_kind is not null or new.schedule_days is not null or new.schedule_timezone is not null then
    perform public.validate_plan_schedule(new.plan_kind, new.schedule_kind, new.schedule_days, new.schedule_timezone, new.starts_at, new.ends_at, new.all_day);
  end if;
  return new;
end;
$$;
create trigger activities_schedule_validation
  before insert or update of plan_kind, schedule_kind, schedule_days, schedule_timezone, starts_at, ends_at, all_day
  on public.activities for each row execute function public.validate_activity_schedule();

create or replace function public.create_plan_v3(
  p_name text,
  p_description text,
  p_emoji text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean,
  p_visibility text,
  p_plan_kind text,
  p_schedule_kind text,
  p_schedule_days smallint[],
  p_schedule_timezone text,
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
    me uuid := public.current_parent_id();
    created public.activities;
    invited uuid;
    notified uuid[] := '{}'::uuid[];
    actor_first_name text;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if char_length(btrim(coalesce(p_name, ''))) < 2 or char_length(btrim(p_name)) > 140 then
      raise exception 'Plan name must be between 2 and 140 characters';
    end if;
    perform public.validate_plan_schedule(p_plan_kind, p_schedule_kind, p_schedule_days, p_schedule_timezone, p_starts_at, p_ends_at, p_all_day);
    if char_length(coalesce(p_external_source_key, '')) > 700 then raise exception 'Plan source key is too long'; end if;
    if p_visibility = 'invited' and coalesce(cardinality(p_invited_parent_ids), 0) = 0 then raise exception 'Choose at least one connection'; end if;
    if p_ends_at is not null and p_ends_at < p_starts_at then
      raise exception 'End time must be after the start time';
    end if;
    if p_visibility is null or p_visibility not in ('public', 'connections', 'invited') then
      raise exception 'Choose a valid audience';
    end if;
    if p_external_url is not null and p_external_url !~ '^https?://' then
      raise exception 'Plan links must start with http:// or https://';
    end if;
    if p_cover_image_url is not null and p_cover_image_url !~ '^https?://' then
      raise exception 'Cover images must use an http or https link';
    end if;

    insert into public.activities (
      name, emoji, description, starts_at, ends_at, source, created_by,
      published, visibility, location_name, location_address, external_url,
      cover_image_url, all_day, updated_at, external_source_key,
      plan_kind, schedule_kind, schedule_days, schedule_timezone
    ) values (
      btrim(p_name), nullif(btrim(coalesce(p_emoji, '')), ''),
      nullif(btrim(coalesce(p_description, '')), ''), p_starts_at, p_ends_at,
      'user_created', me, true, p_visibility,
      nullif(btrim(coalesce(p_location_name, '')), ''),
      nullif(btrim(coalesce(p_location_address, '')), ''),
      nullif(btrim(coalesce(p_external_url, '')), ''),
      nullif(btrim(coalesce(p_cover_image_url, '')), ''),
      coalesce(p_all_day, false), now(), nullif(btrim(coalesce(p_external_source_key, '')), ''),
      p_plan_kind, p_schedule_kind, p_schedule_days, p_schedule_timezone
    ) returning * into created;

    select split_part(display_name, ' ', 1) into actor_first_name
    from public.parents where id = me;

    if p_visibility = 'invited' then
      foreach invited in array coalesce(p_invited_parent_ids, '{}'::uuid[]) loop
        if invited = me or not public.are_connected(me, invited) then
          raise exception 'Plans can only invite your current connections';
        end if;
        insert into public.plan_invites (plan_id, invited_parent_id, invited_by)
        values (created.id, invited, me) on conflict do nothing;
        if found and coalesce((
          select plan_invitations from public.parent_notification_preferences
          where parent_id = invited
        ), true) then
          insert into public.connection_notifications (
            recipient_id, actor_id, notification_type, title, body, url
          ) values (
            invited, me, 'plan_invite', 'You’re invited ✨',
            actor_first_name || ' invited you to ' || created.name || '.',
            '/plan/' || created.id::text
          );
          notified := array_append(notified, invited);
        end if;
      end loop;
    end if;

    return jsonb_build_object('plan', to_jsonb(created), 'notified_parent_ids', to_jsonb(notified));
  end;
  $$;

create or replace function public.update_plan_v3(
  p_plan uuid,
  p_name text,
  p_description text,
  p_emoji text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean,
  p_visibility text,
  p_plan_kind text,
  p_schedule_kind text,
  p_schedule_days smallint[],
  p_schedule_timezone text,
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
    me uuid := public.current_parent_id();
    updated public.activities;
    invited uuid;
    newly_added boolean;
    notified uuid[] := '{}'::uuid[];
    actor_first_name text;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if char_length(btrim(coalesce(p_name, ''))) < 2 or char_length(btrim(p_name)) > 140 then
      raise exception 'Plan name must be between 2 and 140 characters';
    end if;
    perform public.validate_plan_schedule(p_plan_kind, p_schedule_kind, p_schedule_days, p_schedule_timezone, p_starts_at, p_ends_at, p_all_day);
    if char_length(coalesce(p_external_source_key, '')) > 700 then raise exception 'Plan source key is too long'; end if;
    if p_visibility = 'invited' and coalesce(cardinality(p_invited_parent_ids), 0) = 0 then raise exception 'Choose at least one connection'; end if;
    if p_ends_at is not null and p_ends_at < p_starts_at then
      raise exception 'End time must be after the start time';
    end if;
    if p_visibility is null or p_visibility not in ('public', 'connections', 'invited') then
      raise exception 'Choose a valid audience';
    end if;
    if p_external_url is not null and p_external_url !~ '^https?://' then
      raise exception 'Plan links must start with http:// or https://';
    end if;
    if p_cover_image_url is not null and p_cover_image_url !~ '^https?://' then
      raise exception 'Cover images must use an http or https link';
    end if;

    update public.activities set
      name = btrim(p_name),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      emoji = nullif(btrim(coalesce(p_emoji, '')), ''),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      all_day = coalesce(p_all_day, false),
      plan_kind = p_plan_kind,
      schedule_kind = p_schedule_kind,
      schedule_days = p_schedule_days,
      schedule_timezone = p_schedule_timezone,
      external_source_key = nullif(btrim(coalesce(p_external_source_key, '')), ''),
      visibility = p_visibility,
      location_name = nullif(btrim(coalesce(p_location_name, '')), ''),
      location_address = nullif(btrim(coalesce(p_location_address, '')), ''),
      external_url = nullif(btrim(coalesce(p_external_url, '')), ''),
      cover_image_url = nullif(btrim(coalesce(p_cover_image_url, '')), ''),
      updated_at = now()
    where id = p_plan and created_by = me and cancelled_at is null
    returning * into updated;
    if updated.id is null then raise exception 'Editable plan not found'; end if;

    select split_part(display_name, ' ', 1) into actor_first_name
    from public.parents where id = me;

    if p_visibility = 'invited' then
      delete from public.plan_invites
      where plan_id = p_plan
        and not (invited_parent_id = any(coalesce(p_invited_parent_ids, '{}'::uuid[])));

      foreach invited in array coalesce(p_invited_parent_ids, '{}'::uuid[]) loop
        if invited = me or not public.are_connected(me, invited) then
          raise exception 'Plans can only invite your current connections';
        end if;
        newly_added := false;
        insert into public.plan_invites (plan_id, invited_parent_id, invited_by)
        values (p_plan, invited, me) on conflict do nothing;
        newly_added := found;
        if newly_added and coalesce((
          select plan_invitations from public.parent_notification_preferences
          where parent_id = invited
        ), true) then
          insert into public.connection_notifications (
            recipient_id, actor_id, notification_type, title, body, url
          ) values (
            invited, me, 'plan_invite', 'You’re invited ✨',
            actor_first_name || ' invited you to ' || updated.name || '.',
            '/plan/' || updated.id::text
          );
          notified := array_append(notified, invited);
        end if;
      end loop;
    else
      delete from public.plan_invites where plan_id = p_plan;
    end if;

    return jsonb_build_object('plan', to_jsonb(updated), 'notified_parent_ids', to_jsonb(notified));
  end;
  $$;

-- The sharer's identity is independent from RSVP status. Never expose auth IDs,
-- contact details, or a broader profile through the plan's visibility boundary.
create or replace function public.plan_shared_by(p_plan_ids uuid[])
returns table (
  plan_id uuid, parent_id uuid, display_name text, avatar_color text,
  avatar_initials text, avatar_url text, profile_visible boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select a.id, p.id, p.display_name, p.avatar_color, p.avatar_initials, p.avatar_url,
    (p.id = public.current_parent_id() or public.has_connection_edge(p.id, public.current_parent_id()))
  from public.activities a
  join public.parents p on p.id = a.created_by
  where a.id = any(coalesce(p_plan_ids, '{}'::uuid[]))
    and public.can_view_plan(a.id)
    and not public.is_blocked_between(p.id, public.current_parent_id());
$$;

revoke all on function public.plan_local_instant(timestamp, text) from public, anon;
grant execute on function public.plan_local_instant(timestamp, text) to authenticated;
revoke all on function public.validate_activity_schedule() from public, anon, authenticated;
revoke all on function public.validate_plan_schedule(text, text, smallint[], text, timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.validate_plan_schedule(text, text, smallint[], text, timestamptz, timestamptz, boolean) to authenticated;
revoke all on function public.plan_shared_by(uuid[]),
  public.create_plan_v3(text, text, text, timestamptz, timestamptz, boolean, text, text, text, smallint[], text, uuid[], text, text, text, text, text),
  public.update_plan_v3(uuid, text, text, text, timestamptz, timestamptz, boolean, text, text, text, smallint[], text, uuid[], text, text, text, text, text)
  from public, anon;
grant execute on function public.plan_shared_by(uuid[]),
  public.create_plan_v3(text, text, text, timestamptz, timestamptz, boolean, text, text, text, smallint[], text, uuid[], text, text, text, text, text),
  public.update_plan_v3(uuid, text, text, text, timestamptz, timestamptz, boolean, text, text, text, smallint[], text, uuid[], text, text, text, text, text)
  to authenticated;
