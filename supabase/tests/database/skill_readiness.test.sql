begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public','skill_readiness_events','readiness audit table exists');
select extensions.is((select relrowsecurity from pg_class where oid='public.skill_readiness_events'::regclass),true,'readiness events use RLS');
select extensions.has_function('public','refresh_player_readiness',array[]::text[],'owner refresh exists with no spoofable arguments');
select extensions.function_privs_are('public','refresh_player_readiness',array[]::text[],'authenticated',array['EXECUTE'],'authenticated may request deterministic own refresh');

insert into auth.users(id,email) values
 ('b1111111-1111-4111-8111-111111111111','ready-owner@example.com'),
 ('b2222222-2222-4222-8222-222222222222','ready-other@example.com');

update public.player_skill_states s set assessment_status='ESTABLISHED',visible_level='III',proficiency_score=40,
 confidence_score=70,readiness_status='LOW',readiness_score=24,last_practiced_at='2026-08-01T00:00:00Z'
from public.taxonomy_entities t where t.id=s.skill_id and s.player_id='b1111111-1111-4111-8111-111111111111' and t.slug='alternate_picking';

insert into public.quests(id,player_id,slug,title,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,
 primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,resolved_snapshot)
select 'b3333333-3333-4333-8333-333333333333','b1111111-1111-4111-8111-111111111111','ready_dorian','Ready Dorian',
 'TECHNIQUE','PROG_TEST',d.id,'DEVELOP_SKILL','CUSTOM',p.id,'{}',
 '{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false}',
 '{"allowed_modes":["SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
 '{"model_version":"DIF_V1","dimensions":{"TECHNIQUE":{"applicable":true,"score":56}},"overall":{"score":54}}',
 'III','{"fixed_xp":null,"progression_effects_embedded":false}',
 '{"identity":{"schema_version":1},"difficulty_profile":{"model_version":"DIF_V1"}}'
from public.taxonomy_entities d cross join public.taxonomy_entities p
where d.kind='DOMAIN' and d.slug='technique' and p.kind='SKILL' and p.slug='hybrid_picking';
insert into public.quest_skill_roles(quest_id,skill_id,role,ordinal)
select 'b3333333-3333-4333-8333-333333333333',id,'SECONDARY_SKILL',1 from public.taxonomy_entities where kind='SKILL' and slug='alternate_picking';
insert into public.practice_sessions(id,player_id,quest_id,status,started_at,ended_at) values
 ('b4444444-4444-4444-8444-444444444444','b1111111-1111-4111-8111-111111111111','b3333333-3333-4333-8333-333333333333','ENDED','2026-09-01T00:00:00Z','2026-09-01T00:10:00Z');
insert into public.practice_session_events(session_id,sequence,event_type,occurred_at) values
 ('b4444444-4444-4444-8444-444444444444',1,'START','2026-09-01T00:00:00Z'),
 ('b4444444-4444-4444-8444-444444444444',2,'END','2026-09-01T00:10:00Z');
insert into public.quest_results(id,player_id,quest_id,session_id,quest_schema_version,difficulty_model_version,
 meaningful_attempt,outcome,verification_modes,confidence_summary,finalized_at)
values('b5555555-5555-4555-8555-555555555555','b1111111-1111-4111-8111-111111111111',
 'b3333333-3333-4333-8333-333333333333','b4444444-4444-4444-8444-444444444444',1,'DIF_V1',true,
 'ATTEMPTED','{}','LOW','2026-09-01T00:10:00Z');
update public.quest_results set outcome='CLEARED',verification_modes=array['SESSION'],confidence_summary='MIXED'
where id='b5555555-5555-4555-8555-555555555555';

