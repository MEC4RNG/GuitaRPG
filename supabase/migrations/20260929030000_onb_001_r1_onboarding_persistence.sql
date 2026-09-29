-- ONB-001-R1: atomic, owner-derived onboarding completion.
-- Authority: ONB-001, PLY-002, TAX-001.

begin;

create or replace function public.complete_player_onboarding(
  p_experience_background text,
  p_typical_session_minutes integer,
  p_challenge_preference text,
  p_calibration_status text,
  p_tuning_context_id uuid,
  p_goal text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_goal text := nullif(btrim(p_goal), '');
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authenticated Player required';
  end if;

  if not exists (
    select 1
    from public.taxonomy_entities
    where id = p_tuning_context_id
      and kind = 'CONTEXT'
      and lifecycle = 'ACTIVE'
      and metadata ->> 'context_family' = 'TUNING'
  ) then
    raise exception using
      errcode = '23514',
      message = 'tuning_context_id must reference an active TUNING Context taxonomy entity';
  end if;

  perform 1
  from public.player_profiles
  where player_id = caller_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Player profile is not initialized';
  end if;

  update public.player_tuning_preferences
  set is_default = false
  where player_id = caller_id
    and is_default
    and tuning_context_id <> p_tuning_context_id;

  insert into public.player_tuning_preferences (
    player_id,
    tuning_context_id,
    rank,
    is_default
  )
  values (caller_id, p_tuning_context_id, 1, true)
  on conflict (player_id, tuning_context_id) do update
  set rank = excluded.rank,
      is_default = excluded.is_default;

  if normalized_goal is not null
     and not exists (
       select 1
       from public.player_goals
       where player_id = caller_id
         and is_active
         and domain_id is null
         and skill_id is null
         and btrim(objective) = normalized_goal
     ) then
    insert into public.player_goals (player_id, objective, priority, is_active)
    values (caller_id, normalized_goal, 100, true);
  end if;

  update public.player_profiles
  set experience_background = p_experience_background,
      typical_session_minutes = p_typical_session_minutes,
      challenge_preference = p_challenge_preference,
      calibration_status = p_calibration_status,
      onboarding_status = 'COMPLETE'
  where player_id = caller_id;
end;
$$;

revoke all on function public.complete_player_onboarding(text, integer, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_player_onboarding(text, integer, text, text, uuid, text)
  to authenticated, service_role;

commit;
