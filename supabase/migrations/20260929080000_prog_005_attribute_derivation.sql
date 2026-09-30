-- PROG-005: ATTR_V1 Character Attribute derivation from ATTRIBUTE_GRAPH_V1.
begin;

create table public.attribute_progression_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  attribute_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  source_result_id uuid references public.quest_results(id) on delete cascade,
  source_session_id uuid references public.practice_sessions(id) on delete cascade,
  source_quest_id uuid references public.quests(id) on delete cascade,
  graph_version text not null check (graph_version='ATTRIBUTE_GRAPH_V1'),
  attribute_model_version text not null check (attribute_model_version='ATTR_V1'),
  total_contributor_count integer not null check (total_contributor_count>0),
  rated_contributor_count integer not null check (rated_contributor_count between 0 and total_contributor_count),
  established_contributor_count integer not null check (established_contributor_count between 0 and rated_contributor_count),
  coverage_ratio numeric(8,6) not null check (coverage_ratio between 0 and 1),
  mean_contributor_confidence numeric(5,2),
  score_before numeric(5,2),
  score_after numeric(5,2),
  status_before text not null check (status_before in ('UNASSESSED','ESTIMATED','ESTABLISHED')),
  status_after text not null check (status_after in ('UNASSESSED','ESTIMATED','ESTABLISHED')),
  evaluated_at timestamptz not null,
  source_kind text not null check (source_kind in ('RESULT_DERIVATION','MIGRATION_REBUILD','REPLAY')),
  reason_code text not null check (reason_code in ('NO_RATED_CONTRIBUTORS','ESTIMATED_COVERAGE','ESTABLISHED_GATES_MET')),
  created_at timestamptz not null default clock_timestamp(),
  check ((status_after='UNASSESSED' and score_after is null) or (status_after<>'UNASSESSED' and score_after between 0 and 100)),
  check ((source_kind='RESULT_DERIVATION' and source_result_id is not null and source_session_id is not null and source_quest_id is not null)
    or (source_kind<>'RESULT_DERIVATION' and source_result_id is null and source_session_id is null and source_quest_id is null))
);
create unique index attribute_progression_events_result_attribute_idx
  on public.attribute_progression_events(source_result_id,attribute_id) where source_kind='RESULT_DERIVATION';
create index attribute_progression_events_player_attribute_time_idx
  on public.attribute_progression_events(player_id,attribute_id,evaluated_at,id);

alter table public.attribute_progression_events enable row level security;
revoke all on table public.attribute_progression_events from public,anon,authenticated;
grant select on table public.attribute_progression_events to authenticated;
grant all on table public.attribute_progression_events to service_role;
create policy attribute_progression_events_owner_select on public.attribute_progression_events
  for select to authenticated using ((select auth.uid())=player_id);

create or replace function private.rebuild_player_attributes_v1(
  p_player_id uuid,
  p_source_kind text default 'REPLAY',
  p_result_id uuid default null,
  p_evaluated_at timestamptz default clock_timestamp()
) returns bigint language plpgsql security definer set search_path='' as $$
declare
  attribute_row record;
  current_state public.player_attribute_states;
  source_result public.quest_results;
  total_count integer; rated_count integer; established_count integer;
  weighted_sum numeric; weight_sum numeric; mean_confidence numeric; coverage numeric;
  next_score numeric; next_status text; reason text; changed bigint:=0;
