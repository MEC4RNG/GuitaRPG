-- QST-002: immutable player-owned resolved Quest instances.
-- Authority: QST-001, DATA-001, TAX-001, DIF-001, EVD-001, PROG-001.

begin;

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  title text not null check (btrim(title) <> ''),
  schema_version smallint not null default 1 check (schema_version = 1),
  quest_type text not null check (quest_type in ('TECHNIQUE', 'PERFORMANCE', 'EXPLORATION', 'CREATIVE', 'KNOWLEDGE')),
  origin text not null check (btrim(origin) <> ''),
  primary_domain_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  purpose_reason text not null check (purpose_reason in ('DEVELOP_SKILL', 'REFRESH_SKILL', 'EXPLORE', 'APPLY_CONCEPT', 'CREATE', 'ASSESS')),
  generation_mode text not null check (generation_mode in ('QUICK', 'CUSTOM', 'TRAINING', 'DAILY', 'CALIBRATION', 'CAMPAIGN')),
  primary_skill_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  execution jsonb not null check (jsonb_typeof(execution) = 'object'),
  completion_contract jsonb not null check (
    jsonb_typeof(completion_contract) = 'object'
    and completion_contract -> 'mastery_claimed' = 'false'::jsonb
  ),
  verification_profile jsonb not null check (jsonb_typeof(verification_profile) = 'object'),
  difficulty_profile jsonb not null check (jsonb_typeof(difficulty_profile) = 'object'),
  declared_overall_demand text not null check (declared_overall_demand in ('I', 'II', 'III', 'IV', 'V')),
  rewards jsonb not null check (
    jsonb_typeof(rewards) = 'object'
    and rewards -> 'fixed_xp' = 'null'::jsonb
    and rewards -> 'progression_effects_embedded' = 'false'::jsonb
  ),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  resolved_snapshot jsonb not null check (
    jsonb_typeof(resolved_snapshot) = 'object'
    and resolved_snapshot -> 'identity' -> 'schema_version' = '1'::jsonb
    and not (resolved_snapshot ? 'outcome')
    and not (resolved_snapshot ? 'result')
    and not (resolved_snapshot ? 'reflection')
    and not (resolved_snapshot ? 'xp')
    and not (resolved_snapshot ? 'progression')
  ),
  created_at timestamptz not null default now(),
  unique (player_id, slug)
);

create table public.quest_skill_roles (
  quest_id uuid not null references public.quests(id) on delete cascade,
  skill_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  role text not null check (role in ('SECONDARY_SKILL', 'REQUIRED_TECHNIQUE')),
  ordinal smallint not null check (ordinal between 1 and 2),
  primary key (quest_id, skill_id),
  unique (quest_id, role, ordinal)
);

create table public.quest_concepts (
  quest_id uuid not null references public.quests(id) on delete cascade,
  concept_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  ordinal smallint not null check (ordinal > 0),
  primary key (quest_id, concept_id),
  unique (quest_id, ordinal)
);

create table public.quest_contexts (
  quest_id uuid not null references public.quests(id) on delete cascade,
  context_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  role text not null check (role in ('TUNING', 'TONAL_CENTER', 'STYLE', 'PLAYING_ROLE', 'ACCOMPANIMENT')),
  ordinal smallint not null default 1 check (ordinal > 0),
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  primary key (quest_id, context_id, role),
  unique (quest_id, role, ordinal)
);

create unique index quest_contexts_one_style_idx on public.quest_contexts (quest_id) where role = 'STYLE';

create table public.quest_constraints (
  quest_id uuid not null references public.quests(id) on delete cascade,
  constraint_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  ordinal smallint not null check (ordinal between 1 and 3),
  parameters jsonb not null check (jsonb_typeof(parameters) = 'object'),
  primary key (quest_id, constraint_id),
  unique (quest_id, ordinal)
);

create table public.quest_objective_criteria (
  quest_id uuid not null references public.quests(id) on delete cascade,
  ordinal smallint not null check (ordinal > 0),
  metric text not null check (btrim(metric) <> ''),
  operator text not null check (operator in ('EQ', 'GTE', 'LTE')),
  criterion_value jsonb not null check (jsonb_typeof(criterion_value) in ('number', 'string', 'boolean')),
  unit text not null check (btrim(unit) <> ''),
  primary key (quest_id, ordinal)
);

