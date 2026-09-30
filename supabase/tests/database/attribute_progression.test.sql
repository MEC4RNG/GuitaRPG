begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public','attribute_progression_events','Attribute audit event table exists');
select extensions.is((select relrowsecurity from pg_class where oid='public.attribute_progression_events'::regclass),true,'Attribute event RLS enabled');
select extensions.has_function('private','rebuild_player_attributes_v1',array['uuid','text','uuid','timestamp with time zone'],'trusted ATTR_V1 rebuild exists');

insert into auth.users(id,email) values
 ('c1111111-1111-4111-8111-111111111111','attr-owner@example.com'),
 ('c2222222-2222-4222-8222-222222222222','attr-other@example.com'),
 ('c3333333-3333-4333-8333-333333333333','attr-establish@example.com');

select extensions.is((select count(*)::bigint from public.player_attribute_states where player_id='c1111111-1111-4111-8111-111111111111' and assessment_status='UNASSESSED' and score is null),11::bigint,'no rated contributors leaves all Attributes UNASSESSED/null');

insert into public.quests(id,player_id,slug,title,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,
 primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,resolved_snapshot)
select 'c4444444-4444-4444-8444-444444444444','c1111111-1111-4111-8111-111111111111','attr_dorian','Attribute Dorian',
 'TECHNIQUE','PROG_TEST',d.id,'DEVELOP_SKILL','CUSTOM',p.id,'{}',
 '{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false}',
 '{"allowed_modes":["SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
 '{"model_version":"DIF_V1","dimensions":{"TECHNIQUE":{"applicable":true,"score":56}},"overall":{"score":54}}',
 'III','{"fixed_xp":null,"progression_effects_embedded":false}',
 '{"identity":{"schema_version":1},"difficulty_profile":{"model_version":"DIF_V1"}}'
from public.taxonomy_entities d cross join public.taxonomy_entities p
where d.kind='DOMAIN' and d.slug='technique' and p.kind='SKILL' and p.slug='hybrid_picking';
insert into public.quest_skill_roles(quest_id,skill_id,role,ordinal)
select 'c4444444-4444-4444-8444-444444444444',id,'SECONDARY_SKILL',row_number() over(order by slug)::smallint
from public.taxonomy_entities where kind='SKILL' and slug in ('scale_mapping','syncopation_control');
insert into public.practice_sessions(id,player_id,quest_id,status,started_at,ended_at) values
 ('c5555555-5555-4555-8555-555555555555','c1111111-1111-4111-8111-111111111111','c4444444-4444-4444-8444-444444444444','ENDED','2026-09-01T00:00:00Z','2026-09-01T00:10:12Z');
insert into public.practice_session_events(session_id,sequence,event_type,occurred_at) values
 ('c5555555-5555-4555-8555-555555555555',1,'START','2026-09-01T00:00:00Z'),
 ('c5555555-5555-4555-8555-555555555555',2,'END','2026-09-01T00:10:12Z');
insert into public.quest_results(id,player_id,quest_id,session_id,quest_schema_version,difficulty_model_version,
 meaningful_attempt,outcome,verification_modes,confidence_summary,finalized_at)
values('c6666666-6666-4666-8666-666666666666','c1111111-1111-4111-8111-111111111111',
 'c4444444-4444-4444-8444-444444444444','c5555555-5555-4555-8555-555555555555',1,'DIF_V1',true,
 'ATTEMPTED','{}','LOW','2026-09-01T00:10:12Z');
update public.quest_results set outcome='CLEARED',verification_modes=array['SESSION'],confidence_summary='MIXED'
where id='c6666666-6666-4666-8666-666666666666';

