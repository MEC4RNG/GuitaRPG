begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public','practice_xp_correction_ledger','XP correction ledger exists');
select extensions.has_table('private','progression_recompute_runs','recompute receipt table exists');
select extensions.has_function('private','progression_integrity_report_v1',array['uuid'],'integrity report exists');
select extensions.has_function('private','admin_recompute_player_progression_v1',array['uuid','timestamp with time zone','text','text'],'trusted recompute operation exists');
select extensions.has_function('private','apply_practice_xp_correction_v1',array['uuid','bigint','bigint','text','text','uuid','text'],'trusted XP correction operation exists');
select extensions.is((select relrowsecurity from pg_class where oid='public.practice_xp_correction_ledger'::regclass),true,'correction ledger RLS is enabled');

insert into auth.users(id,email) values
 ('d1111111-1111-4111-8111-111111111111','recompute-owner@example.com'),
 ('d2222222-2222-4222-8222-222222222222','recompute-other@example.com');

insert into public.quests(id,player_id,slug,title,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,
 primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,resolved_snapshot)
select 'd3333333-3333-4333-8333-333333333333','d1111111-1111-4111-8111-111111111111','recompute_dorian','Recompute Dorian',
 'TECHNIQUE','PROG_TEST',d.id,'DEVELOP_SKILL','CUSTOM',p.id,'{}',
 '{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false}',
 '{"allowed_modes":["SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
 '{"model_version":"DIF_V1","dimensions":{"TECHNIQUE":{"applicable":true,"score":56}},"overall":{"score":54}}',
 'III','{"fixed_xp":null,"progression_effects_embedded":false}',
 '{"identity":{"schema_version":1},"difficulty_profile":{"model_version":"DIF_V1"}}'
from public.taxonomy_entities d cross join public.taxonomy_entities p
where d.kind='DOMAIN' and d.slug='technique' and p.kind='SKILL' and p.slug='hybrid_picking';
insert into public.quest_skill_roles(quest_id,skill_id,role,ordinal)
select 'd3333333-3333-4333-8333-333333333333',id,'SECONDARY_SKILL',row_number() over(order by slug)::smallint
from public.taxonomy_entities where kind='SKILL' and slug in ('scale_mapping','syncopation_control');
insert into public.practice_sessions(id,player_id,quest_id,status,started_at,ended_at) values
 ('d4444444-4444-4444-8444-444444444444','d1111111-1111-4111-8111-111111111111','d3333333-3333-4333-8333-333333333333','ENDED','2026-09-01T00:00:00Z','2026-09-01T00:10:12Z');
insert into public.practice_session_events(session_id,sequence,event_type,occurred_at) values
 ('d4444444-4444-4444-8444-444444444444',1,'START','2026-09-01T00:00:00Z'),
 ('d4444444-4444-4444-8444-444444444444',2,'END','2026-09-01T00:10:12Z');
insert into public.quest_results(id,player_id,quest_id,session_id,quest_schema_version,difficulty_model_version,
 meaningful_attempt,outcome,verification_modes,confidence_summary,finalized_at)
values('d5555555-5555-4555-8555-555555555555','d1111111-1111-4111-8111-111111111111',
 'd3333333-3333-4333-8333-333333333333','d4444444-4444-4444-8444-444444444444',1,'DIF_V1',true,
 'ATTEMPTED','{}','LOW','2026-09-01T00:10:12Z');
update public.quest_results set outcome='CLEARED',verification_modes=array['SESSION'],confidence_summary='MIXED'
where id='d5555555-5555-4555-8555-555555555555';

create temporary table immutable_before as
select
  (select to_jsonb(q) from public.quests q where id='d3333333-3333-4333-8333-333333333333') quest,
  (select jsonb_agg(to_jsonb(e) order by sequence) from public.practice_session_events e where session_id='d4444444-4444-4444-8444-444444444444') session_events,
  (select to_jsonb(r) from public.quest_results r where id='d5555555-5555-4555-8555-555555555555') result,
  (select to_jsonb(x) from public.practice_xp_ledger x where source_result_id='d5555555-5555-4555-8555-555555555555') xp_award;

select extensions.is((private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->>'safe_to_recompute')::boolean,true,'healthy DORIAN history is safe to recompute');
select extensions.is((private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->>'finalized_result_count')::bigint,1::bigint,'integrity report counts finalized Results');
select extensions.is((private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->>'result_xp_award_count')::bigint,1::bigint,'integrity report counts normal XP awards');
select extensions.is((private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->>'expected_skill_progression_event_count')::bigint,3::bigint,'integrity report expects Primary plus two persisted role events');
select extensions.is((private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->>'actual_skill_progression_event_count')::bigint,3::bigint,'integrity report observes exact Skill event count');
select extensions.is((private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->>'model_version_mismatch_count')::bigint,0::bigint,'integrity report finds no V1 model mismatch');