select extensions.is((select row(readiness_status,readiness_score,proficiency_score,confidence_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(HIGH,55.30,55.30,20.00)','DORIAN Primary is immediately HIGH without changing PROF/CONF values');
select extensions.is((select row(readiness_status,readiness_score,proficiency_score,evidence_count)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='alternate_picking'),'(HIGH,40.00,40.00,0)','rated supporting exposure restores HIGH without proficiency evidence');
select extensions.is((select count(*)::bigint from public.skill_readiness_events where player_id='b1111111-1111-4111-8111-111111111111'),2::bigint,'practice refresh records only changed rated Skills');
select extensions.is((select count(*)::bigint from public.skill_progression_events where source_result_id='b5555555-5555-4555-8555-555555555555'),2::bigint,'readiness integration does not duplicate PROF processing');
select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_result_id='b5555555-5555-4555-8555-555555555555'),15::bigint,'readiness integration leaves XP_V1 intact');

create temporary table invariant_before as select
 (select proficiency_score from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking') proficiency,
 (select confidence_score from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking') confidence,
 (select exposure_count from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking') exposure,
 (select evidence_count from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking') evidence,
 (select practice_xp from public.player_character_states where player_id='b1111111-1111-4111-8111-111111111111') xp,
 (select coalesce(jsonb_agg(to_jsonb(a)-array['created_at','updated_at']::text[] order by attribute_id),'[]'::jsonb) from public.player_attribute_states a where player_id='b1111111-1111-4111-8111-111111111111') attributes;

select extensions.is(private.refresh_player_readiness_v1('b1111111-1111-4111-8111-111111111111','2026-09-08T00:10:00Z','RECENCY_REFRESH'),0::bigint,'exactly seven days remains HIGH and is a no-op');
select extensions.is(private.refresh_player_readiness_v1('b1111111-1111-4111-8111-111111111111','2026-09-08T00:10:00.001Z','RECENCY_REFRESH'),2::bigint,'just over seven days changes both rated Skills');
select extensions.is((select row(readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(MODERATE,44.24)','eight-day-equivalent DORIAN readiness is MODERATE 44.24');
select extensions.is(private.refresh_player_readiness_v1('b1111111-1111-4111-8111-111111111111','2026-10-01T00:10:00Z','RECENCY_REFRESH'),0::bigint,'exactly thirty days remains MODERATE');
select extensions.is(private.refresh_player_readiness_v1('b1111111-1111-4111-8111-111111111111','2026-10-01T00:10:00.001Z','RECENCY_REFRESH'),2::bigint,'just over thirty days becomes LOW');
select extensions.is((select row(readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(LOW,33.18)','31-day-equivalent DORIAN readiness is LOW 33.18');
select extensions.ok((select bool_and(readiness_score<=proficiency_score) from public.player_skill_states where player_id='b1111111-1111-4111-8111-111111111111' and readiness_score is not null),'readiness never exceeds proficiency');
select extensions.is((select row(proficiency,confidence,exposure,evidence,xp)::text from invariant_before),
 (select row(s.proficiency_score,s.confidence_score,s.exposure_count,s.evidence_count,c.practice_xp)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id cross join public.player_character_states c where s.player_id='b1111111-1111-4111-8111-111111111111' and c.player_id=s.player_id and t.slug='hybrid_picking'),
 'time refresh changes no proficiency, confidence, exposure, evidence, or XP');
select extensions.is((select coalesce(jsonb_agg(to_jsonb(a)-array['created_at','updated_at']::text[] order by attribute_id),'[]'::jsonb) from public.player_attribute_states a where player_id='b1111111-1111-4111-8111-111111111111'),(select attributes from invariant_before),'readiness changes no Attributes');
select extensions.is((select row(readiness_status,readiness_score)::text from public.player_skill_states where player_id='b1111111-1111-4111-8111-111111111111' and assessment_status='UNRATED' limit 1),'(UNKNOWN,)','UNRATED remains UNKNOWN/null despite refresh');
select extensions.is(private.refresh_player_readiness_v1('b1111111-1111-4111-8111-111111111111','2026-08-31T23:00:00Z','RECENCY_REFRESH'),2::bigint,'future-practice anomaly clamps age to zero and restores HIGH');

set local role authenticated;
set local request.jwt.claim.sub='b1111111-1111-4111-8111-111111111111';
select extensions.lives_ok($$select public.refresh_player_readiness()$$,'owner can request server-time refresh');
select extensions.throws_ok($$insert into public.skill_readiness_events(player_id,skill_id,readiness_model_version,previous_status,next_status,assessment_status_snapshot,evaluated_at,reason_code,source_kind) values('b1111111-1111-4111-8111-111111111111',(select id from public.taxonomy_entities where kind='SKILL' limit 1),'READY_V1','UNKNOWN','UNKNOWN','UNRATED',now(),'UNRATED_UNKNOWN','RECENCY_REFRESH')$$,'42501',null,'ordinary client cannot insert readiness events');
select extensions.throws_ok($$update public.skill_readiness_events set next_status='LOW'$$,'42501',null,'ordinary client cannot update readiness events');
select extensions.throws_ok($$update public.player_skill_states set readiness_status='LOW'$$,'42501',null,'ordinary client cannot directly set readiness');
set local request.jwt.claim.sub='b2222222-2222-4222-8222-222222222222';
select extensions.is((select count(*)::bigint from public.skill_readiness_events),0::bigint,'non-owner cannot read readiness events');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);

select private.rebuild_player_progression_v1('b1111111-1111-4111-8111-111111111111','2026-10-02T00:10:00Z');
select extensions.is((select row(proficiency_score,confidence_score,exposure_count,evidence_count,readiness_status,readiness_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(55.30,20.00,1,1,LOW,33.18)','trusted replay reproduces PROF, CONF, counters, and READY as-of');
select extensions.is((select readiness_model_version from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where player_id='b1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'READY_V1','replay retains READY_V1 version');

delete from auth.users where id='b1111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::bigint from public.skill_readiness_events where player_id='b1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades readiness events');
select extensions.is((select count(*)::bigint from public.player_skill_states where player_id='b1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades Skill projection');

select * from extensions.finish();
rollback;
