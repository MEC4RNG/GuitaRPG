-- EVD-002: immutable EVD_V1 Result, criterion, evidence, and reflection persistence.
begin;

create table public.quest_results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  session_id uuid not null unique references public.practice_sessions(id) on delete cascade,
  quest_schema_version smallint not null check (quest_schema_version > 0),
  evidence_model_version text not null default 'EVD_V1' check (evidence_model_version = 'EVD_V1'),
  difficulty_model_version text,
  meaningful_attempt boolean not null,
  outcome text not null check (outcome in ('ABANDONED','ATTEMPTED','PARTIAL','CLEARED')),
  verification_modes text[] not null check (
    verification_modes <@ array['SELF','SESSION','AUDIO_ASSISTED','DIRECT_AUDIO','APP_VERIFIED']::text[]
  ),
  confidence_summary text not null check (confidence_summary in ('LOW','MODERATE','HIGH','MIXED')),
  reflection text check (reflection in ('TOO_EASY','GOOD_CHALLENGE','TOO_HARD')),
  player_notes text check (player_notes is null or char_length(player_notes) <= 4000),
  finalized_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp()
);

create table public.quest_result_criteria (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.quest_results(id) on delete cascade,
  quest_criterion_ordinal smallint not null check (quest_criterion_ordinal > 0),
  metric text not null check (btrim(metric) <> ''),
  operator text not null check (operator in ('EQ','GTE','LTE')),
  target_value jsonb not null check (jsonb_typeof(target_value) in ('number','string','boolean')),
  unit text not null check (btrim(unit) <> ''),
  criterion_state text not null check (criterion_state in ('MET','NOT_MET','UNKNOWN','NOT_EVALUATED')),
  unique (result_id, quest_criterion_ordinal)
);

create table public.quest_result_evidence (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.quest_results(id) on delete cascade,
  result_criterion_id uuid references public.quest_result_criteria(id) on delete cascade,
  criterion_ordinal smallint check (criterion_ordinal is null or criterion_ordinal > 0),
  criterion_metric text not null check (btrim(criterion_metric) <> ''),
  verification_mode text not null check (verification_mode in ('SELF','SESSION','AUDIO_ASSISTED','DIRECT_AUDIO','APP_VERIFIED')),
  criterion_state text not null check (criterion_state in ('MET','NOT_MET','UNKNOWN','NOT_EVALUATED')),
  observed_or_asserted_value jsonb,
  unit text not null check (btrim(unit) <> ''),
  evidence_confidence text not null check (evidence_confidence in ('LOW','MODERATE','HIGH')),
  source_authority text not null check (source_authority in ('PLAYER','SESSION_SYSTEM','AUDIO_ANALYZER','DIRECT_AUDIO_ANALYZER','APP_GRADER')),
  recorded_at timestamptz not null default clock_timestamp(),
  evaluator_version text,
  rationale text,
  artifact_reference text,
  check (
    (verification_mode='SELF' and source_authority='PLAYER' and evaluator_version is null)
    or (verification_mode='SESSION' and source_authority='SESSION_SYSTEM' and evaluator_version is not null)
    or (verification_mode='AUDIO_ASSISTED' and source_authority='AUDIO_ANALYZER' and evaluator_version is not null)
    or (verification_mode='DIRECT_AUDIO' and source_authority='DIRECT_AUDIO_ANALYZER' and evaluator_version is not null)
    or (verification_mode='APP_VERIFIED' and source_authority='APP_GRADER' and evaluator_version is not null)
  ),
  check (
    (result_criterion_id is null and criterion_ordinal is null)
    or (result_criterion_id is not null and criterion_ordinal is not null)
  )
);

create index quest_results_player_finalized_idx on public.quest_results(player_id, finalized_at desc);
create index quest_results_quest_idx on public.quest_results(quest_id);
create index quest_result_criteria_result_idx on public.quest_result_criteria(result_id, quest_criterion_ordinal);
create index quest_result_evidence_result_idx on public.quest_result_evidence(result_id);

