-- QST-007: lazily ensure Journey overlays for every Quest owned by the current Player.

begin;

create or replace function public.ensure_player_quest_journeys()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  inserted_count integer;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  insert into public.player_quest_journeys (
    quest_id, player_id, lifecycle_status, current_stage, opened_at, last_worked_at
  )
  select
    q.id,
    caller_id,
    case when session_summary.session_count > 0 then 'ACTIVE' else 'SAVED' end,
    case when session_summary.session_count > 0 then 'EXPLORE' else 'MAP' end,
    case when session_summary.session_count > 0 then session_summary.first_started_at else null end,
    coalesce(session_summary.last_worked_at, q.created_at)
  from public.quests q
  cross join lateral (
    select
      count(s.id) as session_count,
      min(s.started_at) as first_started_at,
      max(coalesce(s.ended_at, s.started_at)) as last_worked_at
    from public.practice_sessions s
    where s.quest_id = q.id and s.player_id = caller_id
  ) session_summary
  where q.player_id = caller_id
  on conflict (quest_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.ensure_player_quest_journeys() from public, anon, authenticated;
grant execute on function public.ensure_player_quest_journeys() to authenticated, service_role;

create or replace function public.read_player_quest_session_summaries(p_quest_ids uuid[])
returns table (
  quest_id uuid,
  session_count bigint,
  latest_session_id uuid,
  latest_session_status text,
  latest_session_started_at timestamptz,
  latest_session_ended_at timestamptz,
  latest_result_outcome text
)
language plpgsql stable security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;
  if coalesce(cardinality(p_quest_ids), 0) > 20 then
    raise exception using errcode = '22023', message = 'At most 20 Quest summaries may be read';
  end if;

  return query
  select
    q.id,
    count(s.id),
    latest.id,
    latest.status,
    latest.started_at,
    latest.ended_at,
    result.outcome
  from public.quests q
  left join public.practice_sessions s
    on s.quest_id = q.id and s.player_id = caller_id
  left join lateral (
    select ps.id, ps.status, ps.started_at, ps.ended_at
    from public.practice_sessions ps
    where ps.quest_id = q.id and ps.player_id = caller_id
    order by ps.started_at desc, ps.id desc
    limit 1
  ) latest on true
  left join public.quest_results result
    on result.session_id = latest.id and result.player_id = caller_id
  where q.player_id = caller_id and q.id = any(coalesce(p_quest_ids, '{}'::uuid[]))
  group by q.id, latest.id, latest.status, latest.started_at, latest.ended_at, result.outcome;
end;
$$;

revoke all on function public.read_player_quest_session_summaries(uuid[]) from public, anon, authenticated;
grant execute on function public.read_player_quest_session_summaries(uuid[]) to authenticated, service_role;

commit;
