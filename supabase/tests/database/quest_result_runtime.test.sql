begin;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public','quest_results','Result table exists');
select extensions.has_table('public','quest_result_criteria','Result criterion table exists');
select extensions.has_table('public','quest_result_evidence','Result evidence table exists');
select extensions.has_function('public','finalize_quest_result',array['uuid','jsonb','text','text'],'finalization RPC exists');
select extensions.is((select relrowsecurity from pg_class where oid='public.quest_results'::regclass),true,'Result RLS enabled');
select extensions.is((select relrowsecurity from pg_class where oid='public.quest_result_criteria'::regclass),true,'criterion RLS enabled');
select extensions.is((select relrowsecurity from pg_class where oid='public.quest_result_evidence'::regclass),true,'evidence RLS enabled');
select col_is_unique('public','quest_results','session_id','one Result per Session is enforced');
select hasnt_column('public','quest_results','xp','Result has no XP');
select hasnt_column('public','quest_results','proficiency','Result has no proficiency');
select hasnt_column('public','quest_results','mastery','Result has no mastery');

insert into auth.users(id,email) values
 ('71111111-1111-4111-8111-111111111111','result-owner@example.com'),
 ('72222222-2222-4222-8222-222222222222','result-other@example.com'),
 ('73333333-3333-4333-8333-333333333333',null);

insert into public.quests(
 id,player_id,slug,title,schema_version,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,
 primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,metadata,resolved_snapshot
) select v.quest_id,v.player_id,v.slug,v.title,1,'TECHNIQUE','EVD_TEST',
 (select id from public.taxonomy_entities where kind='DOMAIN' and slug='technique'),'DEVELOP_SKILL','CUSTOM',
 (select id from public.taxonomy_entities where kind='SKILL' and slug='hybrid_picking'),'{}',
 jsonb_build_object('attempt_rule','MEANINGFUL_ACTIVITY','minimum_attempt_seconds',v.minimum_seconds,'clear_rule','ALL_OBJECTIVE_CRITERIA','mastery_claimed',false),
 '{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
 '{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1"}','III',
 '{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false}','{}',
 jsonb_build_object('identity',jsonb_build_object('schema_version',1),'difficulty_profile',jsonb_build_object('model_version','DIF_V1'))
from (values
 ('74444444-4444-4444-8444-444444444441'::uuid,'71111111-1111-4111-8111-111111111111'::uuid,'dorian_result_clear','DORIAN RESULT CLEAR',60),
 ('74444444-4444-4444-8444-444444444442'::uuid,'71111111-1111-4111-8111-111111111111'::uuid,'dorian_result_short','DORIAN RESULT SHORT',60),
 ('74444444-4444-4444-8444-444444444443'::uuid,'72222222-2222-4222-8222-222222222222'::uuid,'dorian_result_other','DORIAN RESULT OTHER',60),
 ('74444444-4444-4444-8444-444444444444'::uuid,'73333333-3333-4333-8333-333333333333'::uuid,'dorian_result_guest','DORIAN RESULT GUEST',60)
) v(quest_id,player_id,slug,title,minimum_seconds);

insert into public.quest_concepts(quest_id,concept_id,ordinal)
select q.id,e.id,1 from public.quests q cross join public.taxonomy_entities e
where q.id::text like '74444444-4444-4444-8444-44444444444%' and e.kind='CONCEPT' and e.slug='dorian';
insert into public.quest_constraints(quest_id,constraint_id,ordinal,parameters)
select q.id,e.id,1,'{"bpm":90}' from public.quests q cross join public.taxonomy_entities e
where q.id::text like '74444444-4444-4444-8444-44444444444%' and e.kind='CONSTRAINT' and e.slug='target_tempo';

insert into public.quest_objective_criteria(quest_id,ordinal,metric,operator,criterion_value,unit)
select q.id,c.ordinal,c.metric,c.operator,c.value,c.unit from public.quests q cross join (values
 (1::smallint,'practice_duration','GTE','600'::jsonb,'seconds'),
 (2::smallint,'target_tempo','EQ','90'::jsonb,'bpm'),
 (3::smallint,'constraint_compliance','EQ','true'::jsonb,'boolean')
) c(ordinal,metric,operator,value,unit) where q.id::text like '74444444-4444-4444-8444-44444444444%';
set constraints all immediate;

