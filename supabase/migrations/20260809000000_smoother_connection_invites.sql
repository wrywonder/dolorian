-- Reuse one durable, revocable link so sharing with a few trusted parents is
-- immediate and does not consume the active-invite limit on every visit.

create or replace function public.get_or_create_connection_invite()
returns public.connection_invites
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    result public.connection_invites;
  begin
    if me is null then raise exception 'Not authenticated'; end if;

    select * into result
    from public.connection_invites
    where inviter_id = me
      and revoked_at is null
      and expires_at > now()
      and use_count < max_uses
    order by expires_at desc, created_at desc
    limit 1
    for update;

    if result.id is null then
      insert into public.connection_invites (inviter_id, expires_at, max_uses)
      values (me, now() + interval '30 days', 10)
      returning * into result;
      perform public.write_connection_audit(
        me,
        null,
        'invite_created',
        jsonb_build_object('invite_id', result.id, 'source', 'share_link')
      );
    end if;

    return result;
  end;
  $$;

create or replace function public.preview_connection_invite(p_reference text)
returns jsonb
  language plpgsql stable security definer
  set search_path = public, pg_temp
  as $$
  declare
    invite public.connection_invites;
    inviter public.parents;
    viewer uuid := public.current_parent_id();
  begin
    select * into invite from public.connection_invites
    where token::text = btrim(p_reference) or code = upper(btrim(p_reference))
    limit 1;
    if invite.id is null then return jsonb_build_object('found', false); end if;
    select * into inviter from public.parents where id = invite.inviter_id;
    return jsonb_build_object(
      'found', true,
      'active', invite.revoked_at is null and invite.expires_at > now() and invite.use_count < invite.max_uses,
      'already_connected', viewer is not null and public.are_connected(viewer, invite.inviter_id),
      'is_self', viewer = invite.inviter_id,
      'token', invite.token,
      'code', invite.code,
      'expires_at', invite.expires_at,
      'inviter', jsonb_build_object(
        'id', inviter.id,
        'display_name', inviter.display_name,
        'neighborhood', inviter.neighborhood,
        'avatar_color', inviter.avatar_color,
        'avatar_initials', inviter.avatar_initials,
        'avatar_url', inviter.avatar_url
      )
    );
  end;
  $$;

grant execute on function public.get_or_create_connection_invite() to authenticated;
