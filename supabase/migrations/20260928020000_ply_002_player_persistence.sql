-- PLY-002: Player profile and development persistence.
-- Authority: PLY-001, DATA-001, PROG-001, TAX-003.

begin;

create table public.player_profiles (
  player_id uuid primary key references auth.users(id) on delete cascade,
  display_name text null check (display_name is null or btrim(display_name) <> ''),
  locale text null check (locale is null or btrim(locale) <> ''),
  timezone text null check (timezone is null or btrim(timezone) <> ''),
  experience_background text not null default 'UNSPECIFIED'
    check (experience_background in ('NEW_TO_GUITAR', 'SOME_EXPERIENCE', 'EXPERIENCED', 'UNSPECIFIED')),
  onboarding_status text not null default 'NOT_STARTED'
    check (onboarding_status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE')),
  calibration_status text not null default 'NOT_STARTED'
    check (calibration_status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'SKIPPED')),
  challenge_preference text not null default 'BALANCED'
    check (challenge_preference in ('RELAXED', 'BALANCED', 'CHALLENGE', 'PUSH_ME')),
  typical_session_minutes integer null
    check (typical_session_minutes is null or typical_session_minutes between 1 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_tuning_preferences (
  player_id uuid not null references auth.users(id) on delete cascade,
  tuning_context_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  rank integer not null default 1 check (rank > 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, tuning_context_id)
);

create unique index player_tuning_preferences_one_default_idx
  on public.player_tuning_preferences (player_id)
  where is_default;

create table public.player_setups (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (btrim(label) <> ''),
  guitar_type text not null
    check (guitar_type in ('ELECTRIC', 'ACOUSTIC', 'CLASSICAL', 'OTHER_GUITAR')),
  string_count smallint not null default 6 check (string_count between 1 and 24),
  default_tuning_context_id uuid null references public.taxonomy_entities(id) on delete restrict,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index player_setups_one_default_idx
  on public.player_setups (player_id)
  where is_default;

create index player_setups_player_idx on public.player_setups (player_id);

create table public.player_goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  domain_id uuid null references public.taxonomy_entities(id) on delete restrict,
  skill_id uuid null references public.taxonomy_entities(id) on delete restrict,
  objective text null check (objective is null or btrim(objective) <> ''),
  priority integer not null default 100 check (priority >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    domain_id is not null
    or skill_id is not null
    or objective is not null
  )
);

create index player_goals_player_active_priority_idx
  on public.player_goals (player_id, is_active, priority);

create table public.player_skill_states (
  player_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  assessment_status text not null default 'UNRATED'
    check (assessment_status in ('UNRATED', 'ESTIMATED', 'ESTABLISHED')),
  visible_level text null check (visible_level is null or visible_level in ('I', 'II', 'III', 'IV', 'V')),
  proficiency_score numeric(5,2) null
    check (proficiency_score is null or proficiency_score between 0 and 100),
  confidence_score numeric(5,2) not null default 0
    check (confidence_score between 0 and 100),
  readiness_status text not null default 'UNKNOWN'
    check (readiness_status in ('UNKNOWN', 'LOW', 'MODERATE', 'HIGH')),
  readiness_score numeric(5,2) null
    check (readiness_score is null or readiness_score between 0 and 100),
  exposure_count bigint not null default 0 check (exposure_count >= 0),
  evidence_count bigint not null default 0 check (evidence_count >= 0),
  last_practiced_at timestamptz null,
  last_evidence_at timestamptz null,
  proficiency_model_version text not null default 'PROF_V1',
  confidence_model_version text not null default 'CONF_V1',
  readiness_model_version text not null default 'READY_V1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, skill_id),
  check (
    (
      assessment_status = 'UNRATED'
      and visible_level is null
      and proficiency_score is null
      and confidence_score = 0
      and readiness_status = 'UNKNOWN'
      and readiness_score is null
    )
    or (
      assessment_status in ('ESTIMATED', 'ESTABLISHED')
      and visible_level is not null
      and proficiency_score is not null
    )
  ),
  check (
    readiness_status <> 'UNKNOWN'
    or readiness_score is null
  ),
  check (
    assessment_status <> 'ESTABLISHED'
    or confidence_score >= 60
  ),
  check (
    visible_level is null
    or (
      visible_level = 'I' and proficiency_score >= 0 and proficiency_score < 20
    )
    or (
      visible_level = 'II' and proficiency_score >= 20 and proficiency_score < 40
    )
    or (
      visible_level = 'III' and proficiency_score >= 40 and proficiency_score < 60
    )
    or (
      visible_level = 'IV' and proficiency_score >= 60 and proficiency_score < 80
    )
    or (
      visible_level = 'V' and proficiency_score >= 80 and proficiency_score <= 100
    )
  )
);

create index player_skill_states_player_status_idx
  on public.player_skill_states (player_id, assessment_status);

create index player_skill_states_player_readiness_idx
  on public.player_skill_states (player_id, readiness_status);

create table public.player_character_states (
  player_id uuid primary key references auth.users(id) on delete cascade,
  practice_xp bigint not null default 0 check (practice_xp >= 0),
  character_level integer not null default 1 check (character_level >= 1),
  total_practice_seconds bigint not null default 0 check (total_practice_seconds >= 0),
  xp_model_version text not null default 'XP_V1',
  character_model_version text not null default 'CHAR_V1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_attribute_states (
  player_id uuid not null references auth.users(id) on delete cascade,
  attribute_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  assessment_status text not null default 'UNASSESSED'
    check (assessment_status in ('UNASSESSED', 'ESTIMATED', 'ESTABLISHED')),
  score numeric(5,2) null check (score is null or score between 0 and 100),
  attribute_model_version text not null default 'ATTR_V1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, attribute_id),
  check (
    (assessment_status = 'UNASSESSED' and score is null)
    or (assessment_status in ('ESTIMATED', 'ESTABLISHED') and score is not null)
  )
);

create or replace function private.player_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.player_validate_taxonomy_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actual_kind text;
begin
  if tg_table_name = 'player_tuning_preferences' then
    select kind into actual_kind
    from public.taxonomy_entities
    where id = new.tuning_context_id;

    if actual_kind is distinct from 'CONTEXT' then
      raise exception using
        errcode = '23514',
        message = 'tuning_context_id must reference a CONTEXT taxonomy entity';
    end if;
  elsif tg_table_name = 'player_setups' then
    if new.default_tuning_context_id is not null then
      select kind into actual_kind
      from public.taxonomy_entities
      where id = new.default_tuning_context_id;

      if actual_kind is distinct from 'CONTEXT' then
        raise exception using
          errcode = '23514',
          message = 'default_tuning_context_id must reference a CONTEXT taxonomy entity';
      end if;
    end if;
  elsif tg_table_name = 'player_goals' then
    if new.domain_id is not null then
      select kind into actual_kind
      from public.taxonomy_entities
      where id = new.domain_id;

      if actual_kind is distinct from 'DOMAIN' then
        raise exception using
          errcode = '23514',
          message = 'domain_id must reference a DOMAIN taxonomy entity';
      end if;
    end if;

    if new.skill_id is not null then
      select kind into actual_kind
      from public.taxonomy_entities
      where id = new.skill_id;

      if actual_kind is distinct from 'SKILL' then
        raise exception using
          errcode = '23514',
          message = 'skill_id must reference a SKILL taxonomy entity';
      end if;
    end if;
  elsif tg_table_name = 'player_skill_states' then
    select kind into actual_kind
    from public.taxonomy_entities
    where id = new.skill_id;

    if actual_kind is distinct from 'SKILL' then
      raise exception using
        errcode = '23514',
        message = 'player skill state must reference a SKILL taxonomy entity';
    end if;
  elsif tg_table_name = 'player_attribute_states' then
    select kind into actual_kind
    from public.taxonomy_entities
    where id = new.attribute_id;

    if actual_kind is distinct from 'ATTRIBUTE' then
      raise exception using
        errcode = '23514',
        message = 'player attribute state must reference an ATTRIBUTE taxonomy entity';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.player_enforce_immutable_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.player_id <> old.player_id then
    raise exception using
      errcode = '23514',
      message = 'player_id ownership is immutable';
  end if;

  return new;
end;
$$;

create or replace function private.ensure_player_state(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_profiles (player_id)
  values (p_player_id)
  on conflict (player_id) do nothing;

  insert into public.player_character_states (player_id)
  values (p_player_id)
  on conflict (player_id) do nothing;

  insert into public.player_skill_states (player_id, skill_id)
  select p_player_id, id
  from public.taxonomy_entities
  where kind = 'SKILL'
    and lifecycle = 'ACTIVE'
  on conflict (player_id, skill_id) do nothing;

  insert into public.player_attribute_states (player_id, attribute_id)
  select p_player_id, id
  from public.taxonomy_entities
  where kind = 'ATTRIBUTE'
    and lifecycle = 'ACTIVE'
  on conflict (player_id, attribute_id) do nothing;
end;
$$;

create or replace function private.bootstrap_new_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_player_state(new.id);
  return new;
end;
$$;

revoke all on function private.ensure_player_state(uuid) from public, anon, authenticated;
revoke all on function private.bootstrap_new_player() from public, anon, authenticated;
revoke all on function private.player_touch_updated_at() from public, anon, authenticated;
revoke all on function private.player_validate_taxonomy_refs() from public, anon, authenticated;
revoke all on function private.player_enforce_immutable_owner() from public, anon, authenticated;

grant execute on function private.ensure_player_state(uuid) to service_role;

drop trigger if exists on_auth_user_created_guitarrpg_player on auth.users;
create trigger on_auth_user_created_guitarrpg_player
after insert on auth.users
for each row execute function private.bootstrap_new_player();

create trigger player_profiles_touch_updated_at
before update on public.player_profiles
for each row execute function private.player_touch_updated_at();

create trigger player_tuning_preferences_touch_updated_at
before update on public.player_tuning_preferences
for each row execute function private.player_touch_updated_at();

create trigger player_setups_touch_updated_at
before update on public.player_setups
for each row execute function private.player_touch_updated_at();

create trigger player_goals_touch_updated_at
before update on public.player_goals
for each row execute function private.player_touch_updated_at();

create trigger player_skill_states_touch_updated_at
before update on public.player_skill_states
for each row execute function private.player_touch_updated_at();

create trigger player_character_states_touch_updated_at
before update on public.player_character_states
for each row execute function private.player_touch_updated_at();

create trigger player_attribute_states_touch_updated_at
before update on public.player_attribute_states
for each row execute function private.player_touch_updated_at();

create trigger player_profiles_immutable_owner
before update on public.player_profiles
for each row execute function private.player_enforce_immutable_owner();

create trigger player_tuning_preferences_immutable_owner
before update on public.player_tuning_preferences
for each row execute function private.player_enforce_immutable_owner();

create trigger player_setups_immutable_owner
before update on public.player_setups
for each row execute function private.player_enforce_immutable_owner();

create trigger player_goals_immutable_owner
before update on public.player_goals
for each row execute function private.player_enforce_immutable_owner();

create trigger player_skill_states_immutable_owner
before update on public.player_skill_states
for each row execute function private.player_enforce_immutable_owner();

create trigger player_character_states_immutable_owner
before update on public.player_character_states
for each row execute function private.player_enforce_immutable_owner();

create trigger player_attribute_states_immutable_owner
before update on public.player_attribute_states
for each row execute function private.player_enforce_immutable_owner();

create trigger player_tuning_preferences_validate_taxonomy
before insert or update on public.player_tuning_preferences
for each row execute function private.player_validate_taxonomy_refs();

create trigger player_setups_validate_taxonomy
before insert or update on public.player_setups
for each row execute function private.player_validate_taxonomy_refs();

create trigger player_goals_validate_taxonomy
before insert or update on public.player_goals
for each row execute function private.player_validate_taxonomy_refs();

create trigger player_skill_states_validate_taxonomy
before insert or update on public.player_skill_states
for each row execute function private.player_validate_taxonomy_refs();

create trigger player_attribute_states_validate_taxonomy
before insert or update on public.player_attribute_states
for each row execute function private.player_validate_taxonomy_refs();

alter table public.player_profiles enable row level security;
alter table public.player_tuning_preferences enable row level security;
alter table public.player_setups enable row level security;
alter table public.player_goals enable row level security;
alter table public.player_skill_states enable row level security;
alter table public.player_character_states enable row level security;
alter table public.player_attribute_states enable row level security;

revoke all on table public.player_profiles from anon, authenticated;
revoke all on table public.player_tuning_preferences from anon, authenticated;
revoke all on table public.player_setups from anon, authenticated;
revoke all on table public.player_goals from anon, authenticated;
revoke all on table public.player_skill_states from anon, authenticated;
revoke all on table public.player_character_states from anon, authenticated;
revoke all on table public.player_attribute_states from anon, authenticated;

grant select on table public.player_profiles to authenticated;
grant update (
  display_name,
  locale,
  timezone,
  experience_background,
  onboarding_status,
  calibration_status,
  challenge_preference,
  typical_session_minutes
) on public.player_profiles to authenticated;

grant select on table public.player_tuning_preferences to authenticated;
grant insert (player_id, tuning_context_id, rank, is_default)
  on public.player_tuning_preferences to authenticated;
grant update (rank, is_default)
  on public.player_tuning_preferences to authenticated;
grant delete on table public.player_tuning_preferences to authenticated;

grant select on table public.player_setups to authenticated;
grant insert (
  player_id,
  label,
  guitar_type,
  string_count,
  default_tuning_context_id,
  is_default
) on public.player_setups to authenticated;
grant update (
  label,
  guitar_type,
  string_count,
  default_tuning_context_id,
  is_default
) on public.player_setups to authenticated;
grant delete on table public.player_setups to authenticated;

grant select on table public.player_goals to authenticated;
grant insert (
  player_id,
  domain_id,
  skill_id,
  objective,
  priority,
  is_active
) on public.player_goals to authenticated;
grant update (
  domain_id,
  skill_id,
  objective,
  priority,
  is_active
) on public.player_goals to authenticated;
grant delete on table public.player_goals to authenticated;

grant select on table public.player_skill_states to authenticated;
grant select on table public.player_character_states to authenticated;
grant select on table public.player_attribute_states to authenticated;

grant all on table public.player_profiles to service_role;
grant all on table public.player_tuning_preferences to service_role;
grant all on table public.player_setups to service_role;
grant all on table public.player_goals to service_role;
grant all on table public.player_skill_states to service_role;
grant all on table public.player_character_states to service_role;
grant all on table public.player_attribute_states to service_role;

create policy player_profiles_owner_select
  on public.player_profiles
  for select
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_profiles_owner_update
  on public.player_profiles
  for update
  to authenticated
  using ((select auth.uid()) = player_id)
  with check ((select auth.uid()) = player_id);

create policy player_tuning_preferences_owner_select
  on public.player_tuning_preferences
  for select
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_tuning_preferences_owner_insert
  on public.player_tuning_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = player_id);

create policy player_tuning_preferences_owner_update
  on public.player_tuning_preferences
  for update
  to authenticated
  using ((select auth.uid()) = player_id)
  with check ((select auth.uid()) = player_id);

create policy player_tuning_preferences_owner_delete
  on public.player_tuning_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_setups_owner_select
  on public.player_setups
  for select
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_setups_owner_insert
  on public.player_setups
  for insert
  to authenticated
  with check ((select auth.uid()) = player_id);

create policy player_setups_owner_update
  on public.player_setups
  for update
  to authenticated
  using ((select auth.uid()) = player_id)
  with check ((select auth.uid()) = player_id);

create policy player_setups_owner_delete
  on public.player_setups
  for delete
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_goals_owner_select
  on public.player_goals
  for select
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_goals_owner_insert
  on public.player_goals
  for insert
  to authenticated
  with check ((select auth.uid()) = player_id);

create policy player_goals_owner_update
  on public.player_goals
  for update
  to authenticated
  using ((select auth.uid()) = player_id)
  with check ((select auth.uid()) = player_id);

create policy player_goals_owner_delete
  on public.player_goals
  for delete
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_skill_states_owner_select
  on public.player_skill_states
  for select
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_character_states_owner_select
  on public.player_character_states
  for select
  to authenticated
  using ((select auth.uid()) = player_id);

create policy player_attribute_states_owner_select
  on public.player_attribute_states
  for select
  to authenticated
  using ((select auth.uid()) = player_id);

select private.ensure_player_state(id)
from auth.users;

do $ply_002$
declare
  active_skill_count bigint;
  active_attribute_count bigint;
  missing_profile_count bigint;
  missing_character_count bigint;
  invalid_skill_bootstrap_count bigint;
  invalid_attribute_bootstrap_count bigint;
begin
  select count(*) into active_skill_count
  from public.taxonomy_entities
  where kind = 'SKILL' and lifecycle = 'ACTIVE';

  select count(*) into active_attribute_count
  from public.taxonomy_entities
  where kind = 'ATTRIBUTE' and lifecycle = 'ACTIVE';

  select count(*) into missing_profile_count
  from auth.users u
  left join public.player_profiles p on p.player_id = u.id
  where p.player_id is null;

  select count(*) into missing_character_count
  from auth.users u
  left join public.player_character_states c on c.player_id = u.id
  where c.player_id is null;

  select count(*) into invalid_skill_bootstrap_count
  from auth.users u
  where (
    select count(*)
    from public.player_skill_states s
    where s.player_id = u.id
  ) <> active_skill_count;

  select count(*) into invalid_attribute_bootstrap_count
  from auth.users u
  where (
    select count(*)
    from public.player_attribute_states a
    where a.player_id = u.id
  ) <> active_attribute_count;

  if active_skill_count <> 72 then
    raise exception 'PLY-002 expected 72 active canonical Skills, found %', active_skill_count;
  end if;

  if active_attribute_count <> 11 then
    raise exception 'PLY-002 expected 11 active canonical Attributes, found %', active_attribute_count;
  end if;

  if missing_profile_count <> 0 then
    raise exception 'PLY-002 found % Auth users without Player profiles', missing_profile_count;
  end if;

  if missing_character_count <> 0 then
    raise exception 'PLY-002 found % Auth users without Character state', missing_character_count;
  end if;

  if invalid_skill_bootstrap_count <> 0 then
    raise exception 'PLY-002 found % Auth users without complete UNRATED Skill rows', invalid_skill_bootstrap_count;
  end if;

  if invalid_attribute_bootstrap_count <> 0 then
    raise exception 'PLY-002 found % Auth users without complete UNASSESSED Attribute rows', invalid_attribute_bootstrap_count;
  end if;
end;
$ply_002$;

commit;
