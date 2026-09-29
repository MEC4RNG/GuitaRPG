-- SES-002: append-only practice control telemetry; SES-001 lifecycle remains authoritative.
begin;

create table public.practice_session_control_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  event_type text not null check (event_type in ('REP_ADJUST', 'METRONOME_BPM_SET')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default clock_timestamp(),
  unique (session_id, sequence),
  check (
    (event_type = 'REP_ADJUST' and jsonb_typeof(payload -> 'delta') = 'number')
    or (event_type = 'METRONOME_BPM_SET' and jsonb_typeof(payload -> 'bpm') = 'number')
  )
);
create index practice_session_control_events_order_idx on public.practice_session_control_events (session_id, sequence);
alter table public.practice_session_control_events enable row level security;
revoke all on table public.practice_session_control_events from public, anon, authenticated;
grant select on table public.practice_session_control_events to authenticated;
grant all on table public.practice_session_control_events to service_role;
create policy practice_session_control_events_owner_select on public.practice_session_control_events for select to authenticated using (exists (select 1 from public.practice_sessions s where s.id = session_id and s.player_id = (select auth.uid())));

create or replace function private.append_practice_control_event(p_session_id uuid, p_event_type text, p_payload jsonb)
returns public.practice_session_control_events language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); s public.practice_sessions; next_sequence integer; reps integer; inserted public.practice_session_control_events;
begin
 if caller is null then raise exception using errcode='42501', message='Authentication is required'; end if;
 select * into s from public.practice_sessions where id=p_session_id for update;
 if not found or s.player_id <> caller then raise exception using errcode='42501', message='Session is not owned by caller'; end if;
 if s.status <> 'ACTIVE' then raise exception using errcode='55000', message='Practice controls require an ACTIVE Session'; end if;
 if p_event_type='REP_ADJUST' then
   if jsonb_typeof(p_payload->'delta') <> 'number' or (p_payload->>'delta') not in ('-1','1') then raise exception using errcode='23514', message='Rep delta must be -1 or 1'; end if;
   select coalesce(sum((payload->>'delta')::integer),0) into reps from public.practice_session_control_events where session_id=p_session_id and event_type='REP_ADJUST';
   if reps + (p_payload->>'delta')::integer < 0 then raise exception using errcode='23514', message='Rep count cannot be negative'; end if;
 elsif p_event_type='METRONOME_BPM_SET' then
   if jsonb_typeof(p_payload->'bpm') <> 'number' or (p_payload->>'bpm') !~ '^[0-9]+$' or (p_payload->>'bpm')::integer not between 30 and 240 then raise exception using errcode='23514', message='BPM must be a whole number between 30 and 240'; end if;
 else raise exception using errcode='23514', message='Unsupported control event'; end if;
 select coalesce(max(sequence),0)+1 into next_sequence from public.practice_session_control_events where session_id=p_session_id;
 insert into public.practice_session_control_events(session_id,sequence,event_type,payload) values(p_session_id,next_sequence,p_event_type,p_payload) returning * into inserted;
 return inserted;
end; $$;
create or replace function public.adjust_practice_session_reps(p_session_id uuid, p_delta integer) returns public.practice_session_control_events language sql security definer set search_path = '' as $$ select private.append_practice_control_event(p_session_id,'REP_ADJUST',jsonb_build_object('delta',p_delta)); $$;
create or replace function public.set_practice_session_metronome_bpm(p_session_id uuid, p_bpm integer) returns public.practice_session_control_events language sql security definer set search_path = '' as $$ select private.append_practice_control_event(p_session_id,'METRONOME_BPM_SET',jsonb_build_object('bpm',p_bpm)); $$;
revoke all on function private.append_practice_control_event(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.adjust_practice_session_reps(uuid,integer) from public,anon,authenticated;
revoke all on function public.set_practice_session_metronome_bpm(uuid,integer) from public,anon,authenticated;
grant execute on function public.adjust_practice_session_reps(uuid,integer) to authenticated,service_role;
grant execute on function public.set_practice_session_metronome_bpm(uuid,integer) to authenticated,service_role;
commit;
