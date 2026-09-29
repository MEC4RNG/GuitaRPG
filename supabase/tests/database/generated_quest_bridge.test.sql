begin;

create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_function('public', 'persist_generated_quest', array['jsonb'], 'generated Quest persistence RPC exists');

insert into auth.users (id, email) values
  ('71111111-1111-4111-8111-111111111111', 'generated-owner@example.com'),
  ('72222222-2222-4222-8222-222222222222', 'generated-other@example.com');

create temporary table generated_quest_fixture (payload jsonb not null);
insert into generated_quest_fixture values ($json$
{
  "identity":{"id":"73333333-3333-4333-8333-333333333333","slug":"dorian_generated_bridge","title":"Hybrid Picking: Dorian","schema_version":1,"type":"TECHNIQUE","origin":"QST_GEN_V1"},
  "purpose":{"reason":"DEVELOP_SKILL","primary_domain":"technique","generation_mode":"CUSTOM"},
  "execution":{"primary_skill":{"slug":"hybrid_picking","name":"Hybrid Picking","domain":"technique","role":"PRIMARY_SKILL"},"secondary_skills":[{"slug":"scale_mapping","name":"Scale Mapping","domain":"fretboard","role":"SECONDARY_SKILL"},{"slug":"syncopation_control","name":"Syncopation Control","domain":"rhythm","role":"SECONDARY_SKILL"}],"required_techniques":[],"estimated_minutes":10,"meter":"4/4"},
  "completion_contract":{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false},
  "verification_profile":{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false},
  "difficulty_profile":{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1","overall":{"score":54,"level":"III"}},
  "rewards":{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false},
  "metadata":{"generator_version":"QST_GEN_V1","generation_mode":"CUSTOM"},
  "resolved_snapshot":{
    "identity":{"id":"73333333-3333-4333-8333-333333333333","slug":"dorian_generated_bridge","title":"Hybrid Picking: Dorian","schema_version":1,"type":"TECHNIQUE","origin":"QST_GEN_V1"},
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
select throws_ok(
  $$select public.persist_generated_quest((select payload from generated_quest_fixture))$$,
  '42501', null, 'unauthenticated generated Quest persistence is denied'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '71111111-1111-4111-8111-111111111111';
select lives_ok(
  $$select public.persist_generated_quest((select payload from generated_quest_fixture))$$,
  'authenticated owner persists generated Quest'
);
select is(
  (select player_id from public.quests where id = '73333333-3333-4333-8333-333333333333'),
  '71111111-1111-4111-8111-111111111111'::uuid,
  'generated Quest owner derives from auth.uid()'
);
select is(
  (select id::text from public.quests where id = '73333333-3333-4333-8333-333333333333'),
  (select resolved_snapshot -> 'identity' ->> 'id' from public.quests where id = '73333333-3333-4333-8333-333333333333'),
  'durable Quest ID equals resolved snapshot identity'
);
select is(
  (select domain.slug from public.quests quest join public.taxonomy_entities domain on domain.id = quest.primary_domain_id where quest.id = '73333333-3333-4333-8333-333333333333'),
  'technique',
  'Primary Domain resolves correctly'
);
select is(
  (select skill.slug from public.quests quest join public.taxonomy_entities skill on skill.id = quest.primary_skill_id where quest.id = '73333333-3333-4333-8333-333333333333'),
  'hybrid_picking',
  'Primary Skill resolves correctly'
);
select results_eq(
  $$select role, entity.slug, ordinal::integer from public.quest_skill_roles role join public.taxonomy_entities entity on entity.id = role.skill_id where quest_id = '73333333-3333-4333-8333-333333333333' order by role, ordinal$$,
  $$values ('SECONDARY_SKILL'::text, 'scale_mapping'::text, 1), ('SECONDARY_SKILL'::text, 'syncopation_control'::text, 2)$$,
  'secondary Skill roles persist in order'
);
select results_eq(
  $$select entity.slug, ordinal::integer from public.quest_concepts concept join public.taxonomy_entities entity on entity.id = concept.concept_id where quest_id = '73333333-3333-4333-8333-333333333333' order by ordinal$$,
  $$values ('dorian'::text, 1), ('eighth_note_subdivision'::text, 2), ('syncopation'::text, 3)$$,
  'Concepts persist in order'
);
select is((select parameters ->> 'pitch_class' from public.quest_contexts where quest_id = '73333333-3333-4333-8333-333333333333' and role = 'TONAL_CENTER'), 'E', 'tonal-center Context persists');
select results_eq(
  $$select entity.slug, ordinal::integer from public.quest_constraints constraint_row join public.taxonomy_entities entity on entity.id = constraint_row.constraint_id where quest_id = '73333333-3333-4333-8333-333333333333' order by ordinal$$,
  $$values ('string_set'::text, 1), ('fret_range'::text, 2), ('target_tempo'::text, 3)$$,
  'Constraints persist in order'
);
select is((select parameters ->> 'bpm' from public.quest_constraints constraint_row join public.taxonomy_entities entity on entity.id = constraint_row.constraint_id where quest_id = '73333333-3333-4333-8333-333333333333' and entity.slug = 'target_tempo'), '90', 'DORIAN 90 BPM persists');
select results_eq(
  $$select metric, operator, criterion_value, unit from public.quest_objective_criteria where quest_id = '73333333-3333-4333-8333-333333333333' order by ordinal$$,
  $$values ('practice_duration'::text, 'GTE'::text, '600'::jsonb, 'seconds'::text), ('target_tempo'::text, 'EQ'::text, '90'::jsonb, 'bpm'::text), ('constraint_compliance'::text, 'EQ'::text, 'true'::jsonb, 'boolean'::text)$$,
  'Objective criteria persist exactly'
);
select is((select declared_overall_demand from public.quests where id = '73333333-3333-4333-8333-333333333333'), 'III', 'DORIAN generated Quest graph persists');
select ok(not ((select resolved_snapshot from public.quests where id = '73333333-3333-4333-8333-333333333333') ?| array['result','xp','progression']), 'generated Quest embeds no Result or progression fields');

select lives_ok(
  $$select public.start_practice_session('73333333-3333-4333-8333-333333333333')$$,
  'owner starts a Session for the persisted generated Quest'
);
select is((select quest_id from public.practice_sessions where player_id = '71111111-1111-4111-8111-111111111111'), '73333333-3333-4333-8333-333333333333'::uuid, 'Session references exactly the persisted generated Quest');
select is((select resolved_snapshot -> 'difficulty_profile' -> 'overall' ->> 'score' from public.quests where id = '73333333-3333-4333-8333-333333333333'), '54', 'Quest remains immutable after Session start');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '72222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.start_practice_session('73333333-3333-4333-8333-333333333333')$$,
  '42501', null, 'another Player cannot start the generated Quest'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '71111111-1111-4111-8111-111111111111';
select throws_ok(
  $$select public.persist_generated_quest((select payload from generated_quest_fixture))$$,
  '23505', null, 'duplicate generated Quest identity rejects cleanly'
);
select throws_ok(
  $$select public.persist_generated_quest(jsonb_set(jsonb_set((select payload from generated_quest_fixture), '{identity,id}', '"74444444-4444-4444-8444-444444444444"'), '{resolved_snapshot,identity,id}', '"74444444-4444-4444-8444-444444444444"'))$$,
  '23505', null, 'duplicate player slug rejects cleanly'
);
select throws_ok(
  $$select public.persist_generated_quest(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set((select payload from generated_quest_fixture), '{identity,id}', '"75555555-5555-4555-8555-555555555555"'), '{identity,slug}', '"unknown_taxonomy_rollback"'), '{resolved_snapshot,identity,id}', '"75555555-5555-4555-8555-555555555555"'), '{resolved_snapshot,identity,slug}', '"unknown_taxonomy_rollback"'), '{resolved_snapshot,concepts,0,slug}', '"not_a_real_concept"'))$$,
  '23514', null, 'unknown taxonomy rejects the whole generated Quest graph'
);
reset role;

select is((select count(*)::bigint from public.quests where id = '75555555-5555-4555-8555-555555555555'), 0::bigint, 'failed generated write leaves no partial Quest row');

select set_config('request.jwt.claim.sub', '', true);
delete from auth.users where id = '71111111-1111-4111-8111-111111111111';
select is((select count(*)::bigint from public.quests where id = '73333333-3333-4333-8333-333333333333'), 0::bigint, 'account deletion cascades generated Quest');
select is((select count(*)::bigint from public.practice_sessions where quest_id = '73333333-3333-4333-8333-333333333333'), 0::bigint, 'account deletion cascades generated Quest Session');

select * from finish();
rollback;
