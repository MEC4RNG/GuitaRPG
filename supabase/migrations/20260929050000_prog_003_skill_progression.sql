-- PROG-003: PROF_V1 / CONF_V1 Result-backed Skill progression.
begin;

create table private.skill_progression_baselines (
  player_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  assessment_status text not null,
  visible_level text,
  proficiency_score numeric(5,2),
  confidence_score numeric(5,2) not null,
  readiness_status text not null,
  readiness_score numeric(5,2),
  readiness_model_version text not null,
  exposure_count bigint not null,
  evidence_count bigint not null,
  last_practiced_at timestamptz,
  last_evidence_at timestamptz,
  captured_at timestamptz not null default clock_timestamp(),
  primary key (player_id, skill_id)
);

insert into private.skill_progression_baselines (
  player_id,skill_id,assessment_status,visible_level,proficiency_score,confidence_score,
  readiness_status,readiness_score,readiness_model_version,exposure_count,evidence_count,last_practiced_at,last_evidence_at
)
select player_id,skill_id,assessment_status,visible_level,proficiency_score,confidence_score,
  readiness_status,readiness_score,readiness_model_version,exposure_count,evidence_count,last_practiced_at,last_evidence_at
from public.player_skill_states;

create table public.skill_progression_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  source_result_id uuid not null references public.quest_results(id) on delete cascade,
  source_session_id uuid not null references public.practice_sessions(id) on delete cascade,
  source_quest_id uuid not null references public.quests(id) on delete cascade,
  event_type text not null default 'RESULT_SKILL_EVIDENCE' check (event_type='RESULT_SKILL_EVIDENCE'),
  skill_role text not null check (skill_role in ('PRIMARY_SKILL','SECONDARY_SKILL','REQUIRED_TECHNIQUE')),
  proficiency_model_version text not null check (proficiency_model_version='PROF_V1'),
  confidence_model_version text not null check (confidence_model_version='CONF_V1'),
  meaningful_exposure boolean not null,
  meaningful_attempt boolean not null,
  informative_evidence boolean not null,
  outcome text not null check (outcome in ('ABANDONED','ATTEMPTED','PARTIAL','CLEARED')),
  evidence_confidence text not null check (evidence_confidence in ('LOW','MODERATE','HIGH')),
  demand_dimension text not null,
  demand_score numeric(5,2) not null check (demand_score between 0 and 100),
  challenge_band text not null check (challenge_band in ('UNKNOWN','VERY_COMFORTABLE','COMFORTABLE','TARGET','STRETCH','OVERREACH')),
  repetition_factor numeric(4,2) not null check (repetition_factor between 0.25 and 1),
  score_before numeric(5,2),
  raw_score_delta numeric(5,2) not null,
  applied_score_delta numeric(5,2) not null check (abs(applied_score_delta)<=8),
  score_after numeric(5,2),
  visible_level_before text,
  visible_level_after text,
  confidence_before numeric(5,2) not null,
  confidence_delta numeric(5,2) not null,
  confidence_after numeric(5,2) not null,
  assessment_before text not null,
  assessment_after text not null,
  contradiction_gate boolean not null,
  context_signature text not null,
  reason_code text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (source_result_id, skill_id),
  check ((skill_role='PRIMARY_SKILL') or (not informative_evidence and applied_score_delta=0)),
  check ((score_before is null and assessment_before='UNRATED') or score_before is not null),
  check ((score_after is null and assessment_after='UNRATED') or score_after is not null)
);

create index skill_progression_events_player_skill_time_idx
  on public.skill_progression_events(player_id,skill_id,occurred_at,id);
alter table public.skill_progression_events enable row level security;
revoke all on table public.skill_progression_events from public,anon,authenticated;
grant select on table public.skill_progression_events to authenticated;
grant all on table public.skill_progression_events to service_role;
create policy skill_progression_events_owner_select on public.skill_progression_events
  for select to authenticated using ((select auth.uid())=player_id);

