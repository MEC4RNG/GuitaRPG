begin;

set local search_path = extensions, public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.ok(
  to_regprocedure('public.complete_player_onboarding(text,integer,text,text,uuid,text)') is not null,
  'atomic onboarding completion RPC exists'
);

select extensions.ok(
  (select prosecdef from pg_proc where oid = to_regprocedure('public.complete_player_onboarding(text,integer,text,text,uuid,text)')),
  'onboarding RPC is SECURITY DEFINER'
);

select extensions.is(
  (select proconfig from pg_proc where oid = to_regprocedure('public.complete_player_onboarding(text,integer,text,text,uuid,text)')),
  array['search_path=""']::text[],
  'onboarding RPC fixes an empty search path'
);

select extensions.ok(
  not has_function_privilege('anon', 'public.complete_player_onboarding(text,integer,text,text,uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.complete_player_onboarding(text,integer,text,text,uuid,text)', 'EXECUTE'),
  'only authenticated application callers receive RPC execution authority'
);

select extensions.ok(
  not has_column_privilege('authenticated', 'public.player_tuning_preferences', 'player_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.player_tuning_preferences', 'tuning_context_id', 'UPDATE'),
  'direct tuning key UPDATE privileges remain narrow'
);

insert into auth.users (id, email)
values
  ('a1111111-1111-4111-8111-111111111111', null),
  ('a2222222-2222-4222-8222-222222222222', 'permanent-onboarding@example.com');

create temporary table onboarding_derived_baseline (
  player_id uuid primary key,
  skills jsonb not null,
  character jsonb not null,
  attributes jsonb not null
);

insert into onboarding_derived_baseline
select
  u.id,
  (select jsonb_agg(to_jsonb(s) - 'updated_at' order by s.skill_id) from public.player_skill_states s where s.player_id = u.id),
  (select to_jsonb(c) - 'updated_at' from public.player_character_states c where c.player_id = u.id),
  (select jsonb_agg(to_jsonb(a) - 'updated_at' order by a.attribute_id) from public.player_attribute_states a where a.player_id = u.id)
from auth.users u
where u.id in ('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222');

set local role anon;

select extensions.throws_ok(
  $$select public.complete_player_onboarding('UNSPECIFIED', 20, 'BALANCED', 'SKIPPED',
      (select id from public.taxonomy_entities where slug = 'standard_tuning'), null)$$,
  '42501',
  null,
  'unauthenticated caller cannot invoke onboarding completion'
);

set local role postgres;
set local role authenticated;
set local request.jwt.claim.sub = 'a1111111-1111-4111-8111-111111111111';

select extensions.lives_ok(
  $$select public.complete_player_onboarding('SOME_EXPERIENCE', 25, 'BALANCED', 'SKIPPED',
      (select id from public.taxonomy_entities where slug = 'standard_tuning'), 'Improve timing')$$,
  'anonymous authenticated Player completes onboarding with Standard Tuning'
);

select extensions.results_eq(
  $$select onboarding_status, experience_background, typical_session_minutes,
      challenge_preference, calibration_status from public.player_profiles$$,
  $$values ('COMPLETE'::text, 'SOME_EXPERIENCE'::text, 25, 'BALANCED'::text, 'SKIPPED'::text)$$,
  'RPC persists the accepted authored profile fields and COMPLETE state'
);

select extensions.results_eq(
  $$select t.slug, p.rank, p.is_default
    from public.player_tuning_preferences p
    join public.taxonomy_entities t on t.id = p.tuning_context_id$$,
  $$values ('standard_tuning'::text, 1, true)$$,
  'server-derived owner receives the selected default tuning'
);

select extensions.lives_ok(
  $$select public.complete_player_onboarding('SOME_EXPERIENCE', 25, 'BALANCED', 'SKIPPED',
      (select id from public.taxonomy_entities where slug = 'standard_tuning'), 'Improve timing')$$,
  'identical onboarding retry succeeds'
);

