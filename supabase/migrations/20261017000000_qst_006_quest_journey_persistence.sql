-- QST-006: owner-scoped MEC Quest Journey persistence and trusted lifecycle boundaries.

begin;

create table public.player_quest_journeys (
  quest_id uuid primary key references public.quests(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  lifecycle_status text not null check (lifecycle_status in ('SAVED','ACTIVE','CONCLUDED','ARCHIVED','ABANDONED')),
  current_stage text not null check (current_stage in ('MAP','EXPLORE','CRAFT')),
  archived_from_status text check (archived_from_status in ('SAVED','ACTIVE','CONCLUDED','ABANDONED')),
  opened_at timestamptz,
  concluded_at timestamptz,
  archived_at timestamptz,
  abandoned_at timestamptz,
  last_worked_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint player_quest_journeys_archive_consistency check (
    (lifecycle_status = 'ARCHIVED' and archived_at is not null and archived_from_status is not null)
    or (lifecycle_status <> 'ARCHIVED' and archived_at is null and archived_from_status is null)
  )
);

create index player_quest_journeys_owner_recent_idx
  on public.player_quest_journeys (player_id, last_worked_at desc);

create or replace function private.validate_quest_journey_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.quests q where q.id = new.quest_id and q.player_id = new.player_id
  ) then
    raise exception using errcode = '23503', message = 'Journey owner must match Quest owner';
  end if;
  return new;
end;
$$;

create trigger player_quest_journeys_validate_owner
before insert or update on public.player_quest_journeys
for each row execute function private.validate_quest_journey_owner();

revoke all on function private.validate_quest_journey_owner() from public, anon, authenticated;

alter table public.player_quest_journeys enable row level security;
revoke all on table public.player_quest_journeys from public, anon, authenticated;
grant select on table public.player_quest_journeys to authenticated;
grant all on table public.player_quest_journeys to service_role;

create policy player_quest_journeys_owner_select
on public.player_quest_journeys for select to authenticated
using (player_id = (select auth.uid()));

create or replace function public.ensure_quest_journey(p_quest_id uuid)
returns public.player_quest_journeys
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  first_session timestamptz;
  last_session timestamptz;
  has_sessions boolean;
  result_row public.player_quest_journeys;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;
  if not exists (select 1 from public.quests q where q.id = p_quest_id and q.player_id = caller_id) then
    raise exception using errcode = '42501', message = 'Owned Quest not found';
  end if;

  select count(*) > 0, min(s.started_at), max(coalesce(s.ended_at, s.started_at))
    into has_sessions, first_session, last_session
  from public.practice_sessions s
  where s.quest_id = p_quest_id and s.player_id = caller_id;

  insert into public.player_quest_journeys (
    quest_id, player_id, lifecycle_status, current_stage, opened_at, last_worked_at
  ) values (
    p_quest_id,
    caller_id,
    case when has_sessions then 'ACTIVE' else 'SAVED' end,
    case when has_sessions then 'EXPLORE' else 'MAP' end,
    case when has_sessions then first_session else null end,
    coalesce(last_session, clock_timestamp())
  ) on conflict (quest_id) do nothing;

  select * into result_row from public.player_quest_journeys
  where quest_id = p_quest_id and player_id = caller_id;
  return result_row;
end;
$$;

create or replace function public.save_generated_quest_journey(p_quest jsonb, p_mode text default 'SAVED')
returns public.player_quest_journeys
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  snapshot jsonb := p_quest -> 'resolved_snapshot';
  v_quest_id uuid;
  existing_quest public.quests;
  journey public.player_quest_journeys;
  created_journey boolean := false;
  now_at timestamptz := clock_timestamp();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;
  if p_mode not in ('SAVED','START','PRACTICE') then
    raise exception using errcode = '22023', message = 'Unsupported Journey persistence mode';
  end if;
  begin
    v_quest_id := (snapshot -> 'identity' ->> 'id')::uuid;
  exception when others then
    raise exception using errcode = '22023', message = 'Generated Quest identity must be a UUID';
  end;

  -- Serialize creation/retry for one immutable Quest identity so concurrent exact
  -- retries cannot race between the existence check and canonical persistence.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_quest_id::text, 0));

  select * into existing_quest from public.quests where id = v_quest_id;
  if existing_quest.id is null then
    perform public.persist_generated_quest(p_quest);
  elsif existing_quest.player_id <> caller_id then
    raise exception using errcode = '42501', message = 'Quest identity belongs to another Player';
  elsif existing_quest.resolved_snapshot <> snapshot then
    raise exception using errcode = '23505', message = 'Quest identity conflicts with a different immutable snapshot';
  end if;

  insert into public.player_quest_journeys (
    quest_id, player_id, lifecycle_status, current_stage, opened_at, last_worked_at
  ) values (
    v_quest_id,
    caller_id,
    case when p_mode = 'SAVED' then 'SAVED' else 'ACTIVE' end,
    case when p_mode = 'PRACTICE' then 'EXPLORE' else 'MAP' end,
    case when p_mode = 'SAVED' then null else now_at end,
    now_at
  ) on conflict (quest_id) do nothing
  returning * into journey;
  created_journey := journey.quest_id is not null;

  if not created_journey then
    select * into journey from public.player_quest_journeys
    where quest_id = v_quest_id and player_id = caller_id for update;
    if journey.quest_id is null then
      raise exception using errcode = '42501', message = 'Journey identity belongs to another Player';
    end if;
    if p_mode in ('START','PRACTICE') then
      update public.player_quest_journeys
      set lifecycle_status = 'ACTIVE',
          opened_at = coalesce(opened_at, now_at),
          archived_at = null,
          archived_from_status = null,
          last_worked_at = now_at,
          updated_at = now_at
      where player_quest_journeys.quest_id = v_quest_id and player_id = caller_id
      returning * into journey;
    end if;
  end if;
  return journey;
