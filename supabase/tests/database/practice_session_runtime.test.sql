begin;

create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_table('public', 'practice_sessions', 'practice_sessions exists');
select has_table('public', 'practice_session_events', 'practice_session_events exists');
select has_function('public', 'start_practice_session', array['uuid'], 'start RPC exists');
select has_function('public', 'pause_practice_session', array['uuid'], 'pause RPC exists');
select has_function('public', 'resume_practice_session', array['uuid'], 'resume RPC exists');
select has_function('public', 'end_practice_session', array['uuid'], 'end RPC exists');
select has_function('public', 'practice_session_active_seconds', array['uuid'], 'active-time function exists');
select has_table('public', 'practice_session_control_events', 'SES-002 control telemetry exists');
select has_function('public', 'adjust_practice_session_reps', array['uuid', 'integer'], 'rep RPC exists');
select has_function('public', 'set_practice_session_metronome_bpm', array['uuid', 'integer'], 'BPM RPC exists');
select is((select relrowsecurity from pg_class where oid = 'public.practice_sessions'::regclass), true, 'Session RLS is enabled');
select is((select relrowsecurity from pg_class where oid = 'public.practice_session_events'::regclass), true, 'event RLS is enabled');
select hasnt_column('public', 'practice_sessions', 'outcome', 'Session has no Result outcome');
select hasnt_column('public', 'practice_sessions', 'xp', 'Session has no XP');
select hasnt_column('public', 'practice_sessions', 'proficiency', 'Session has no proficiency');
select hasnt_column('public', 'practice_sessions', 'mastery', 'Session has no mastery');
select has_table('public', 'quest_results', 'later EVD persistence remains separate from Session');

insert into auth.users (id, email) values
  ('51111111-1111-4111-8111-111111111111', 'session-owner@example.com'),
  ('52222222-2222-4222-8222-222222222222', 'session-other@example.com'),
  ('53333333-3333-4333-8333-333333333333', null);

insert into public.quests (
  id, player_id, slug, title, schema_version, quest_type, origin,
  primary_domain_id, purpose_reason, generation_mode, primary_skill_id,
  execution, completion_contract, verification_profile, difficulty_profile,
  declared_overall_demand, rewards, metadata, resolved_snapshot
)
select
  fixture.quest_id, fixture.player_id, fixture.slug, fixture.title, 1, 'TECHNIQUE', 'TEST_FIXTURE',
  (select id from public.taxonomy_entities where kind = 'DOMAIN' and slug = 'technique'),
  'DEVELOP_SKILL', 'CUSTOM',
  (select id from public.taxonomy_entities where kind = 'SKILL' and slug = 'hybrid_picking'),
  '{"estimated_minutes":10,"meter":"4/4"}',
  '{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false}',
  '{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
  '{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1"}',
  'III',
  '{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false}',
  '{}',
  '{"identity":{"schema_version":1},"difficulty_profile":{"model_version":"DIF_V1"}}'
from (values
  ('54444444-4444-4444-8444-444444444441'::uuid, '51111111-1111-4111-8111-111111111111'::uuid, 'dorian_session_owner', 'DORIAN SESSION OWNER'),
  ('54444444-4444-4444-8444-444444444442'::uuid, '52222222-2222-4222-8222-222222222222'::uuid, 'dorian_session_other', 'DORIAN SESSION OTHER'),
  ('54444444-4444-4444-8444-444444444443'::uuid, '53333333-3333-4333-8333-333333333333'::uuid, 'dorian_session_guest', 'DORIAN SESSION GUEST')
) fixture(quest_id, player_id, slug, title);

insert into public.quest_concepts (quest_id, concept_id, ordinal)
select quest.id, entity.id, 1
from public.quests quest
cross join public.taxonomy_entities entity
where quest.id in (
  '54444444-4444-4444-8444-444444444441',
  '54444444-4444-4444-8444-444444444442',
  '54444444-4444-4444-8444-444444444443'
) and entity.kind = 'CONCEPT' and entity.slug = 'dorian';

insert into public.quest_constraints (quest_id, constraint_id, ordinal, parameters)
select quest.id, entity.id, 1, '{"bpm":90}'::jsonb
from public.quests quest
cross join public.taxonomy_entities entity
where quest.id in (
  '54444444-4444-4444-8444-444444444441',
  '54444444-4444-4444-8444-444444444442',
  '54444444-4444-4444-8444-444444444443'
) and entity.kind = 'CONSTRAINT' and entity.slug = 'target_tempo';

insert into public.quest_objective_criteria (quest_id, ordinal, metric, operator, criterion_value, unit)
select id, 1, 'target_tempo', 'EQ', '90', 'bpm'
from public.quests where id in (
  '54444444-4444-4444-8444-444444444441',
  '54444444-4444-4444-8444-444444444442',
  '54444444-4444-4444-8444-444444444443'
);

