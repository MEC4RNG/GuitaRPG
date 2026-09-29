-- PROG-004: READY_V1 server-authoritative readiness and recency projection.
begin;

create table public.skill_readiness_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  readiness_model_version text not null check (readiness_model_version='READY_V1'),
  previous_status text not null check (previous_status in ('UNKNOWN','LOW','MODERATE','HIGH')),
  previous_score numeric(5,2),
  next_status text not null check (next_status in ('UNKNOWN','LOW','MODERATE','HIGH')),
  next_score numeric(5,2),
  assessment_status_snapshot text not null check (assessment_status_snapshot in ('UNRATED','ESTIMATED','ESTABLISHED')),
  proficiency_score_snapshot numeric(5,2),
  last_practiced_at_snapshot timestamptz,
  evaluated_at timestamptz not null,
  reason_code text not null check (reason_code in ('UNRATED_UNKNOWN','UNKNOWN_RECENCY','BASELINE_PRESERVED','RECENT_HIGH','AGING_MODERATE','STALE_LOW')),
  source_kind text not null check (source_kind in ('PRACTICE_REFRESH','RECENCY_REFRESH','BASELINE_PRESERVED','REPLAY')),
  created_at timestamptz not null default clock_timestamp(),
  check ((next_status='UNKNOWN' and next_score is null) or (next_status<>'UNKNOWN' and next_score between 0 and 100)),
  check (next_score is null or proficiency_score_snapshot is null or next_score<=proficiency_score_snapshot)
);

create index skill_readiness_events_player_skill_time_idx
  on public.skill_readiness_events(player_id,skill_id,evaluated_at,id);
alter table public.skill_readiness_events enable row level security;
revoke all on table public.skill_readiness_events from public,anon,authenticated;
grant select on table public.skill_readiness_events to authenticated;
grant all on table public.skill_readiness_events to service_role;
create policy skill_readiness_events_owner_select on public.skill_readiness_events
  for select to authenticated using ((select auth.uid())=player_id);

create or replace function private.refresh_player_readiness_v1(
  p_player_id uuid,
  p_as_of timestamptz,
  p_source_kind text default 'RECENCY_REFRESH'
) returns bigint
language plpgsql security definer set search_path=''
as $$
declare
  state public.player_skill_states;
  baseline private.skill_progression_baselines;
  age_seconds numeric;
  next_status text;
  next_score numeric;
  reason text;
  changed bigint:=0;
begin
  if p_as_of is null then raise exception using errcode='22004',message='READY_V1 requires as_of'; end if;
  if p_source_kind not in ('PRACTICE_REFRESH','RECENCY_REFRESH','BASELINE_PRESERVED','REPLAY') then
    raise exception using errcode='22023',message='Invalid READY_V1 source kind';
  end if;
  if not exists(select 1 from auth.users where id=p_player_id) then
    raise exception using errcode='23503',message='Player identity does not exist';
  end if;

  for state in select * from public.player_skill_states where player_id=p_player_id order by skill_id for update loop
    if state.assessment_status='UNRATED' then
      next_status:='UNKNOWN'; next_score:=null; reason:='UNRATED_UNKNOWN';
    elsif state.last_practiced_at is null then
      select * into baseline from private.skill_progression_baselines
        where player_id=state.player_id and skill_id=state.skill_id;
      if found and baseline.readiness_status<>'UNKNOWN' and baseline.readiness_score is not null then
        next_status:=baseline.readiness_status;
        next_score:=least(state.proficiency_score,baseline.readiness_score);
        reason:='BASELINE_PRESERVED';
      else
        next_status:='UNKNOWN'; next_score:=null; reason:='UNKNOWN_RECENCY';
      end if;
    else
      age_seconds:=greatest(0,extract(epoch from (p_as_of-state.last_practiced_at)));
      if age_seconds<=604800 then next_status:='HIGH'; next_score:=state.proficiency_score; reason:='RECENT_HIGH';
      elsif age_seconds<=2592000 then next_status:='MODERATE'; next_score:=round(state.proficiency_score*.8,2); reason:='AGING_MODERATE';
      else next_status:='LOW'; next_score:=round(state.proficiency_score*.6,2); reason:='STALE_LOW'; end if;
    end if;

    if state.readiness_status is distinct from next_status or state.readiness_score is distinct from next_score
       or state.readiness_model_version is distinct from 'READY_V1' then
      insert into public.skill_readiness_events(player_id,skill_id,readiness_model_version,
        previous_status,previous_score,next_status,next_score,assessment_status_snapshot,
        proficiency_score_snapshot,last_practiced_at_snapshot,evaluated_at,reason_code,source_kind)
      values(state.player_id,state.skill_id,'READY_V1',state.readiness_status,state.readiness_score,
        next_status,next_score,state.assessment_status,state.proficiency_score,state.last_practiced_at,
        p_as_of,reason,case when reason='BASELINE_PRESERVED' then 'BASELINE_PRESERVED' else p_source_kind end);
      update public.player_skill_states set readiness_status=next_status,readiness_score=next_score,
        readiness_model_version='READY_V1',updated_at=clock_timestamp()
      where player_id=state.player_id and skill_id=state.skill_id;
      changed:=changed+1;
    end if;
  end loop;
  return changed;
end $$;

create or replace function public.refresh_player_readiness()
returns bigint language plpgsql security definer set search_path=''
as $$
declare caller uuid:=auth.uid();
begin
  if caller is null then raise exception using errcode='42501',message='Authentication is required'; end if;
  return private.refresh_player_readiness_v1(caller,clock_timestamp(),'RECENCY_REFRESH');
end $$;

-- Forward-replace only the trusted trigger function. Trigger identity remains stable.
-- PROF/CONF completes first, then READY_V1 consumes its resulting projection explicitly.
create or replace function private.project_skills_after_result_finalization()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.apply_result_skill_progression_v1(new.id);
  perform private.refresh_player_readiness_v1(new.player_id,new.finalized_at,'PRACTICE_REFRESH');
  return new;
end $$;

create or replace function private.rebuild_player_progression_v1(p_player_id uuid,p_as_of timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.rebuild_player_skill_states_v1(p_player_id);
  perform private.refresh_player_readiness_v1(p_player_id,p_as_of,'REPLAY');
end $$;

-- Evaluate only actual stored snapshots at migration time; do not fabricate daily history.
do $$ declare player record; migration_as_of timestamptz:=clock_timestamp(); begin
  for player in select distinct player_id from public.player_skill_states order by player_id loop
    perform private.refresh_player_readiness_v1(player.player_id,migration_as_of,'RECENCY_REFRESH');
  end loop;
end $$;

revoke all on function private.refresh_player_readiness_v1(uuid,timestamptz,text) from public,anon,authenticated;
revoke all on function private.rebuild_player_progression_v1(uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.refresh_player_readiness() from public,anon,authenticated;
grant execute on function private.refresh_player_readiness_v1(uuid,timestamptz,text) to service_role;
grant execute on function private.rebuild_player_progression_v1(uuid,timestamptz) to service_role;
grant execute on function public.refresh_player_readiness() to authenticated,service_role;

commit;
