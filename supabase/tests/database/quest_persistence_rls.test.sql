begin;

create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_table('public', 'quests', 'quests exists');
select has_table('public', 'quest_skill_roles', 'quest_skill_roles exists');
select has_table('public', 'quest_concepts', 'quest_concepts exists');
select has_table('public', 'quest_contexts', 'quest_contexts exists');
select has_table('public', 'quest_constraints', 'quest_constraints exists');
select has_table('public', 'quest_objective_criteria', 'quest_objective_criteria exists');

insert into auth.users (id, email) values
  ('41111111-1111-4111-8111-111111111111', 'quest-owner@example.com'),
  ('42222222-2222-4222-8222-222222222222', 'quest-other@example.com');

insert into public.quests (
  id, player_id, slug, title, schema_version, quest_type, origin,
  primary_domain_id, purpose_reason, generation_mode, primary_skill_id,
  execution, completion_contract, verification_profile, difficulty_profile,
  declared_overall_demand, rewards, metadata, resolved_snapshot
)
select
  '43333333-3333-4333-8333-333333333333',
  '41111111-1111-4111-8111-111111111111',
  'quest_persistence_test', 'QUEST PERSISTENCE TEST', 1, 'TECHNIQUE', 'TEST_FIXTURE',
  (select id from public.taxonomy_entities where kind = 'DOMAIN' and slug = 'technique'),
  'DEVELOP_SKILL', 'TRAINING',
  (select id from public.taxonomy_entities where kind = 'SKILL' and slug = 'hybrid_picking'),
  '{"estimated_minutes":10,"meter":"4/4"}',
  '{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false}',
  '{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
  '{"declared_overall_demand":"III","computation_status":"ILLUSTRATIVE_PENDING_DIF_001"}',
  'III',
  '{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false}',
  '{}',
  '{"identity":{"schema_version":1}}';

insert into public.quest_skill_roles (quest_id, skill_id, role, ordinal)
select '43333333-3333-4333-8333-333333333333', id, 'SECONDARY_SKILL', 1
from public.taxonomy_entities where kind = 'SKILL' and slug = 'scale_mapping';

insert into public.quest_concepts (quest_id, concept_id, ordinal)
select '43333333-3333-4333-8333-333333333333', id, 1
from public.taxonomy_entities where kind = 'CONCEPT' and slug = 'dorian';

insert into public.quest_constraints (quest_id, constraint_id, ordinal, parameters)
select '43333333-3333-4333-8333-333333333333', id, 1, '{"count":2}'
from public.taxonomy_entities where kind = 'CONSTRAINT' and slug = 'string_count';

insert into public.quest_objective_criteria (quest_id, ordinal, metric, operator, criterion_value, unit)
values ('43333333-3333-4333-8333-333333333333', 1, 'target_tempo', 'EQ', '90', 'bpm');

set constraints all immediate;

set local role anon;
select throws_ok($$select * from public.quests$$, '42501', null, 'anonymous role cannot read private Quests');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '41111111-1111-4111-8111-111111111111';
select results_eq($$select slug from public.quests$$, $$values ('quest_persistence_test'::text)$$, 'owner sees only their immutable Quest');
select throws_ok($$update public.quests set title = 'changed' where id = '43333333-3333-4333-8333-333333333333'$$, '42501', null, 'owner cannot update immutable Quest rows');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '42222222-2222-4222-8222-222222222222';
select results_eq($$select count(*)::bigint from public.quests$$, array[0::bigint], 'non-owner cannot read another Player Quest');
reset role;

select throws_ok(
  $$insert into public.quest_concepts (quest_id, concept_id, ordinal)
      select '43333333-3333-4333-8333-333333333333', id, 2
      from public.taxonomy_entities where kind = 'SKILL' and slug = 'alternate_picking'$$,
  '23514', null, 'taxonomy kind validation rejects a Skill as a Quest Concept'
);

delete from auth.users where id = '41111111-1111-4111-8111-111111111111';
select is((select count(*)::bigint from public.quests where id = '43333333-3333-4333-8333-333333333333'), 0::bigint, 'deleting Auth identity cascades Quest persistence');

select * from finish();
rollback;