create index quests_player_created_idx on public.quests (player_id, created_at desc);
create index quests_player_type_idx on public.quests (player_id, quest_type);

create or replace function private.quest_validate_taxonomy_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actual_kind text; actual_family text;
begin
  if tg_table_name = 'quests' then
    select kind into actual_kind from public.taxonomy_entities where id = new.primary_domain_id;
    if actual_kind is distinct from 'DOMAIN' then raise exception using errcode = '23514', message = 'primary_domain_id must reference a DOMAIN taxonomy entity'; end if;
    select kind into actual_kind from public.taxonomy_entities where id = new.primary_skill_id;
    if actual_kind is distinct from 'SKILL' then raise exception using errcode = '23514', message = 'primary_skill_id must reference a SKILL taxonomy entity'; end if;
  elsif tg_table_name = 'quest_skill_roles' then
    select kind into actual_kind from public.taxonomy_entities where id = new.skill_id;
    if actual_kind is distinct from 'SKILL' then raise exception using errcode = '23514', message = 'quest skill role must reference a SKILL taxonomy entity'; end if;
  elsif tg_table_name = 'quest_concepts' then
    select kind into actual_kind from public.taxonomy_entities where id = new.concept_id;
    if actual_kind is distinct from 'CONCEPT' then raise exception using errcode = '23514', message = 'quest concept must reference a CONCEPT taxonomy entity'; end if;
  elsif tg_table_name = 'quest_contexts' then
    select kind, metadata ->> 'context_family' into actual_kind, actual_family from public.taxonomy_entities where id = new.context_id;
    if actual_kind is distinct from 'CONTEXT' then raise exception using errcode = '23514', message = 'quest context must reference a CONTEXT taxonomy entity'; end if;
    if new.role = 'TUNING' and actual_family is distinct from 'TUNING' then raise exception using errcode = '23514', message = 'TUNING quest context must reference a TUNING Context taxonomy entity'; end if;
  elsif tg_table_name = 'quest_constraints' then
    select kind into actual_kind from public.taxonomy_entities where id = new.constraint_id;
    if actual_kind is distinct from 'CONSTRAINT' then raise exception using errcode = '23514', message = 'quest constraint must reference a CONSTRAINT taxonomy entity'; end if;
  end if;
  return new;
end;
$$;

create or replace function private.quest_validate_composition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare q uuid; primary_id uuid; secondary_count bigint; required_count bigint; concept_count bigint; constraint_count bigint; criteria_count bigint;
begin
  if tg_table_name = 'quests' then
    q := coalesce(new.id, old.id);
  else
    q := coalesce(new.quest_id, old.quest_id);
  end if;
  select primary_skill_id into primary_id from public.quests where id = q;
  if primary_id is null then return null; end if;
  select count(*) filter (where role = 'SECONDARY_SKILL'), count(*) filter (where role = 'REQUIRED_TECHNIQUE') into secondary_count, required_count from public.quest_skill_roles where quest_id = q;
  select count(*) into concept_count from public.quest_concepts where quest_id = q;
  select count(*) into constraint_count from public.quest_constraints where quest_id = q;
  select count(*) into criteria_count from public.quest_objective_criteria where quest_id = q;
  if exists (select 1 from public.quest_skill_roles where quest_id = q and skill_id = primary_id) then raise exception using errcode = '23514', message = 'primary Skill cannot appear in another Quest Skill role'; end if;
  if secondary_count > 2 or required_count > 2 then raise exception using errcode = '23514', message = 'Quest Skill role count exceeds QST-001 maximum'; end if;
  if concept_count < 1 then raise exception using errcode = '23514', message = 'Quest requires at least one canonical Concept'; end if;
  if constraint_count not between 1 and 3 then raise exception using errcode = '23514', message = 'Quest requires one to three Constraints'; end if;
  if criteria_count < 1 then raise exception using errcode = '23514', message = 'Quest requires at least one Objective criterion'; end if;
  return null;
