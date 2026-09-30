-- PROG-006: service-only progression integrity, deterministic recomputation,
-- and explicit compensating XP corrections. Existing V1 model semantics remain authoritative.
begin;

create table public.practice_xp_correction_ledger (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  source_result_id uuid null references public.quest_results(id) on delete cascade,
  xp_delta bigint not null,
  eligible_practice_seconds_delta bigint not null,
  xp_model_version text not null check (xp_model_version = 'XP_V1'),
  character_model_version text not null check (character_model_version = 'CHAR_V1'),
  reason text not null check (btrim(reason) <> ''),
  idempotency_key text not null check (btrim(idempotency_key) <> ''),
  operator_reference text null check (operator_reference is null or btrim(operator_reference) <> ''),
  correction_category text not null default 'ADMINISTRATIVE_CORRECTION'
    check (correction_category = 'ADMINISTRATIVE_CORRECTION'),
  created_at timestamptz not null default clock_timestamp(),
  unique (player_id, idempotency_key),
  check (xp_delta <> 0 or eligible_practice_seconds_delta <> 0)
);

create index practice_xp_correction_player_time_idx
  on public.practice_xp_correction_ledger (player_id, created_at, id);

alter table public.practice_xp_correction_ledger enable row level security;
revoke all on table public.practice_xp_correction_ledger from public, anon, authenticated, service_role;
grant select on table public.practice_xp_correction_ledger to authenticated, service_role;
grant insert on table public.practice_xp_correction_ledger to service_role;

create policy practice_xp_correction_owner_select
  on public.practice_xp_correction_ledger
  for select to authenticated
  using ((select auth.uid()) = player_id);

create table private.progression_recompute_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  model_bundle jsonb not null,
  requested_as_of timestamptz not null,
  effective_as_of timestamptz not null,
  reason text not null check (btrim(reason) <> ''),
  idempotency_key text not null check (btrim(idempotency_key) <> ''),
  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz null,
  status text not null check (status in ('RUNNING', 'COMPLETED', 'BLOCKED')),
  projection_changed boolean null,
  integrity_report jsonb not null,
  before_snapshot jsonb not null,
  after_snapshot jsonb null,
  unique (player_id, idempotency_key)
);

create index progression_recompute_runs_player_time_idx
  on private.progression_recompute_runs (player_id, started_at, id);

revoke all on table private.progression_recompute_runs from public, anon, authenticated, service_role;
grant select on table private.progression_recompute_runs to service_role;

create or replace function private.progression_model_bundle_v1()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'xp', 'XP_V1',
    'character', 'CHAR_V1',
    'proficiency', 'PROF_V1',
    'confidence', 'CONF_V1',
    'readiness', 'READY_V1',
    'attribute', 'ATTR_V1',
    'attribute_graph', 'ATTRIBUTE_GRAPH_V1'
  )
$$;

create or replace function private.progression_semantic_snapshot_v1(p_player_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'character', (
      select jsonb_build_object(
        'practice_xp', c.practice_xp,
        'character_level', c.character_level,
        'total_practice_seconds', c.total_practice_seconds,
        'xp_model_version', c.xp_model_version,
        'character_model_version', c.character_model_version
      )
      from public.player_character_states c
      where c.player_id = p_player_id
    ),
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object(
        'skill_id', s.skill_id,
        'assessment_status', s.assessment_status,
        'visible_level', s.visible_level,
        'proficiency_score', s.proficiency_score,
        'confidence_score', s.confidence_score,
        'readiness_status', s.readiness_status,
        'readiness_score', s.readiness_score,
        'exposure_count', s.exposure_count,
        'evidence_count', s.evidence_count,
        'last_practiced_at', s.last_practiced_at,
        'last_evidence_at', s.last_evidence_at,
        'proficiency_model_version', s.proficiency_model_version,
        'confidence_model_version', s.confidence_model_version,
        'readiness_model_version', s.readiness_model_version
      ) order by s.skill_id)
      from public.player_skill_states s
      where s.player_id = p_player_id
    ), '[]'::jsonb),
    'attributes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attribute_id', a.attribute_id,
        'assessment_status', a.assessment_status,
        'score', a.score,
        'attribute_model_version', a.attribute_model_version
      ) order by a.attribute_id)
      from public.player_attribute_states a
      where a.player_id = p_player_id
    ), '[]'::jsonb)
  )