alter table public.quest_results enable row level security;
alter table public.quest_result_criteria enable row level security;
alter table public.quest_result_evidence enable row level security;

revoke all on table public.quest_results, public.quest_result_criteria, public.quest_result_evidence from public, anon, authenticated;
grant select on table public.quest_results, public.quest_result_criteria, public.quest_result_evidence to authenticated;
grant all on table public.quest_results, public.quest_result_criteria, public.quest_result_evidence to service_role;

create policy quest_results_owner_select on public.quest_results for select to authenticated
  using ((select auth.uid()) = player_id);
create policy quest_result_criteria_owner_select on public.quest_result_criteria for select to authenticated
  using (exists (select 1 from public.quest_results r where r.id=result_id and r.player_id=(select auth.uid())));
create policy quest_result_evidence_owner_select on public.quest_result_evidence for select to authenticated
  using (exists (select 1 from public.quest_results r where r.id=result_id and r.player_id=(select auth.uid())));

create or replace function private.evd_compare_scalar(p_operator text, p_observed jsonb, p_target jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare met boolean;
begin
  if jsonb_typeof(p_observed) not in ('number','string','boolean') or jsonb_typeof(p_observed) <> jsonb_typeof(p_target) then
    raise exception using errcode='23514', message='Observed and target values must have the same scalar type';
  end if;
  if p_operator='EQ' then met := p_observed = p_target;
  elsif p_operator='GTE' and jsonb_typeof(p_target)='number' then met := (p_observed #>> '{}')::numeric >= (p_target #>> '{}')::numeric;
  elsif p_operator='LTE' and jsonb_typeof(p_target)='number' then met := (p_observed #>> '{}')::numeric <= (p_target #>> '{}')::numeric;
  else raise exception using errcode='23514', message='GTE and LTE require numeric values';
  end if;
  return case when met then 'MET' else 'NOT_MET' end;
end; $$;

create or replace function private.evd_validate_self_inputs(p_inputs jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(p_inputs) <> 'array' then raise exception using errcode='22023', message='SELF criteria must be an array'; end if;
  for item in select value from jsonb_array_elements(p_inputs) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'ordinal') <> 'number' then
      raise exception using errcode='22023', message='Each SELF input requires a criterion ordinal';
    end if;
    if item - array['ordinal','unknown','observed_value']::text[] <> '{}'::jsonb then
      raise exception using errcode='42501', message='SELF input contains a forbidden authority field';
    end if;
    if coalesce((item->>'unknown')::boolean,false)=false and jsonb_typeof(item->'observed_value') not in ('number','string','boolean') then
      raise exception using errcode='22023', message='SELF input requires a scalar observed value or unknown=true';
    end if;
  end loop;
  if exists (
    select 1 from jsonb_array_elements(p_inputs) as duplicate_entry
    group by (duplicate_entry->>'ordinal')::smallint having count(*)>1
  ) then raise exception using errcode='23505', message='Duplicate SELF criterion ordinal'; end if;
end; $$;

create or replace function public.finalize_quest_result(
  p_session_id uuid,
  p_self_criteria jsonb default '[]'::jsonb,
  p_reflection text default null,
  p_notes text default null
) returns public.quest_results language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  s public.practice_sessions;
  q public.quests;
  existing public.quest_results;
  result_row public.quest_results;
  criterion record;
  criterion_row public.quest_result_criteria;
  self_input jsonb;
  observed jsonb;
  state text;
  active_seconds bigint;
  minimum_seconds numeric;
  meaningful boolean;
  latest_bpm integer;
  met_count integer := 0;
  criterion_count integer := 0;
  modes text[];
  confidence_count integer;
  confidence_value text;
  final_outcome text;
begin
  if caller is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  if p_reflection is not null and p_reflection not in ('TOO_EASY','GOOD_CHALLENGE','TOO_HARD') then
    raise exception using errcode='23514', message='Invalid reflection value';
  end if;
  if p_notes is not null and char_length(p_notes)>4000 then raise exception using errcode='22001', message='Player notes exceed 4000 characters'; end if;
  perform private.evd_validate_self_inputs(coalesce(p_self_criteria,'[]'::jsonb));

  select * into s from public.practice_sessions where id=p_session_id for update;
  if not found or s.player_id<>caller then raise exception using errcode='42501', message='Session is not owned by caller'; end if;
  if s.status<>'ENDED' then raise exception using errcode='55000', message='Result finalization requires an ENDED Session'; end if;
  select * into existing from public.quest_results where session_id=s.id;
  if found then raise exception using errcode='55000', message='RESULT_ALREADY_FINALIZED'; end if;
  select * into q from public.quests where id=s.quest_id and player_id=caller;
  if not found then raise exception using errcode='42501', message='Quest is not owned by caller'; end if;
  if q.completion_contract->>'attempt_rule'<>'MEANINGFUL_ACTIVITY' or jsonb_typeof(q.completion_contract->'minimum_attempt_seconds')<>'number' then
    raise exception using errcode='0A000', message='UNSUPPORTED_ATTEMPT_CONTRACT';
  end if;
  minimum_seconds := (q.completion_contract->>'minimum_attempt_seconds')::numeric;
  active_seconds := public.practice_session_active_seconds(s.id);
  meaningful := active_seconds>=minimum_seconds;

  insert into public.quest_results(
    player_id,quest_id,session_id,quest_schema_version,evidence_model_version,difficulty_model_version,
    meaningful_attempt,outcome,verification_modes,confidence_summary,reflection,player_notes
  ) values (
    caller,q.id,s.id,q.schema_version,'EVD_V1',q.difficulty_profile->>'model_version',
    meaningful,'ATTEMPTED','{}','LOW',p_reflection,nullif(p_notes,'')
  ) returning * into result_row;

  if not meaningful then
    for criterion in select * from public.quest_objective_criteria where quest_id=q.id order by ordinal loop
      criterion_count := criterion_count+1;
      insert into public.quest_result_criteria(result_id,quest_criterion_ordinal,metric,operator,target_value,unit,criterion_state)
      values(result_row.id,criterion.ordinal,criterion.metric,criterion.operator,criterion.criterion_value,criterion.unit,'NOT_EVALUATED');
    end loop;
    insert into public.quest_result_evidence(
      result_id,criterion_metric,verification_mode,criterion_state,observed_or_asserted_value,unit,
      evidence_confidence,source_authority,evaluator_version,rationale
    ) values (
      result_row.id,'practice_presence','SESSION','MET',to_jsonb(active_seconds),'seconds',
      'HIGH','SESSION_SYSTEM','SESSION_EVD_V1','Authoritative recorded active time is below the Quest meaningful-attempt threshold.'
    );
    final_outcome := 'ABANDONED';
  else
    select (payload->>'bpm')::integer into latest_bpm from public.practice_session_control_events
      where session_id=s.id and event_type='METRONOME_BPM_SET' order by sequence desc limit 1;
    for criterion in select * from public.quest_objective_criteria where quest_id=q.id order by ordinal loop
      criterion_count := criterion_count+1;
      observed := null; state := null; self_input := null;
      if criterion.metric in ('practice_duration','time_elapsed') then
        observed := to_jsonb(active_seconds);
        state := private.evd_compare_scalar(criterion.operator,observed,criterion.criterion_value);
      elsif criterion.metric='target_tempo' and latest_bpm is not null then
        observed := to_jsonb(latest_bpm);
        state := private.evd_compare_scalar(criterion.operator,observed,criterion.criterion_value);
      else
        select value into self_input from jsonb_array_elements(coalesce(p_self_criteria,'[]'::jsonb))
          where (value->>'ordinal')::smallint=criterion.ordinal;
        if self_input is null or coalesce((self_input->>'unknown')::boolean,false) then state := 'UNKNOWN';
        elsif not (q.verification_profile->'allowed_modes' ? 'SELF') then state := 'UNKNOWN';
        else observed := self_input->'observed_value'; state := private.evd_compare_scalar(criterion.operator,observed,criterion.criterion_value); end if;
      end if;

      insert into public.quest_result_criteria(result_id,quest_criterion_ordinal,metric,operator,target_value,unit,criterion_state)
      values(result_row.id,criterion.ordinal,criterion.metric,criterion.operator,criterion.criterion_value,criterion.unit,state)
      returning * into criterion_row;
      if state='MET' then met_count:=met_count+1; end if;

      if criterion.metric in ('practice_duration','time_elapsed') then
        insert into public.quest_result_evidence(result_id,result_criterion_id,criterion_ordinal,criterion_metric,verification_mode,criterion_state,observed_or_asserted_value,unit,evidence_confidence,source_authority,evaluator_version,rationale)
        values(result_row.id,criterion_row.id,criterion.ordinal,criterion.metric,'SESSION',state,observed,criterion.unit,'HIGH','SESSION_SYSTEM','SESSION_EVD_V1','Derived from authoritative Session lifecycle intervals; paused time is excluded.');
      elsif criterion.metric='target_tempo' and latest_bpm is not null then
        insert into public.quest_result_evidence(result_id,result_criterion_id,criterion_ordinal,criterion_metric,verification_mode,criterion_state,observed_or_asserted_value,unit,evidence_confidence,source_authority,evaluator_version,rationale)
        values(result_row.id,criterion_row.id,criterion.ordinal,criterion.metric,'SESSION',state,observed,criterion.unit,'HIGH','SESSION_SYSTEM','SESSION_EVD_V1','Verifies the latest recorded metronome configuration, not musical performance accuracy.');
      elsif self_input is not null and not coalesce((self_input->>'unknown')::boolean,false) and (q.verification_profile->'allowed_modes' ? 'SELF') then
        insert into public.quest_result_evidence(result_id,result_criterion_id,criterion_ordinal,criterion_metric,verification_mode,criterion_state,observed_or_asserted_value,unit,evidence_confidence,source_authority,evaluator_version,rationale)
        values(result_row.id,criterion_row.id,criterion.ordinal,criterion.metric,'SELF',state,observed,criterion.unit,'MODERATE','PLAYER',null,'Player-authored observation; trusted comparison derived the criterion state.');
      end if;
    end loop;
    if criterion_count=0 then raise exception using errcode='23514', message='Quest has no Objective criteria'; end if;
    final_outcome := case when met_count=criterion_count then 'CLEARED' when met_count>0 then 'PARTIAL' else 'ATTEMPTED' end;
  end if;

  select coalesce(array_agg(distinct verification_mode order by verification_mode),'{}'::text[]) into modes
    from public.quest_result_evidence where result_id=result_row.id;
  select count(distinct evidence_confidence), min(evidence_confidence) into confidence_count, confidence_value
    from public.quest_result_evidence where result_id=result_row.id;
  if confidence_count>1 then confidence_value:='MIXED'; end if;
  if confidence_value is null then confidence_value:='LOW'; end if;
  update public.quest_results set outcome=final_outcome,verification_modes=modes,confidence_summary=confidence_value
    where id=result_row.id returning * into result_row;
  return result_row;
end; $$;

revoke all on function private.evd_compare_scalar(text,jsonb,jsonb) from public,anon,authenticated;
revoke all on function private.evd_validate_self_inputs(jsonb) from public,anon,authenticated;
revoke all on function public.finalize_quest_result(uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.finalize_quest_result(uuid,jsonb,text,text) to authenticated,service_role;

commit;