insert into public.practice_sessions(id,player_id,quest_id,status,started_at,ended_at,created_at) values
 ('75555555-5555-4555-8555-555555555551','71111111-1111-4111-8111-111111111111','74444444-4444-4444-8444-444444444441','ENDED','2026-09-29T12:00:00Z','2026-09-29T12:11:12Z','2026-09-29T12:00:00Z'),
 ('75555555-5555-4555-8555-555555555552','71111111-1111-4111-8111-111111111111','74444444-4444-4444-8444-444444444442','ENDED','2026-09-29T13:00:00Z','2026-09-29T13:00:12Z','2026-09-29T13:00:00Z'),
 ('75555555-5555-4555-8555-555555555553','71111111-1111-4111-8111-111111111111','74444444-4444-4444-8444-444444444441','ACTIVE','2026-09-29T14:00:00Z',null,'2026-09-29T14:00:00Z'),
 ('75555555-5555-4555-8555-555555555554','71111111-1111-4111-8111-111111111111','74444444-4444-4444-8444-444444444441','PAUSED','2026-09-29T15:00:00Z',null,'2026-09-29T15:00:00Z'),
 ('75555555-5555-4555-8555-555555555555','72222222-2222-4222-8222-222222222222','74444444-4444-4444-8444-444444444443','ENDED','2026-09-29T16:00:00Z','2026-09-29T16:10:00Z','2026-09-29T16:00:00Z'),
 ('75555555-5555-4555-8555-555555555556','73333333-3333-4333-8333-333333333333','74444444-4444-4444-8444-444444444444','ENDED','2026-09-29T17:00:00Z','2026-09-29T17:10:00Z','2026-09-29T17:00:00Z');

insert into public.practice_session_events(session_id,sequence,event_type,occurred_at)
values
 ('75555555-5555-4555-8555-555555555551',1,'START','2026-09-29T12:00:00Z'),
 ('75555555-5555-4555-8555-555555555551',2,'PAUSE','2026-09-29T12:10:00Z'),
 ('75555555-5555-4555-8555-555555555551',3,'RESUME','2026-09-29T12:11:00Z'),
 ('75555555-5555-4555-8555-555555555551',4,'END','2026-09-29T12:11:12Z'),
 ('75555555-5555-4555-8555-555555555552',1,'START','2026-09-29T13:00:00Z'),
 ('75555555-5555-4555-8555-555555555552',2,'END','2026-09-29T13:00:12Z'),
 ('75555555-5555-4555-8555-555555555553',1,'START','2026-09-29T14:00:00Z'),
 ('75555555-5555-4555-8555-555555555554',1,'START','2026-09-29T15:00:00Z'),
 ('75555555-5555-4555-8555-555555555554',2,'PAUSE','2026-09-29T15:01:00Z'),
 ('75555555-5555-4555-8555-555555555555',1,'START','2026-09-29T16:00:00Z'),
 ('75555555-5555-4555-8555-555555555555',2,'END','2026-09-29T16:10:00Z'),
 ('75555555-5555-4555-8555-555555555556',1,'START','2026-09-29T17:00:00Z'),
 ('75555555-5555-4555-8555-555555555556',2,'END','2026-09-29T17:10:00Z');
insert into public.practice_session_control_events(session_id,sequence,event_type,payload,occurred_at)
values('75555555-5555-4555-8555-555555555551',1,'METRONOME_BPM_SET','{"bpm":90}','2026-09-29T12:05:00Z');

set local role anon;
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555551')$$,'42501',null,'anon cannot finalize');
select extensions.throws_ok($$select * from public.quest_results$$,'42501',null,'anon cannot read Results');
reset role;

