-- Public, village-visible, and invited-only plans with guarded RSVP access.

alter table public.activities
  add column if not exists visibility text not null default 'public',
  add column if not exists location_name text,
  add column if not exists location_address text,
  add column if not exists external_url text,
  add column if not exists cover_image_url text,
  add column if not exists all_day boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists cancelled_at timestamptz;

alter table public.activities
  drop constraint if exists activities_visibility_check;
alter table public.activities
  add constraint activities_visibility_check
  check (visibility in ('public', 'connections', 'invited'));

alter table public.activities
  drop constraint if exists activities_external_url_check;
alter table public.activities
  add constraint activities_external_url_check
  check (external_url is null or external_url ~ '^https?://');

alter table public.activity_interactions
  drop constraint if exists activity_interactions_state_check;
alter table public.activity_interactions
  add constraint activity_interactions_state_check
  check (state in ('saved', 'interested', 'going', 'attended', 'out', 'skipped'));

create table public.plan_invites (
  plan_id uuid not null references public.activities(id) on delete cascade,
  invited_parent_id uuid not null references public.parents(id) on delete cascade,
  invited_by uuid not null references public.parents(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, invited_parent_id)
);

create index plan_invites_parent_idx
  on public.plan_invites (invited_parent_id, created_at desc);

alter table public.parent_notification_preferences
  add column if not exists plan_invitations boolean not null default true;

alter table public.connection_notifications
  add column if not exists push_sent_at timestamptz;

alter table public.connection_notifications
  drop constraint if exists connection_notifications_notification_type_check;
alter table public.connection_notifications
  add constraint connection_notifications_notification_type_check
  check (notification_type in (
    'connection_request', 'connection_accepted', 'invite_redeemed', 'plan_invite'
  ));

create or replace function public.can_view_plan(p_plan uuid, p_viewer uuid)
returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select exists (
      select 1
      from public.activities a
      where a.id = p_plan
        and (
          a.created_by = p_viewer
          or (
            a.published
            and (
              a.created_by is null
              or a.visibility = 'public'
              or (
                a.visibility = 'connections'
                and public.are_connected(a.created_by, p_viewer)
              )
              or (
                a.visibility = 'invited'
                and exists (
                  select 1 from public.plan_invites pi
                  where pi.plan_id = a.id
                    and pi.invited_parent_id = p_viewer
                )
              )
            )
            and (
              a.created_by is null
              or not public.is_blocked_between(a.created_by, p_viewer)
            )
          )
        )
    );
  $$;

drop policy if exists activities_select_published_or_mine on public.activities;
create policy activities_select_visible_plans on public.activities
  for select using (public.can_view_plan(id, public.current_parent_id()));

alter table public.plan_invites enable row level security;
create policy plan_invites_participants_select on public.plan_invites
  for select using (
    invited_parent_id = public.current_parent_id()
    or exists (
      select 1 from public.activities a
      where a.id = plan_id and a.created_by = public.current_parent_id()
    )
  );

drop policy if exists ai_select_self_or_connected on public.activity_interactions;
create policy activity_interactions_visible_plan on public.activity_interactions
  for select using (
    parent_id = public.current_parent_id()
    or public.can_view_plan(activity_id, public.current_parent_id())
  );

drop policy if exists ai_write_own on public.activity_interactions;
create policy activity_interactions_write_own_visible on public.activity_interactions
  for all using (
    parent_id = public.current_parent_id()
    and public.can_view_plan(activity_id, public.current_parent_id())
  )
  with check (
    parent_id = public.current_parent_id()
    and public.can_view_plan(activity_id, public.current_parent_id())
  );

create or replace function public.plan_participants(p_plan_ids uuid[])
returns table (
  plan_id uuid,
  parent_id uuid,
  display_name text,
  neighborhood text,
  avatar_color text,
  avatar_initials text,
  avatar_url text,
  profile_visible boolean,
  state text,
  state_changed_at timestamptz
)
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select
      ai.activity_id,
      p.id,
      p.display_name,
      p.neighborhood,
      p.avatar_color,
      p.avatar_initials,
      p.avatar_url,
      (p.id = public.current_parent_id() or public.has_connection_edge(p.id, public.current_parent_id())),
      ai.state,
      ai.state_changed_at
    from public.activity_interactions ai
    join public.parents p on p.id = ai.parent_id
    where ai.activity_id = any(coalesce(p_plan_ids, '{}'::uuid[]))
      and ai.state in ('interested', 'going', 'attended', 'out')
      and public.can_view_plan(ai.activity_id, public.current_parent_id())
      and (
        p.id = public.current_parent_id()
        or not public.is_blocked_between(p.id, public.current_parent_id())
      );
  $$;

