begin;

set local search_path = extensions, public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.ok(
  to_regprocedure('public.save_player_profile_v1(text,text,integer,text,uuid,jsonb)') is not null,
  'atomic Profile save RPC exists'
);
select extensions.ok(
  (select prosecdef from pg_proc where oid = to_regprocedure('public.save_player_profile_v1(text,text,integer,text,uuid,jsonb)')),
  'Profile save is SECURITY DEFINER'
);
select extensions.is(
  (select proconfig from pg_proc where oid = to_regprocedure('public.save_player_profile_v1(text,text,integer,text,uuid,jsonb)')),
  array['search_path=""']::text[],
  'Profile save fixes an empty search path'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.save_player_profile_v1(text,text,integer,text,uuid,jsonb)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.save_player_profile_v1(text,text,integer,text,uuid,jsonb)', 'EXECUTE'),
  'only authenticated application callers can execute Profile save'
);

insert into auth.users (id, email) values
  ('b1111111-1111-4111-8111-111111111111', null),
  ('b2222222-2222-4222-8222-222222222222', null);
update public.player_profiles set onboarding_status = 'COMPLETE', calibration_status = 'SKIPPED'
where player_id in ('b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222');

insert into public.player_goals (id, player_id, objective, priority, is_active) values
  ('b0000000-0000-4000-8000-000000000001', 'b1111111-1111-4111-8111-111111111111', 'Old note', 7, true),
  ('b0000000-0000-4000-8000-000000000002', 'b2222222-2222-4222-8222-222222222222', 'Foreign note', 100, true);

set local role anon;
select extensions.throws_ok(
  $$select public.save_player_profile_v1(null, 'UNSPECIFIED', 20, 'BALANCED', null, '[]')$$,
  '42501', null, 'unauthenticated Profile save is rejected'
);

set local role postgres;
set local role authenticated;
set local request.jwt.claim.sub = 'b1111111-1111-4111-8111-111111111111';

select extensions.lives_ok(
  $$select public.save_player_profile_v1(
    '  Dorian  ', 'EXPERIENCED', 35, 'PUSH_ME',
    (select id from public.taxonomy_entities where slug = 'drop_d'),
    jsonb_build_array(
      jsonb_build_object('id','b0000000-0000-4000-8000-000000000001','kind','OBJECTIVE','objective','Updated note'),
      jsonb_build_object('kind','SKILL','target_id',(select id from public.taxonomy_entities where slug = 'alternate_picking')),
      jsonb_build_object('kind','DOMAIN','target_id',(select id from public.taxonomy_entities where slug = 'technique'))
    ))$$,
  'authenticated owner saves scalar preferences, tuning, and all structured goal kinds'
);

select extensions.results_eq(
  $$select display_name, experience_background, typical_session_minutes, challenge_preference,
      onboarding_status, calibration_status from public.player_profiles$$,
  $$values ('Dorian'::text, 'EXPERIENCED'::text, 35, 'PUSH_ME'::text, 'COMPLETE'::text, 'SKIPPED'::text)$$,
  'scalar fields normalize while onboarding and calibration remain unchanged'
);
select extensions.results_eq(
  $$select t.slug from public.player_tuning_preferences p join public.taxonomy_entities t
      on t.id = p.tuning_context_id where p.is_default$$,
  array['drop_d'::text],
  'valid canonical tuning becomes the single default'
);
select extensions.is(
  (select priority from public.player_goals where id = 'b0000000-0000-4000-8000-000000000001'),
  7,
  'existing goal priority is preserved'
);
select extensions.is(
  (select objective from public.player_goals where id = 'b0000000-0000-4000-8000-000000000001'),
  'Updated note'::text,
  'existing goal identity is preserved on update'
);
select extensions.is(
  (select count(*)::bigint from public.player_goals where player_id = 'b1111111-1111-4111-8111-111111111111' and priority = 100),
  2::bigint,
  'new Skill and Domain goals receive neutral priority 100'
);

select extensions.throws_ok(
  $$select public.save_player_profile_v1('Changed', 'NEW_TO_GUITAR', 10, 'RELAXED', null,
    jsonb_build_array(jsonb_build_object('id','b0000000-0000-4000-8000-000000000002','kind','OBJECTIVE','objective','stolen')))$$,
  '42501', 'goal does not belong to authenticated Player', 'foreign goal UUID is rejected'
);
select extensions.is(
  (select display_name from public.player_profiles), 'Dorian'::text,
  'foreign goal failure rolls the entire save back'
);

select extensions.throws_ok(
  $$select public.save_player_profile_v1(null, 'UNSPECIFIED', 20, 'BALANCED',
    (select id from public.taxonomy_entities where slug = 'alternate_picking'), '[]')$$,
  '23514', 'default tuning must reference an active TUNING Context',
  'wrong taxonomy kind is rejected for default tuning'
);
select extensions.throws_ok(
  $$select public.save_player_profile_v1(null, 'UNSPECIFIED', 20, 'BALANCED', null,
    jsonb_build_array(
      jsonb_build_object('kind','SKILL','target_id',(select id from public.taxonomy_entities where slug = 'alternate_picking')),
      jsonb_build_object('kind','SKILL','target_id',(select id from public.taxonomy_entities where slug = 'alternate_picking'))
    ))$$,
  '23505', 'duplicate Skill goal', 'duplicate structured goals are rejected'
);

select extensions.lives_ok(
  $$select public.save_player_profile_v1('', 'SOME_EXPERIENCE', null, 'BALANCED', null, '[]')$$,
  'empty snapshot clears optional values and deactivates goals'
);
select extensions.ok(
  (select display_name is null and typical_session_minutes is null from public.player_profiles)
  and not exists (select 1 from public.player_tuning_preferences where is_default)
  and not exists (select 1 from public.player_goals where player_id = 'b1111111-1111-4111-8111-111111111111' and is_active),
  'empty display name normalizes, default clears, and omitted goals deactivate'
);
select extensions.is(
  (select count(*)::bigint from public.player_goals where player_id = 'b1111111-1111-4111-8111-111111111111'),
  3::bigint,
  'removed goals remain preserved instead of deleted'
);

set local role postgres;
select extensions.ok(
  exists (select 1 from public.player_skill_states where player_id = 'b1111111-1111-4111-8111-111111111111')
  and exists (select 1 from public.player_character_states where player_id = 'b1111111-1111-4111-8111-111111111111')
  and exists (select 1 from public.player_attribute_states where player_id = 'b1111111-1111-4111-8111-111111111111'),
  'Profile save leaves derived progression structures intact'
);

delete from auth.users where id = 'b1111111-1111-4111-8111-111111111111';
select extensions.is(
  ((select count(*) from public.player_profiles where player_id = 'b1111111-1111-4111-8111-111111111111')
   + (select count(*) from public.player_goals where player_id = 'b1111111-1111-4111-8111-111111111111')
   + (select count(*) from public.player_tuning_preferences where player_id = 'b1111111-1111-4111-8111-111111111111'))::bigint,
  0::bigint,
  'account deletion cascades Profile-owned state'
);

select * from extensions.finish();
rollback;
