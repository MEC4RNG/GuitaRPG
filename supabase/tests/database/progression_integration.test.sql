begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

insert into auth.users(id,email) values
 ('e1111111-1111-4111-8111-111111111111','rel003-owner@example.com'),
 ('e2222222-2222-4222-8222-222222222222','rel003-other@example.com');

insert into public.quests(id,player_id,slug,title,schema_version,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,
 primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,metadata,resolved_snapshot)
select v.quest_id,'e1111111-1111-4111-8111-111111111111',v.slug,v.title,1,'TECHNIQUE','REL_003',d.id,'DEVELOP_SKILL','CUSTOM',p.id,'{}',
 '{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false}',
 '{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
 '{"model_version":"DIF_V1","dimensions":{"TECHNIQUE":{"applicable":true,"score":56}},"overall":{"score":54}}','III',
 '{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false}','{}',
 '{"identity":{"schema_version":1},"difficulty_profile":{"model_version":"DIF_V1"}}'
from (values
 ('e3333333-3333-4333-8333-333333333331'::uuid,'rel003_dorian','REL-003 Dorian'),
 ('e3333333-3333-4333-8333-333333333332'::uuid,'rel003_short','REL-003 Short')) v(quest_id,slug,title)
cross join public.taxonomy_entities d cross join public.taxonomy_entities p
where d.kind='DOMAIN' and d.slug='technique' and p.kind='SKILL' and p.slug='hybrid_picking';

insert into public.quest_skill_roles(quest_id,skill_id,role,ordinal)
select q.id,t.id,'SECONDARY_SKILL',row_number() over(partition by q.id order by t.slug)::smallint
from public.quests q cross join public.taxonomy_entities t
where q.id in ('e3333333-3333-4333-8333-333333333331','e3333333-3333-4333-8333-333333333332')
 and t.kind='SKILL' and t.slug in ('scale_mapping','syncopation_control');
insert into public.quest_concepts(quest_id,concept_id,ordinal)
select q.id,t.id,1 from public.quests q cross join public.taxonomy_entities t
where q.id in ('e3333333-3333-4333-8333-333333333331','e3333333-3333-4333-8333-333333333332') and t.kind='CONCEPT' and t.slug='dorian';
insert into public.quest_constraints(quest_id,constraint_id,ordinal,parameters)
select q.id,t.id,1,'{"bpm":90}' from public.quests q cross join public.taxonomy_entities t
where q.id in ('e3333333-3333-4333-8333-333333333331','e3333333-3333-4333-8333-333333333332') and t.kind='CONSTRAINT' and t.slug='target_tempo';
insert into public.quest_objective_criteria(quest_id,ordinal,metric,operator,criterion_value,unit)
select q.id,c.ordinal,c.metric,c.operator,c.value,c.unit from public.quests q cross join (values
 (1::smallint,'practice_duration','GTE','600'::jsonb,'seconds'),
 (2::smallint,'target_tempo','EQ','90'::jsonb,'bpm'),
 (3::smallint,'constraint_compliance','EQ','true'::jsonb,'boolean')
) c(ordinal,metric,operator,value,unit)
where q.id in ('e3333333-3333-4333-8333-333333333331','e3333333-3333-4333-8333-333333333332');
set constraints all immediate;

insert into public.practice_sessions(id,player_id,quest_id,status,started_at,ended_at,created_at) values
 ('e4444444-4444-4444-8444-444444444441','e1111111-1111-4111-8111-111111111111','e3333333-3333-4333-8333-333333333331','ENDED','2026-09-29T12:00:00Z','2026-09-29T12:11:12Z','2026-09-29T12:00:00Z'),
 ('e4444444-4444-4444-8444-444444444442','e1111111-1111-4111-8111-111111111111','e3333333-3333-4333-8333-333333333331','ENDED','2026-09-29T13:00:00Z','2026-09-29T13:10:12Z','2026-09-29T13:00:00Z'),
 ('e4444444-4444-4444-8444-444444444443','e1111111-1111-4111-8111-111111111111','e3333333-3333-4333-8333-333333333332','ENDED','2026-09-29T14:00:00Z','2026-09-29T14:00:12Z','2026-09-29T14:00:00Z');
insert into public.practice_session_events(session_id,sequence,event_type,occurred_at) values
 ('e4444444-4444-4444-8444-444444444441',1,'START','2026-09-29T12:00:00Z'),
 ('e4444444-4444-4444-8444-444444444441',2,'PAUSE','2026-09-29T12:10:00Z'),
 ('e4444444-4444-4444-8444-444444444441',3,'RESUME','2026-09-29T12:11:00Z'),
 ('e4444444-4444-4444-8444-444444444441',4,'END','2026-09-29T12:11:12Z'),
 ('e4444444-4444-4444-8444-444444444442',1,'START','2026-09-29T13:00:00Z'),
 ('e4444444-4444-4444-8444-444444444442',2,'END','2026-09-29T13:10:12Z'),
 ('e4444444-4444-4444-8444-444444444443',1,'START','2026-09-29T14:00:00Z'),
 ('e4444444-4444-4444-8444-444444444443',2,'END','2026-09-29T14:00:12Z');