begin
  if p_source_kind not in ('RESULT_DERIVATION','MIGRATION_REBUILD','REPLAY') then
    raise exception using errcode='22023',message='Invalid ATTR_V1 source kind';
  end if;
  if not exists(select 1 from auth.users where id=p_player_id) then
    raise exception using errcode='23503',message='Player identity does not exist';
  end if;
  if p_source_kind='RESULT_DERIVATION' then
    select * into source_result from public.quest_results where id=p_result_id and player_id=p_player_id;
    if not found then raise exception using errcode='23503',message='ATTR_V1 source Result does not exist for Player'; end if;
  elsif p_result_id is not null then
    raise exception using errcode='22023',message='Only RESULT_DERIVATION accepts a source Result';
  end if;

  for attribute_row in select id from public.taxonomy_entities where kind='ATTRIBUTE' and lifecycle='ACTIVE' order by id loop
    insert into public.player_attribute_states(player_id,attribute_id) values(p_player_id,attribute_row.id)
      on conflict(player_id,attribute_id) do nothing;
    select * into current_state from public.player_attribute_states
      where player_id=p_player_id and attribute_id=attribute_row.id for update;

    select count(*)::integer,
      count(*) filter(where s.assessment_status in ('ESTIMATED','ESTABLISHED'))::integer,
      count(*) filter(where s.assessment_status='ESTABLISHED')::integer,
      sum(s.proficiency_score*(.25+.75*s.confidence_score/100)) filter(where s.assessment_status in ('ESTIMATED','ESTABLISHED')),
      sum(.25+.75*s.confidence_score/100) filter(where s.assessment_status in ('ESTIMATED','ESTABLISHED')),
      avg(s.confidence_score) filter(where s.assessment_status in ('ESTIMATED','ESTABLISHED'))
    into total_count,rated_count,established_count,weighted_sum,weight_sum,mean_confidence
    from public.taxonomy_relationships graph
    left join public.player_skill_states s on s.player_id=p_player_id and s.skill_id=graph.source_entity_id
    where graph.relationship_type='AFFECTS' and graph.metadata->>'graph_version'='ATTRIBUTE_GRAPH_V1'
      and graph.target_entity_id=attribute_row.id;
    if total_count=0 then raise exception 'ATTR_V1 Attribute has no ATTRIBUTE_GRAPH_V1 contributors'; end if;
    coverage:=rated_count::numeric/total_count;
    if rated_count=0 then
      next_score:=null; next_status:='UNASSESSED'; reason:='NO_RATED_CONTRIBUTORS';
    else
      next_score:=round(weighted_sum/weight_sum,2);
      if coverage>=.6 and mean_confidence>=60 and established_count>=2 then
        next_status:='ESTABLISHED'; reason:='ESTABLISHED_GATES_MET';
      else next_status:='ESTIMATED'; reason:='ESTIMATED_COVERAGE'; end if;
    end if;

    if current_state.assessment_status is distinct from next_status or current_state.score is distinct from next_score
       or current_state.attribute_model_version is distinct from 'ATTR_V1' then
      insert into public.attribute_progression_events(player_id,attribute_id,source_result_id,source_session_id,source_quest_id,
        graph_version,attribute_model_version,total_contributor_count,rated_contributor_count,established_contributor_count,
        coverage_ratio,mean_contributor_confidence,score_before,score_after,status_before,status_after,evaluated_at,source_kind,reason_code)
      values(p_player_id,attribute_row.id,case when p_source_kind='RESULT_DERIVATION' then source_result.id end,
        case when p_source_kind='RESULT_DERIVATION' then source_result.session_id end,
        case when p_source_kind='RESULT_DERIVATION' then source_result.quest_id end,
        'ATTRIBUTE_GRAPH_V1','ATTR_V1',total_count,rated_count,established_count,round(coverage,6),round(mean_confidence,2),
        current_state.score,next_score,current_state.assessment_status,next_status,p_evaluated_at,p_source_kind,reason)
      on conflict(source_result_id,attribute_id) where source_kind='RESULT_DERIVATION' do nothing;
      update public.player_attribute_states set assessment_status=next_status,score=next_score,
        attribute_model_version='ATTR_V1',updated_at=clock_timestamp()
      where player_id=p_player_id and attribute_id=attribute_row.id;
      changed:=changed+1;
    end if;
  end loop;
  return changed;
end $$;

-- Explicit terminal sequence: PROF/CONF, READY, then ATTR. XP remains independent.
create or replace function private.project_skills_after_result_finalization()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.apply_result_skill_progression_v1(new.id);
  perform private.refresh_player_readiness_v1(new.player_id,new.finalized_at,'PRACTICE_REFRESH');
  perform private.rebuild_player_attributes_v1(new.player_id,'RESULT_DERIVATION',new.id,new.finalized_at);
  return new;
end $$;

create or replace function private.rebuild_player_progression_v1(p_player_id uuid,p_as_of timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.rebuild_player_character_state(p_player_id);
  perform private.rebuild_player_skill_states_v1(p_player_id);
  perform private.refresh_player_readiness_v1(p_player_id,p_as_of,'REPLAY');
  perform private.rebuild_player_attributes_v1(p_player_id,'REPLAY',null,p_as_of);
end $$;

do $$ declare player record; migration_as_of timestamptz:=clock_timestamp(); begin
  if exists(select 1 from public.player_attribute_states where assessment_status<>'UNASSESSED' or score is not null) then
    raise exception 'PROG-005 found unexpected pre-existing derived Attribute state';
  end if;
  for player in select distinct player_id from public.player_attribute_states order by player_id loop
    perform private.rebuild_player_attributes_v1(player.player_id,'MIGRATION_REBUILD',null,migration_as_of);
  end loop;
end $$;

revoke all on function private.rebuild_player_attributes_v1(uuid,text,uuid,timestamptz) from public,anon,authenticated;
revoke all on function private.rebuild_player_progression_v1(uuid,timestamptz) from public,anon,authenticated;
grant execute on function private.rebuild_player_attributes_v1(uuid,text,uuid,timestamptz) to service_role;
grant execute on function private.rebuild_player_progression_v1(uuid,timestamptz) to service_role;

commit;
