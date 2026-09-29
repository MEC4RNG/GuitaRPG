begin;
set local search_path = extensions, public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

insert into auth.users(id,email) values
 ('81111111-1111-4111-8111-111111111111','core-loop-owner@example.com'),
 ('82222222-2222-4222-8222-222222222222','core-loop-other@example.com');

create temporary table progression_baseline(skill_count bigint,character_count bigint,attribute_count bigint);
insert into progression_baseline select
 (select count(*) from public.player_skill_states where player_id='81111111-1111-4111-8111-111111111111'),
 (select count(*) from public.player_character_states where player_id='81111111-1111-4111-8111-111111111111'),
 (select count(*) from public.player_attribute_states where player_id='81111111-1111-4111-8111-111111111111');

create temporary table core_loop_fixture(payload jsonb not null);
grant select on core_loop_fixture to authenticated;
insert into core_loop_fixture values ($json$
{
 "identity":{"id":"83333333-3333-4333-8333-333333333333","slug":"dorian_core_loop","title":"DORIAN CORE LOOP","schema_version":1,"type":"TECHNIQUE","origin":"QST_GEN_V1"},
 "purpose":{"reason":"DEVELOP_SKILL","primary_domain":"technique","generation_mode":"CUSTOM"},
 "execution":{"primary_skill":{"slug":"hybrid_picking","name":"Hybrid Picking","domain":"technique","role":"PRIMARY_SKILL"},"secondary_skills":[{"slug":"scale_mapping","name":"Scale Mapping","domain":"fretboard","role":"SECONDARY_SKILL"},{"slug":"syncopation_control","name":"Syncopation Control","domain":"rhythm","role":"SECONDARY_SKILL"}],"required_techniques":[],"estimated_minutes":10,"meter":"4/4"},
 "completion_contract":{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false},
 "verification_profile":{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false},
 "difficulty_profile":{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1","overall":{"score":54,"level":"III"}},
 "rewards":{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false},
 "metadata":{"generator_version":"QST_GEN_V1","generation_mode":"CUSTOM"},
 "resolved_snapshot":{
  "identity":{"id":"83333333-3333-4333-8333-333333333333","slug":"dorian_core_loop","title":"DORIAN CORE LOOP","schema_version":1,"type":"TECHNIQUE","origin":"QST_GEN_V1"},
  "purpose":{"reason":"DEVELOP_SKILL","primary_domain":"technique","generation_mode":"CUSTOM"},
  "musical_context":{"tuning":null,"tonal_center":{"kind":"TONAL_CENTER","pitch_class":"E"},"style":null,"playing_role":null,"accompaniment":null},
  "execution":{"primary_skill":{"slug":"hybrid_picking","name":"Hybrid Picking","domain":"technique","role":"PRIMARY_SKILL"},"secondary_skills":[{"slug":"scale_mapping","name":"Scale Mapping","domain":"fretboard","role":"SECONDARY_SKILL"},{"slug":"syncopation_control","name":"Syncopation Control","domain":"rhythm","role":"SECONDARY_SKILL"}],"required_techniques":[],"estimated_minutes":10,"meter":"4/4"},
  "concepts":[{"slug":"dorian","name":"Dorian"},{"slug":"eighth_note_subdivision","name":"Eighth-Note Subdivision"},{"slug":"syncopation","name":"Syncopation"}],
  "constraints":[{"slug":"string_set","name":"String Set","parameters":{"strings":[2,3,4,5]}},{"slug":"fret_range","name":"Fret Range","parameters":{"min":5,"max":12}},{"slug":"target_tempo","name":"Target Tempo","parameters":{"bpm":90}}],
  "objective":{"kind":"SUSTAINED_PERFORMANCE","summary":"Practice Hybrid Picking under the resolved constraints.","clear_rule":"ALL_CRITERIA","criteria":[{"metric":"practice_duration","operator":"GTE","value":600,"unit":"seconds"},{"metric":"target_tempo","operator":"EQ","value":90,"unit":"bpm"},{"metric":"constraint_compliance","operator":"EQ","value":true,"unit":"boolean"}]},
  "completion_contract":{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false},
  "verification_profile":{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false},
  "difficulty_profile":{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1","overall":{"score":54,"level":"III"}},
  "rewards":{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false},
  "metadata":{"generator_version":"QST_GEN_V1","generation_mode":"CUSTOM"}
 }
}
$json$::jsonb);

set local role anon;
select extensions.throws_ok($$select public.persist_generated_quest((select payload from core_loop_fixture))$$,'42501',null,'core loop denies unauthenticated Quest persistence');
set local role postgres;

set local role authenticated;
set local request.jwt.claim.sub='81111111-1111-4111-8111-111111111111';
select extensions.lives_ok($$select public.persist_generated_quest((select payload from core_loop_fixture))$$,'core loop persists QST_GEN_V1 Quest');
select extensions.is((select resolved_snapshot->'difficulty_profile'->'overall'->>'score' from public.quests where id='83333333-3333-4333-8333-333333333333'),'54','DORIAN overall score is 54');
select extensions.is((select declared_overall_demand from public.quests where id='83333333-3333-4333-8333-333333333333'),'III','DORIAN demand is III');

create temporary table core_sessions(label text primary key,id uuid not null);
grant select,insert,update on core_sessions to authenticated;
insert into core_sessions select 'partial',(public.start_practice_session('83333333-3333-4333-8333-333333333333')).id;
insert into core_sessions select 'cleared',(public.start_practice_session('83333333-3333-4333-8333-333333333333')).id;
insert into core_sessions select 'pending',(public.start_practice_session('83333333-3333-4333-8333-333333333333')).id;
insert into core_sessions select 'active',(public.start_practice_session('83333333-3333-4333-8333-333333333333')).id;
insert into core_sessions select 'paused',(public.start_practice_session('83333333-3333-4333-8333-333333333333')).id;

select extensions.lives_ok($$select public.pause_practice_session((select id from core_sessions where label='partial'))$$,'partial attempt pauses');
select extensions.lives_ok($$select public.resume_practice_session((select id from core_sessions where label='partial'))$$,'partial attempt resumes');
select extensions.lives_ok($$select public.set_practice_session_metronome_bpm((select id from core_sessions where label='partial'),90)$$,'partial attempt records 90 BPM');
select extensions.lives_ok($$select public.end_practice_session((select id from core_sessions where label='partial'))$$,'partial attempt ends');

select extensions.lives_ok($$select public.pause_practice_session((select id from core_sessions where label='cleared'))$$,'clear attempt pauses');
select extensions.lives_ok($$select public.resume_practice_session((select id from core_sessions where label='cleared'))$$,'clear attempt resumes');
select extensions.lives_ok($$select public.set_practice_session_metronome_bpm((select id from core_sessions where label='cleared'),90)$$,'clear attempt records 90 BPM');
select extensions.lives_ok($$select public.adjust_practice_session_reps((select id from core_sessions where label='cleared'),1)$$,'rep telemetry remains non-authoritative');
select extensions.lives_ok($$select public.end_practice_session((select id from core_sessions where label='cleared'))$$,'clear attempt ends');

select extensions.lives_ok($$select public.pause_practice_session((select id from core_sessions where label='pending'))$$,'pending attempt pauses');
select extensions.lives_ok($$select public.resume_practice_session((select id from core_sessions where label='pending'))$$,'pending attempt resumes');
select extensions.lives_ok($$select public.set_practice_session_metronome_bpm((select id from core_sessions where label='pending'),90)$$,'pending attempt records BPM');
select extensions.lives_ok($$select public.end_practice_session((select id from core_sessions where label='pending'))$$,'pending attempt ends without Result');
select extensions.lives_ok($$select public.pause_practice_session((select id from core_sessions where label='paused'))$$,'paused History attempt remains paused');
set local role postgres;

update public.practice_session_events event set occurred_at = case event.sequence
 when 1 then '2026-09-29 12:00:00+00'::timestamptz when 2 then '2026-09-29 12:10:00+00'::timestamptz
 when 3 then '2026-09-29 12:11:00+00'::timestamptz when 4 then '2026-09-29 12:11:12+00'::timestamptz end
where event.session_id in (select id from core_sessions where label in ('partial','cleared','pending'));
update public.practice_sessions session set started_at=event.occurred_at,
 ended_at=(select e.occurred_at from public.practice_session_events e where e.session_id=session.id and e.event_type='END'),
 created_at=event.occurred_at
from public.practice_session_events event where event.session_id=session.id and event.event_type='START';

set local role authenticated;
set local request.jwt.claim.sub='81111111-1111-4111-8111-111111111111';
select extensions.is(public.practice_session_active_seconds((select id from core_sessions where label='cleared')),612::bigint,'DORIAN authoritative active seconds are 612');
select extensions.lives_ok($$select public.finalize_quest_result((select id from core_sessions where label='partial'),'[{"ordinal":3,"observed_value":false}]','TOO_HARD',null)$$,'partial attempt finalizes');
select extensions.lives_ok($$select public.finalize_quest_result((select id from core_sessions where label='cleared'),'[{"ordinal":3,"observed_value":true}]','GOOD_CHALLENGE','REL-002')$$,'clear attempt finalizes');
select extensions.is((select outcome from public.quest_results where session_id=(select id from core_sessions where label='partial')),'PARTIAL','first attempt is PARTIAL');
select extensions.is((select outcome from public.quest_results where session_id=(select id from core_sessions where label='cleared')),'CLEARED','second attempt is CLEARED');
select extensions.is((select confidence_summary from public.quest_results where session_id=(select id from core_sessions where label='cleared')),'MIXED','DORIAN confidence is MIXED');
select extensions.results_eq($$select metric||':'||criterion_state from public.quest_result_criteria where result_id=(select id from public.quest_results where session_id=(select id from core_sessions where label='cleared')) order by quest_criterion_ordinal$$,$$select * from (values('practice_duration:MET'::text),('target_tempo:MET'::text),('constraint_compliance:MET'::text)) expected(value)$$,'DORIAN criteria are all MET');
select extensions.results_eq($$select verification_mode||':'||source_authority from public.quest_result_evidence where result_id=(select id from public.quest_results where session_id=(select id from core_sessions where label='cleared')) order by verification_mode,source_authority$$,$$select * from (values('SELF:PLAYER'::text),('SESSION:SESSION_SYSTEM'::text),('SESSION:SESSION_SYSTEM'::text)) expected(value)$$,'History evidence retains SESSION and SELF authority');
select extensions.is((select count(*)::bigint from public.quest_results where session_id=(select id from core_sessions where label='pending')),0::bigint,'ended Session remains Result pending');
select extensions.is((select status from public.practice_sessions where id=(select id from core_sessions where label='active')),'ACTIVE','History source retains In progress state');
select extensions.is((select status from public.practice_sessions where id=(select id from core_sessions where label='paused')),'PAUSED','History source retains Paused state');
select extensions.is((select count(*)::bigint from public.practice_sessions where quest_id='83333333-3333-4333-8333-333333333333'),5::bigint,'one Quest retains distinct attempts');
select extensions.is((select count(*)::bigint from public.quest_results where quest_id='83333333-3333-4333-8333-333333333333'),2::bigint,'later Result does not overwrite earlier Result');
select extensions.throws_ok($$select public.finalize_quest_result((select id from core_sessions where label='active'),'[]')$$,'55000',null,'ACTIVE Session cannot finalize');
select extensions.throws_ok($$update public.quests set title='forged' where id='83333333-3333-4333-8333-333333333333'$$,'42501',null,'completed Quest remains immutable');
select extensions.throws_ok($$update public.practice_session_events set occurred_at=clock_timestamp()$$,'42501',null,'Session events remain immutable');
select extensions.throws_ok($$update public.practice_session_control_events set payload='{}'$$,'42501',null,'controls remain append-only');
select extensions.throws_ok($$update public.quest_results set outcome='ATTEMPTED'$$,'42501',null,'Result graph remains immutable');
select extensions.throws_ok($$delete from public.quests where id='83333333-3333-4333-8333-333333333333'$$,'23503',null,'attempted Quest ordinary deletion remains blocked');
set local role postgres;

set local role authenticated;
set local request.jwt.claim.sub='82222222-2222-4222-8222-222222222222';
select extensions.is((select count(*)::bigint from public.quests),0::bigint,'non-owner cannot read core-loop Quest');
select extensions.is((select count(*)::bigint from public.practice_sessions),0::bigint,'non-owner cannot read core-loop Sessions');
select extensions.is((select count(*)::bigint from public.quest_results),0::bigint,'non-owner cannot read core-loop Results or History graph');
select extensions.throws_ok($$select public.start_practice_session('83333333-3333-4333-8333-333333333333')$$,'42501',null,'non-owner cannot start core-loop Quest');
select extensions.throws_ok($$select public.finalize_quest_result((select id from core_sessions where label='pending'),'[]')$$,'42501',null,'non-owner cannot finalize core-loop Result');
set local role postgres;

select extensions.is((select resolved_snapshot->'identity'->>'id' from public.quests where id='83333333-3333-4333-8333-333333333333'),'83333333-3333-4333-8333-333333333333','Quest snapshot identity remains unchanged');
select extensions.is((select count(*)::bigint from public.player_skill_states where player_id='81111111-1111-4111-8111-111111111111'),(select skill_count from progression_baseline),'core loop creates no proficiency mutation');
select extensions.is((select count(*)::bigint from public.player_character_states where player_id='81111111-1111-4111-8111-111111111111'),(select character_count from progression_baseline),'core loop creates no Character Level mutation');
select extensions.is((select count(*)::bigint from public.player_attribute_states where player_id='81111111-1111-4111-8111-111111111111'),(select attribute_count from progression_baseline),'core loop creates no Attribute mutation');
select set_config('request.jwt.claim.sub','',true);
delete from auth.users where id='81111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::bigint from public.quests where player_id='81111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Quest graph');
select extensions.is((select count(*)::bigint from public.practice_sessions where player_id='81111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Session graph');
select extensions.is((select count(*)::bigint from public.quest_results where player_id='81111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Result graph');

select * from extensions.finish();
rollback;
