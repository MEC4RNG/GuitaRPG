begin;
set local search_path = extensions, public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public','practice_xp_ledger','XP ledger exists');
select extensions.is((select relrowsecurity from pg_class where oid='public.practice_xp_ledger'::regclass),true,'XP ledger RLS enabled');
select extensions.col_is_unique('public','practice_xp_ledger','source_result_id','one Result has at most one normal award');

insert into auth.users(id,email) values
 ('91111111-1111-4111-8111-111111111111','xp-owner@example.com'),
 ('92222222-2222-4222-8222-222222222222','xp-other@example.com');

create temporary table development_baseline(skill_state jsonb, attribute_state jsonb);
insert into development_baseline
select
  (select coalesce(jsonb_agg(to_jsonb(skill) - array['created_at','updated_at']::text[] order by skill.skill_id),'[]'::jsonb)
   from public.player_skill_states skill where skill.player_id='91111111-1111-4111-8111-111111111111'),
  (select coalesce(jsonb_agg(to_jsonb(attribute) - array['created_at','updated_at']::text[] order by attribute.attribute_id),'[]'::jsonb)
   from public.player_attribute_states attribute where attribute.player_id='91111111-1111-4111-8111-111111111111');

insert into public.quests(
 id,player_id,slug,title,schema_version,quest_type,origin,primary_domain_id,purpose_reason,generation_mode,
 primary_skill_id,execution,completion_contract,verification_profile,difficulty_profile,declared_overall_demand,rewards,metadata,resolved_snapshot
) select v.quest_id,'91111111-1111-4111-8111-111111111111',v.slug,v.title,1,'TECHNIQUE','PROG_TEST',
 (select id from public.taxonomy_entities where kind='DOMAIN' and slug='technique'),'DEVELOP_SKILL','CUSTOM',
 (select id from public.taxonomy_entities where kind='SKILL' and slug='hybrid_picking'),'{}',
 jsonb_build_object('attempt_rule','MEANINGFUL_ACTIVITY','minimum_attempt_seconds',60,'clear_rule','ALL_OBJECTIVE_CRITERIA','mastery_claimed',false),
 '{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false}',
 '{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1"}','III',
 '{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false}','{}',
 jsonb_build_object('identity',jsonb_build_object('schema_version',1),'difficulty_profile',jsonb_build_object('model_version','DIF_V1'))
from (values
 ('93333333-3333-4333-8333-333333333331'::uuid,'xp_attempted','XP ATTEMPTED',900),
 ('93333333-3333-4333-8333-333333333332'::uuid,'xp_partial','XP PARTIAL',600),
 ('93333333-3333-4333-8333-333333333333'::uuid,'xp_dorian','XP DORIAN',600),
 ('93333333-3333-4333-8333-333333333334'::uuid,'xp_abandoned','XP ABANDONED',600)
) v(quest_id,slug,title,duration_target);

insert into public.quest_concepts(quest_id,concept_id,ordinal)
select quest.id,concept.id,1
from public.quests quest
cross join public.taxonomy_entities concept
where quest.id::text like '93333333-3333-4333-8333-33333333333%'
  and concept.kind='CONCEPT' and concept.slug='dorian';

insert into public.quest_constraints(quest_id,constraint_id,ordinal,parameters)
select quest.id,constraint_entity.id,1,'{"bpm":90}'::jsonb
from public.quests quest
cross join public.taxonomy_entities constraint_entity
where quest.id::text like '93333333-3333-4333-8333-33333333333%'
  and constraint_entity.kind='CONSTRAINT' and constraint_entity.slug='target_tempo';

insert into public.quest_objective_criteria(quest_id,ordinal,metric,operator,criterion_value,unit)
select v.quest_id,c.ordinal,c.metric,c.operator,
  case when c.metric='practice_duration' then to_jsonb(v.duration_target) else '90'::jsonb end,c.unit
from (values
 ('93333333-3333-4333-8333-333333333331'::uuid,900),
 ('93333333-3333-4333-8333-333333333332'::uuid,600),
 ('93333333-3333-4333-8333-333333333333'::uuid,600),
 ('93333333-3333-4333-8333-333333333334'::uuid,600)
) v(quest_id,duration_target)
cross join (values
 (1::smallint,'practice_duration','GTE','seconds'),
 (2::smallint,'target_tempo','EQ','bpm')
) c(ordinal,metric,operator,unit);
set constraints all immediate;