$$;

create or replace function private.progression_integrity_report_v1(p_player_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  finalized_count bigint;
  result_award_count bigint;
  correction_count bigint;
  expected_skill_count bigint;
  actual_skill_count bigint;
  missing_awards bigint;
  duplicate_awards bigint;
  missing_skill_events bigint;
  duplicate_skill_events bigint;
  unexpected_skill_events bigint;
  missing_event_baselines bigint;
  correction_key_duplicates bigint;
  model_mismatches bigint;
  expected_xp bigint;
  expected_seconds bigint;
  expected_level integer;
  character_mismatch boolean;
  blockers jsonb := '[]'::jsonb;
  projection_mismatches jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from auth.users where id = p_player_id) then
    raise exception using errcode = '23503', message = 'Player identity does not exist';
  end if;

  select count(*) into finalized_count
  from public.quest_results where player_id = p_player_id;

  select count(*) into result_award_count
  from public.practice_xp_ledger where player_id = p_player_id and entry_type = 'RESULT_AWARD';

  select count(*) into correction_count
  from public.practice_xp_correction_ledger where player_id = p_player_id;

  select count(*) into missing_awards
  from public.quest_results r
  left join public.practice_xp_ledger x on x.source_result_id = r.id
  where r.player_id = p_player_id and x.id is null;

  select count(*) into duplicate_awards from (
    select source_result_id from public.practice_xp_ledger
    where player_id = p_player_id group by source_result_id having count(*) <> 1
  ) duplicate_rows;

  with expected as (
    select r.id as result_id, q.primary_skill_id as skill_id
    from public.quest_results r join public.quests q on q.id = r.quest_id
    where r.player_id = p_player_id
    union all
    select r.id, roles.skill_id
    from public.quest_results r
    join public.quest_skill_roles roles on roles.quest_id = r.quest_id
    where r.player_id = p_player_id
  )
  select count(*) into expected_skill_count from expected;

  select count(*) into actual_skill_count
  from public.skill_progression_events where player_id = p_player_id;

  with expected as (
    select r.id as result_id, q.primary_skill_id as skill_id
    from public.quest_results r join public.quests q on q.id = r.quest_id
    where r.player_id = p_player_id
    union all
    select r.id, roles.skill_id
    from public.quest_results r
    join public.quest_skill_roles roles on roles.quest_id = r.quest_id
    where r.player_id = p_player_id
  )
  select count(*) into missing_skill_events
  from expected e
  left join public.skill_progression_events s
    on s.source_result_id = e.result_id and s.skill_id = e.skill_id
  where s.id is null;

  select count(*) into duplicate_skill_events from (
    select source_result_id, skill_id from public.skill_progression_events
    where player_id = p_player_id
    group by source_result_id, skill_id having count(*) <> 1
  ) duplicate_rows;

  with expected as (
    select r.id as result_id, q.primary_skill_id as skill_id
    from public.quest_results r join public.quests q on q.id = r.quest_id
    where r.player_id = p_player_id
    union
    select r.id, roles.skill_id
    from public.quest_results r
    join public.quest_skill_roles roles on roles.quest_id = r.quest_id
    where r.player_id = p_player_id
  )
  select count(*) into unexpected_skill_events
  from public.skill_progression_events s
  left join expected e on e.result_id = s.source_result_id and e.skill_id = s.skill_id
  where s.player_id = p_player_id and e.result_id is null;

  select count(*) into missing_event_baselines
  from (select distinct player_id, skill_id from public.skill_progression_events where player_id = p_player_id) e
  left join private.skill_progression_baselines b using (player_id, skill_id)
  where b.skill_id is null;

  select count(*) into correction_key_duplicates from (
    select idempotency_key from public.practice_xp_correction_ledger
    where player_id = p_player_id group by idempotency_key having count(*) <> 1
  ) duplicate_rows;

  select
    (select count(*) from public.practice_xp_ledger where player_id = p_player_id
      and (xp_model_version <> 'XP_V1' or character_model_version <> 'CHAR_V1')) +
    (select count(*) from public.practice_xp_correction_ledger where player_id = p_player_id
      and (xp_model_version <> 'XP_V1' or character_model_version <> 'CHAR_V1')) +
    (select count(*) from public.skill_progression_events where player_id = p_player_id
      and (proficiency_model_version <> 'PROF_V1' or confidence_model_version <> 'CONF_V1')) +
    (select count(*) from public.skill_readiness_events where player_id = p_player_id
      and readiness_model_version <> 'READY_V1') +
    (select count(*) from public.player_skill_states where player_id = p_player_id
      and (proficiency_model_version <> 'PROF_V1' or confidence_model_version <> 'CONF_V1'
        or readiness_model_version <> 'READY_V1')) +
    (select count(*) from public.attribute_progression_events where player_id = p_player_id
      and (attribute_model_version <> 'ATTR_V1' or graph_version <> 'ATTRIBUTE_GRAPH_V1')) +
    (select count(*) from public.player_attribute_states where player_id = p_player_id
      and attribute_model_version <> 'ATTR_V1')
  into model_mismatches;

  select
    coalesce((select sum(total_xp_delta) from public.practice_xp_ledger where player_id = p_player_id), 0) +
      coalesce((select sum(xp_delta) from public.practice_xp_correction_ledger where player_id = p_player_id), 0),
    coalesce((select sum(eligible_practice_seconds) from public.practice_xp_ledger where player_id = p_player_id), 0) +
      coalesce((select sum(eligible_practice_seconds_delta) from public.practice_xp_correction_ledger where player_id = p_player_id), 0)
  into expected_xp, expected_seconds;

  if expected_xp >= 0 then expected_level := private.char_v1_level(expected_xp); end if;

  select not exists (
    select 1 from public.player_character_states c
    where c.player_id = p_player_id and c.practice_xp = expected_xp
      and c.total_practice_seconds = expected_seconds and c.character_level = expected_level
      and c.xp_model_version = 'XP_V1' and c.character_model_version = 'CHAR_V1'
  ) into character_mismatch;

  if missing_awards > 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','MISSING_RESULT_AWARD','count',missing_awards)); end if;
  if duplicate_awards > 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','DUPLICATE_RESULT_AWARD','count',duplicate_awards)); end if;
  if missing_skill_events > 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','MISSING_SKILL_EVENT','count',missing_skill_events)); end if;
  if duplicate_skill_events > 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','DUPLICATE_SKILL_EVENT','count',duplicate_skill_events)); end if;
  if unexpected_skill_events > 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','UNEXPECTED_SKILL_EVENT','count',unexpected_skill_events)); end if;
  if missing_event_baselines > 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','MISSING_SKILL_BASELINE','count',missing_event_baselines)); end if;
  if correction_key_duplicates > 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','DUPLICATE_CORRECTION_KEY','count',correction_key_duplicates)); end if;
  if model_mismatches > 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','MODEL_VERSION_MISMATCH','count',model_mismatches)); end if;
  if expected_xp < 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','NEGATIVE_XP_AGGREGATE','count',1)); end if;
  if expected_seconds < 0 then blockers := blockers || jsonb_build_array(jsonb_build_object('code','NEGATIVE_PRACTICE_SECONDS_AGGREGATE','count',1)); end if;
  if character_mismatch then projection_mismatches := projection_mismatches || jsonb_build_array('CHARACTER_PROJECTION_DRIFT'); end if;

  return jsonb_build_object(
    'player_id', p_player_id,
    'finalized_result_count', finalized_count,
    'result_xp_award_count', result_award_count,
    'xp_correction_count', correction_count,
    'expected_skill_progression_event_count', expected_skill_count,
    'actual_skill_progression_event_count', actual_skill_count,
    'model_version_mismatch_count', model_mismatches,
    'expected_character', jsonb_build_object('practice_xp', expected_xp, 'character_level', expected_level, 'total_practice_seconds', expected_seconds),
    'projection_mismatches', projection_mismatches,
    'structural_blockers', blockers,
    'safe_to_recompute', jsonb_array_length(blockers) = 0,
    'skill_projection_numerical_parity_audited', false
  );