create or replace function private.prof_v1_level(p_score numeric)
returns text language sql immutable strict set search_path='' as $$
  select case when p_score<20 then 'I' when p_score<40 then 'II' when p_score<60 then 'III' when p_score<80 then 'IV' else 'V' end
$$;

create or replace function private.prof_v1_challenge(p_demand numeric,p_score numeric)
returns text language sql immutable set search_path='' as $$
  select case when p_score is null then 'UNKNOWN' when p_demand-p_score<=-50 then 'VERY_COMFORTABLE'
    when p_demand-p_score<=-20 then 'COMFORTABLE' when p_demand-p_score<=15 then 'TARGET'
    when p_demand-p_score<=35 then 'STRETCH' else 'OVERREACH' end
$$;

create or replace function private.prof_v1_raw_delta(p_challenge text,p_outcome text)
returns numeric language sql immutable strict set search_path='' as $$
  select case
    when p_outcome='ABANDONED' then 0
    when p_challenge='VERY_COMFORTABLE' then case p_outcome when 'ATTEMPTED' then -4 when 'PARTIAL' then -2 else 1 end
    when p_challenge='COMFORTABLE' then case p_outcome when 'ATTEMPTED' then -3 when 'PARTIAL' then -1 else 2 end
    when p_challenge='TARGET' then case p_outcome when 'ATTEMPTED' then -2 when 'PARTIAL' then 1 else 4 end
    when p_challenge='STRETCH' then case p_outcome when 'ATTEMPTED' then -1 when 'PARTIAL' then 2 else 6 end
    when p_challenge='OVERREACH' then case p_outcome when 'ATTEMPTED' then 0 when 'PARTIAL' then 2 else 5 end
    else 0 end
$$;