insert into public.practice_sessions(id,player_id,quest_id,status,started_at,ended_at,created_at) values
 ('94444444-4444-4444-8444-444444444441','91111111-1111-4111-8111-111111111111','93333333-3333-4333-8333-333333333331','ENDED','2026-09-29T10:00:00Z','2026-09-29T10:10:00Z','2026-09-29T10:00:00Z'),
 ('94444444-4444-4444-8444-444444444442','91111111-1111-4111-8111-111111111111','93333333-3333-4333-8333-333333333332','ENDED','2026-09-29T11:00:00Z','2026-09-29T11:10:00Z','2026-09-29T11:00:00Z'),
 ('94444444-4444-4444-8444-444444444443','91111111-1111-4111-8111-111111111111','93333333-3333-4333-8333-333333333333','ENDED','2026-09-29T12:00:00Z','2026-09-29T12:11:12Z','2026-09-29T12:00:00Z'),
 ('94444444-4444-4444-8444-444444444444','91111111-1111-4111-8111-111111111111','93333333-3333-4333-8333-333333333334','ENDED','2026-09-29T13:00:00Z','2026-09-29T13:00:30Z','2026-09-29T13:00:00Z'),
 ('94444444-4444-4444-8444-444444444445','91111111-1111-4111-8111-111111111111','93333333-3333-4333-8333-333333333333','ENDED','2026-09-29T14:00:00Z','2026-09-29T14:01:00Z','2026-09-29T14:00:00Z');

insert into public.practice_session_events(session_id,sequence,event_type,occurred_at) values
 ('94444444-4444-4444-8444-444444444441',1,'START','2026-09-29T10:00:00Z'),
 ('94444444-4444-4444-8444-444444444441',2,'END','2026-09-29T10:10:00Z'),
 ('94444444-4444-4444-8444-444444444442',1,'START','2026-09-29T11:00:00Z'),
 ('94444444-4444-4444-8444-444444444442',2,'END','2026-09-29T11:10:00Z'),
 ('94444444-4444-4444-8444-444444444443',1,'START','2026-09-29T12:00:00Z'),
 ('94444444-4444-4444-8444-444444444443',2,'PAUSE','2026-09-29T12:10:00Z'),
 ('94444444-4444-4444-8444-444444444443',3,'RESUME','2026-09-29T12:11:00Z'),
 ('94444444-4444-4444-8444-444444444443',4,'END','2026-09-29T12:11:12Z'),
 ('94444444-4444-4444-8444-444444444444',1,'START','2026-09-29T13:00:00Z'),
 ('94444444-4444-4444-8444-444444444444',2,'END','2026-09-29T13:00:30Z'),
 ('94444444-4444-4444-8444-444444444445',1,'START','2026-09-29T14:00:00Z'),
 ('94444444-4444-4444-8444-444444444445',2,'END','2026-09-29T14:01:00Z');
insert into public.practice_session_control_events(session_id,sequence,event_type,payload,occurred_at)
values('94444444-4444-4444-8444-444444444443',1,'METRONOME_BPM_SET','{"bpm":90}','2026-09-29T12:05:00Z');

set local role authenticated;
set local request.jwt.claim.sub='91111111-1111-4111-8111-111111111111';
select extensions.throws_ok($$insert into public.practice_xp_ledger(player_id,source_result_id,source_session_id,xp_model_version,character_model_version,eligible_practice_seconds,completed_practice_minutes,outcome,meaningful_attempt,practice_minute_xp,outcome_bonus_xp,total_xp_delta) values('91111111-1111-4111-8111-111111111111',gen_random_uuid(),gen_random_uuid(),'XP_V1','CHAR_V1',60,1,'ATTEMPTED',true,1,1,2)$$,'42501',null,'ordinary client cannot insert XP');
select extensions.throws_ok($$update public.practice_xp_ledger set total_xp_delta=999$$,'42501',null,'ordinary client cannot update XP');
select extensions.throws_ok($$delete from public.practice_xp_ledger$$,'42501',null,'ordinary client cannot delete XP');
select extensions.throws_ok($$update public.player_character_states set practice_xp=999 where player_id='91111111-1111-4111-8111-111111111111'$$,'42501',null,'ordinary client cannot set Character projection');
select extensions.is((select count(*)::bigint from public.practice_xp_ledger),0::bigint,'ENDED Session without Result earns no XP');

