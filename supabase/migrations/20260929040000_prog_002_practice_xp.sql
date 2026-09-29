-- PROG-002: immutable Result-backed XP_V1 ledger and CHAR_V1 projection.
begin;

create table public.practice_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  source_result_id uuid not null references public.quest_results(id) on delete cascade,
  source_session_id uuid not null references public.practice_sessions(id) on delete cascade,
  entry_type text not null default 'RESULT_AWARD' check (entry_type = 'RESULT_AWARD'),
  xp_model_version text not null check (xp_model_version = 'XP_V1'),
  character_model_version text not null check (character_model_version = 'CHAR_V1'),
  eligible_practice_seconds bigint not null check (eligible_practice_seconds >= 0),
  completed_practice_minutes bigint not null check (
    completed_practice_minutes = floor(eligible_practice_seconds::numeric / 60)::bigint
  ),
  outcome text not null check (outcome in ('ABANDONED','ATTEMPTED','PARTIAL','CLEARED')),
  meaningful_attempt boolean not null,
  practice_minute_xp bigint not null check (practice_minute_xp = completed_practice_minutes),
  outcome_bonus_xp smallint not null check (outcome_bonus_xp in (0,1,3,5)),
  total_xp_delta bigint not null check (
    total_xp_delta = practice_minute_xp + outcome_bonus_xp and total_xp_delta >= 0
  ),
  awarded_at timestamptz not null default clock_timestamp(),
  unique (source_result_id),
  check (
    (meaningful_attempt and outcome_bonus_xp = case outcome
      when 'ABANDONED' then 0 when 'ATTEMPTED' then 1 when 'PARTIAL' then 3 when 'CLEARED' then 5 end)
    or
    (not meaningful_attempt and eligible_practice_seconds = 0 and completed_practice_minutes = 0
      and practice_minute_xp = 0 and outcome_bonus_xp = 0 and total_xp_delta = 0)
  )
);

create index practice_xp_ledger_player_awarded_idx
  on public.practice_xp_ledger (player_id, awarded_at, id);
create index practice_xp_ledger_session_idx
  on public.practice_xp_ledger (source_session_id);

alter table public.practice_xp_ledger enable row level security;
revoke all on table public.practice_xp_ledger from public, anon, authenticated;
grant select on table public.practice_xp_ledger to authenticated;
grant all on table public.practice_xp_ledger to service_role;

create policy practice_xp_ledger_owner_select
  on public.practice_xp_ledger for select to authenticated
  using ((select auth.uid()) = player_id);

create or replace function private.char_v1_level(p_cumulative_xp bigint)
returns integer
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if p_cumulative_xp < 0 then
    raise exception using errcode = '22003', message = 'CHAR_V1 requires nonnegative cumulative XP';
  end if;
  return floor(sqrt(p_cumulative_xp::numeric / 100))::integer + 1;
end;
$$;

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
    coalesce(sum(total_xp_delta), 0)::bigint,
    coalesce(sum(eligible_practice_seconds), 0)::bigint
  into aggregate_xp, aggregate_seconds
  from public.practice_xp_ledger
  where player_id = p_player_id;

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

create or replace function private.award_result_xp_v1(p_result_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row public.quest_results;
  active_seconds bigint;
  eligible_seconds bigint;
  completed_minutes bigint;
  bonus smallint;
begin
  select * into result_row
  from public.quest_results
  where id = p_result_id;

  if not found then
    raise exception using errcode = '23503', message = 'Result does not exist';
  end if;

  active_seconds := public.practice_session_active_seconds(result_row.session_id);
  eligible_seconds := case when result_row.meaningful_attempt then active_seconds else 0 end;
  completed_minutes := floor(eligible_seconds::numeric / 60)::bigint;
  bonus := case
    when not result_row.meaningful_attempt then 0
    when result_row.outcome = 'ABANDONED' then 0
    when result_row.outcome = 'ATTEMPTED' then 1
    when result_row.outcome = 'PARTIAL' then 3
    when result_row.outcome = 'CLEARED' then 5
  end;

  insert into public.practice_xp_ledger (
    player_id, source_result_id, source_session_id, entry_type,
    xp_model_version, character_model_version, eligible_practice_seconds,
    completed_practice_minutes, outcome, meaningful_attempt,
    practice_minute_xp, outcome_bonus_xp, total_xp_delta, awarded_at
  ) values (
    result_row.player_id, result_row.id, result_row.session_id, 'RESULT_AWARD',
    'XP_V1', 'CHAR_V1', eligible_seconds,
    completed_minutes, result_row.outcome, result_row.meaningful_attempt,
    completed_minutes, bonus, completed_minutes + bonus, result_row.finalized_at
  )
  on conflict (source_result_id) do nothing;

  perform private.rebuild_player_character_state(result_row.player_id);
end;
$$;

create or replace function private.award_xp_after_result_finalization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.award_result_xp_v1(new.id);
  return new;
end;
$$;

create trigger quest_results_award_terminal_xp
after update of outcome, verification_modes, confidence_summary on public.quest_results
for each row execute function private.award_xp_after_result_finalization();

-- Existing durable Results are already terminal. Backfill exactly once from their
-- authoritative Session histories, then rebuild each affected projection.
insert into public.practice_xp_ledger (
  player_id, source_result_id, source_session_id, entry_type,
  xp_model_version, character_model_version, eligible_practice_seconds,
  completed_practice_minutes, outcome, meaningful_attempt,
  practice_minute_xp, outcome_bonus_xp, total_xp_delta, awarded_at
)
select
  result.player_id,
  result.id,
  result.session_id,
  'RESULT_AWARD',
  'XP_V1',
  'CHAR_V1',
  case when result.meaningful_attempt then active.seconds else 0 end,
  floor((case when result.meaningful_attempt then active.seconds else 0 end)::numeric / 60)::bigint,
  result.outcome,
  result.meaningful_attempt,
  floor((case when result.meaningful_attempt then active.seconds else 0 end)::numeric / 60)::bigint,
  case
    when not result.meaningful_attempt then 0
    when result.outcome = 'ABANDONED' then 0
    when result.outcome = 'ATTEMPTED' then 1
    when result.outcome = 'PARTIAL' then 3
    when result.outcome = 'CLEARED' then 5
  end,
  floor((case when result.meaningful_attempt then active.seconds else 0 end)::numeric / 60)::bigint +
    case
      when not result.meaningful_attempt then 0
      when result.outcome = 'ABANDONED' then 0
      when result.outcome = 'ATTEMPTED' then 1
      when result.outcome = 'PARTIAL' then 3
      when result.outcome = 'CLEARED' then 5
    end,
  result.finalized_at
from public.quest_results result
cross join lateral (
  select public.practice_session_active_seconds(result.session_id) as seconds
) active
on conflict (source_result_id) do nothing;

do $$
declare
  player record;
begin
  for player in select distinct player_id from public.practice_xp_ledger loop
    perform private.rebuild_player_character_state(player.player_id);
  end loop;
end;
$$;

revoke all on function private.char_v1_level(bigint) from public, anon, authenticated;
revoke all on function private.rebuild_player_character_state(uuid) from public, anon, authenticated;
revoke all on function private.award_result_xp_v1(uuid) from public, anon, authenticated;
revoke all on function private.award_xp_after_result_finalization() from public, anon, authenticated;
grant execute on function private.char_v1_level(bigint) to service_role;
grant execute on function private.rebuild_player_character_state(uuid) to service_role;

commit;