set local role authenticated;
set local request.jwt.claim.sub='d1111111-1111-4111-8111-111111111111';
select extensions.throws_ok($$select private.admin_recompute_player_progression_v1('d1111111-1111-4111-8111-111111111111',now(),'forbidden','user-recompute')$$,'42501',null,'ordinary user cannot invoke recompute');
select extensions.throws_ok($$select private.apply_practice_xp_correction_v1('d1111111-1111-4111-8111-111111111111',1,0,'forbidden','user-correction',null,null)$$,'42501',null,'ordinary user cannot invoke XP correction');
select extensions.throws_ok($$insert into public.practice_xp_correction_ledger(player_id,xp_delta,eligible_practice_seconds_delta,xp_model_version,character_model_version,reason,idempotency_key) values('d1111111-1111-4111-8111-111111111111',1,0,'XP_V1','CHAR_V1','forbidden','direct')$$,'42501',null,'ordinary user cannot insert correction');
select extensions.throws_ok($$update public.practice_xp_correction_ledger set reason='changed'$$,'42501',null,'ordinary user cannot update correction');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);

select extensions.lives_ok($$select private.apply_practice_xp_correction_v1('d1111111-1111-4111-8111-111111111111',-5,0,'Remove erroneous engagement XP','xp-minus-five','d5555555-5555-4555-8555-555555555555',null)$$,'service correction succeeds');
select extensions.is((select count(*) from public.practice_xp_correction_ledger where player_id='d1111111-1111-4111-8111-111111111111'),1::bigint,'correction ledger receives one append-only entry');
select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_result_id='d5555555-5555-4555-8555-555555555555'),15::bigint,'original RESULT_AWARD remains 15');
select extensions.is((select practice_xp from public.player_character_states where player_id='d1111111-1111-4111-8111-111111111111'),10::bigint,'negative correction rebuilds Character XP to 10');
select extensions.is((select character_level from public.player_character_states where player_id='d1111111-1111-4111-8111-111111111111'),1,'Character Level recalculates through CHAR_V1');
select extensions.lives_ok($$select private.apply_practice_xp_correction_v1('d1111111-1111-4111-8111-111111111111',-5,0,'Remove erroneous engagement XP','xp-minus-five','d5555555-5555-4555-8555-555555555555',null)$$,'same correction idempotency key retries safely');
select extensions.is((select count(*) from public.practice_xp_correction_ledger where player_id='d1111111-1111-4111-8111-111111111111'),1::bigint,'idempotent retry creates no duplicate correction');
select extensions.throws_ok($$select private.apply_practice_xp_correction_v1('d1111111-1111-4111-8111-111111111111',-6,0,'Different inputs','xp-minus-five',null,null)$$,'22023',null,'same correction key with different inputs is rejected');
select extensions.lives_ok($$select private.apply_practice_xp_correction_v1('d1111111-1111-4111-8111-111111111111',0,-12,'Correct meaningful seconds','seconds-minus-twelve',null,null)$$,'signed practice-seconds correction succeeds');
select extensions.is((select row(practice_xp,total_practice_seconds)::text from public.player_character_states where player_id='d1111111-1111-4111-8111-111111111111'),'(10,600)','seconds correction changes meaningful time without changing XP');
select extensions.throws_ok($$select private.apply_practice_xp_correction_v1('d1111111-1111-4111-8111-111111111111',-11,0,'Invalid negative XP','invalid-xp',null,null)$$,'22003',null,'negative aggregate XP is rejected');
select extensions.throws_ok($$select private.apply_practice_xp_correction_v1('d1111111-1111-4111-8111-111111111111',0,-601,'Invalid negative seconds','invalid-seconds',null,null)$$,'22003',null,'negative aggregate meaningful seconds is rejected');
select extensions.is((select count(*) from public.practice_xp_correction_ledger where idempotency_key like 'invalid-%'),0::bigint,'invalid corrections insert no ledger rows');
select extensions.lives_ok($$select private.apply_practice_xp_correction_v1('d1111111-1111-4111-8111-111111111111',5,12,'Compensate prior correction','restore-dorian',null,null)$$,'a mistaken correction is corrected by a new compensation');
select extensions.is((select row(practice_xp,total_practice_seconds)::text from public.player_character_states where player_id='d1111111-1111-4111-8111-111111111111'),'(15,612)','opposite compensation restores DORIAN Character state');

