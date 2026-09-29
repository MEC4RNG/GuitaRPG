-- QST-003-R1: authenticated atomic persistence for resolved QST_GEN_V1 Quests.

begin;

create or replace function private.active_taxonomy_entity_id(p_slug text, p_kind text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  entity_id uuid;
begin
  select id into entity_id
  from public.taxonomy_entities
  where slug = p_slug and kind = p_kind and lifecycle = 'ACTIVE';

  if entity_id is null then
    raise exception using
      errcode = '23514',
      message = format('Unknown, inactive, or wrong-kind taxonomy reference: %s (%s)', p_slug, p_kind);
  end if;
  return entity_id;
end;
$$;

revoke all on function private.active_taxonomy_entity_id(text, text) from public, anon, authenticated;

create or replace function public.persist_generated_quest(p_quest jsonb)
returns public.quests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  snapshot jsonb := p_quest -> 'resolved_snapshot';
  identity jsonb;
  purpose jsonb;
  execution jsonb;
  context jsonb;
  item jsonb;
  persisted public.quests;
  quest_id uuid;
  ordinal_value integer;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;
  if jsonb_typeof(p_quest) <> 'object' or jsonb_typeof(snapshot) <> 'object' then
    raise exception using errcode = '22023', message = 'A resolved canonical Quest is required';
  end if;

  identity := snapshot -> 'identity';
  purpose := snapshot -> 'purpose';
  execution := snapshot -> 'execution';
  context := snapshot -> 'musical_context';

  if identity ->> 'origin' <> 'QST_GEN_V1' then
    raise exception using errcode = '22023', message = 'Only QST_GEN_V1 Quests may use this persistence boundary';
  end if;
  if purpose ->> 'generation_mode' not in ('QUICK', 'CUSTOM') then
    raise exception using errcode = '22023', message = 'Only QUICK or CUSTOM generated Quests are supported';
  end if;
  begin
    quest_id := (identity ->> 'id')::uuid;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'Generated Quest identity must be a UUID';
  end;
  if quest_id is null or p_quest -> 'identity' ->> 'id' is distinct from identity ->> 'id' then
    raise exception using errcode = '22023', message = 'Quest persistence and snapshot identities must agree';
  end if;

  insert into public.quests (
    id, player_id, slug, title, schema_version, quest_type, origin,
    primary_domain_id, purpose_reason, generation_mode, primary_skill_id,
    execution, completion_contract, verification_profile, difficulty_profile,
    declared_overall_demand, rewards, metadata, resolved_snapshot
  ) values (
    quest_id,
    caller_id,
    identity ->> 'slug',
    identity ->> 'title',
    (identity ->> 'schema_version')::smallint,
    identity ->> 'type',
    identity ->> 'origin',
    private.active_taxonomy_entity_id(purpose ->> 'primary_domain', 'DOMAIN'),
    purpose ->> 'reason',
    purpose ->> 'generation_mode',
    private.active_taxonomy_entity_id(execution -> 'primary_skill' ->> 'slug', 'SKILL'),
    execution,
    snapshot -> 'completion_contract',
    snapshot -> 'verification_profile',
    snapshot -> 'difficulty_profile',
    snapshot -> 'difficulty_profile' ->> 'declared_overall_demand',
    snapshot -> 'rewards',
    snapshot -> 'metadata',
    snapshot
  ) returning * into persisted;

  ordinal_value := 0;
  for item in select value from jsonb_array_elements(execution -> 'secondary_skills') loop
    ordinal_value := ordinal_value + 1;
    insert into public.quest_skill_roles (quest_id, skill_id, role, ordinal)
    values (quest_id, private.active_taxonomy_entity_id(item ->> 'slug', 'SKILL'), 'SECONDARY_SKILL', ordinal_value);
  end loop;

  ordinal_value := 0;
  for item in select value from jsonb_array_elements(execution -> 'required_techniques') loop
    ordinal_value := ordinal_value + 1;
    insert into public.quest_skill_roles (quest_id, skill_id, role, ordinal)
    values (quest_id, private.active_taxonomy_entity_id(item ->> 'slug', 'SKILL'), 'REQUIRED_TECHNIQUE', ordinal_value);
  end loop;

  ordinal_value := 0;
  for item in select value from jsonb_array_elements(snapshot -> 'concepts') loop
    ordinal_value := ordinal_value + 1;
    insert into public.quest_concepts (quest_id, concept_id, ordinal)
    values (quest_id, private.active_taxonomy_entity_id(item ->> 'slug', 'CONCEPT'), ordinal_value);
  end loop;

  if jsonb_typeof(context -> 'tuning') = 'object' then
    insert into public.quest_contexts (quest_id, context_id, role, ordinal, parameters)
    values (quest_id, private.active_taxonomy_entity_id(context -> 'tuning' ->> 'slug', 'CONTEXT'), 'TUNING', 1, '{}'::jsonb);
  end if;
  if jsonb_typeof(context -> 'tonal_center') = 'object' then
    insert into public.quest_contexts (quest_id, context_id, role, ordinal, parameters)
    values (
      quest_id,
      private.active_taxonomy_entity_id('tonal_center', 'CONTEXT'),
      'TONAL_CENTER',
      1,
      jsonb_build_object('pitch_class', context -> 'tonal_center' ->> 'pitch_class')
    );
  end if;
  if jsonb_typeof(context -> 'style') = 'object' then
    insert into public.quest_contexts (quest_id, context_id, role, ordinal, parameters)
    values (quest_id, private.active_taxonomy_entity_id(context -> 'style' ->> 'slug', 'CONTEXT'), 'STYLE', 1, '{}'::jsonb);
  end if;
  if jsonb_typeof(context -> 'playing_role') = 'object' then
    insert into public.quest_contexts (quest_id, context_id, role, ordinal, parameters)
    values (quest_id, private.active_taxonomy_entity_id(context -> 'playing_role' ->> 'slug', 'CONTEXT'), 'PLAYING_ROLE', 1, '{}'::jsonb);
  end if;
  if jsonb_typeof(context -> 'accompaniment') = 'object' then
    insert into public.quest_contexts (quest_id, context_id, role, ordinal, parameters)
    values (quest_id, private.active_taxonomy_entity_id(context -> 'accompaniment' ->> 'slug', 'CONTEXT'), 'ACCOMPANIMENT', 1, '{}'::jsonb);
  end if;

  ordinal_value := 0;
  for item in select value from jsonb_array_elements(snapshot -> 'constraints') loop
    ordinal_value := ordinal_value + 1;
    insert into public.quest_constraints (quest_id, constraint_id, ordinal, parameters)
    values (
      quest_id,
      private.active_taxonomy_entity_id(item ->> 'slug', 'CONSTRAINT'),
      ordinal_value,
      coalesce(item -> 'parameters', '{}'::jsonb)
    );
  end loop;

  ordinal_value := 0;
  for item in select value from jsonb_array_elements(snapshot -> 'objective' -> 'criteria') loop
    ordinal_value := ordinal_value + 1;
    insert into public.quest_objective_criteria (
      quest_id, ordinal, metric, operator, criterion_value, unit
    ) values (
      quest_id, ordinal_value, item ->> 'metric', item ->> 'operator', item -> 'value', item ->> 'unit'
    );
  end loop;

  set constraints all immediate;
  return persisted;
end;
$$;

revoke all on function public.persist_generated_quest(jsonb) from public, anon, authenticated;
grant execute on function public.persist_generated_quest(jsonb) to authenticated;
grant execute on function public.persist_generated_quest(jsonb) to service_role;

commit;