set local role authenticated;
set local request.jwt.claim.sub='71111111-1111-4111-8111-111111111111';
select extensions.throws_ok($$insert into public.quest_results(player_id,quest_id,session_id,quest_schema_version,meaningful_attempt,outcome,verification_modes,confidence_summary) values('71111111-1111-4111-8111-111111111111','74444444-4444-4444-8444-444444444441','75555555-5555-4555-8555-555555555551',1,true,'CLEARED','{}','HIGH')$$,'42501',null,'direct Result INSERT denied');
select extensions.throws_ok($$insert into public.quest_result_criteria(result_id,quest_criterion_ordinal,metric,operator,target_value,unit,criterion_state) values(gen_random_uuid(),1,'x','EQ','true','boolean','MET')$$,'42501',null,'direct criterion INSERT denied');
select extensions.throws_ok($$insert into public.quest_result_evidence(result_id,criterion_metric,verification_mode,criterion_state,unit,evidence_confidence,source_authority,evaluator_version) values(gen_random_uuid(),'x','SESSION','MET','x','HIGH','SESSION_SYSTEM','FAKE')$$,'42501',null,'direct SESSION_SYSTEM evidence forgery denied');
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555555')$$,'42501',null,'non-owner finalization denied');
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555553')$$,'55000',null,'ACTIVE finalization denied');
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555554')$$,'55000',null,'PAUSED finalization denied');
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555551','[{"ordinal":3,"observed_value":true,"source_authority":"SESSION_SYSTEM"}]')$$,'42501',null,'client cannot submit SESSION_SYSTEM authority');
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555551','[{"ordinal":3,"observed_value":true,"source_authority":"APP_GRADER"}]')$$,'42501',null,'client cannot submit APP_GRADER authority');
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555551','[{"ordinal":3,"observed_value":true,"source_authority":"AUDIO_ANALYZER"}]')$$,'42501',null,'client cannot submit AUDIO_ANALYZER authority');
select extensions.lives_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555551','[{"ordinal":3,"observed_value":true}]','GOOD_CHALLENGE','Focused on even accents.')$$,'ENDED Session finalizes atomically');
select extensions.is((select outcome from public.quest_results where session_id='75555555-5555-4555-8555-555555555551'),'CLEARED','all MET derives CLEARED');
select extensions.is((select meaningful_attempt from public.quest_results where session_id='75555555-5555-4555-8555-555555555551'),true,'meaningful attempt uses Quest threshold');
select extensions.is(public.practice_session_active_seconds('75555555-5555-4555-8555-555555555551'),612::bigint,'DORIAN active duration is 612 seconds');
select extensions.results_eq($$select metric||':'||criterion_state from public.quest_result_criteria where result_id=(select id from public.quest_results where session_id='75555555-5555-4555-8555-555555555551') order by quest_criterion_ordinal$$,$$select * from (values('practice_duration:MET'::text),('target_tempo:MET'::text),('constraint_compliance:MET'::text)) expected(value)$$,'DORIAN criterion states are exact');
select extensions.is((select source_authority from public.quest_result_evidence where criterion_metric='constraint_compliance'),'PLAYER','SELF persists as PLAYER');
select extensions.is((select evidence_confidence from public.quest_result_evidence where criterion_metric='constraint_compliance'),'MODERATE','SELF confidence is system-assigned MODERATE');
select extensions.is((select source_authority from public.quest_result_evidence where criterion_metric='practice_duration'),'SESSION_SYSTEM','duration evidence is trusted SESSION_SYSTEM');
select extensions.is((select observed_or_asserted_value from public.quest_result_evidence where criterion_metric='practice_duration'),'612'::jsonb,'duration observation is authoritative');
select extensions.is((select observed_or_asserted_value from public.quest_result_evidence where criterion_metric='target_tempo'),'90'::jsonb,'latest persisted BPM is used');
select extensions.is((select position('not musical performance accuracy' in rationale)>0 from public.quest_result_evidence where criterion_metric='target_tempo'),true,'BPM evidence disclaims musical accuracy');
select extensions.is((select confidence_summary from public.quest_results where session_id='75555555-5555-4555-8555-555555555551'),'MIXED','confidence summary is derived MIXED');
select extensions.results_eq($$select unnest(verification_modes) from public.quest_results where session_id='75555555-5555-4555-8555-555555555551' order by 1$$,$$select * from (values('SELF'::text),('SESSION'::text)) expected(value)$$,'verification modes are derived');
select extensions.is((select reflection from public.quest_results where session_id='75555555-5555-4555-8555-555555555551'),'GOOD_CHALLENGE','allowed reflection persists');
select extensions.is((select player_notes from public.quest_results where session_id='75555555-5555-4555-8555-555555555551'),'Focused on even accents.','Player notes persist');
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555551','[{"ordinal":3,"observed_value":false}]')$$,'55000','RESULT_ALREADY_FINALIZED','duplicate/material refinalization is terminal and safe');
select extensions.is((select count(*)::bigint from public.quest_results where session_id='75555555-5555-4555-8555-555555555551'),1::bigint,'retry cannot duplicate Result');
select extensions.throws_ok($$update public.quest_results set outcome='ATTEMPTED'$$,'42501',null,'Result UPDATE denied');
select extensions.throws_ok($$delete from public.quest_results$$,'42501',null,'Result DELETE denied');
select extensions.throws_ok($$update public.quest_result_criteria set criterion_state='NOT_MET'$$,'42501',null,'criterion UPDATE denied');
select extensions.throws_ok($$delete from public.quest_result_evidence$$,'42501',null,'evidence DELETE denied');

