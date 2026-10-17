begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_function('public','ensure_player_quest_journeys',array[]::text[],'owner library ensure RPC exists');
select extensions.is((select prosecdef from pg_proc where oid='public.ensure_player_quest_journeys()'::regprocedure),true,'library ensure is SECURITY DEFINER');
select extensions.is((select proconfig from pg_proc where oid='public.ensure_player_quest_journeys()'::regprocedure),array['search_path=""']::text[],'library ensure has empty search path');
select extensions.ok(has_function_privilege('authenticated','public.ensure_player_quest_journeys()','execute'),'authenticated may execute library ensure');
select extensions.ok(not has_function_privilege('anon','public.ensure_player_quest_journeys()','execute'),'anon role cannot execute library ensure');
select extensions.has_function('public','read_player_quest_session_summaries',array['uuid[]'],'bounded Session summary RPC exists');
select extensions.is((select prosecdef from pg_proc where oid='public.read_player_quest_session_summaries(uuid[])'::regprocedure),true,'Session summary read is SECURITY DEFINER');
select extensions.is((select proconfig from pg_proc where oid='public.read_player_quest_session_summaries(uuid[])'::regprocedure),array['search_path=""']::text[],'Session summary read has empty search path');
select extensions.ok(has_function_privilege('authenticated','public.read_player_quest_session_summaries(uuid[])','execute'),'authenticated may read bounded owner summaries');
select extensions.ok(not has_function_privilege('anon','public.read_player_quest_session_summaries(uuid[])','execute'),'anon cannot read Session summaries');

insert into auth.users(id,email) values
('b7111111-1111-4111-8111-111111111111','library-owner@example.com'),
('b7222222-2222-4222-8222-222222222222','library-other@example.com');

insert into public.quests(id,player_id,slug,title,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,metadata,resolved_snapshot)
select valueset.id, valueset.player_id, valueset.slug, valueset.title, 'TECHNIQUE','QST_GEN_V1',domain.id,'DEVELOP_SKILL','QUICK',skill.id,'{}'::jsonb,'{"mastery_claimed":false}'::jsonb,'{}'::jsonb,'{}'::jsonb,'II','{"fixed_xp":null,"progression_effects_embedded":false}'::jsonb,'{}'::jsonb,jsonb_build_object('identity',jsonb_build_object('id',valueset.id,'schema_version',1))
from (values
  ('b7333333-3333-4333-8333-333333333333'::uuid,'b7111111-1111-4111-8111-111111111111'::uuid,'library_unattempted','Library Unattempted'),
  ('b7444444-4444-4444-8444-444444444444'::uuid,'b7111111-1111-4111-8111-111111111111'::uuid,'library_attempted','Library Attempted'),
  ('b7555555-5555-4555-8555-555555555555'::uuid,'b7111111-1111-4111-8111-111111111111'::uuid,'library_existing','Library Existing'),
  ('b7666666-6666-4666-8666-666666666666'::uuid,'b7222222-2222-4222-8222-222222222222'::uuid,'library_other','Library Other')
) valueset(id,player_id,slug,title)
cross join lateral (select id from public.taxonomy_entities where kind='DOMAIN' order by slug limit 1) domain
cross join lateral (select id from public.taxonomy_entities where kind='SKILL' order by slug limit 1) skill;

insert into public.practice_sessions(id,player_id,quest_id,status,started_at)
values ('b7777777-7777-4777-8777-777777777777','b7111111-1111-4111-8111-111111111111','b7444444-4444-4444-8444-444444444444','ACTIVE','2026-10-10T10:00:00Z');

insert into public.player_quest_journeys(quest_id,player_id,lifecycle_status,current_stage,last_worked_at)
values ('b7555555-5555-4555-8555-555555555555','b7111111-1111-4111-8111-111111111111','CONCLUDED','CRAFT','2026-10-09T10:00:00Z');

set local role anon;
select extensions.throws_ok($$select public.ensure_player_quest_journeys()$$,'42501',null,'unauthenticated ensure is denied');

set local role authenticated;
set local request.jwt.claim.sub='b7111111-1111-4111-8111-111111111111';
select extensions.is(public.ensure_player_quest_journeys(),2,'owner ensure inserts only two missing owner Journeys');
select extensions.is((select lifecycle_status||'/'||current_stage from public.player_quest_journeys where quest_id='b7333333-3333-4333-8333-333333333333'),'SAVED/MAP','unattempted Quest defaults SAVED/MAP');
select extensions.is((select lifecycle_status||'/'||current_stage from public.player_quest_journeys where quest_id='b7444444-4444-4444-8444-444444444444'),'ACTIVE/EXPLORE','attempted Quest defaults ACTIVE/EXPLORE');
select extensions.is((select lifecycle_status||'/'||current_stage from public.player_quest_journeys where quest_id='b7555555-5555-4555-8555-555555555555'),'CONCLUDED/CRAFT','existing Journey choices are preserved');
select extensions.is(public.ensure_player_quest_journeys(),0,'repeated ensure is idempotent');
select extensions.is((select count(*)::bigint from public.player_quest_journeys where quest_id='b7666666-6666-4666-8666-666666666666'),0::bigint,'another Player Quest remains untouched');
select extensions.is((select count(*)::bigint from public.practice_xp_ledger where player_id='b7111111-1111-4111-8111-111111111111'),0::bigint,'library ensure mutates no progression');
select extensions.is(
  (select count(*)::bigint from public.read_player_quest_session_summaries(array[
    'b7444444-4444-4444-8444-444444444444'::uuid,
    'b7666666-6666-4666-8666-666666666666'::uuid
  ])),
  1::bigint,
  'Session summary read excludes another Player Quest'
);
select extensions.is(
  (select session_count from public.read_player_quest_session_summaries(array['b7444444-4444-4444-8444-444444444444'::uuid])),
  1::bigint,
  'Session summary count is truthful and bounded'
);

select * from extensions.finish();
rollback;
