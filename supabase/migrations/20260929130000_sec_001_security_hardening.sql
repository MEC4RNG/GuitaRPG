-- SEC-001: revoke implicit function execution and establish an explicit RPC allowlist.
begin;

revoke execute on all functions in schema public, private from public, anon, authenticated;

grant execute on function public.complete_player_onboarding(text,integer,text,text,uuid,text) to authenticated, service_role;
grant execute on function public.persist_generated_quest(jsonb) to authenticated, service_role;
grant execute on function public.start_practice_session(uuid) to authenticated, service_role;
grant execute on function public.pause_practice_session(uuid) to authenticated, service_role;
grant execute on function public.resume_practice_session(uuid) to authenticated, service_role;
grant execute on function public.end_practice_session(uuid) to authenticated, service_role;
grant execute on function public.practice_session_active_seconds(uuid) to authenticated, service_role;
grant execute on function public.adjust_practice_session_reps(uuid,integer) to authenticated, service_role;
grant execute on function public.set_practice_session_metronome_bpm(uuid,integer) to authenticated, service_role;
grant execute on function public.finalize_quest_result(uuid,jsonb,text,text) to authenticated, service_role;
grant execute on function public.refresh_player_readiness() to authenticated, service_role;
grant execute on function public.save_player_profile_v1(text,text,integer,text,uuid,jsonb) to authenticated, service_role;
grant execute on function public.export_player_data_v1() to authenticated;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

commit;
