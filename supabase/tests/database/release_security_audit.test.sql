begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.is(
  (select count(*)::bigint from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
  27::bigint,
  'release surface contains the expected 27 public tables'
);
select extensions.is(
  (select count(*)::bigint from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m')),
  0::bigint,
  'no public views or materialized views bypass relation ownership'
);
select extensions.is(
  (select count(*)::bigint from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),
  0::bigint,
  'every public application table has RLS enabled'
);
select extensions.is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
  19::bigint,
  'public RPC surface is exactly 19 functions'
);
select extensions.is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private'),
  37::bigint,
  'private function surface is exactly 37 functions'
);
select extensions.is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','private') and p.prosecdef
     and not (
       exists (
         select 1 from unnest(coalesce(p.proconfig,'{}'::text[])) setting
         where setting in ('search_path=','search_path=""')
       )
       or (n.nspname='private' and p.proname='seed_taxonomy_v1' and coalesce(p.proconfig,'{}'::text[]) @> array['search_path=public, private, pg_temp'])
     )),
  0::bigint,
  'all SECURITY DEFINER functions use empty search_path except the audited taxonomy seeder'
);
select extensions.is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','private') and p.prosecdef
     and (
       exists (
         select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
         where a.grantee=0 and a.privilege_type='EXECUTE'
       )
       or has_function_privilege('anon',p.oid,'execute')
     )),
  0::bigint,
  'no SECURITY DEFINER function is executable by PUBLIC or anon'
);
select extensions.is(
  (select array_agg(p.proname::text order by p.proname::text collate "C")
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and has_function_privilege('authenticated',p.oid,'execute')),
  array[
    'adjust_practice_session_reps','complete_player_onboarding','end_practice_session',
    'ensure_player_quest_journeys','ensure_quest_journey','export_player_data_v1','finalize_quest_result','pause_practice_session',
    'persist_generated_quest','practice_session_active_seconds','read_player_quest_session_summaries',
    'refresh_player_readiness','resume_practice_session','save_generated_quest_journey','save_player_profile_v1',
    'set_practice_session_metronome_bpm','set_quest_journey_stage','start_practice_session',
    'transition_quest_journey'
  ]::text[],
  'authenticated EXECUTE privileges equal the browser RPC allowlist'
);
select extensions.is(
  (select count(*)::bigint from information_schema.role_table_grants
   where grantee in ('anon','authenticated') and table_schema='public'
     and table_name in ('player_skill_states','player_character_states','player_attribute_states','practice_xp_ledger','practice_xp_correction_ledger','skill_progression_events','skill_readiness_events','attribute_progression_events')
     and privilege_type in ('INSERT','UPDATE','DELETE')),
  0::bigint,
  'ordinary roles cannot mutate derived progression relations'
);
select extensions.ok(
  not has_function_privilege('anon','public.export_player_data_v1()','execute')
    and has_function_privilege('authenticated','public.export_player_data_v1()','execute'),
  'owner-derived export remains authenticated-only'
);
select extensions.is(
  (select count(*)::bigint from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace,
    lateral aclexplode(coalesce(d.defaclacl,acldefault('f',d.defaclrole))) a
    where n.nspname in ('public','private') and d.defaclobjtype='f' and a.grantee=0 and a.privilege_type='EXECUTE'),
  0::bigint,
  'future public/private functions do not default to PUBLIC execute'
);

select * from extensions.finish();
rollback;