select extensions.lives_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555552','[]',null,null)$$,'short ENDED Session finalizes ABANDONED');
select extensions.is((select outcome from public.quest_results where session_id='75555555-5555-4555-8555-555555555552'),'ABANDONED','below threshold derives ABANDONED');
select extensions.is((select count(*)::bigint from public.quest_result_criteria c join public.quest_results r on r.id=c.result_id where r.session_id='75555555-5555-4555-8555-555555555552' and c.criterion_state='NOT_EVALUATED'),3::bigint,'ABANDONED criteria are NOT_EVALUATED');
select extensions.is((select criterion_metric from public.quest_result_evidence e join public.quest_results r on r.id=e.result_id where r.session_id='75555555-5555-4555-8555-555555555552'),'practice_presence','ABANDONED retains supporting practice presence');
select extensions.is((select reflection from public.quest_results where session_id='75555555-5555-4555-8555-555555555552'),null,'null reflection accepted');
select extensions.throws_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555553','[]','INVALID',null)$$,'23514',null,'invalid reflection rejected');
select extensions.is((select title from public.quests where id='74444444-4444-4444-8444-444444444441'),'DORIAN RESULT CLEAR','Result finalization does not mutate Quest');
select extensions.is((select count(*)::bigint from public.practice_session_events where session_id='75555555-5555-4555-8555-555555555551'),4::bigint,'Result finalization does not mutate Session history');
select extensions.throws_ok($$delete from public.quests where id='74444444-4444-4444-8444-444444444441'$$,'23503',null,'ordinary Quest historical protection remains');
reset role;

set local role authenticated;
set local request.jwt.claim.sub='72222222-2222-4222-8222-222222222222';
select extensions.is((select count(*)::bigint from public.quest_results),0::bigint,'non-owner cannot read Results');
select extensions.is((select count(*)::bigint from public.quest_result_criteria),0::bigint,'non-owner cannot read criteria');
select extensions.is((select count(*)::bigint from public.quest_result_evidence),0::bigint,'non-owner cannot read evidence');
reset role;

set local role authenticated;
set local request.jwt.claim.sub='73333333-3333-4333-8333-333333333333';
select extensions.lives_ok($$select public.finalize_quest_result('75555555-5555-4555-8555-555555555556','[{"ordinal":3,"observed_value":true}]')$$,'anonymous Auth owner uses the same finalization model');
reset role;

select set_config('request.jwt.claim.sub','',true);
delete from auth.users where id='71111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::bigint from public.quest_results where player_id='71111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Result graph');
select extensions.is((select count(*)::bigint from public.quest_result_criteria c join public.quest_results r on r.id=c.result_id where r.player_id='71111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes criteria');
select extensions.is((select count(*)::bigint from public.quest_result_evidence e join public.quest_results r on r.id=e.result_id where r.player_id='71111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes evidence');

select * from extensions.finish();
rollback;