select extensions.lives_ok($$select public.finalize_quest_result('94444444-4444-4444-8444-444444444441')$$,'meaningful ATTEMPTED finalizes');
select extensions.lives_ok($$select public.finalize_quest_result('94444444-4444-4444-8444-444444444442')$$,'meaningful PARTIAL finalizes');
select extensions.lives_ok($$select public.finalize_quest_result('94444444-4444-4444-8444-444444444443')$$,'DORIAN-equivalent CLEARED finalizes');
select extensions.lives_ok($$select public.finalize_quest_result('94444444-4444-4444-8444-444444444444')$$,'nonmeaningful Result finalizes');

select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_session_id='94444444-4444-4444-8444-444444444441'),11::bigint,'600-second ATTEMPTED awards 11 XP');
select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_session_id='94444444-4444-4444-8444-444444444442'),13::bigint,'600-second PARTIAL awards 13 XP');
select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_session_id='94444444-4444-4444-8444-444444444443'),15::bigint,'612-second CLEARED awards 15 XP');
select extensions.is((select eligible_practice_seconds from public.practice_xp_ledger where source_session_id='94444444-4444-4444-8444-444444444443'),612::bigint,'paused time is excluded from eligible seconds');
select extensions.is((select total_xp_delta from public.practice_xp_ledger where source_session_id='94444444-4444-4444-8444-444444444444'),0::bigint,'nonmeaningful ABANDONED records zero XP');
select extensions.is((select count(*)::bigint from public.practice_xp_ledger),4::bigint,'each finalized Result produces exactly one ledger row');
select extensions.throws_ok($$select public.finalize_quest_result('94444444-4444-4444-8444-444444444443')$$,'55000','RESULT_ALREADY_FINALIZED','Result retry remains terminal');
select extensions.is((select count(*)::bigint from public.practice_xp_ledger where source_session_id='94444444-4444-4444-8444-444444444443'),1::bigint,'retry cannot duplicate XP');
select extensions.is((select practice_xp from public.player_character_states where player_id='91111111-1111-4111-8111-111111111111'),39::bigint,'Character XP equals ledger sum');
select extensions.is((select total_practice_seconds from public.player_character_states where player_id='91111111-1111-4111-8111-111111111111'),1812::bigint,'practice seconds equal meaningful ledger sum');
select extensions.is((select character_level from public.player_character_states where player_id='91111111-1111-4111-8111-111111111111'),1,'Character Level follows CHAR_V1');
select extensions.is((select count(*)::bigint from public.practice_xp_ledger),4::bigint,'pending Result Session remains without XP');
set local role postgres;

select extensions.is(private.char_v1_level(0),1,'CHAR_V1 Level 1 begins at zero');
select extensions.is(private.char_v1_level(99),1,'CHAR_V1 stays Level 1 below first threshold');
select extensions.is(private.char_v1_level(100),2,'CHAR_V1 reaches Level 2 at threshold');
select extensions.is(private.char_v1_level(400),3,'CHAR_V1 reaches Level 3 at threshold');
select extensions.is(private.char_v1_level(10000),11,'CHAR_V1 crosses multiple thresholds deterministically');

update public.player_character_states set practice_xp=0,character_level=1,total_practice_seconds=0
where player_id='91111111-1111-4111-8111-111111111111';
select private.rebuild_player_character_state('91111111-1111-4111-8111-111111111111');
select extensions.is((select row(practice_xp,total_practice_seconds,character_level)::text from public.player_character_states where player_id='91111111-1111-4111-8111-111111111111'),'(39,1812,1)','trusted recomputation reproduces projection');
select private.award_result_xp_v1((select source_result_id from public.practice_xp_ledger where source_session_id='94444444-4444-4444-8444-444444444443'));
select extensions.is((select count(*)::bigint from public.practice_xp_ledger),4::bigint,'backfill/award path is idempotent');

set local role authenticated;
set local request.jwt.claim.sub='92222222-2222-4222-8222-222222222222';
select extensions.is((select count(*)::bigint from public.practice_xp_ledger),0::bigint,'non-owner cannot read XP ledger');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);
delete from auth.users where id='91111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::bigint from public.practice_xp_ledger where player_id='91111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes XP ledger');
select extensions.is((select count(*)::bigint from public.player_character_states where player_id='91111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Character projection');

select * from extensions.finish();
rollback;