set local role authenticated;
set local request.jwt.claim.sub='d1111111-1111-4111-8111-111111111111';
select extensions.is((select count(*) from public.practice_xp_correction_ledger),3::bigint,'owner can read own correction ledger');
set local request.jwt.claim.sub='d2222222-2222-4222-8222-222222222222';
select extensions.is((select count(*) from public.practice_xp_correction_ledger),0::bigint,'non-owner cannot read correction ledger');
set local role service_role;
select extensions.throws_ok($$update public.practice_xp_correction_ledger set reason='rewrite'$$,'42501',null,'service role has no correction UPDATE privilege');
select extensions.throws_ok($$delete from public.practice_xp_correction_ledger$$,'42501',null,'service role has no correction DELETE privilege');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);

create temporary table progression_audit_before as
select private.progression_semantic_snapshot_v1('d1111111-1111-4111-8111-111111111111') semantic,
 (select count(*) from public.skill_progression_events where player_id='d1111111-1111-4111-8111-111111111111') skill_events,
 (select count(*) from public.practice_xp_ledger where player_id='d1111111-1111-4111-8111-111111111111') xp_awards;

update public.player_character_states set practice_xp=999,character_level=4,total_practice_seconds=999
where player_id='d1111111-1111-4111-8111-111111111111';
update public.player_skill_states s set assessment_status='ESTIMATED',visible_level='I',proficiency_score=10,
 confidence_score=5,readiness_status='HIGH',readiness_score=10,exposure_count=0,evidence_count=0
from public.taxonomy_entities t where s.player_id='d1111111-1111-4111-8111-111111111111' and s.skill_id=t.id and t.slug='hybrid_picking';
update public.player_attribute_states a set assessment_status='ESTIMATED',score=10
from public.taxonomy_entities t where a.player_id='d1111111-1111-4111-8111-111111111111' and a.attribute_id=t.id and t.slug in ('coordination','precision');