end;
$$;

revoke all on function private.quest_validate_taxonomy_refs() from public, anon, authenticated;
revoke all on function private.quest_validate_composition() from public, anon, authenticated;

create trigger quests_validate_taxonomy before insert or update on public.quests for each row execute function private.quest_validate_taxonomy_refs();
create trigger quest_skill_roles_validate_taxonomy before insert or update on public.quest_skill_roles for each row execute function private.quest_validate_taxonomy_refs();
create trigger quest_concepts_validate_taxonomy before insert or update on public.quest_concepts for each row execute function private.quest_validate_taxonomy_refs();
create trigger quest_contexts_validate_taxonomy before insert or update on public.quest_contexts for each row execute function private.quest_validate_taxonomy_refs();
create trigger quest_constraints_validate_taxonomy before insert or update on public.quest_constraints for each row execute function private.quest_validate_taxonomy_refs();

create constraint trigger quests_validate_composition after insert on public.quests deferrable initially deferred for each row execute function private.quest_validate_composition();
create constraint trigger quest_skill_roles_validate_composition after insert or delete on public.quest_skill_roles deferrable initially deferred for each row execute function private.quest_validate_composition();
create constraint trigger quest_concepts_validate_composition after insert or delete on public.quest_concepts deferrable initially deferred for each row execute function private.quest_validate_composition();
create constraint trigger quest_constraints_validate_composition after insert or delete on public.quest_constraints deferrable initially deferred for each row execute function private.quest_validate_composition();
create constraint trigger quest_objective_criteria_validate_composition after insert or delete on public.quest_objective_criteria deferrable initially deferred for each row execute function private.quest_validate_composition();

alter table public.quests enable row level security;
alter table public.quest_skill_roles enable row level security;
alter table public.quest_concepts enable row level security;
alter table public.quest_contexts enable row level security;
alter table public.quest_constraints enable row level security;
alter table public.quest_objective_criteria enable row level security;

revoke all on table public.quests, public.quest_skill_roles, public.quest_concepts, public.quest_contexts, public.quest_constraints, public.quest_objective_criteria from anon, authenticated;
grant select, insert, delete on table public.quests to authenticated;
grant select, insert, delete on table public.quest_skill_roles, public.quest_concepts, public.quest_contexts, public.quest_constraints, public.quest_objective_criteria to authenticated;
grant all on table public.quests, public.quest_skill_roles, public.quest_concepts, public.quest_contexts, public.quest_constraints, public.quest_objective_criteria to service_role;

create policy quests_owner_select on public.quests for select to authenticated using ((select auth.uid()) = player_id);
create policy quests_owner_insert on public.quests for insert to authenticated with check ((select auth.uid()) = player_id);
create policy quests_owner_delete on public.quests for delete to authenticated using ((select auth.uid()) = player_id);

create policy quest_skill_roles_owner_select on public.quest_skill_roles for select to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_skill_roles_owner_insert on public.quest_skill_roles for insert to authenticated with check (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_skill_roles_owner_delete on public.quest_skill_roles for delete to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_concepts_owner_select on public.quest_concepts for select to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_concepts_owner_insert on public.quest_concepts for insert to authenticated with check (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_concepts_owner_delete on public.quest_concepts for delete to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_contexts_owner_select on public.quest_contexts for select to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_contexts_owner_insert on public.quest_contexts for insert to authenticated with check (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_contexts_owner_delete on public.quest_contexts for delete to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_constraints_owner_select on public.quest_constraints for select to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_constraints_owner_insert on public.quest_constraints for insert to authenticated with check (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_constraints_owner_delete on public.quest_constraints for delete to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_objective_criteria_owner_select on public.quest_objective_criteria for select to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_objective_criteria_owner_insert on public.quest_objective_criteria for insert to authenticated with check (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));
create policy quest_objective_criteria_owner_delete on public.quest_objective_criteria for delete to authenticated using (exists (select 1 from public.quests q where q.id = quest_id and q.player_id = (select auth.uid())));

commit;