insert into public.practice_session_control_events(session_id,sequence,event_type,payload,occurred_at)
values('e4444444-4444-4444-8444-444444444441',1,'METRONOME_BPM_SET','{"bpm":90}','2026-09-29T12:05:00Z');

-- An ended Session remains progression-pending until the ordinary Result RPC runs.
select extensions.is((select count(*) from public.quest_results where session_id='e4444444-4444-4444-8444-444444444442'),0::bigint,'pending Session has no Result');
select extensions.is((select count(*) from public.practice_xp_ledger where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'pending Session has no XP');
select extensions.is((select count(*) from public.skill_progression_events where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'pending Session has no Skill events');
select extensions.is((select count(*) from public.attribute_progression_events where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'pending Session has no Attribute events');

set local role authenticated;
set local request.jwt.claim.sub='e1111111-1111-4111-8111-111111111111';
select extensions.lives_ok($$select public.finalize_quest_result('e4444444-4444-4444-8444-444444444441','[{"ordinal":3,"observed_value":true}]','GOOD_CHALLENGE','REL-003')$$,'one ordinary Result finalization succeeds');
select extensions.lives_ok($$select public.finalize_quest_result('e4444444-4444-4444-8444-444444444443','[]',null,null)$$,'short Session finalizes honestly');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);

select extensions.is((select row(meaningful_attempt,outcome,confidence_summary)::text from public.quest_results where session_id='e4444444-4444-4444-8444-444444444441'),'(t,CLEARED,MIXED)','DORIAN Result is meaningful CLEARED MIXED');
select extensions.is(public.practice_session_active_seconds('e4444444-4444-4444-8444-444444444441'),612::bigint,'DORIAN has 612 active seconds');
select extensions.is((select total_xp_delta from public.practice_xp_ledger x join public.quest_results r on r.id=x.source_result_id where r.session_id='e4444444-4444-4444-8444-444444444441'),15::bigint,'Result pipeline awards 15 XP');
select extensions.is((select row(practice_xp,character_level,total_practice_seconds)::text from public.player_character_states where player_id='e1111111-1111-4111-8111-111111111111'),'(15,1,612)','XP projects to Character Level 1 and 612 seconds');
select extensions.is((select row(assessment_status,visible_level,proficiency_score,confidence_score,exposure_count,evidence_count)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(ESTIMATED,III,55.30,20.00,1,1)','Primary Skill receives canonical PROF/CONF evidence');
select extensions.is((select row(readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(HIGH,55.30)','Primary Skill readiness is immediate HIGH');
select extensions.is((select count(*) from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug in ('scale_mapping','syncopation_control') and assessment_status='UNRATED' and proficiency_score is null and confidence_score=0 and exposure_count=1 and evidence_count=0),2::bigint,'supporting Skills remain exposure-only');
select extensions.is((select row(a.assessment_status,a.score)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug='coordination'),'(ESTIMATED,55.30)','Coordination derives from Hybrid Picking');
select extensions.is((select row(a.assessment_status,a.score)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug='precision'),'(ESTIMATED,55.30)','Precision derives from Hybrid Picking');
select extensions.is((select count(*) from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug in ('fretboard','theory','rhythm','control') and assessment_status='UNASSESSED' and score is null),4::bigint,'unrated contributors cannot inflate Attributes');
select extensions.is((select count(*) from public.quest_result_criteria c join public.quest_results r on r.id=c.result_id where r.session_id='e4444444-4444-4444-8444-444444444441' and criterion_state='MET'),3::bigint,'finalization persists all MET criteria');
select extensions.is((select count(*) from public.quest_result_evidence e join public.quest_results r on r.id=e.result_id where r.session_id='e4444444-4444-4444-8444-444444444441' and source_authority in ('PLAYER','SESSION_SYSTEM')),3::bigint,'finalization persists trusted evidence authorities');
select extensions.is((select outcome from public.quest_results where session_id='e4444444-4444-4444-8444-444444444443'),'ABANDONED','short Result is ABANDONED');
select extensions.is((select total_xp_delta from public.practice_xp_ledger x join public.quest_results r on r.id=x.source_result_id where r.session_id='e4444444-4444-4444-8444-444444444443'),0::bigint,'ABANDONED Result awards zero XP');
select extensions.is((select count(*) from public.skill_progression_events e join public.quest_results r on r.id=e.source_result_id where r.session_id='e4444444-4444-4444-8444-444444444443' and (e.meaningful_exposure or e.informative_evidence)),0::bigint,'ABANDONED Result adds no meaningful Skill evidence');

create temporary table rel003_source_before as select
 (select to_jsonb(q) from public.quests q where id='e3333333-3333-4333-8333-333333333331') quest,
 (select jsonb_agg(to_jsonb(e) order by sequence) from public.practice_session_events e where session_id='e4444444-4444-4444-8444-444444444441') session_events,
 (select to_jsonb(r) from public.quest_results r where session_id='e4444444-4444-4444-8444-444444444441') result,
 (select jsonb_agg(to_jsonb(c) order by quest_criterion_ordinal) from public.quest_result_criteria c join public.quest_results r on r.id=c.result_id where r.session_id='e4444444-4444-4444-8444-444444444441') criteria,
 (select jsonb_agg(to_jsonb(e) order by criterion_metric) from public.quest_result_evidence e join public.quest_results r on r.id=e.result_id where r.session_id='e4444444-4444-4444-8444-444444444441') evidence,
 (select count(*) from public.skill_progression_events where player_id='e1111111-1111-4111-8111-111111111111') skill_events;

select extensions.is((private.progression_integrity_report_v1('e1111111-1111-4111-8111-111111111111')->>'safe_to_recompute')::boolean,true,'complete history is safe to recompute');
update public.player_character_states set practice_xp=999,character_level=4,total_practice_seconds=999 where player_id='e1111111-1111-4111-8111-111111111111';
update public.player_skill_states s set proficiency_score=10,visible_level='I',confidence_score=5,readiness_score=10 from public.taxonomy_entities t where s.player_id='e1111111-1111-4111-8111-111111111111' and s.skill_id=t.id and t.slug='hybrid_picking';
update public.player_attribute_states a set score=10 from public.taxonomy_entities t where a.player_id='e1111111-1111-4111-8111-111111111111' and a.attribute_id=t.id and t.slug in ('coordination','precision');
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('e1111111-1111-4111-8111-111111111111','2026-09-29T14:00:12Z','REL-003 repair','rel003-repair')$$,'trusted recompute repairs combined drift');
select extensions.is((select projection_changed from private.progression_recompute_runs where idempotency_key='rel003-repair'),true,'repair receipt records projection change');
select extensions.is((select row(practice_xp,character_level,total_practice_seconds)::text from public.player_character_states where player_id='e1111111-1111-4111-8111-111111111111'),'(15,1,612)','Character drift restores exactly');
select extensions.is((select row(proficiency_score,confidence_score,readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(55.30,20.00,HIGH,55.30)','Skill and readiness drift restore exactly');
select extensions.is((select count(*) from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug in ('coordination','precision') and score=55.30),2::bigint,'Attribute drift restores exactly');
select extensions.is((select count(*) from public.skill_progression_events where player_id='e1111111-1111-4111-8111-111111111111'),(select skill_events from rel003_source_before),'repair creates no progression events');
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('e1111111-1111-4111-8111-111111111111','2026-09-29T14:00:12Z','REL-003 no-op','rel003-noop')$$,'healthy recompute succeeds');
select extensions.is((select projection_changed from private.progression_recompute_runs where idempotency_key='rel003-noop'),false,'healthy recompute is a semantic no-op');
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('e1111111-1111-4111-8111-111111111111','2026-09-29T14:00:12Z','REL-003 no-op','rel003-noop')$$,'same recompute key retries safely');
select extensions.is((select count(*) from private.progression_recompute_runs where idempotency_key='rel003-noop'),1::bigint,'recompute retry has one receipt');
select extensions.is((select quest from rel003_source_before),(select to_jsonb(q) from public.quests q where id='e3333333-3333-4333-8333-333333333331'),'recompute preserves Quest');
select extensions.is((select session_events from rel003_source_before),(select jsonb_agg(to_jsonb(e) order by sequence) from public.practice_session_events e where session_id='e4444444-4444-4444-8444-444444444441'),'recompute preserves Session history');
select extensions.is((select result from rel003_source_before),(select to_jsonb(r) from public.quest_results r where session_id='e4444444-4444-4444-8444-444444444441'),'recompute preserves Result');
select extensions.is((select criteria from rel003_source_before),(select jsonb_agg(to_jsonb(c) order by quest_criterion_ordinal) from public.quest_result_criteria c join public.quest_results r on r.id=c.result_id where r.session_id='e4444444-4444-4444-8444-444444444441'),'recompute preserves criteria');
select extensions.is((select evidence from rel003_source_before),(select jsonb_agg(to_jsonb(e) order by criterion_metric) from public.quest_result_evidence e join public.quest_results r on r.id=e.result_id where r.session_id='e4444444-4444-4444-8444-444444444441'),'recompute preserves evidence');

select extensions.lives_ok($$select private.apply_practice_xp_correction_v1('e1111111-1111-4111-8111-111111111111',-5,0,'REL-003 correction','rel003-minus-five',null,null)$$,'trusted negative XP correction succeeds');
select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_result_id=(select id from public.quest_results where session_id='e4444444-4444-4444-8444-444444444441')),15::bigint,'original Result award remains 15');
select extensions.is((select practice_xp from public.player_character_states where player_id='e1111111-1111-4111-8111-111111111111'),10::bigint,'correction changes Character to 10 XP');
select extensions.is((select row(proficiency_score,confidence_score,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='e1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(55.30,20.00,55.30)','XP correction leaves Skill/readiness unchanged');
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('e1111111-1111-4111-8111-111111111111','2026-09-29T14:00:12Z','REL-003 corrected replay','rel003-corrected')$$,'recompute preserves authoritative correction ledger');
select extensions.is((select practice_xp from public.player_character_states where player_id='e1111111-1111-4111-8111-111111111111'),10::bigint,'corrected Character persists through recompute');
select extensions.lives_ok($$select private.apply_practice_xp_correction_v1('e1111111-1111-4111-8111-111111111111',5,0,'REL-003 compensation','rel003-plus-five',null,null)$$,'correction-of-correction appends compensation');
select extensions.is((select count(*) from public.practice_xp_correction_ledger where player_id='e1111111-1111-4111-8111-111111111111'),2::bigint,'both immutable corrections remain');
select extensions.is((select practice_xp from public.player_character_states where player_id='e1111111-1111-4111-8111-111111111111'),15::bigint,'compensation restores 15 XP');

set local role authenticated;
set local request.jwt.claim.sub='e1111111-1111-4111-8111-111111111111';
select extensions.throws_ok($$update public.player_skill_states set proficiency_score=100$$,'42501',null,'ordinary owner cannot mutate Skill projection');
select extensions.throws_ok($$update public.player_attribute_states set score=100$$,'42501',null,'ordinary owner cannot mutate Attribute projection');
select extensions.throws_ok($$select private.admin_recompute_player_progression_v1('e1111111-1111-4111-8111-111111111111',now(),'forbidden','forbidden')$$,'42501',null,'ordinary owner cannot recompute');
select extensions.throws_ok($$select private.apply_practice_xp_correction_v1('e1111111-1111-4111-8111-111111111111',1,0,'forbidden','forbidden',null,null)$$,'42501',null,'ordinary owner cannot correct XP');
set local request.jwt.claim.sub='e2222222-2222-4222-8222-222222222222';
select extensions.is((select count(*) from public.practice_xp_ledger where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'other Player cannot read XP');
select extensions.is((select count(*) from public.skill_progression_events where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'other Player cannot read Skill events');
select extensions.is((select count(*) from public.attribute_progression_events where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'other Player cannot read Attribute events');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);

delete from public.skill_progression_events where ctid=(select e.ctid from public.skill_progression_events e join public.taxonomy_entities t on t.id=e.skill_id where e.player_id='e1111111-1111-4111-8111-111111111111' and t.kind='SKILL' and t.slug='hybrid_picking' limit 1);
select extensions.is((private.progression_integrity_report_v1('e1111111-1111-4111-8111-111111111111')->>'safe_to_recompute')::boolean,false,'missing historical Skill event makes audit unsafe');
create temporary table rel003_blocked_before as select private.progression_semantic_snapshot_v1('e1111111-1111-4111-8111-111111111111') snapshot;
select extensions.lives_ok($$select private.admin_recompute_player_progression_v1('e1111111-1111-4111-8111-111111111111','2026-09-29T14:00:12Z','REL-003 blocked','rel003-blocked')$$,'unsafe replay returns a receipt');
select extensions.is((select status from private.progression_recompute_runs where idempotency_key='rel003-blocked'),'BLOCKED','unsafe replay is refused');
select extensions.is((select snapshot from rel003_blocked_before),private.progression_semantic_snapshot_v1('e1111111-1111-4111-8111-111111111111'),'blocked replay does not mutate projections');

delete from auth.users where id='e1111111-1111-4111-8111-111111111111';
select extensions.is((select count(*) from public.player_character_states where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Character projection');
select extensions.is((select count(*) from public.player_skill_states where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Skill projections');
select extensions.is((select count(*) from public.player_attribute_states where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Attribute projections');
select extensions.is((select count(*) from public.practice_xp_ledger where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes XP awards');
select extensions.is((select count(*) from public.practice_xp_correction_ledger where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes corrections');
select extensions.is((select count(*) from private.progression_recompute_runs where player_id='e1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes recompute receipts');

select * from extensions.finish();
rollback;