end;
$$;

-- Event-free Skills have a known canonical bootstrap state. Event-bearing Skills must
-- have a preserved baseline and are blocked by the integrity audit when it is absent.
create or replace function private.rebuild_player_skill_states_v1(p_player_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.player_skill_states where player_id=p_player_id;
  insert into public.player_skill_states(player_id,skill_id,assessment_status,visible_level,proficiency_score,confidence_score,
    readiness_status,readiness_score,exposure_count,evidence_count,last_practiced_at,last_evidence_at,
    proficiency_model_version,confidence_model_version,readiness_model_version)
  select b.player_id,b.skill_id,b.assessment_status,b.visible_level,b.proficiency_score,b.confidence_score,
    b.readiness_status,b.readiness_score,b.exposure_count,b.evidence_count,b.last_practiced_at,b.last_evidence_at,
    'PROF_V1','CONF_V1',b.readiness_model_version
  from private.skill_progression_baselines b where b.player_id=p_player_id;
  insert into public.player_skill_states(player_id,skill_id)
  select p_player_id,e.id from public.taxonomy_entities e
  where e.kind='SKILL' and e.lifecycle='ACTIVE'
  on conflict(player_id,skill_id) do nothing;
  insert into public.player_skill_states(player_id,skill_id,assessment_status,visible_level,proficiency_score,confidence_score,
    exposure_count,evidence_count,last_practiced_at,last_evidence_at,proficiency_model_version,confidence_model_version)
  select e.player_id,e.skill_id,(array_agg(e.assessment_after order by e.occurred_at desc,e.id desc))[1],
    private.prof_v1_level((array_agg(e.score_after order by e.occurred_at desc,e.id desc))[1]),
    (array_agg(e.score_after order by e.occurred_at desc,e.id desc))[1],
    (array_agg(e.confidence_after order by e.occurred_at desc,e.id desc))[1],
    coalesce(b.exposure_count,0)+count(*) filter(where e.meaningful_exposure),
    coalesce(b.evidence_count,0)+count(*) filter(where e.informative_evidence),
    greatest(b.last_practiced_at,max(e.occurred_at) filter(where e.meaningful_exposure)),
    greatest(b.last_evidence_at,max(e.occurred_at) filter(where e.informative_evidence)),'PROF_V1','CONF_V1'
  from public.skill_progression_events e left join private.skill_progression_baselines b using(player_id,skill_id)
  where e.player_id=p_player_id group by e.player_id,e.skill_id,b.exposure_count,b.evidence_count,b.last_practiced_at,b.last_evidence_at
  on conflict(player_id,skill_id) do update set assessment_status=excluded.assessment_status,visible_level=excluded.visible_level,
    proficiency_score=excluded.proficiency_score,confidence_score=excluded.confidence_score,
    exposure_count=excluded.exposure_count,evidence_count=excluded.evidence_count,last_practiced_at=excluded.last_practiced_at,
    last_evidence_at=excluded.last_evidence_at,proficiency_model_version='PROF_V1',confidence_model_version='CONF_V1';
end $$;

create or replace function private.rebuild_player_character_state(p_player_id uuid)
returns public.player_character_states
language plpgsql
security definer
set search_path = ''
as $$
declare
  aggregate_xp bigint;
  aggregate_seconds bigint;
  projection public.player_character_states;
begin
  if not exists (select 1 from auth.users where id = p_player_id) then
    raise exception using errcode = '23503', message = 'Player identity does not exist';
  end if;

  select
    coalesce((select sum(total_xp_delta) from public.practice_xp_ledger where player_id=p_player_id),0) +
      coalesce((select sum(xp_delta) from public.practice_xp_correction_ledger where player_id=p_player_id),0),
    coalesce((select sum(eligible_practice_seconds) from public.practice_xp_ledger where player_id=p_player_id),0) +
      coalesce((select sum(eligible_practice_seconds_delta) from public.practice_xp_correction_ledger where player_id=p_player_id),0)
  into aggregate_xp, aggregate_seconds;

  if aggregate_xp < 0 then raise exception using errcode='22003',message='Correction would make cumulative XP negative'; end if;
  if aggregate_seconds < 0 then raise exception using errcode='22003',message='Correction would make meaningful practice seconds negative'; end if;

  insert into public.player_character_states (
    player_id, practice_xp, character_level, total_practice_seconds,
    xp_model_version, character_model_version
  ) values (
    p_player_id, aggregate_xp, private.char_v1_level(aggregate_xp), aggregate_seconds,
    'XP_V1', 'CHAR_V1'
  )
  on conflict (player_id) do update set
    practice_xp = excluded.practice_xp,
    character_level = excluded.character_level,
    total_practice_seconds = excluded.total_practice_seconds,
    xp_model_version = excluded.xp_model_version,
    character_model_version = excluded.character_model_version
  returning * into projection;
  return projection;
end;
$$;

create or replace function private.apply_practice_xp_correction_v1(
  p_player_id uuid,
  p_xp_delta bigint,
  p_practice_seconds_delta bigint,
  p_reason text,
  p_idempotency_key text,
  p_source_result_id uuid default null,
  p_operator_reference text default null
) returns public.practice_xp_correction_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.practice_xp_correction_ledger;
  inserted public.practice_xp_correction_ledger;
  next_xp bigint;
  next_seconds bigint;
begin
  if btrim(coalesce(p_reason,'')) = '' then raise exception using errcode='22023',message='Correction reason is required'; end if;
  if btrim(coalesce(p_idempotency_key,'')) = '' then raise exception using errcode='22023',message='Correction idempotency key is required'; end if;
  if p_xp_delta = 0 and p_practice_seconds_delta = 0 then raise exception using errcode='22023',message='Correction must change XP or practice seconds'; end if;
  select * into existing from public.practice_xp_correction_ledger
    where player_id=p_player_id and idempotency_key=p_idempotency_key;
  if found then
    if existing.xp_delta<>p_xp_delta or existing.eligible_practice_seconds_delta<>p_practice_seconds_delta
      or existing.reason<>p_reason or existing.source_result_id is distinct from p_source_result_id
      or existing.operator_reference is distinct from p_operator_reference then
      raise exception using errcode='22023',message='Correction idempotency key was already used with different inputs';
    end if;
    return existing;
  end if;
  perform 1 from auth.users where id=p_player_id for update;
  if not found then raise exception using errcode='23503',message='Player identity does not exist'; end if;
  if p_source_result_id is not null and not exists(
    select 1 from public.quest_results where id=p_source_result_id and player_id=p_player_id
  ) then raise exception using errcode='23503',message='Correction source Result does not belong to Player'; end if;
  select
    coalesce((select sum(total_xp_delta) from public.practice_xp_ledger where player_id=p_player_id),0) +
      coalesce((select sum(xp_delta) from public.practice_xp_correction_ledger where player_id=p_player_id),0) + p_xp_delta,
    coalesce((select sum(eligible_practice_seconds) from public.practice_xp_ledger where player_id=p_player_id),0) +
      coalesce((select sum(eligible_practice_seconds_delta) from public.practice_xp_correction_ledger where player_id=p_player_id),0) + p_practice_seconds_delta
  into next_xp,next_seconds;
  if next_xp<0 then raise exception using errcode='22003',message='Correction would make cumulative XP negative'; end if;
  if next_seconds<0 then raise exception using errcode='22003',message='Correction would make meaningful practice seconds negative'; end if;
  insert into public.practice_xp_correction_ledger(player_id,source_result_id,xp_delta,
    eligible_practice_seconds_delta,xp_model_version,character_model_version,reason,idempotency_key,operator_reference)
  values(p_player_id,p_source_result_id,p_xp_delta,p_practice_seconds_delta,'XP_V1','CHAR_V1',p_reason,p_idempotency_key,p_operator_reference)
  returning * into inserted;
  perform private.rebuild_player_character_state(p_player_id);
  return inserted;
end;
$$;

create or replace function private.rebuild_player_progression_v1(p_player_id uuid,p_as_of timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.rebuild_player_character_state(p_player_id);
  perform private.rebuild_player_skill_states_v1(p_player_id);
  perform private.refresh_player_readiness_v1(p_player_id,p_as_of,'REPLAY');
  perform private.rebuild_player_attributes_v1(p_player_id,'REPLAY',null,p_as_of);
end $$;

create or replace function private.admin_recompute_player_progression_v1(
  p_player_id uuid,
  p_as_of timestamptz,
  p_reason text,
  p_idempotency_key text
) returns private.progression_recompute_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing private.progression_recompute_runs;
  receipt private.progression_recompute_runs;
  report jsonb;
  before_state jsonb;
  after_state jsonb;
begin
  if p_as_of is null then raise exception using errcode='22004',message='Recompute as_of is required'; end if;
  if btrim(coalesce(p_reason,''))='' then raise exception using errcode='22023',message='Recompute reason is required'; end if;
  if btrim(coalesce(p_idempotency_key,''))='' then raise exception using errcode='22023',message='Recompute idempotency key is required'; end if;
  select * into existing from private.progression_recompute_runs
    where player_id=p_player_id and idempotency_key=p_idempotency_key;
  if found then
    if existing.effective_as_of<>p_as_of or existing.reason<>p_reason then
      raise exception using errcode='22023',message='Recompute idempotency key was already used with different inputs';
    end if;
    return existing;
  end if;
  perform 1 from auth.users where id=p_player_id for update;
  if not found then raise exception using errcode='23503',message='Player identity does not exist'; end if;
  report:=private.progression_integrity_report_v1(p_player_id);
  before_state:=private.progression_semantic_snapshot_v1(p_player_id);
  insert into private.progression_recompute_runs(player_id,model_bundle,requested_as_of,effective_as_of,
    reason,idempotency_key,status,integrity_report,before_snapshot)
  values(p_player_id,private.progression_model_bundle_v1(),p_as_of,p_as_of,p_reason,p_idempotency_key,
    case when (report->>'safe_to_recompute')::boolean then 'RUNNING' else 'BLOCKED' end,report,before_state)
  returning * into receipt;
  if not (report->>'safe_to_recompute')::boolean then
    update private.progression_recompute_runs set completed_at=clock_timestamp(),projection_changed=false,
      after_snapshot=before_state where id=receipt.id returning * into receipt;
    return receipt;
  end if;
  perform private.rebuild_player_progression_v1(p_player_id,p_as_of);
  after_state:=private.progression_semantic_snapshot_v1(p_player_id);
  update private.progression_recompute_runs set completed_at=clock_timestamp(),status='COMPLETED',
    projection_changed=(before_state is distinct from after_state),after_snapshot=after_state
  where id=receipt.id returning * into receipt;
  return receipt;
end;
$$;

revoke all on function private.progression_model_bundle_v1() from public,anon,authenticated;
revoke all on function private.progression_semantic_snapshot_v1(uuid) from public,anon,authenticated;
revoke all on function private.progression_integrity_report_v1(uuid) from public,anon,authenticated;
revoke all on function private.rebuild_player_skill_states_v1(uuid) from public,anon,authenticated;
revoke all on function private.rebuild_player_character_state(uuid) from public,anon,authenticated;
revoke all on function private.apply_practice_xp_correction_v1(uuid,bigint,bigint,text,text,uuid,text) from public,anon,authenticated;
revoke all on function private.rebuild_player_progression_v1(uuid,timestamptz) from public,anon,authenticated;
revoke all on function private.admin_recompute_player_progression_v1(uuid,timestamptz,text,text) from public,anon,authenticated;
grant execute on function private.progression_model_bundle_v1() to service_role;
grant execute on function private.progression_semantic_snapshot_v1(uuid) to service_role;
grant execute on function private.progression_integrity_report_v1(uuid) to service_role;
grant execute on function private.rebuild_player_skill_states_v1(uuid) to service_role;
grant execute on function private.rebuild_player_character_state(uuid) to service_role;
grant execute on function private.apply_practice_xp_correction_v1(uuid,bigint,bigint,text,text,uuid,text) to service_role;
grant execute on function private.rebuild_player_progression_v1(uuid,timestamptz) to service_role;
grant execute on function private.admin_recompute_player_progression_v1(uuid,timestamptz,text,text) to service_role;

do $$
begin
  if exists(select 1 from public.practice_xp_correction_ledger) then
    raise exception 'PROG-006 migration must not create XP corrections';
  end if;
  if exists(select 1 from private.progression_recompute_runs) then
    raise exception 'PROG-006 migration must not create recompute receipts';
  end if;
end;
$$;

commit;