select extensions.results_eq(
  $$select
      (select count(*) from public.player_tuning_preferences)::bigint,
      (select count(*) from public.player_goals where objective = 'Improve timing')::bigint$$,
  $$values (1::bigint, 1::bigint)$$,
  'identical retry duplicates neither tuning nor goal'
);

select extensions.lives_ok(
  $$select public.complete_player_onboarding('SOME_EXPERIENCE', 25, 'BALANCED', 'SKIPPED',
      (select id from public.taxonomy_entities where slug = 'drop_d'), 'Improve timing')$$,
  'retry may change the selected tuning'
);

select extensions.results_eq(
  $$select count(*)::bigint from public.player_tuning_preferences where is_default$$,
  array[1::bigint],
  'changing tuning leaves exactly one default'
);

select extensions.results_eq(
  $$select t.slug from public.player_tuning_preferences p
    join public.taxonomy_entities t on t.id = p.tuning_context_id where p.is_default$$,
  array['drop_d'::text],
  'newly selected tuning becomes the default'
);

select extensions.throws_ok(
  $$select public.complete_player_onboarding('EXPERIENCED', 30, 'PUSH_ME', 'IN_PROGRESS',
      (select id from public.taxonomy_entities where kind = 'SKILL' limit 1), null)$$,
  '23514',
  'tuning_context_id must reference an active TUNING Context taxonomy entity',
  'non-TUNING taxonomy entity is rejected'
);

select extensions.results_eq(
  $$select onboarding_status, experience_background from public.player_profiles$$,
  $$values ('COMPLETE'::text, 'SOME_EXPERIENCE'::text)$$,
  'failed completion is atomic and does not partially update the profile'
);

set local role postgres;
set local role authenticated;
set local request.jwt.claim.sub = 'a2222222-2222-4222-8222-222222222222';

select extensions.lives_ok(
  $$select public.complete_player_onboarding('NEW_TO_GUITAR', 15, 'RELAXED', 'SKIPPED',
      (select id from public.taxonomy_entities where slug = 'dadgad'), null)$$,
  'permanent authenticated Player uses the same completion boundary'
);

set local role postgres;

select extensions.is(
  (select count(*)::bigint from public.player_tuning_preferences where player_id = 'a1111111-1111-4111-8111-111111111111' and is_default),
  1::bigint,
  'Player B completion cannot alter Player A default tuning'
);

select extensions.is(
  (select count(*)::bigint from public.player_goals where player_id = 'a2222222-2222-4222-8222-222222222222'),
  0::bigint,
  'empty optional goal creates no authored row'
);

select extensions.ok(
  not exists (
    select 1 from onboarding_derived_baseline b
    where b.skills is distinct from (select jsonb_agg(to_jsonb(s) - 'updated_at' order by s.skill_id) from public.player_skill_states s where s.player_id = b.player_id)
       or b.character is distinct from (select to_jsonb(c) - 'updated_at' from public.player_character_states c where c.player_id = b.player_id)
       or b.attributes is distinct from (select jsonb_agg(to_jsonb(a) - 'updated_at' order by a.attribute_id) from public.player_attribute_states a where a.player_id = b.player_id)
  ),
  'onboarding leaves all derived Skill, Character, and Attribute state unchanged'
);

delete from auth.users where id = 'a1111111-1111-4111-8111-111111111111';

select extensions.is(
  (
    (select count(*) from public.player_profiles where player_id = 'a1111111-1111-4111-8111-111111111111')
    + (select count(*) from public.player_tuning_preferences where player_id = 'a1111111-1111-4111-8111-111111111111')
    + (select count(*) from public.player_goals where player_id = 'a1111111-1111-4111-8111-111111111111')
  )::bigint,
  0::bigint,
  'Auth deletion still cascades authored onboarding data'
);

select * from extensions.finish();
rollback;