create or replace function private.apply_result_skill_progression_v1(p_result_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  r public.quest_results; q public.quests; ref record; state public.player_skill_states;
  domain_slug text; dimension text; dimension_score numeric; overall_score numeric; demand numeric;
  exposure boolean; informative boolean; evidence_conf text; challenge text; raw_delta numeric;
  repetition numeric; prior_easy integer; weighted numeric; after_score numeric; after_conf numeric;
  after_assessment text; after_level text; positive_count integer; negative_count integer;
  contradiction boolean; informative_count integer; session_count integer; current_low numeric; current_high numeric;
begin
  select * into r from public.quest_results where id=p_result_id;
  if not found then raise exception using errcode='23503',message='Result does not exist'; end if;
  select * into q from public.quests where id=r.quest_id;
  insert into private.skill_progression_baselines(player_id,skill_id,assessment_status,visible_level,
    proficiency_score,confidence_score,readiness_status,readiness_score,readiness_model_version,
    exposure_count,evidence_count,last_practiced_at,last_evidence_at)
  select player_id,skill_id,assessment_status,visible_level,proficiency_score,confidence_score,
    readiness_status,readiness_score,readiness_model_version,exposure_count,evidence_count,last_practiced_at,last_evidence_at
  from public.player_skill_states where player_id=r.player_id
  on conflict(player_id,skill_id) do nothing;
  select slug into domain_slug from public.taxonomy_entities where id=q.primary_domain_id;
  dimension:=case domain_slug when 'technique' then 'TECHNIQUE' when 'fretboard' then 'FRETBOARD'
    when 'harmony_theory' then 'THEORY' when 'rhythm' then 'RHYTHM'
    when 'creativity_expression' then 'CREATIVE' when 'ear_musicianship' then 'THEORY' else 'CONSTRAINT' end;
  overall_score:=coalesce((q.difficulty_profile#>>'{overall,score}')::numeric,
    case q.declared_overall_demand when 'I' then 10 when 'II' then 30 when 'III' then 50 when 'IV' then 70 else 90 end);
  dimension_score:=case when coalesce((q.difficulty_profile#>>array['dimensions',dimension,'applicable'])::boolean,false)
    then (q.difficulty_profile#>>array['dimensions',dimension,'score'])::numeric else null end;
  demand:=round((coalesce(dimension_score,overall_score)*.65+overall_score*.35)::numeric,2);
  evidence_conf:=case when r.confidence_summary='MIXED' then 'MODERATE' else r.confidence_summary end;
  exposure:=r.meaningful_attempt and r.outcome<>'ABANDONED';

  for ref in
    select q.primary_skill_id as skill_id,'PRIMARY_SKILL'::text as role
    union all select skill_id,role from public.quest_skill_roles where quest_id=q.id
  loop
    informative:=exposure and ref.role='PRIMARY_SKILL';
    insert into public.player_skill_states(player_id,skill_id) values(r.player_id,ref.skill_id)
      on conflict(player_id,skill_id) do nothing;
    select * into state from public.player_skill_states where player_id=r.player_id and skill_id=ref.skill_id for update;
    if exists(select 1 from public.skill_progression_events where source_result_id=r.id and skill_id=ref.skill_id) then continue; end if;
    challenge:=private.prof_v1_challenge(demand,state.proficiency_score);
    select count(*) into prior_easy from public.skill_progression_events e
      where e.player_id=r.player_id and e.skill_id=ref.skill_id and e.source_quest_id=q.id
        and e.outcome='CLEARED' and e.challenge_band in ('VERY_COMFORTABLE','COMFORTABLE') and e.informative_evidence;
    repetition:=case when informative and r.outcome='CLEARED' and challenge in ('VERY_COMFORTABLE','COMFORTABLE')
      then greatest(.25,1-prior_easy*.25) else 1 end;
    raw_delta:=case when informative then private.prof_v1_raw_delta(challenge,r.outcome) else 0 end;
    after_score:=state.proficiency_score;
    after_conf:=state.confidence_score;
    after_assessment:=state.assessment_status;
    contradiction:=false;
    if informative then
      if state.proficiency_score is null then
        after_score:=least(79,greatest(0,demand+(case r.outcome when 'CLEARED' then 0 when 'PARTIAL' then -6 else -12 end)*
          case evidence_conf when 'LOW' then .5 when 'MODERATE' then .75 else 1 end));
      else
        weighted:=greatest(-8,least(8,raw_delta*case evidence_conf when 'LOW' then .5 when 'MODERATE' then .75 else 1 end*repetition));
        after_score:=greatest(0,least(100,state.proficiency_score+weighted));
        if state.assessment_status='ESTABLISHED' then
          select count(*) filter(where applied_score_delta>0),count(*) filter(where applied_score_delta<0)
            into positive_count,negative_count from (
              select applied_score_delta from public.skill_progression_events where player_id=r.player_id and skill_id=ref.skill_id and informative_evidence order by occurred_at desc,id desc limit 2
            ) recent;
          current_low:=floor(state.proficiency_score/20)*20; current_high:=least(100,current_low+19.99);
          if private.prof_v1_level(after_score)>state.visible_level and positive_count<1 then after_score:=current_high; end if;
          if private.prof_v1_level(after_score)<state.visible_level and negative_count<1 then after_score:=current_low; end if;
        end if;
      end if;
      after_score:=round(after_score,2);
      after_conf:=least(100,state.confidence_score+case evidence_conf when 'LOW' then 10 when 'MODERATE' then 20 else 25 end*repetition);
      select count(*),count(distinct source_session_id),
        coalesce(bool_or(applied_score_delta>0),false) and coalesce(bool_or(applied_score_delta<0),false)
        into informative_count,session_count,contradiction
      from (select * from public.skill_progression_events where player_id=r.player_id and skill_id=ref.skill_id and informative_evidence order by occurred_at desc,id desc limit 4) recent;
      contradiction:=contradiction or ((after_score-coalesce(state.proficiency_score,after_score))>0 and exists(
        select 1 from public.skill_progression_events where player_id=r.player_id and skill_id=ref.skill_id and informative_evidence and applied_score_delta<0 order by occurred_at desc limit 4));
      if state.assessment_status='ESTABLISHED' or (informative_count+1>=3 and session_count+1>=2 and after_conf>=60 and not contradiction)
        then after_assessment:='ESTABLISHED'; else after_assessment:='ESTIMATED'; end if;
    end if;
    after_level:=case when after_score is null then null else private.prof_v1_level(after_score) end;

    insert into public.skill_progression_events(player_id,skill_id,source_result_id,source_session_id,source_quest_id,
      skill_role,proficiency_model_version,confidence_model_version,meaningful_exposure,meaningful_attempt,informative_evidence,outcome,
      evidence_confidence,demand_dimension,demand_score,challenge_band,repetition_factor,score_before,raw_score_delta,
      applied_score_delta,score_after,visible_level_before,visible_level_after,confidence_before,confidence_delta,confidence_after,
      assessment_before,assessment_after,contradiction_gate,context_signature,reason_code,occurred_at)
    values(r.player_id,ref.skill_id,r.id,r.session_id,q.id,ref.role,'PROF_V1','CONF_V1',exposure,r.meaningful_attempt,informative,r.outcome,
      evidence_conf,dimension,demand,challenge,repetition,state.proficiency_score,raw_delta,
      coalesce(after_score-state.proficiency_score,0),after_score,state.visible_level,after_level,state.confidence_score,
      after_conf-state.confidence_score,after_conf,state.assessment_status,after_assessment,contradiction,
      q.slug,case when not exposure then 'NONMEANINGFUL_NO_EVIDENCE' when ref.role<>'PRIMARY_SKILL' then 'SUPPORTING_EXPOSURE_ONLY'
        when state.proficiency_score is null then 'INITIAL_PRIMARY_ESTIMATE' else 'PRIMARY_EVIDENCE_APPLIED' end,r.finalized_at);

    update public.player_skill_states set assessment_status=after_assessment,visible_level=after_level,
      proficiency_score=after_score,confidence_score=after_conf,
      exposure_count=exposure_count+case when exposure then 1 else 0 end,
      evidence_count=evidence_count+case when informative then 1 else 0 end,
      last_practiced_at=case when exposure then greatest(coalesce(last_practiced_at,'-infinity'),r.finalized_at) else last_practiced_at end,
      last_evidence_at=case when informative then greatest(coalesce(last_evidence_at,'-infinity'),r.finalized_at) else last_evidence_at end,
      proficiency_model_version='PROF_V1',confidence_model_version='CONF_V1',updated_at=clock_timestamp()
      where player_id=r.player_id and skill_id=ref.skill_id;
  end loop;
end $$;

create or replace function private.project_skills_after_result_finalization()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.apply_result_skill_progression_v1(new.id); return new; end $$;

create trigger quest_results_project_terminal_skills
after update of outcome,verification_modes,confidence_summary on public.quest_results
for each row execute function private.project_skills_after_result_finalization();

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

do $$ declare item record; begin
  for item in select id from public.quest_results order by finalized_at,id loop
    perform private.apply_result_skill_progression_v1(item.id);
  end loop;
end $$;

revoke all on function private.prof_v1_level(numeric) from public,anon,authenticated;
revoke all on function private.prof_v1_challenge(numeric,numeric) from public,anon,authenticated;
revoke all on function private.prof_v1_raw_delta(text,text) from public,anon,authenticated;
revoke all on function private.apply_result_skill_progression_v1(uuid) from public,anon,authenticated;
revoke all on function private.project_skills_after_result_finalization() from public,anon,authenticated;
revoke all on function private.rebuild_player_skill_states_v1(uuid) from public,anon,authenticated;
grant execute on function private.rebuild_player_skill_states_v1(uuid) to service_role;

commit;