set constraints all immediate;

set local role anon;
select throws_ok(
  $$select public.start_practice_session('54444444-4444-4444-8444-444444444441')$$,
  '42501', null, 'unauthenticated caller cannot start Session'
);
select throws_ok($$select * from public.practice_sessions$$, '42501', null, 'anonymous role cannot read Sessions');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '51111111-1111-4111-8111-111111111111';
select lives_ok(
  $$select public.start_practice_session('54444444-4444-4444-8444-444444444441')$$,
  'permanent owner starts Session for own Quest'
);
select is((select status from public.practice_sessions limit 1), 'ACTIVE', 'new Session begins ACTIVE');
select is((select event_type from public.practice_session_events order by sequence limit 1), 'START', 'first event is START');
select lives_ok(
  $$select public.adjust_practice_session_reps((select id from public.practice_sessions limit 1), 1)$$,
  'owner may append a positive rep while ACTIVE'
);
select lives_ok(
  $$select public.adjust_practice_session_reps((select id from public.practice_sessions limit 1), -1)$$,
  'owner may correct a previously recorded rep while ACTIVE'
);
select throws_ok(
  $$select public.adjust_practice_session_reps((select id from public.practice_sessions limit 1), -1)$$,
  '23514', null, 'rep count cannot become negative'
);
select lives_ok(
  $$select public.set_practice_session_metronome_bpm((select id from public.practice_sessions limit 1), 90)$$,
  'owner may append a BPM setting while ACTIVE'
);
select throws_ok(
  $$select public.set_practice_session_metronome_bpm((select id from public.practice_sessions limit 1), 29)$$,
  '23514', null, 'BPM lower bound is enforced'
);
select throws_ok(
  $$select public.set_practice_session_metronome_bpm((select id from public.practice_sessions limit 1), 241)$$,
  '23514', null, 'BPM upper bound is enforced'
);
select results_eq(
  $$select sequence from public.practice_session_control_events order by sequence$$,
  $$values (1::integer), (2::integer), (3::integer)$$,
  'control telemetry has deterministic per-Session order'
);
select throws_ok(
  $$insert into public.practice_session_control_events(session_id, sequence, event_type, payload) select id, 99, 'REP_ADJUST', '{"delta":1}' from public.practice_sessions limit 1$$,
  '42501', null, 'client cannot forge control telemetry'
);
select throws_ok(
  $$update public.practice_session_control_events set occurred_at = occurred_at - interval '1 hour'$$,
  '42501', null, 'client cannot rewrite control timestamps'
);
select throws_ok(
  $$delete from public.practice_session_control_events$$,
  '42501', null, 'client cannot delete control telemetry'
);
select throws_ok(
  $$select public.start_practice_session('54444444-4444-4444-8444-444444444442')$$,
  '42501', null, 'owner cannot start Session for another Player Quest'
);
select throws_ok(
  $$update public.practice_sessions set status = 'ENDED'$$,
  '42501', null, 'client cannot forge Session status'
);
select throws_ok(
  $$insert into public.practice_session_events(session_id, sequence, event_type) select id, 99, 'END' from public.practice_sessions limit 1$$,
  '42501', null, 'client cannot forge lifecycle event'
);
select throws_ok(
  $$update public.practice_session_events set occurred_at = occurred_at - interval '1 hour'$$,
  '42501', null, 'client cannot rewrite event timestamp'
);
select throws_ok(
  $$delete from public.practice_session_events$$,
  '42501', null, 'client cannot delete append-only events'
);
select lives_ok(
  $$select public.pause_practice_session((select id from public.practice_sessions order by created_at limit 1))$$,
  'ACTIVE to PAUSED succeeds'
);
select throws_ok(
  $$select public.adjust_practice_session_reps((select id from public.practice_sessions order by created_at limit 1), 1)$$,
  '55000', null, 'control telemetry requires an ACTIVE Session'
);
select throws_ok(
  $$select public.pause_practice_session((select id from public.practice_sessions order by created_at limit 1))$$,
  '55000', null, 'duplicate PAUSE fails'
);
select lives_ok(
  $$select public.resume_practice_session((select id from public.practice_sessions order by created_at limit 1))$$,
  'PAUSED to ACTIVE succeeds'
);
select lives_ok(
  $$select public.end_practice_session((select id from public.practice_sessions order by created_at limit 1))$$,
  'ACTIVE to ENDED succeeds'
);
select throws_ok(
  $$select public.resume_practice_session((select id from public.practice_sessions order by created_at limit 1))$$,
  '55000', null, 'ENDED is terminal'
);
select results_eq(
  $$select event_type from public.practice_session_events order by sequence$$,
  $$values ('START'::text), ('PAUSE'::text), ('RESUME'::text), ('END'::text)$$,
  'lifecycle events preserve deterministic order'
);
select is(
  (select ended_at = (select occurred_at from public.practice_session_events where event_type = 'END') from public.practice_sessions limit 1),
  true,
  'END event and ended_at share one server-authored timestamp'
);
select throws_ok(
  $$delete from public.quests where id = '54444444-4444-4444-8444-444444444441'$$,
  '23503', null, 'ordinary Quest deletion is blocked after a Session exists'
);
select lives_ok(
  $$select public.start_practice_session('54444444-4444-4444-8444-444444444441')$$,
  'one Quest supports multiple Sessions'
);
select lives_ok(
  $$select public.pause_practice_session((select id from public.practice_sessions where status = 'ACTIVE' limit 1))$$,
  'second attempt ACTIVE to PAUSED succeeds'
);
select lives_ok(
  $$select public.end_practice_session((select id from public.practice_sessions where status = 'PAUSED' limit 1))$$,
  'PAUSED to ENDED succeeds'
);
select is((select count(*)::bigint from public.practice_sessions), 2::bigint, 'multiple Sessions retain distinct identities');
select is((select title from public.quests where id = '54444444-4444-4444-8444-444444444441'), 'DORIAN SESSION OWNER', 'ending Sessions does not mutate the Quest');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '52222222-2222-4222-8222-222222222222';
select results_eq($$select count(*)::bigint from public.practice_sessions$$, array[0::bigint], 'non-owner cannot read Session history');
select throws_ok(
  $$select public.resume_practice_session((select id from public.practice_sessions where quest_id = '54444444-4444-4444-8444-444444444441' limit 1))$$,
  '42501', null, 'non-owner cannot transition another Player Session'
);
select throws_ok(
  $$select public.set_practice_session_metronome_bpm((select id from public.practice_sessions where quest_id = '54444444-4444-4444-8444-444444444441' limit 1), 90)$$,
  '42501', null, 'non-owner cannot forge another Player control telemetry'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '53333333-3333-4333-8333-333333333333';
select lives_ok(
  $$select public.start_practice_session('54444444-4444-4444-8444-444444444443')$$,
  'anonymous Auth guest receives normal owner behavior'
);
reset role;

set local role service_role;
select is((select count(*)::bigint from public.practice_sessions), 3::bigint, 'trusted service role can read Session telemetry');
reset role;

insert into public.practice_sessions (
  id, player_id, quest_id, status, started_at, ended_at, created_at
) values (
  '55555555-5555-4555-8555-555555555555',
  '52222222-2222-4222-8222-222222222222',
  '54444444-4444-4444-8444-444444444442',
  'ENDED', '2026-09-28T12:00:00Z', '2026-09-28T12:02:30Z', '2026-09-28T12:00:00Z'
);
insert into public.practice_session_events (
  id, session_id, sequence, event_type, occurred_at
) values
  ('56666666-6666-4666-8666-666666666661', '55555555-5555-4555-8555-555555555555', 1, 'START', '2026-09-28T12:00:00Z'),
  ('56666666-6666-4666-8666-666666666662', '55555555-5555-4555-8555-555555555555', 2, 'PAUSE', '2026-09-28T12:01:00Z'),
  ('56666666-6666-4666-8666-666666666663', '55555555-5555-4555-8555-555555555555', 3, 'RESUME', '2026-09-28T12:02:00Z'),
  ('56666666-6666-4666-8666-666666666664', '55555555-5555-4555-8555-555555555555', 4, 'END', '2026-09-28T12:02:30Z');

set local role authenticated;
set local request.jwt.claim.sub = '52222222-2222-4222-8222-222222222222';
select is(
  public.practice_session_active_seconds('55555555-5555-4555-8555-555555555555'),
  90::bigint,
  'recorded active time deterministically excludes paused interval'
);
reset role;

select set_config('request.jwt.claim.sub', '', true);
delete from auth.users where id = '51111111-1111-4111-8111-111111111111';
select is((select count(*)::bigint from public.practice_sessions where player_id = '51111111-1111-4111-8111-111111111111'), 0::bigint, 'account deletion removes Sessions');
select is((select count(*)::bigint from public.practice_session_control_events), 0::bigint, 'account deletion cascades Session control telemetry');
select is((select count(*)::bigint from public.quests where player_id = '51111111-1111-4111-8111-111111111111'), 0::bigint, 'account deletion removes attempted Quests');

select * from finish();
rollback;
