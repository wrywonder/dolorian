-- Idempotent onboarding keeps partially-created Auth accounts recoverable when
-- a device closes or loses its connection after the OTP is verified.

create or replace function public.complete_onboarding(
  p_display_name text,
  p_neighborhood text,
  p_avatar_color text,
  p_avatar_initials text
)
returns public.parents
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    auth_user uuid := auth.uid();
    result public.parents;
    clean_name text := regexp_replace(btrim(coalesce(p_display_name, '')), '\s+', ' ', 'g');
    clean_neighborhood text := nullif(regexp_replace(btrim(coalesce(p_neighborhood, '')), '\s+', ' ', 'g'), '');
    clean_initials text := upper(btrim(coalesce(p_avatar_initials, '')));
  begin
    if auth_user is null then raise exception 'Not authenticated'; end if;
    if char_length(clean_name) < 2 or char_length(clean_name) > 80 then
      raise exception 'Display name must be between 2 and 80 characters';
    end if;
    if clean_neighborhood is not null and char_length(clean_neighborhood) > 80 then
      raise exception 'Neighborhood must be 80 characters or fewer';
    end if;
    if p_avatar_color not in ('peach','golden','sage','mauve','slate','rose','butter') then
      raise exception 'Choose a valid profile color';
    end if;
    if char_length(clean_initials) < 1 or char_length(clean_initials) > 3 then
      raise exception 'Profile initials must be between 1 and 3 characters';
    end if;

    insert into public.parents (
      auth_user_id, display_name, neighborhood, avatar_color, avatar_initials
    ) values (
      auth_user, clean_name, clean_neighborhood, p_avatar_color, clean_initials
    )
    on conflict (auth_user_id) do update set
      display_name = excluded.display_name,
      neighborhood = excluded.neighborhood,
      avatar_color = excluded.avatar_color,
      avatar_initials = excluded.avatar_initials
    returning * into result;

    insert into public.parent_notification_preferences (parent_id)
    values (result.id) on conflict (parent_id) do nothing;

    return result;
  end;
  $$;

revoke all on function public.complete_onboarding(text, text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, text) to authenticated;

