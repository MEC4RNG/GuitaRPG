begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public','skill_progression_events','Skill event ledger exists');
select extensions.is((select relrowsecurity from pg_class where oid='public.skill_progression_events'::regclass),true,'Skill ledger uses RLS');
select extensions.col_is_unique('public','skill_progression_events',array['source_result_id','skill_id'],'Result and Skill are structurally unique');
select extensions.is(private.prof_v1_level(55.30),'III','PROF_V1 score band is inspectable');
select extensions.is(private.prof_v1_challenge(55,null),'UNKNOWN','unrated challenge is UNKNOWN');
select extensions.is(private.prof_v1_challenge(10,70),'VERY_COMFORTABLE','challenge is derived from pre-Result proficiency');
select extensions.is(private.prof_v1_raw_delta('TARGET','CLEARED'),4::numeric,'target clear coefficient is inspectable');
select extensions.is(private.prof_v1_raw_delta('OVERREACH','ATTEMPTED'),0::numeric,'overreach attempt is not strong negative evidence');

insert into auth.users(id,email) values
 ('a1111111-1111-4111-8111-111111111111','skill-owner@example.com'),
 ('a2222222-2222-4222-8222-222222222222','skill-other@example.com');

insert into public.quests(id,player_id,slug,title,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,
 primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,resolved_snapshot)
select 'a3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','skill_progression','Skill progression',
 'TECHNIQUE','PROG_TEST',d.id,'DEVELOP_SKILL','CUSTOM',p.id,'{}',
 '{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false}',
 '{"allowed_modes":["SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
 '{"model_version":"DIF_V1","dimensions":{"TECHNIQUE":{"applicable":true,"score":56}},"overall":{"score":54}}',
 'III','{"fixed_xp":null,"progression_effects_embedded":false}',
 '{"identity":{"schema_version":1},"difficulty_profile":{"model_version":"DIF_V1"}}'
from public.taxonomy_entities d cross join public.taxonomy_entities p
where d.kind='DOMAIN' and d.slug='technique' and p.kind='SKILL' and p.slug='hybrid_picking';

insert into public.quest_skill_roles(quest_id,skill_id,role,ordinal)
select 'a3333333-3333-4333-8333-333333333333',id,'SECONDARY_SKILL',1
from public.taxonomy_entities where kind='SKILL' and slug='alternate_picking';

insert into public.practice_sessions(id,player_id,quest_id,status,started_at,ended_at) values
 ('a4444444-4444-4444-8444-444444444444','a1111111-1111-4111-8111-111111111111','a3333333-3333-4333-8333-333333333333','ENDED','2026-09-29T10:00:00Z','2026-09-29T10:10:00Z');
insert into public.practice_session_events(session_id,sequence,event_type,occurred_at) values
 ('a4444444-4444-4444-8444-444444444444',1,'START','2026-09-29T10:00:00Z'),
 ('a4444444-4444-4444-8444-444444444444',2,'END','2026-09-29T10:10:00Z');

insert into public.quest_results(id,player_id,quest_id,session_id,quest_schema_version,difficulty_model_version,
 meaningful_attempt,outcome,verification_modes,confidence_summary,finalized_at)
values('a5555555-5555-4555-8555-555555555555','a1111111-1111-4111-8111-111111111111',
 'a3333333-3333-4333-8333-333333333333','a4444444-4444-4444-8444-444444444444',1,'DIF_V1',true,
 'ATTEMPTED','{}','LOW','2026-09-29T10:10:00Z');
update public.quest_results set outcome='CLEARED',verification_modes=array['SESSION'],confidence_summary='MIXED'
where id='a5555555-5555-4555-8555-555555555555';

select extensions.is((select count(*)::bigint from public.skill_progression_events where source_result_id='a5555555-5555-4555-8555-555555555555'),2::bigint,'terminal Result creates one event per relevant Skill');
select extensions.is((select evidence_confidence from public.skill_progression_events where source_result_id='a5555555-5555-4555-8555-555555555555' and skill_role='PRIMARY_SKILL'),'MODERATE','mixed evidence normalizes to MODERATE');
select extensions.is((select demand_score from public.skill_progression_events where source_result_id='a5555555-5555-4555-8555-555555555555' and skill_role='PRIMARY_SKILL'),55.30::numeric,'demand uses 65 percent relevant dimension plus 35 percent overall');
select extensions.is((select row(meaningful_exposure,informative_evidence)::text from public.skill_progression_events where skill_role='PRIMARY_SKILL'),'(t,t)','primary Skill receives exposure and evidence');
select extensions.is((select row(meaningful_exposure,informative_evidence,applied_score_delta)::text from public.skill_progression_events where skill_role='SECONDARY_SKILL'),'(t,f,0.00)','secondary Skill receives exposure only');
select extensions.is((select row(assessment_status,visible_level,proficiency_score,confidence_score)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where s.player_id='a1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(ESTIMATED,III,55.30,20.00)','first Result creates conservative estimate and cannot establish');
select extensions.is((select row(assessment_status,proficiency_score,confidence_score,exposure_count,evidence_count)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where s.player_id='a1111111-1111-4111-8111-111111111111' and t.slug='alternate_picking'),'(UNRATED,,0.00,1,0)','supporting exposure does not fabricate proficiency');
select extensions.is((select count(*)::bigint from public.practice_xp_ledger),1::bigint,'independent XP trigger still awards exactly once');

create temporary table before_rebuild as
select to_jsonb(s)-array['created_at','updated_at']::text[] snapshot from public.player_skill_states s
where player_id='a1111111-1111-4111-8111-111111111111' order by skill_id;
select private.rebuild_player_skill_states_v1('a1111111-1111-4111-8111-111111111111');
select extensions.is(
 (select jsonb_agg(to_jsonb(s)-array['created_at','updated_at']::text[] order by skill_id) from public.player_skill_states s where player_id='a1111111-1111-4111-8111-111111111111'),
 (select jsonb_agg(snapshot) from before_rebuild),'ledger rebuild reproduces Skill projections');

set local role authenticated;
set local request.jwt.claim.sub='a1111111-1111-4111-8111-111111111111';
select extensions.throws_ok($$update public.skill_progression_events set applied_score_delta=8$$,'42501',null,'ordinary client cannot mutate Skill ledger');
select extensions.throws_ok($$update public.player_skill_states set proficiency_score=100$$,'42501',null,'ordinary client cannot mutate Skill projection');
set local request.jwt.claim.sub='a2222222-2222-4222-8222-222222222222';
select extensions.is((select count(*)::bigint from public.skill_progression_events),0::bigint,'non-owner cannot read Skill ledger');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);
delete from auth.users where id='a1111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::bigint from public.skill_progression_events where player_id='a1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades Skill events');
select extensions.is((select count(*)::bigint from public.player_skill_states where player_id='a1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades Skill projection');

select * from extensions.finish();
rollback;
