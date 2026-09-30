-- PLY-003: atomic, owner-derived Profile editing.

begin;

create or replace function public.save_player_profile_v1(
  p_display_name text,
  p_experience_background text,
  p_typical_session_minutes integer,
  p_challenge_preference text,
  p_default_tuning_context_id uuid,
  p_goals jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  goal jsonb;
  goal_id uuid;
  goal_kind text;
  target_id uuid;
  normalized_objective text;
  submitted_ids uuid[] := array[]::uuid[];
  submitted_skills uuid[] := array[]::uuid[];
  submitted_domains uuid[] := array[]::uuid[];
  submitted_objectives text[] := array[]::text[];
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authenticated Player required';
  end if;
  if p_experience_background not in ('NEW_TO_GUITAR', 'SOME_EXPERIENCE', 'EXPERIENCED', 'UNSPECIFIED') then
    raise exception using errcode = '23514', message = 'invalid experience background';
  end if;
  if p_challenge_preference not in ('RELAXED', 'BALANCED', 'CHALLENGE', 'PUSH_ME') then
    raise exception using errcode = '23514', message = 'invalid challenge preference';
  end if;
  if p_typical_session_minutes is not null and p_typical_session_minutes not between 1 and 1440 then
    raise exception using errcode = '23514', message = 'typical session duration must be between 1 and 1440 minutes';
  end if;
  if jsonb_typeof(p_goals) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'goals must be a JSON array';
  end if;

  perform 1 from public.player_profiles where player_id = caller_id for update;
  if not found then
    raise exception using errcode = '23503', message = 'Player profile is not initialized';
  end if;

  if p_default_tuning_context_id is not null and not exists (
    select 1 from public.taxonomy_entities
    where id = p_default_tuning_context_id and kind = 'CONTEXT' and lifecycle = 'ACTIVE'
      and metadata ->> 'context_family' = 'TUNING'
  ) then
    raise exception using errcode = '23514', message = 'default tuning must reference an active TUNING Context';
  end if;

  for goal in select value from jsonb_array_elements(p_goals)
  loop
    if jsonb_typeof(goal) <> 'object' then
      raise exception using errcode = '22023', message = 'each goal must be an object';
    end if;
    goal_id := nullif(goal ->> 'id', '')::uuid;
    goal_kind := upper(coalesce(goal ->> 'kind', ''));
    target_id := nullif(goal ->> 'target_id', '')::uuid;
    normalized_objective := nullif(btrim(goal ->> 'objective'), '');

    if goal_id is not null then
      if goal_id = any(submitted_ids) then
        raise exception using errcode = '23505', message = 'duplicate goal id';
      end if;
      if not exists (select 1 from public.player_goals where id = goal_id and player_id = caller_id) then
        raise exception using errcode = '42501', message = 'goal does not belong to authenticated Player';
      end if;
      submitted_ids := array_append(submitted_ids, goal_id);
    end if;

    if goal_kind = 'SKILL' then
      if target_id is null or normalized_objective is not null or not exists (
        select 1 from public.taxonomy_entities where id = target_id and kind = 'SKILL' and lifecycle = 'ACTIVE'
      ) then
        raise exception using errcode = '23514', message = 'Skill goal must reference one active canonical Skill';
      end if;
      if target_id = any(submitted_skills) then
        raise exception using errcode = '23505', message = 'duplicate Skill goal';
      end if;
      submitted_skills := array_append(submitted_skills, target_id);
    elsif goal_kind = 'DOMAIN' then
      if target_id is null or normalized_objective is not null or not exists (
        select 1 from public.taxonomy_entities where id = target_id and kind = 'DOMAIN' and lifecycle = 'ACTIVE'
      ) then
        raise exception using errcode = '23514', message = 'Domain goal must reference one active canonical Domain';
      end if;
      if target_id = any(submitted_domains) then
        raise exception using errcode = '23505', message = 'duplicate Domain goal';
      end if;
      submitted_domains := array_append(submitted_domains, target_id);
    elsif goal_kind = 'OBJECTIVE' then
      target_id := null;
      if normalized_objective is null then
        raise exception using errcode = '23514', message = 'Practice note must not be empty';
      end if;
      if lower(normalized_objective) = any(submitted_objectives) then
        raise exception using errcode = '23505', message = 'duplicate practice note';
      end if;
      submitted_objectives := array_append(submitted_objectives, lower(normalized_objective));
    else
      raise exception using errcode = '23514', message = 'goal kind must be SKILL, DOMAIN, or OBJECTIVE';
    end if;

    if goal_id is null then
      insert into public.player_goals (player_id, domain_id, skill_id, objective, priority, is_active)
      values (
        caller_id,
        case when goal_kind = 'DOMAIN' then target_id end,
        case when goal_kind = 'SKILL' then target_id end,
        case when goal_kind = 'OBJECTIVE' then normalized_objective end,
        100,
        true
      ) returning id into goal_id;
      submitted_ids := array_append(submitted_ids, goal_id);
    else
      update public.player_goals
      set domain_id = case when goal_kind = 'DOMAIN' then target_id end,
          skill_id = case when goal_kind = 'SKILL' then target_id end,
          objective = case when goal_kind = 'OBJECTIVE' then normalized_objective end,
          is_active = true
      where id = goal_id and player_id = caller_id;
    end if;
  end loop;

  update public.player_profiles
  set display_name = nullif(btrim(p_display_name), ''),
      experience_background = p_experience_background,
      typical_session_minutes = p_typical_session_minutes,
      challenge_preference = p_challenge_preference
  where player_id = caller_id;

  update public.player_tuning_preferences set is_default = false
  where player_id = caller_id and is_default
    and (p_default_tuning_context_id is null or tuning_context_id <> p_default_tuning_context_id);

  if p_default_tuning_context_id is not null then
    insert into public.player_tuning_preferences (player_id, tuning_context_id, rank, is_default)
    values (caller_id, p_default_tuning_context_id, 1, true)
    on conflict (player_id, tuning_context_id) do update set is_default = true;
  end if;

  update public.player_goals set is_active = false
  where player_id = caller_id and is_active and not (id = any(submitted_ids));
end;
$$;

revoke all on function public.save_player_profile_v1(text, text, integer, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_player_profile_v1(text, text, integer, text, uuid, jsonb)
  to authenticated, service_role;

commit;
