begin;

create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public', 'player_profiles', 'player_profiles exists');
select extensions.has_table('public', 'player_tuning_preferences', 'player_tuning_preferences exists');
select extensions.has_table('public', 'player_setups', 'player_setups exists');
select extensions.has_table('public', 'player_goals', 'player_goals exists');
select extensions.has_table('public', 'player_skill_states', 'player_skill_states exists');
select extensions.has_table('public', 'player_character_states', 'player_character_states exists');
select extensions.has_table('public', 'player_attribute_states', 'player_attribute_states exists');

select extensions.is(
  (
    select count(*)::bigint
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'player_profiles',
        'player_tuning_preferences',
        'player_setups',
        'player_goals',
        'player_skill_states',
        'player_character_states',
        'player_attribute_states'
      )
      and c.relrowsecurity
  ),
  7::bigint,
  'RLS is enabled on all exposed Player tables'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'other@example.com'),
  ('33333333-3333-4333-8333-333333333333', null);

select extensions.is(
  (select count(*)::bigint from public.player_profiles),
  3::bigint,
  'Auth inserts bootstrap one Player profile each'
);

select extensions.is(
  (select count(*)::bigint from public.player_character_states),
  3::bigint,
  'Auth inserts bootstrap one Character state each'
);

select extensions.is(
  (
    select count(*)::bigint
    from public.player_skill_states
    where assessment_status = 'UNRATED'
      and visible_level is null
      and proficiency_score is null
      and confidence_score = 0
      and readiness_status = 'UNKNOWN'
      and readiness_score is null
  ),
  216::bigint,
  'Three Players bootstrap 72 explicit UNRATED Skill states each'
);

select extensions.is(
  (
    select count(*)::bigint
    from public.player_attribute_states
    where assessment_status = 'UNASSESSED'
      and score is null
  ),
  33::bigint,
  'Three Players bootstrap 11 explicit UNASSESSED Attribute states each'
);

set local role anon;

