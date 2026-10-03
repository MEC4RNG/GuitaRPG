begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_function('public','export_player_data_v1',array[]::text[],'versioned Player export RPC exists');
select extensions.function_returns('public','export_player_data_v1',array[]::text[],'jsonb','Player export returns one JSON snapshot');
select extensions.is(
  has_function_privilege('anon','public.export_player_data_v1()','execute'),
  false,
  'anonymous callers cannot execute Player export'
);
select extensions.is(
  has_function_privilege('authenticated','public.export_player_data_v1()','execute'),
  true,
  'authenticated Players may execute Player export'
);

insert into auth.users(id,email,is_anonymous) values
 ('d4000000-0000-4000-8000-000000000001','data004-owner@example.com',false),
 ('d4000000-0000-4000-8000-000000000002','data004-other@example.com',false);
update public.player_profiles set display_name='DATA-004 Owner' where player_id='d4000000-0000-4000-8000-000000000001';
update public.player_profiles set display_name='Other Player' where player_id='d4000000-0000-4000-8000-000000000002';
insert into public.player_goals(player_id,objective,priority)
values ('d4000000-0000-4000-8000-000000000001','Export contract proof',7);

set local role authenticated;
set local request.jwt.claim.sub='d4000000-0000-4000-8000-000000000001';
select extensions.is(
  public.export_player_data_v1()->>'export_version',
  'GUITARPG_PLAYER_EXPORT_V1',
  'export declares the immutable V1 format identifier'
);
select extensions.is(
  public.export_player_data_v1()->'profile'->>'display_name',
  'DATA-004 Owner',
  'export resolves the current owner from auth.uid()'
);
select extensions.is(
  jsonb_array_length(public.export_player_data_v1()->'goals'),
  1,
  'export includes the owner goal graph'
);
select extensions.is(
  (public.export_player_data_v1()->'goals'->0->>'player_id')::uuid,
  'd4000000-0000-4000-8000-000000000001'::uuid,
  'export cannot cross Player ownership'
);
select extensions.is(
  position('Other Player' in public.export_player_data_v1()::text),
  0,
  'distinguishable non-owner data is absent from the complete export JSON'
);
select extensions.ok(
  public.export_player_data_v1() ?& array['profile','preferences','goals','quests','sessions','results','progression'],
  'export contains every required Player application section'
);
select extensions.ok(
  not (public.export_player_data_v1() ? 'skill_progression_baselines')
    and not (public.export_player_data_v1() ? 'progression_recompute_runs'),
  'private recomputation internals are not exported'
);

set local role anon;
select extensions.throws_ok(
  $$select public.export_player_data_v1()$$,
  '42501',
  null,
  'unauthenticated export is rejected'
);

set local role postgres;
select set_config('request.jwt.claim.sub','',true);
select extensions.is(
  (
    select count(*)::bigint
    from pg_constraint c
    join pg_class source on source.oid=c.conrelid
    join pg_namespace source_ns on source_ns.oid=source.relnamespace
    where c.contype='f'
      and c.confrelid='auth.users'::regclass
      and source_ns.nspname in ('public','private')
      and c.confdeltype='c'
  ),
  17::bigint,
  'all 17 direct public/private Player ownership foreign keys cascade from Auth'
);
select extensions.is(
  (
    select count(*)::bigint
    from pg_constraint c
    join pg_class target on target.oid=c.confrelid
    join pg_namespace target_ns on target_ns.oid=target.relnamespace
    where c.contype='f'
      and target_ns.nspname='public'
      and target.relname in ('quests','practice_sessions','quest_results','quest_result_criteria')
      and c.confdeltype<>'c'
  ),
  0::bigint,
  'all dependent Quest, Session, Result, evidence, and progression edges cascade'
);

delete from auth.users where id='d4000000-0000-4000-8000-000000000001';
select extensions.is((select count(*)::bigint from public.player_profiles where player_id='d4000000-0000-4000-8000-000000000001'),0::bigint,'hard Auth deletion removes Profile state');
select extensions.is((select count(*)::bigint from public.player_goals where player_id='d4000000-0000-4000-8000-000000000001'),0::bigint,'hard Auth deletion removes goal state');
select extensions.is((select count(*)::bigint from public.player_skill_states where player_id='d4000000-0000-4000-8000-000000000001'),0::bigint,'hard Auth deletion removes bootstrapped Skill state');
select extensions.is((select count(*)::bigint from public.player_attribute_states where player_id='d4000000-0000-4000-8000-000000000001'),0::bigint,'hard Auth deletion removes bootstrapped Attribute state');
select extensions.is((select count(*)::bigint from public.player_profiles where player_id='d4000000-0000-4000-8000-000000000002'),1::bigint,'another Player remains intact');
select extensions.ok((select count(*)>0 from public.taxonomy_entities),'canonical taxonomy survives Player deletion');

select * from extensions.finish();
rollback;
