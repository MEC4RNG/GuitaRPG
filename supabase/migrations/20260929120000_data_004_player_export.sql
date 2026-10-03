-- DATA-004: owner-derived, versioned Player export snapshot.

begin;

create or replace function public.export_player_data_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id uuid := auth.uid();
begin
  if v_player_id is null then
    raise exception using errcode = '42501', message = 'authenticated Player required';
  end if;

  return jsonb_build_object(
    'export_version', 'GUITARPG_PLAYER_EXPORT_V1',
    'exported_at', statement_timestamp(),
    'profile', (select to_jsonb(p) from public.player_profiles p where p.player_id = v_player_id),
    'preferences', jsonb_build_object(
      'tuning_preferences', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank, x.tuning_context_id) from public.player_tuning_preferences x where x.player_id = v_player_id), '[]'::jsonb),
      'setups', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at, x.id) from public.player_setups x where x.player_id = v_player_id), '[]'::jsonb)
    ),
    'goals', coalesce((select jsonb_agg(to_jsonb(x) order by x.priority, x.created_at, x.id) from public.player_goals x where x.player_id = v_player_id), '[]'::jsonb),
    'quests', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at, x.id) from public.quests x where x.player_id = v_player_id), '[]'::jsonb),
    'quest_details', jsonb_build_object(
      'skill_roles', coalesce((select jsonb_agg(to_jsonb(x) order by x.quest_id, x.role, x.ordinal) from public.quest_skill_roles x join public.quests q on q.id = x.quest_id where q.player_id = v_player_id), '[]'::jsonb),
      'concepts', coalesce((select jsonb_agg(to_jsonb(x) order by x.quest_id, x.ordinal) from public.quest_concepts x join public.quests q on q.id = x.quest_id where q.player_id = v_player_id), '[]'::jsonb),
      'contexts', coalesce((select jsonb_agg(to_jsonb(x) order by x.quest_id, x.role, x.ordinal) from public.quest_contexts x join public.quests q on q.id = x.quest_id where q.player_id = v_player_id), '[]'::jsonb),
      'constraints', coalesce((select jsonb_agg(to_jsonb(x) order by x.quest_id, x.ordinal) from public.quest_constraints x join public.quests q on q.id = x.quest_id where q.player_id = v_player_id), '[]'::jsonb),
      'objective_criteria', coalesce((select jsonb_agg(to_jsonb(x) order by x.quest_id, x.ordinal) from public.quest_objective_criteria x join public.quests q on q.id = x.quest_id where q.player_id = v_player_id), '[]'::jsonb)
    ),
    'sessions', coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at, x.id) from public.practice_sessions x where x.player_id = v_player_id), '[]'::jsonb),
    'session_details', jsonb_build_object(
      'events', coalesce((select jsonb_agg(to_jsonb(x) order by x.session_id, x.sequence) from public.practice_session_events x join public.practice_sessions s on s.id = x.session_id where s.player_id = v_player_id), '[]'::jsonb),
      'control_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.session_id, x.sequence) from public.practice_session_control_events x join public.practice_sessions s on s.id = x.session_id where s.player_id = v_player_id), '[]'::jsonb)
    ),
    'results', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at, x.id) from public.quest_results x where x.player_id = v_player_id), '[]'::jsonb),
    'result_details', jsonb_build_object(
      'criteria', coalesce((select jsonb_agg(to_jsonb(x) order by x.result_id, x.quest_criterion_ordinal) from public.quest_result_criteria x join public.quest_results r on r.id = x.result_id where r.player_id = v_player_id), '[]'::jsonb),
      'evidence', coalesce((select jsonb_agg(to_jsonb(x) order by x.result_id, x.criterion_ordinal, x.recorded_at, x.id) from public.quest_result_evidence x join public.quest_results r on r.id = x.result_id where r.player_id = v_player_id), '[]'::jsonb)
    ),
    'progression', jsonb_build_object(
      'character', (select to_jsonb(x) from public.player_character_states x where x.player_id = v_player_id),
      'skills', coalesce((select jsonb_agg(to_jsonb(x) order by x.skill_id) from public.player_skill_states x where x.player_id = v_player_id), '[]'::jsonb),
      'attributes', coalesce((select jsonb_agg(to_jsonb(x) order by x.attribute_id) from public.player_attribute_states x where x.player_id = v_player_id), '[]'::jsonb),
      'xp_ledger', coalesce((select jsonb_agg(to_jsonb(x) order by x.awarded_at, x.id) from public.practice_xp_ledger x where x.player_id = v_player_id), '[]'::jsonb),
      'xp_corrections', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at, x.id) from public.practice_xp_correction_ledger x where x.player_id = v_player_id), '[]'::jsonb),
      'skill_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at, x.id) from public.skill_progression_events x where x.player_id = v_player_id), '[]'::jsonb),
      'readiness_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at, x.id) from public.skill_readiness_events x where x.player_id = v_player_id), '[]'::jsonb),
      'attribute_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at, x.id) from public.attribute_progression_events x where x.player_id = v_player_id), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.export_player_data_v1() from public, anon;
grant execute on function public.export_player_data_v1() to authenticated;

commit;