create or replace function public.create_plan(
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
  p_cover_image_url text default null
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
    if p_starts_at is null then raise exception 'Choose a start date'; end if;
    if p_ends_at is not null and p_ends_at < p_starts_at then
      raise exception 'End time must be after the start time';
    end if;
    if p_visibility not in ('public', 'connections', 'invited') then
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
      cover_image_url, all_day, updated_at
    ) values (
      btrim(p_name), nullif(btrim(coalesce(p_emoji, '')), ''),
      nullif(btrim(coalesce(p_description, '')), ''), p_starts_at, p_ends_at,
      'user_created', me, true, p_visibility,
      nullif(btrim(coalesce(p_location_name, '')), ''),
      nullif(btrim(coalesce(p_location_address, '')), ''),
      nullif(btrim(coalesce(p_external_url, '')), ''),
      nullif(btrim(coalesce(p_cover_image_url, '')), ''),
      coalesce(p_all_day, false), now()
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

create or replace function public.update_plan(
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
  p_cover_image_url text default null
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
    if p_starts_at is null then raise exception 'Choose a start date'; end if;
    if p_ends_at is not null and p_ends_at < p_starts_at then
      raise exception 'End time must be after the start time';
    end if;
    if p_visibility not in ('public', 'connections', 'invited') then
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

create or replace function public.cancel_plan(p_plan uuid)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    changed int;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    update public.activities set cancelled_at = now(), updated_at = now()
    where id = p_plan and created_by = me and cancelled_at is null;
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'Active plan not found'; end if;
  end;
  $$;

create or replace function public.set_plan_rsvp(p_plan uuid, p_state text)
returns public.activity_interactions
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    result public.activity_interactions;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if p_state not in ('interested', 'going', 'out') then raise exception 'Choose a valid RSVP'; end if;
    if not public.can_view_plan(p_plan, me) then raise exception 'Plan not found'; end if;
    if exists (select 1 from public.activities where id = p_plan and cancelled_at is not null) then
      raise exception 'This plan was cancelled';
    end if;
    insert into public.activity_interactions (
      parent_id, activity_id, state, state_changed_at, created_at
    ) values (me, p_plan, p_state, now(), now())
    on conflict (parent_id, activity_id) do update set
      state = excluded.state,
      state_changed_at = excluded.state_changed_at
    returning * into result;
    return result;
  end;
  $$;

create or replace function public.clear_plan_rsvp(p_plan uuid)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  begin
    delete from public.activity_interactions
    where parent_id = public.current_parent_id()
      and activity_id = p_plan
      and state in ('interested', 'going', 'attended', 'out');
  end;
  $$;

grant select on public.plan_invites to authenticated;
revoke update on table public.connection_notifications from authenticated;
grant update (read_at) on table public.connection_notifications to authenticated;

revoke all on function public.can_view_plan(uuid, uuid),
  public.plan_participants(uuid[]),
  public.create_plan(text, text, text, timestamptz, timestamptz, boolean, text, uuid[], text, text, text, text),
  public.update_plan(uuid, text, text, text, timestamptz, timestamptz, boolean, text, uuid[], text, text, text, text),
  public.cancel_plan(uuid),
  public.set_plan_rsvp(uuid, text),
  public.clear_plan_rsvp(uuid)
from public, anon;

grant execute on function public.can_view_plan(uuid, uuid),
  public.plan_participants(uuid[]),
  public.create_plan(text, text, text, timestamptz, timestamptz, boolean, text, uuid[], text, text, text, text),
  public.update_plan(uuid, text, text, text, timestamptz, timestamptz, boolean, text, uuid[], text, text, text, text),
  public.cancel_plan(uuid),
  public.set_plan_rsvp(uuid, text),
  public.clear_plan_rsvp(uuid)
to authenticated;