select extensions.throws_ok(
  $$select * from public.player_profiles$$,
  '42501',
  null,
  'unauthenticated anon role cannot read private Player profiles'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select extensions.results_eq(
  $$select count(*)::bigint from public.player_profiles$$,
  array[1::bigint],
  'owner sees only their own profile'
);

select extensions.results_eq(
  $$select practice_xp, character_level, total_practice_seconds
    from public.player_character_states$$,
  $$values (0::bigint, 1::integer, 0::bigint)$$,
  'new Player starts at 0 XP, Character Level 1, and 0 recorded practice seconds'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.player_skill_states$$,
  array[72::bigint],
  'owner sees their 72 Skill states'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.player_attribute_states$$,
  array[11::bigint],
  'owner sees their 11 Attribute states'
);

select extensions.lives_ok(
  $$update public.player_profiles
    set display_name = 'Owner', experience_background = 'EXPERIENCED'
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  'owner can update player-authored profile fields'
);

select extensions.results_eq(
  $$select count(*)::bigint
    from public.player_skill_states
    where assessment_status = 'UNRATED'$$,
  array[72::bigint],
  'self-declared experience does not grant Skill proficiency'
);

select extensions.throws_ok(
  $$update public.player_profiles
    set created_at = now()
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'owner cannot rewrite system timestamp columns'
);

select extensions.lives_ok(
  $$insert into public.player_tuning_preferences (
      player_id,
      tuning_context_id,
      rank,
      is_default
    )
    select
      '11111111-1111-4111-8111-111111111111',
      id,
      1,
      true
    from public.taxonomy_entities
    where kind = 'CONTEXT' and slug = 'dadgad'$$,
  'owner can insert their tuning preference'
);

select extensions.lives_ok(
  $$update public.player_tuning_preferences
    set rank = 2
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  'owner can update their tuning preference'
);

select extensions.throws_ok(
  $$update public.player_tuning_preferences
    set player_id = '22222222-2222-4222-8222-222222222222'
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'owner cannot rewrite tuning ownership'
);

select extensions.throws_ok(
  $$insert into public.player_tuning_preferences (
      player_id,
      tuning_context_id,
      rank,
      is_default
    )
    select
      '22222222-2222-4222-8222-222222222222',
      id,
      1,
      true
    from public.taxonomy_entities
    where kind = 'CONTEXT' and slug = 'standard_tuning'$$,
  '42501',
  null,
  'owner cannot insert tuning state for another Player'
);

select extensions.lives_ok(
  $$delete from public.player_tuning_preferences
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  'owner can delete their tuning preference'
);

select extensions.lives_ok(
  $$insert into public.player_setups (
      player_id,
      label,
      guitar_type,
      string_count,
      default_tuning_context_id,
      is_default
    )
    select
      '11111111-1111-4111-8111-111111111111',
      'Main Guitar',
      'ELECTRIC',
      6,
      id,
      true
    from public.taxonomy_entities
    where kind = 'CONTEXT' and slug = 'standard_tuning'$$,
  'owner can insert their setup'
);

select extensions.lives_ok(
  $$update public.player_setups
    set label = 'Primary Guitar'
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  'owner can update their setup'
);

select extensions.lives_ok(
  $$delete from public.player_setups
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  'owner can delete their setup'
);

select extensions.lives_ok(
  $$insert into public.player_goals (
      player_id,
      skill_id,
      objective,
      priority,
      is_active
    )
    select
      '11111111-1111-4111-8111-111111111111',
      id,
      'Improve alternate picking',
      1,
      true
    from public.taxonomy_entities
    where kind = 'SKILL' and slug = 'alternate_picking'$$,
  'owner can insert their goal'
);

select extensions.lives_ok(
  $$update public.player_goals
    set priority = 2
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  'owner can update their goal'
);

select extensions.lives_ok(
  $$delete from public.player_goals
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  'owner can delete their goal'
);

select extensions.throws_ok(
  $$update public.player_skill_states
    set proficiency_score = 99
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'owner cannot directly mutate derived Skill state'
);

select extensions.throws_ok(
  $$update public.player_character_states
    set practice_xp = 99999
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'owner cannot directly mutate Practice XP'
);

select extensions.throws_ok(
  $$update public.player_attribute_states
    set score = 100
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'owner cannot directly mutate derived Attribute state'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select extensions.results_eq(
  $$select count(*)::bigint
    from public.player_profiles
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  array[0::bigint],
  'non-owner cannot read another Player profile'
);

select extensions.results_eq(
  $$update public.player_profiles
    set display_name = 'Hacked'
    where player_id = '11111111-1111-4111-8111-111111111111'
    returning player_id$$,
  array[]::uuid[],
  'non-owner cannot update another Player profile'
);

select extensions.results_eq(
  $$select count(*)::bigint
    from public.player_skill_states
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  array[0::bigint],
  'non-owner cannot read another Player derived Skill state'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select extensions.results_eq(
  $$select count(*)::bigint from public.player_profiles$$,
  array[1::bigint],
  'anonymous Auth user receives the same owner-isolated Player model'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.player_skill_states$$,
  array[72::bigint],
  'anonymous Auth user receives canonical UNRATED Skill state'
);

reset role;
set local role service_role;

select extensions.lives_ok(
  $$update public.player_character_states
    set practice_xp = 10
    where player_id = '11111111-1111-4111-8111-111111111111'$$,
  'trusted service path may mutate derived Character state'
);

select extensions.throws_ok(
  $$update public.player_skill_states
    set assessment_status = 'ESTABLISHED',
        visible_level = 'III',
        proficiency_score = 52,
        confidence_score = 40,
        readiness_status = 'MODERATE',
        readiness_score = 50
    where player_id = '11111111-1111-4111-8111-111111111111'
      and skill_id = (
        select id from public.taxonomy_entities
        where kind = 'SKILL' and slug = 'alternate_picking'
      )$$,
  '23514',
  null,
  'database rejects ESTABLISHED Skill state below confidence threshold'
);

reset role;

insert into public.player_setups (
  player_id,
  label,
  guitar_type,
  string_count
)
values (
  '11111111-1111-4111-8111-111111111111',
  'Cascade Test',
  'ACOUSTIC',
  6
);

insert into public.player_goals (
  player_id,
  objective
)
values (
  '11111111-1111-4111-8111-111111111111',
  'Cascade test goal'
);

delete from auth.users
where id = '11111111-1111-4111-8111-111111111111';

select extensions.is(
  (
    select
      (select count(*) from public.player_profiles where player_id = '11111111-1111-4111-8111-111111111111')
      + (select count(*) from public.player_setups where player_id = '11111111-1111-4111-8111-111111111111')
      + (select count(*) from public.player_goals where player_id = '11111111-1111-4111-8111-111111111111')
      + (select count(*) from public.player_skill_states where player_id = '11111111-1111-4111-8111-111111111111')
      + (select count(*) from public.player_character_states where player_id = '11111111-1111-4111-8111-111111111111')
      + (select count(*) from public.player_attribute_states where player_id = '11111111-1111-4111-8111-111111111111')
  )::bigint,
  0::bigint,
  'deleting Auth identity cascades Player-owned and derived persistence'
);

select * from extensions.finish();
rollback;