select extensions.is((private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->'projection_mismatches' ? 'CHARACTER_PROJECTION_DRIFT'),true,'integrity report detects Character projection drift');
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('d1111111-1111-4111-8111-111111111111','2026-09-01T00:10:12Z','Repair combined projection drift','repair-all')$$,'trusted full recompute repairs combined drift');
select extensions.is((select projection_changed from private.progression_recompute_runs where idempotency_key='repair-all'),true,'drift recompute receipt records a semantic change');
select extensions.is((select status from private.progression_recompute_runs where idempotency_key='repair-all'),'COMPLETED','successful recompute receipt completes');
select extensions.is((select row(practice_xp,character_level,total_practice_seconds)::text from public.player_character_states where player_id='d1111111-1111-4111-8111-111111111111'),'(15,1,612)','Character drift is exactly repaired');
select extensions.is((select row(assessment_status,visible_level,proficiency_score,confidence_score,exposure_count,evidence_count)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='d1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(ESTIMATED,III,55.30,20.00,1,1)','Skill drift restores canonical DORIAN PROF/CONF state');
select extensions.is((select row(readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='d1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(HIGH,55.30)','immediate DORIAN readiness restores HIGH 55.30');
select extensions.is((select row(assessment_status,score)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='d1111111-1111-4111-8111-111111111111' and t.slug='coordination'),'(ESTIMATED,55.30)','Coordination drift restores ESTIMATED 55.30');
select extensions.is((select row(assessment_status,score)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='d1111111-1111-4111-8111-111111111111' and t.slug='precision'),'(ESTIMATED,55.30)','Precision drift restores ESTIMATED 55.30');
select extensions.is((select row(assessment_status,exposure_count,evidence_count)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='d1111111-1111-4111-8111-111111111111' and t.slug='scale_mapping'),'(UNRATED,1,0)','supporting Skill remains exposure-only and UNRATED');
select extensions.is((select count(*) from public.skill_progression_events where player_id='d1111111-1111-4111-8111-111111111111'),(select skill_events from progression_audit_before),'projection repair creates no Skill events');
select extensions.is((select count(*) from public.practice_xp_ledger where player_id='d1111111-1111-4111-8111-111111111111'),(select xp_awards from progression_audit_before),'projection repair creates no Result awards');
select extensions.ok((select model_bundle=private.progression_model_bundle_v1() from private.progression_recompute_runs where idempotency_key='repair-all'),'receipt records the full V1 model bundle');
select extensions.ok((select before_snapshot is not null and after_snapshot is not null from private.progression_recompute_runs where idempotency_key='repair-all'),'receipt records before and after semantic snapshots');

select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('d1111111-1111-4111-8111-111111111111','2026-09-01T00:10:12Z','Verify healthy no-op','healthy-noop')$$,'healthy recompute succeeds');
select extensions.is((select projection_changed from private.progression_recompute_runs where idempotency_key='healthy-noop'),false,'healthy same-as-of recompute is semantic no-op');
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('d1111111-1111-4111-8111-111111111111','2026-09-01T00:10:12Z','Verify healthy no-op','healthy-noop')$$,'same recompute idempotency key retries safely');
select extensions.is((select count(*) from private.progression_recompute_runs where idempotency_key='healthy-noop'),1::bigint,'recompute retry creates one receipt');

select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('d1111111-1111-4111-8111-111111111111','2026-09-09T00:10:12Z','Evaluate day eight','day-eight')$$,'DORIAN +8-day recompute succeeds');
select extensions.is((select row(readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='d1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(MODERATE,44.24)','DORIAN +8-day readiness is MODERATE 44.24');
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('d1111111-1111-4111-8111-111111111111','2026-10-02T00:10:12Z','Evaluate day thirty one','day-thirty-one')$$,'DORIAN +31-day recompute succeeds');
select extensions.is((select row(readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='d1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(LOW,33.18)','DORIAN +31-day readiness is LOW 33.18');
select extensions.is((select row(c.practice_xp,s.proficiency_score,s.confidence_score,a.score,p.score)::text from public.player_character_states c join public.player_skill_states s on s.player_id=c.player_id join public.taxonomy_entities st on st.id=s.skill_id and st.slug='hybrid_picking' join public.player_attribute_states a on a.player_id=c.player_id join public.taxonomy_entities at on at.id=a.attribute_id and at.slug='coordination' join public.player_attribute_states p on p.player_id=c.player_id join public.taxonomy_entities pt on pt.id=p.attribute_id and pt.slug='precision' where c.player_id='d1111111-1111-4111-8111-111111111111'),'(15,55.30,20.00,55.30,55.30)','as-of recompute changes only readiness semantics');

select extensions.is((select quest from immutable_before),(select to_jsonb(q) from public.quests q where id='d3333333-3333-4333-8333-333333333333'),'recompute leaves Quest unchanged');
select extensions.is((select session_events from immutable_before),(select jsonb_agg(to_jsonb(e) order by sequence) from public.practice_session_events e where session_id='d4444444-4444-4444-8444-444444444444'),'recompute leaves Session events unchanged');
select extensions.is((select result from immutable_before),(select to_jsonb(r) from public.quest_results r where id='d5555555-5555-4555-8555-555555555555'),'recompute leaves Result unchanged');
select extensions.is((select xp_award from immutable_before),(select to_jsonb(x) from public.practice_xp_ledger x where source_result_id='d5555555-5555-4555-8555-555555555555'),'recompute leaves Result XP award unchanged');

delete from public.skill_progression_events where source_result_id='d5555555-5555-4555-8555-555555555555'
 and skill_id=(select id from public.taxonomy_entities where slug='hybrid_picking' and kind='SKILL');
create temporary table blocked_before as select private.progression_semantic_snapshot_v1('d1111111-1111-4111-8111-111111111111') semantic;
select extensions.is((private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->>'safe_to_recompute')::boolean,false,'missing historical Skill event makes audit unsafe');
select extensions.ok(private.progression_integrity_report_v1('d1111111-1111-4111-8111-111111111111')->'structural_blockers' @> '[{"code":"MISSING_SKILL_EVENT"}]'::jsonb,'integrity report names the missing Skill event blocker');
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('d1111111-1111-4111-8111-111111111111','2026-10-02T00:10:12Z','Must refuse incomplete history','blocked-history')$$,'unsafe recompute returns a blocked receipt without guessing');
select extensions.is((select status from private.progression_recompute_runs where idempotency_key='blocked-history'),'BLOCKED','unsafe recompute receipt is BLOCKED');
select extensions.is((select private.progression_semantic_snapshot_v1('d1111111-1111-4111-8111-111111111111')),(select semantic from blocked_before),'blocked recompute leaves projections untouched');

delete from auth.users where id='d1111111-1111-4111-8111-111111111111';
select extensions.is((select count(*) from public.practice_xp_correction_ledger where player_id='d1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades XP corrections');
select extensions.is((select count(*) from private.progression_recompute_runs where player_id='d1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades recompute receipts');

select * from extensions.finish();
rollback;