end;
$$;

create or replace function public.set_quest_journey_stage(p_quest_id uuid, p_stage text)
returns public.player_quest_journeys
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  result_row public.player_quest_journeys;
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Authentication is required'; end if;
  if p_stage not in ('MAP','EXPLORE','CRAFT') then raise exception using errcode = '22023', message = 'Invalid Journey stage'; end if;
  update public.player_quest_journeys
  set current_stage = p_stage, last_worked_at = clock_timestamp(), updated_at = clock_timestamp()
  where quest_id = p_quest_id and player_id = caller_id and lifecycle_status <> 'ARCHIVED'
  returning * into result_row;
  if result_row.quest_id is null then raise exception using errcode = '42501', message = 'Active owned Journey not found'; end if;
  return result_row;
end;
$$;

create or replace function public.transition_quest_journey(p_quest_id uuid, p_action text)
returns public.player_quest_journeys
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  current_row public.player_quest_journeys;
  now_at timestamptz := clock_timestamp();
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Authentication is required'; end if;
  select * into current_row from public.player_quest_journeys
  where quest_id = p_quest_id and player_id = caller_id for update;
  if current_row.quest_id is null then raise exception using errcode = '42501', message = 'Owned Journey not found'; end if;

  if p_action = 'START' and current_row.lifecycle_status in ('SAVED','ACTIVE') then
    update public.player_quest_journeys set lifecycle_status='ACTIVE', opened_at=coalesce(opened_at,now_at), last_worked_at=now_at, updated_at=now_at where quest_id=p_quest_id returning * into current_row;
  elsif p_action = 'CONCLUDE' and current_row.lifecycle_status in ('ACTIVE','CONCLUDED') then
    update public.player_quest_journeys set lifecycle_status='CONCLUDED', concluded_at=coalesce(concluded_at,now_at), updated_at=now_at where quest_id=p_quest_id returning * into current_row;
  elsif p_action = 'ABANDON' and current_row.lifecycle_status in ('SAVED','ACTIVE','ABANDONED') then
    update public.player_quest_journeys set lifecycle_status='ABANDONED', abandoned_at=coalesce(abandoned_at,now_at), updated_at=now_at where quest_id=p_quest_id returning * into current_row;
  elsif p_action = 'REOPEN' and current_row.lifecycle_status in ('CONCLUDED','ABANDONED','ACTIVE') then
    update public.player_quest_journeys set lifecycle_status='ACTIVE', opened_at=coalesce(opened_at,now_at), last_worked_at=now_at, updated_at=now_at where quest_id=p_quest_id returning * into current_row;
  elsif p_action = 'ARCHIVE' and current_row.lifecycle_status <> 'ARCHIVED' then
    update public.player_quest_journeys set archived_from_status=current_row.lifecycle_status, lifecycle_status='ARCHIVED', archived_at=now_at, updated_at=now_at where quest_id=p_quest_id returning * into current_row;
  elsif p_action = 'ARCHIVE' and current_row.lifecycle_status = 'ARCHIVED' then
    null;
  elsif p_action = 'UNARCHIVE' and current_row.lifecycle_status = 'ARCHIVED' then
    update public.player_quest_journeys set lifecycle_status=archived_from_status, archived_from_status=null, archived_at=null, updated_at=now_at where quest_id=p_quest_id returning * into current_row;
  else
    raise exception using errcode = '22023', message = 'Invalid Journey lifecycle transition';
  end if;
  return current_row;
end;
$$;

revoke all on function public.ensure_quest_journey(uuid) from public, anon, authenticated;
revoke all on function public.save_generated_quest_journey(jsonb,text) from public, anon, authenticated;
revoke all on function public.set_quest_journey_stage(uuid,text) from public, anon, authenticated;
revoke all on function public.transition_quest_journey(uuid,text) from public, anon, authenticated;
grant execute on function public.ensure_quest_journey(uuid) to authenticated, service_role;
grant execute on function public.save_generated_quest_journey(jsonb,text) to authenticated, service_role;
grant execute on function public.set_quest_journey_stage(uuid,text) to authenticated, service_role;
grant execute on function public.transition_quest_journey(uuid,text) to authenticated, service_role;

commit;