select extensions.is((select row(assessment_status,proficiency_score,confidence_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='c1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(ESTIMATED,55.30,20.00)','DORIAN Hybrid Picking remains PROF_V1 55.30 / CONF_V1 20');
select extensions.is((select row(a.assessment_status,a.score,a.attribute_model_version)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c1111111-1111-4111-8111-111111111111' and t.slug='coordination'),'(ESTIMATED,55.30,ATTR_V1)','DORIAN Coordination is ESTIMATED 55.30');
select extensions.is((select row(a.assessment_status,a.score)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c1111111-1111-4111-8111-111111111111' and t.slug='precision'),'(ESTIMATED,55.30)','DORIAN Precision is ESTIMATED 55.30');
select extensions.is((select row(total_contributor_count,rated_contributor_count,coverage_ratio,mean_contributor_confidence)::text from public.attribute_progression_events e join public.taxonomy_entities t on t.id=e.attribute_id where player_id='c1111111-1111-4111-8111-111111111111' and t.slug='coordination'),'(21,1,0.047619,20.00)','Coordination audit retains 1/21 coverage and mean confidence 20');
select extensions.is((select row(total_contributor_count,rated_contributor_count,coverage_ratio,mean_contributor_confidence)::text from public.attribute_progression_events e join public.taxonomy_entities t on t.id=e.attribute_id where player_id='c1111111-1111-4111-8111-111111111111' and t.slug='precision'),'(21,1,0.047619,20.00)','Precision audit retains 1/21 coverage and mean confidence 20');
select extensions.is((select count(*)::bigint from public.attribute_progression_events where source_result_id='c6666666-6666-4666-8666-666666666666'),2::bigint,'Result creates change-only Attribute events');
select extensions.is((select count(*)::bigint from public.attribute_progression_events where source_result_id='c6666666-6666-4666-8666-666666666666' and graph_version='ATTRIBUTE_GRAPH_V1' and attribute_model_version='ATTR_V1'),2::bigint,'Result events retain graph and model versions');
select extensions.is((select count(*)::bigint from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c1111111-1111-4111-8111-111111111111' and t.slug in ('fretboard','theory','rhythm','control') and a.assessment_status='UNASSESSED' and a.score is null),4::bigint,'UNRATED supporting Skills do not inflate Fretboard, Theory, Rhythm, or Control');
select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_result_id='c6666666-6666-4666-8666-666666666666'),15::bigint,'DORIAN XP remains 15');

create temporary table dorian_attributes_before as select jsonb_agg(to_jsonb(a)-array['created_at','updated_at']::text[] order by attribute_id) snapshot from public.player_attribute_states a where player_id='c1111111-1111-4111-8111-111111111111';
select private.refresh_player_readiness_v1('c1111111-1111-4111-8111-111111111111','2026-10-02T00:10:12Z','RECENCY_REFRESH');
select extensions.is((select jsonb_agg(to_jsonb(a)-array['created_at','updated_at']::text[] order by attribute_id) from public.player_attribute_states a where player_id='c1111111-1111-4111-8111-111111111111'),(select snapshot from dorian_attributes_before),'readiness decay does not alter Attributes');
select extensions.is(private.rebuild_player_attributes_v1('c1111111-1111-4111-8111-111111111111','RESULT_DERIVATION','c6666666-6666-4666-8666-666666666666','2026-10-02T00:10:12Z'),0::bigint,'no-op Result recomputation changes no Attributes');
select extensions.is((select count(*)::bigint from public.attribute_progression_events where source_result_id='c6666666-6666-4666-8666-666666666666'),2::bigint,'no-op recomputation cannot duplicate Result events');

-- Ear has three contributors. Two established contributors satisfy all gates.
update public.player_skill_states s set assessment_status='ESTABLISHED',visible_level='IV',proficiency_score=v.score,
 confidence_score=v.confidence,evidence_count=3,exposure_count=3
from public.taxonomy_entities t join (values('interval_recognition',60::numeric,80::numeric),('scale_degree_recognition',70::numeric,70::numeric)) v(slug,score,confidence) on v.slug=t.slug
where s.player_id='c3333333-3333-4333-8333-333333333333' and s.skill_id=t.id;
select private.rebuild_player_attributes_v1('c3333333-3333-4333-8333-333333333333','REPLAY',null,'2026-09-29T00:00:00Z');
select extensions.is((select row(a.assessment_status,a.score)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c3333333-3333-4333-8333-333333333333' and t.slug='ear'),'(ESTABLISHED,64.77)','Ear establishes with 2/3 coverage, mean confidence >=60, and two established contributors');
select extensions.is((select row(total_contributor_count,rated_contributor_count,established_contributor_count,coverage_ratio,mean_contributor_confidence)::text from public.attribute_progression_events e join public.taxonomy_entities t on t.id=e.attribute_id where player_id='c3333333-3333-4333-8333-333333333333' and t.slug='ear' order by e.created_at desc limit 1),'(3,2,2,0.666667,75.00)','Ear establishment gates are auditable');
update public.player_skill_states s set assessment_status='ESTIMATED' from public.taxonomy_entities t where s.player_id='c3333333-3333-4333-8333-333333333333' and s.skill_id=t.id and t.slug='scale_degree_recognition';
select private.rebuild_player_attributes_v1('c3333333-3333-4333-8333-333333333333','REPLAY',null,'2026-09-29T00:01:00Z');
select extensions.is((select assessment_status from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c3333333-3333-4333-8333-333333333333' and t.slug='ear'),'ESTIMATED','removing the two-established-contributor gate prevents establishment');

-- PROG-FIX-013 and confidence-weighted broad movement on Precision.
update public.player_skill_states s set assessment_status='ESTABLISHED',visible_level='IV',proficiency_score=62,confidence_score=78
from public.taxonomy_entities t where s.player_id='c2222222-2222-4222-8222-222222222222' and s.skill_id=t.id and t.slug='alternate_picking';
select private.rebuild_player_attributes_v1('c2222222-2222-4222-8222-222222222222','REPLAY',null,'2026-09-29T00:00:00Z');
select extensions.is((select row(a.assessment_status,a.score)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c2222222-2222-4222-8222-222222222222' and t.slug='precision'),'(ESTIMATED,62.00)','PROG-FIX-013 excludes unrated contributors rather than scoring them zero');
update public.player_skill_states s set assessment_status='ESTIMATED',visible_level='III',proficiency_score=40,confidence_score=20
from public.taxonomy_entities t where s.player_id='c2222222-2222-4222-8222-222222222222' and s.skill_id=t.id and t.slug='hybrid_picking';
update public.player_skill_states s set proficiency_score=80,visible_level='V',confidence_score=100
from public.taxonomy_entities t where s.player_id='c2222222-2222-4222-8222-222222222222' and s.skill_id=t.id and t.slug='alternate_picking';
select private.rebuild_player_attributes_v1('c2222222-2222-4222-8222-222222222222','REPLAY',null,'2026-09-29T00:01:00Z');
select extensions.is((select score from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c2222222-2222-4222-8222-222222222222' and t.slug='precision'),68.57::numeric,'ATTR_V1 confidence-weighted aggregate matches exact formula');
create temporary table precision_before as select score from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c2222222-2222-4222-8222-222222222222' and t.slug='precision';
update public.player_skill_states s set proficiency_score=48
from public.taxonomy_entities t where s.player_id='c2222222-2222-4222-8222-222222222222' and s.skill_id=t.id and t.slug='hybrid_picking';
select private.rebuild_player_attributes_v1('c2222222-2222-4222-8222-222222222222','REPLAY',null,'2026-09-29T00:02:00Z');
select extensions.ok((select abs(a.score-b.score)<8 from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id cross join precision_before b where a.player_id='c2222222-2222-4222-8222-222222222222' and t.slug='precision'),'one Skill +8 moves a multi-Skill Attribute by less than 8');
select extensions.ok((select score between 40 and 80 from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c2222222-2222-4222-8222-222222222222' and t.slug='precision'),'Attribute score remains within rated contributor range');

set local role authenticated;
set local request.jwt.claim.sub='c1111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::bigint from public.attribute_progression_events),2::bigint,'owner can read own Attribute events');
select extensions.throws_ok($$update public.player_attribute_states set score=100$$,'42501',null,'ordinary client cannot mutate Attribute projection');
select extensions.throws_ok($$insert into public.attribute_progression_events(player_id,attribute_id,graph_version,attribute_model_version,total_contributor_count,rated_contributor_count,established_contributor_count,coverage_ratio,status_before,status_after,evaluated_at,source_kind,reason_code) select 'c1111111-1111-4111-8111-111111111111',id,'ATTRIBUTE_GRAPH_V1','ATTR_V1',1,0,0,0,'UNASSESSED','UNASSESSED',now(),'REPLAY','NO_RATED_CONTRIBUTORS' from public.taxonomy_entities where kind='ATTRIBUTE' limit 1$$,'42501',null,'ordinary client cannot insert Attribute events');
select extensions.throws_ok($$update public.attribute_progression_events set score_after=100$$,'42501',null,'ordinary client cannot update Attribute events');
select extensions.throws_ok($$delete from public.attribute_progression_events$$,'42501',null,'ordinary client cannot delete Attribute events');
set local request.jwt.claim.sub='c2222222-2222-4222-8222-222222222222';
select extensions.is((select count(*)::bigint from public.attribute_progression_events where player_id='c1111111-1111-4111-8111-111111111111'),0::bigint,'non-owner cannot read Attribute events');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);

select private.rebuild_player_progression_v1('c1111111-1111-4111-8111-111111111111','2026-10-02T00:10:12Z');
select extensions.is((select row(a.assessment_status,a.score)::text from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where player_id='c1111111-1111-4111-8111-111111111111' and t.slug='coordination'),'(ESTIMATED,55.30)','full progression replay reproduces Coordination');
select extensions.is((select row(readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='c1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(LOW,33.18)','Attribute replay composition preserves deterministic readiness');
select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_result_id='c6666666-6666-4666-8666-666666666666'),15::bigint,'full progression replay preserves XP ledger');

delete from auth.users where id='c1111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::bigint from public.attribute_progression_events where player_id='c1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades Attribute events');
select extensions.is((select count(*)::bigint from public.player_attribute_states where player_id='c1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades Attribute projection');

select * from extensions.finish();
rollback;
