begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public','player_quest_journeys','Journey relation exists');
select extensions.has_function('public','ensure_quest_journey',array['uuid'],'legacy Journey ensure RPC exists');
select extensions.has_function('public','save_generated_quest_journey',array['jsonb','text'],'generated Journey save RPC exists');
select extensions.has_function('public','set_quest_journey_stage',array['uuid','text'],'Journey stage RPC exists');
select extensions.has_function('public','transition_quest_journey',array['uuid','text'],'Journey transition RPC exists');
select extensions.ok((select relrowsecurity from pg_class where oid='public.player_quest_journeys'::regclass),'Journey RLS is enabled');
select extensions.ok(not has_table_privilege('authenticated','public.player_quest_journeys','insert'),'authenticated cannot insert Journey rows directly');
select extensions.ok(not has_table_privilege('authenticated','public.player_quest_journeys','update'),'authenticated cannot update Journey rows directly');
select extensions.ok(not has_table_privilege('authenticated','public.player_quest_journeys','delete'),'authenticated cannot delete Journey rows directly');

insert into auth.users(id,email) values
('a6111111-1111-4111-8111-111111111111','journey-owner@example.com'),
('a6222222-2222-4222-8222-222222222222','journey-other@example.com');

create temporary table journey_fixture(payload jsonb not null);
grant select on journey_fixture to authenticated;
insert into journey_fixture values ($json$
{
  "identity":{"id":"a6333333-3333-4333-8333-333333333333","slug":"qst_006_journey","title":"QST-006 Journey","schema_version":1,"type":"TECHNIQUE","origin":"QST_GEN_V1"},
  "purpose":{"reason":"DEVELOP_SKILL","primary_domain":"technique","generation_mode":"QUICK"},
  "execution":{"primary_skill":{"slug":"hybrid_picking","name":"Hybrid Picking","domain":"technique","role":"PRIMARY_SKILL"},"secondary_skills":[],"required_techniques":[],"estimated_minutes":10,"meter":"4/4"},
  "completion_contract":{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false},
  "verification_profile":{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false},
  "difficulty_profile":{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1","overall":{"score":54,"level":"III"}},
  "rewards":{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false},
  "metadata":{"generator_version":"QST_GEN_V1","compatibility_rule_version":"QST_GEN_RULES_V1","template_id":"technique_fluency_v1","generation_mode":"QUICK","seed":"qst-006","player_specific":false},
  "resolved_snapshot":{
    "identity":{"id":"a6333333-3333-4333-8333-333333333333","slug":"qst_006_journey","title":"QST-006 Journey","schema_version":1,"type":"TECHNIQUE","origin":"QST_GEN_V1"},
    "purpose":{"reason":"DEVELOP_SKILL","primary_domain":"technique","generation_mode":"QUICK"},
    "musical_context":{"tuning":null,"tonal_center":null,"style":null,"playing_role":null,"accompaniment":null},
    "execution":{"primary_skill":{"slug":"hybrid_picking","name":"Hybrid Picking","domain":"technique","role":"PRIMARY_SKILL"},"secondary_skills":[],"required_techniques":[],"estimated_minutes":10,"meter":"4/4"},
    "concepts":[{"slug":"dorian","name":"Dorian"}],
    "constraints":[{"slug":"target_tempo","name":"Target Tempo","parameters":{"bpm":90}}],
    "objective":{"kind":"SUSTAINED_PERFORMANCE","summary":"Practice Hybrid Picking.","clear_rule":"ALL_CRITERIA","criteria":[{"metric":"practice_duration","operator":"GTE","value":600,"unit":"seconds"}]},
    "completion_contract":{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false},
    "verification_profile":{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false},
    "difficulty_profile":{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1","overall":{"score":54,"level":"III"}},
    "rewards":{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false},
    "metadata":{"generator_version":"QST_GEN_V1","compatibility_rule_version":"QST_GEN_RULES_V1","template_id":"technique_fluency_v1","generation_mode":"QUICK","seed":"qst-006","player_specific":false}
  }
}
$json$::jsonb);

set local role anon;
select extensions.throws_ok($$select public.save_generated_quest_journey((select payload from journey_fixture),'SAVED')$$,'42501',null,'anon cannot persist a Journey');
set local role postgres;

set local role authenticated;
set local request.jwt.claim.sub='a6111111-1111-4111-8111-111111111111';
set constraints all deferred;
select extensions.lives_ok($$select public.save_generated_quest_journey((select payload from journey_fixture),'SAVED')$$,'owner saves generated Quest Journey');
select extensions.is((select lifecycle_status from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),'SAVED','Save creates SAVED Journey');
select extensions.is((select current_stage from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),'MAP','Save defaults to Map');
select extensions.is((select count(*)::bigint from public.practice_sessions where quest_id='a6333333-3333-4333-8333-333333333333'),0::bigint,'Save creates no Session');
select extensions.lives_ok($$select public.save_generated_quest_journey((select payload from journey_fixture),'SAVED')$$,'exact Save retry succeeds');
select extensions.is((select count(*)::bigint from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),1::bigint,'Save retry creates no duplicate Journey');
select extensions.lives_ok($$select public.save_generated_quest_journey((select payload from journey_fixture),'START')$$,'Start Quest activates existing Journey');
select extensions.is((select lifecycle_status from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),'ACTIVE','Start Quest is ACTIVE');
select extensions.is((select current_stage from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),'MAP','Start Quest preserves Map');
select extensions.is((select count(*)::bigint from public.practice_sessions where quest_id='a6333333-3333-4333-8333-333333333333'),0::bigint,'Start Quest creates no Session');
select extensions.lives_ok($$select public.set_quest_journey_stage('a6333333-3333-4333-8333-333333333333','EXPLORE')$$,'owner changes stage to Explore');
select extensions.is((select current_stage from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),'EXPLORE','Explore persists');
select extensions.lives_ok($$select public.set_quest_journey_stage('a6333333-3333-4333-8333-333333333333','CRAFT')$$,'owner changes stage to Craft');
select extensions.lives_ok($$select public.set_quest_journey_stage('a6333333-3333-4333-8333-333333333333','MAP')$$,'all stages remain revisitable');
select extensions.throws_ok($$select public.set_quest_journey_stage('a6333333-3333-4333-8333-333333333333','MASTER')$$,'22023',null,'invalid stage is rejected');
select extensions.lives_ok($$select public.transition_quest_journey('a6333333-3333-4333-8333-333333333333','CONCLUDE')$$,'owner concludes Journey');
select extensions.lives_ok($$select public.transition_quest_journey('a6333333-3333-4333-8333-333333333333','CONCLUDE')$$,'conclusion retry is idempotent');
select extensions.is((select lifecycle_status from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),'CONCLUDED','Journey is concluded');
select extensions.lives_ok($$select public.transition_quest_journey('a6333333-3333-4333-8333-333333333333','ARCHIVE')$$,'owner archives Journey');
select extensions.is((select archived_from_status from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),'CONCLUDED','archive preserves prior lifecycle');
select extensions.lives_ok($$select public.transition_quest_journey('a6333333-3333-4333-8333-333333333333','UNARCHIVE')$$,'owner restores archived Journey');
select extensions.is((select lifecycle_status from public.player_quest_journeys where quest_id='a6333333-3333-4333-8333-333333333333'),'CONCLUDED','unarchive restores prior lifecycle');
select extensions.lives_ok($$select public.transition_quest_journey('a6333333-3333-4333-8333-333333333333','REOPEN')$$,'owner reopens concluded Journey');
select extensions.lives_ok($$select public.transition_quest_journey('a6333333-3333-4333-8333-333333333333','ABANDON')$$,'owner abandons Journey');
select extensions.lives_ok($$select public.transition_quest_journey('a6333333-3333-4333-8333-333333333333','REOPEN')$$,'owner reopens abandoned Journey');
select extensions.throws_ok($$select public.save_generated_quest_journey(jsonb_set((select payload from journey_fixture),'{resolved_snapshot,identity,title}','"Changed"'),'SAVED')$$,'23505',null,'same UUID with changed immutable snapshot is rejected');
select extensions.is((select count(*)::bigint from public.practice_xp_ledger where player_id='a6111111-1111-4111-8111-111111111111'),0::bigint,'Journey actions award no XP');
set local role postgres;

set local role authenticated;
set local request.jwt.claim.sub='a6222222-2222-4222-8222-222222222222';
select extensions.is((select count(*)::bigint from public.player_quest_journeys),0::bigint,'RLS hides another Player Journey');
select extensions.throws_ok($$select public.ensure_quest_journey('a6333333-3333-4333-8333-333333333333')$$,'42501',null,'another Player cannot ensure owner Journey');
select extensions.throws_ok($$select public.transition_quest_journey('a6333333-3333-4333-8333-333333333333','ARCHIVE')$$,'42501',null,'another Player cannot mutate owner Journey');
set local role postgres;

-- Lazy overlay without Sessions is SAVED/MAP.
set constraints all deferred;
insert into public.quests(id,player_id,slug,title,schema_version,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,metadata,resolved_snapshot)
select 'a6444444-4444-4444-8444-444444444444','a6111111-1111-4111-8111-111111111111','legacy_unattempted','Legacy Unattempted',1,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,metadata,jsonb_set(resolved_snapshot,'{identity,id}','"a6444444-4444-4444-8444-444444444444"') from public.quests where id='a6333333-3333-4333-8333-333333333333';
insert into public.quest_concepts select 'a6444444-4444-4444-8444-444444444444',concept_id,ordinal from public.quest_concepts where quest_id='a6333333-3333-4333-8333-333333333333';
insert into public.quest_constraints select 'a6444444-4444-4444-8444-444444444444',constraint_id,ordinal,parameters from public.quest_constraints where quest_id='a6333333-3333-4333-8333-333333333333';
insert into public.quest_objective_criteria select 'a6444444-4444-4444-8444-444444444444',ordinal,metric,operator,criterion_value,unit from public.quest_objective_criteria where quest_id='a6333333-3333-4333-8333-333333333333';

set local role authenticated;
set local request.jwt.claim.sub='a6111111-1111-4111-8111-111111111111';
select extensions.lives_ok($$select public.ensure_quest_journey('a6444444-4444-4444-8444-444444444444')$$,'legacy unattempted Quest gets lazy Journey');
select extensions.is((select lifecycle_status||'/'||current_stage from public.player_quest_journeys where quest_id='a6444444-4444-4444-8444-444444444444'),'SAVED/MAP','unattempted lazy overlay is SAVED/MAP');
select extensions.lives_ok($$select public.start_practice_session('a6444444-4444-4444-8444-444444444444')$$,'legacy Quest receives an ordinary Session');
set local role postgres;
delete from public.player_quest_journeys where quest_id='a6444444-4444-4444-8444-444444444444';
set local role authenticated;
set local request.jwt.claim.sub='a6111111-1111-4111-8111-111111111111';
select extensions.lives_ok($$select public.ensure_quest_journey('a6444444-4444-4444-8444-444444444444')$$,'attempted legacy Quest gets lazy Journey');
select extensions.is((select lifecycle_status||'/'||current_stage from public.player_quest_journeys where quest_id='a6444444-4444-4444-8444-444444444444'),'ACTIVE/EXPLORE','attempted lazy overlay is ACTIVE/EXPLORE');
select extensions.ok((select opened_at=(select min(started_at) from public.practice_sessions where quest_id='a6444444-4444-4444-8444-444444444444') from public.player_quest_journeys where quest_id='a6444444-4444-4444-8444-444444444444'),'lazy overlay derives truthful first Session time');
select extensions.throws_ok($$delete from public.quests where id='a6444444-4444-4444-8444-444444444444'$$,'23503',null,'attempted Quest deletion guard remains intact');

select * from extensions.finish();
rollback;
