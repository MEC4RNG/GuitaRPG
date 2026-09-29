-- SES-001: authoritative Practice Session lifecycle and append-only telemetry.
-- Authority: DATA-001, QST-001/QST-002, EVD-001, PROG-001.

begin;

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  runtime_version text not null default 'SES_V1' check (runtime_version = 'SES_V1'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'ENDED')),
  started_at timestamptz not null default clock_timestamp(),
  ended_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check (
    (status in ('ACTIVE', 'PAUSED') and ended_at is null)
    or (status = 'ENDED' and ended_at is not null and ended_at >= started_at)
  )
);

create table public.practice_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  event_type text not null check (event_type in ('START', 'PAUSE', 'RESUME', 'END')),
  occurred_at timestamptz not null default clock_timestamp(),
  runtime_version text not null default 'SES_V1' check (runtime_version = 'SES_V1'),
  unique (session_id, sequence)
);

create index practice_sessions_player_started_idx
  on public.practice_sessions (player_id, started_at desc);
create index practice_sessions_quest_started_idx
  on public.practice_sessions (quest_id, started_at desc);
create index practice_session_events_order_idx
  on public.practice_session_events (session_id, sequence);

alter table public.practice_sessions enable row level security;
alter table public.practice_session_events enable row level security;

revoke all on table public.practice_sessions, public.practice_session_events from public, anon, authenticated;
grant select on table public.practice_sessions, public.practice_session_events to authenticated;
grant all on table public.practice_sessions, public.practice_session_events to service_role;

create policy practice_sessions_owner_select
  on public.practice_sessions for select to authenticated
  using ((select auth.uid()) = player_id);

create policy practice_session_events_owner_select
  on public.practice_session_events for select to authenticated
  using (
    exists (
      select 1 from public.practice_sessions session
      where session.id = session_id and session.player_id = (select auth.uid())
    )
  );

create or replace function private.transition_practice_session(
  p_session_id uuid,
  p_expected_status text,
  p_new_status text,
  p_event_type text
)
returns public.practice_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  current_session public.practice_sessions;
  event_sequence integer;
  event_time timestamptz := clock_timestamp();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  select * into current_session
  from public.practice_sessions
  where id = p_session_id
  for update;

  if not found or current_session.player_id <> caller_id then
    raise exception using errcode = '42501', message = 'Session is not owned by caller';
  end if;

  if current_session.status <> p_expected_status then
    raise exception using errcode = '55000', message = format(
      'Invalid Session transition: expected %s, found %s',
      p_expected_status,
      current_session.status
    );
  end if;

  select coalesce(max(sequence), 0) + 1 into event_sequence
  from public.practice_session_events
  where session_id = p_session_id;

  update public.practice_sessions
  set status = p_new_status,
      ended_at = case when p_new_status = 'ENDED' then event_time else null end
  where id = p_session_id
  returning * into current_session;

  insert into public.practice_session_events (
    session_id, sequence, event_type, occurred_at, runtime_version
  ) values (
    p_session_id, event_sequence, p_event_type, event_time, 'SES_V1'
  );

  return current_session;
end;
$$;

create or replace function public.start_practice_session(p_quest_id uuid)
returns public.practice_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  session_time timestamptz := clock_timestamp();
  created_session public.practice_sessions;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  if not exists (
    select 1 from public.quests
    where id = p_quest_id and player_id = caller_id
  ) then
    raise exception using errcode = '42501', message = 'Quest is not owned by caller';
  end if;

  insert into public.practice_sessions (
    player_id, quest_id, runtime_version, status, started_at, created_at
  ) values (
    caller_id, p_quest_id, 'SES_V1', 'ACTIVE', session_time, session_time
  ) returning * into created_session;

  insert into public.practice_session_events (
    session_id, sequence, event_type, occurred_at, runtime_version
  ) values (
    created_session.id, 1, 'START', session_time, 'SES_V1'
  );

  return created_session;
end;
$$;

create or replace function public.pause_practice_session(p_session_id uuid)
returns public.practice_sessions
language sql
security definer
set search_path = ''
as $$
  select private.transition_practice_session(p_session_id, 'ACTIVE', 'PAUSED', 'PAUSE');
$$;

create or replace function public.resume_practice_session(p_session_id uuid)
returns public.practice_sessions
language sql
security definer
set search_path = ''
as $$
  select private.transition_practice_session(p_session_id, 'PAUSED', 'ACTIVE', 'RESUME');
$$;

create or replace function public.end_practice_session(p_session_id uuid)
returns public.practice_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  select status into current_status from public.practice_sessions where id = p_session_id;
  if current_status = 'ACTIVE' then
    return private.transition_practice_session(p_session_id, 'ACTIVE', 'ENDED', 'END');
  elsif current_status = 'PAUSED' then
    return private.transition_practice_session(p_session_id, 'PAUSED', 'ENDED', 'END');
  end if;
  return private.transition_practice_session(p_session_id, 'ACTIVE', 'ENDED', 'END');
end;
$$;

create or replace function public.practice_session_active_seconds(p_session_id uuid)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  with ordered as (
    select
      event_type,
      occurred_at,
      lead(event_type) over (order by sequence) as next_type,
      lead(occurred_at) over (order by sequence) as next_at
    from public.practice_session_events
    where session_id = p_session_id
  )
  select coalesce(sum(
    case
      when event_type in ('START', 'RESUME') and next_type in ('PAUSE', 'END')
        then floor(extract(epoch from (next_at - occurred_at)))::bigint
      else 0
    end
  ), 0)::bigint
  from ordered;
$$;

create or replace function private.prevent_attempted_quest_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and exists (
    select 1 from public.practice_sessions where quest_id = old.id
  ) then
    raise exception using errcode = '23503', message = 'Quest with Practice Sessions cannot be deleted';
  end if;
  return old;
end;
$$;

create trigger quests_protect_session_history
before delete on public.quests
for each row execute function private.prevent_attempted_quest_delete();

revoke all on function private.transition_practice_session(uuid, text, text, text) from public, anon, authenticated;
revoke all on function private.prevent_attempted_quest_delete() from public, anon, authenticated;

revoke all on function public.start_practice_session(uuid) from public, anon, authenticated;
revoke all on function public.pause_practice_session(uuid) from public, anon, authenticated;
revoke all on function public.resume_practice_session(uuid) from public, anon, authenticated;
revoke all on function public.end_practice_session(uuid) from public, anon, authenticated;
revoke all on function public.practice_session_active_seconds(uuid) from public, anon, authenticated;

grant execute on function public.start_practice_session(uuid) to authenticated;
grant execute on function public.pause_practice_session(uuid) to authenticated;
grant execute on function public.resume_practice_session(uuid) to authenticated;
grant execute on function public.end_practice_session(uuid) to authenticated;
grant execute on function public.practice_session_active_seconds(uuid) to authenticated;

grant execute on function public.start_practice_session(uuid) to service_role;
grant execute on function public.pause_practice_session(uuid) to service_role;
grant execute on function public.resume_practice_session(uuid) to service_role;
grant execute on function public.end_practice_session(uuid) to service_role;
grant execute on function public.practice_session_active_seconds(uuid) to service_role;

commit;
