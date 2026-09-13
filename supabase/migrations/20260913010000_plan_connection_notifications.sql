-- New connections-visible plans use the existing invitation notification channel.
-- Keep old RPCs and notification types compatible with installed clients.
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
    else
      -- A share is one invitation to look, regardless of RSVP or schedule.
      -- Use both sides of the connection edge; a pending request is not a friend.
      with recipients as (
        select case when c.parent_a = me then c.parent_b else c.parent_a end as id
        from public.connections c
        where (c.parent_a = me or c.parent_b = me) and c.status = 'connected'
      ), inserted as (
        insert into public.connection_notifications (
          recipient_id, actor_id, notification_type, title, body, url
        )
        select r.id, me, 'plan_invite', 'A plan with friends ✨',
          actor_first_name || ' shared ' || created.name || '. Want to join?',
          '/plan/' || created.id::text
        from recipients r
        left join public.parent_notification_preferences pref on pref.parent_id = r.id
        where r.id <> me and not public.is_blocked_between(me, r.id)
          and coalesce(pref.plan_invitations, true)
        returning recipient_id
      )
      select coalesce(array_agg(recipient_id), '{}'::uuid[]) into notified from inserted;
    end if;

    return jsonb_build_object('plan', to_jsonb(created), 'notified_parent_ids', to_jsonb(notified));
  end;
  $$;


-- A short delivery lease prevents two client requests from sending the same row
-- concurrently. A failed/crashed worker leaves it available again after a minute.
alter table public.connection_notifications add column push_claimed_at timestamptz;

-- The foreground fallback must not reveal a plan after its audience changes,
-- cancellation, a block, or opting out. Existing non-plan notifications keep
-- their recipient-only policy. The activities subquery also enforces plan RLS.
drop policy connection_notifications_recipient on public.connection_notifications;
create policy connection_notifications_recipient on public.connection_notifications
  for select using (
    recipient_id = public.current_parent_id()
    and (
      notification_type <> 'plan_invite'
      or (
        coalesce((select pref.plan_invitations from public.parent_notification_preferences pref
          where pref.parent_id = public.current_parent_id()), true)
        and exists (
          select 1 from public.activities a
          where '/plan/' || a.id::text = connection_notifications.url
            and a.created_by = connection_notifications.actor_id
            and a.published and a.cancelled_at is null
            and (a.visibility = 'invited' or public.are_connected(a.created_by, public.current_parent_id()))
        )
      )
    )
  );

-- Called only by the authenticated Edge Function using the service role after
-- resolving the caller's parent ID. Supplying a plan narrows selection; it can
-- never create a notification, change its copy, or authorize another audience.
create function public.claim_connection_notification(
  p_actor uuid, p_recipient uuid, p_type text, p_plan uuid default null
) returns setof public.connection_notifications
  language sql volatile security definer
  set search_path = public, pg_temp
  as $$
    with eligible as (
      select n.id
      from public.connection_notifications n
      where n.actor_id = p_actor and n.recipient_id = p_recipient
        and n.notification_type = p_type
        and n.push_sent_at is null
        and n.created_at >= now() - interval '15 minutes'
        and (n.push_claimed_at is null or n.push_claimed_at < now() - interval '1 minute')
        and (p_plan is null or (p_type = 'plan_invite' and n.url = '/plan/' || p_plan::text))
        and (
          p_type <> 'plan_invite'
          or (
            coalesce((select pref.plan_invitations from public.parent_notification_preferences pref
              where pref.parent_id = p_recipient), true)
            and exists (
              select 1 from public.activities a
              where n.url = '/plan/' || a.id::text and a.created_by = p_actor
                and a.published and a.cancelled_at is null
                and not public.is_blocked_between(p_actor, p_recipient)
                and (
                  (a.visibility in ('connections', 'public') and public.are_connected(p_actor, p_recipient))
                  or (a.visibility = 'invited' and exists (
                    select 1 from public.plan_invites pi
                    where pi.plan_id = a.id and pi.invited_parent_id = p_recipient
                  ))
                )
            )
          )
        )
      order by n.created_at desc, n.id
      limit 1 for update of n skip locked
    )
    update public.connection_notifications n
      set push_claimed_at = clock_timestamp()
      from eligible e where n.id = e.id returning n.*;
  $$;
revoke all on function public.claim_connection_notification(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_connection_notification(uuid, uuid, text, uuid) to service_role;
