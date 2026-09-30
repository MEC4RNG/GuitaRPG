begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

insert into auth.users(id,email) values
 ('f1111111-1111-4111-8111-111111111111','rel004-owner@example.com'),
 ('f2222222-2222-4222-8222-222222222222','rel004-other@example.com');

create temporary table adaptive_training_fixture(payload jsonb not null);
grant select on adaptive_training_fixture to authenticated;
insert into adaptive_training_fixture values ($json$
{
  "identity":{"id":"f3333333-3333-4333-8333-333333333333","slug":"rel004_adaptive_hybrid","title":"Hybrid Picking: Adaptive Training","schema_version":1,"type":"TECHNIQUE","origin":"QST_GEN_V1"},
  "purpose":{"reason":"DEVELOP_SKILL","primary_domain":"technique","generation_mode":"TRAINING"},
  "execution":{"primary_skill":{"slug":"hybrid_picking","name":"Hybrid Picking","domain":"technique","role":"PRIMARY_SKILL"},"secondary_skills":[],"required_techniques":[],"estimated_minutes":10,"meter":"4/4"},
  "completion_contract":{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false},
  "verification_profile":{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false},
  "difficulty_profile":{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1","dimensions":{"TECHNIQUE":{"applicable":true,"score":56}},"overall":{"score":54,"level":"III"}},
  "rewards":{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false},
  "metadata":{"generator_version":"QST_GEN_V1","compatibility_rule_version":"QST_GEN_RULES_V1","template_id":"execution_grid_v1","generation_mode":"TRAINING","seed":"rel004","player_specific":true,
    "training_recommendation":{"materialization_model_version":"TRN_MAT_V1","candidate_model_version":"TRN_CAND_V1","scoring_model_version":"TRN_SCORE_V1","candidate_key":"TRN_CAND_V1:hybrid_picking","evaluated_at":"2026-09-30T12:00:00.000Z","semantic_rank":1,"recommendation_priority_score":47.36,"selection_mode":"UNIQUE_TOP_ACCEPTED","components":[{"key":"INTENT_NEED","points":28,"max_points":30,"explanation_codes":["INTENT_DEVELOPMENT"]}]},
    "training_adaptation":{"adaptation_model_version":"TRN_ADAPT_V1","challenge_target_version":"TRN_CHALLENGE_TARGET_V1","variant_catalog_version":"TRN_VARIANTS_V1","challenge_preference":"CHALLENGE","preference_applied":true,"fit":"EXACT_PREFERRED_BAND","selected_variant_key":"HIGH","personal_difficulty":{"status":"PROVISIONAL","personal_level":"IV","uncertainty":"MODERATE","primary_gap":25},"context_novelty":{"status":"UNKNOWN","source":"EXPLICIT_SNAPSHOT","context_keys":["tuning:standard_tuning"]},"evaluated_variants":[{"variant_key":"LOW","absolute_level":"II","absolute_score":32,"personal_status":"PROVISIONAL","personal_level":"II","uncertainty":"MODERATE","primary_gap":-23.3},{"variant_key":"BASE","absolute_level":"III","absolute_score":54,"personal_status":"PROVISIONAL","personal_level":"III","uncertainty":"MODERATE","primary_gap":-1.3},{"variant_key":"HIGH","absolute_level":"IV","absolute_score":80.3,"personal_status":"PROVISIONAL","personal_level":"IV","uncertainty":"MODERATE","primary_gap":25},{"variant_key":"MAX","absolute_level":"V","absolute_score":95,"personal_status":"PROVISIONAL","personal_level":"V","uncertainty":"MODERATE","primary_gap":39.7}]}
  },
  "resolved_snapshot":{
    "identity":{"id":"f3333333-3333-4333-8333-333333333333","slug":"rel004_adaptive_hybrid","title":"Hybrid Picking: Adaptive Training","schema_version":1,"type":"TECHNIQUE","origin":"QST_GEN_V1"},
    "purpose":{"reason":"DEVELOP_SKILL","primary_domain":"technique","generation_mode":"TRAINING"},
    "musical_context":{"tuning":{"slug":"standard_tuning","name":"Standard Tuning"},"tonal_center":null,"style":null,"playing_role":null,"accompaniment":null},
    "execution":{"primary_skill":{"slug":"hybrid_picking","name":"Hybrid Picking","domain":"technique","role":"PRIMARY_SKILL"},"secondary_skills":[],"required_techniques":[],"estimated_minutes":10,"meter":"4/4"},
    "concepts":[{"slug":"eighth_note_subdivision","name":"Eighth-Note Subdivision"}],
    "constraints":[{"slug":"string_set","name":"String Set","parameters":{"strings":[1,2,3,4,5,6]}},{"slug":"target_tempo","name":"Target Tempo","parameters":{"bpm":140}}],
    "objective":{"kind":"SUSTAINED_PERFORMANCE","summary":"Practice Hybrid Picking under the resolved constraints.","clear_rule":"ALL_CRITERIA","criteria":[{"metric":"practice_duration","operator":"GTE","value":600,"unit":"seconds"},{"metric":"target_tempo","operator":"EQ","value":140,"unit":"bpm"},{"metric":"constraint_compliance","operator":"EQ","value":true,"unit":"boolean"}]},
    "completion_contract":{"attempt_rule":"MEANINGFUL_ACTIVITY","minimum_attempt_seconds":60,"clear_rule":"ALL_OBJECTIVE_CRITERIA","mastery_claimed":false},
    "verification_profile":{"allowed_modes":["SELF","SESSION"],"recommended_mode":"SESSION","verification_required_for_clear":false},
    "difficulty_profile":{"declared_overall_demand":"III","computation_status":"COMPUTED","model_version":"DIF_V1","dimensions":{"TECHNIQUE":{"applicable":true,"score":56}},"overall":{"score":54,"level":"III"}},
    "rewards":{"policy":"STANDARD_PRACTICE","fixed_xp":null,"progression_effects_embedded":false},
    "metadata":{"generator_version":"QST_GEN_V1","compatibility_rule_version":"QST_GEN_RULES_V1","template_id":"execution_grid_v1","generation_mode":"TRAINING","seed":"rel004","player_specific":true,
      "training_recommendation":{"materialization_model_version":"TRN_MAT_V1","candidate_model_version":"TRN_CAND_V1","scoring_model_version":"TRN_SCORE_V1","candidate_key":"TRN_CAND_V1:hybrid_picking","evaluated_at":"2026-09-30T12:00:00.000Z","semantic_rank":1,"recommendation_priority_score":47.36,"selection_mode":"UNIQUE_TOP_ACCEPTED","components":[{"key":"INTENT_NEED","points":28,"max_points":30,"explanation_codes":["INTENT_DEVELOPMENT"]}]},
      "training_adaptation":{"adaptation_model_version":"TRN_ADAPT_V1","challenge_target_version":"TRN_CHALLENGE_TARGET_V1","variant_catalog_version":"TRN_VARIANTS_V1","challenge_preference":"CHALLENGE","preference_applied":true,"fit":"EXACT_PREFERRED_BAND","selected_variant_key":"HIGH","personal_difficulty":{"status":"PROVISIONAL","personal_level":"IV","uncertainty":"MODERATE","primary_gap":25},"context_novelty":{"status":"UNKNOWN","source":"EXPLICIT_SNAPSHOT","context_keys":["tuning:standard_tuning"]},"evaluated_variants":[{"variant_key":"LOW","absolute_level":"II","absolute_score":32,"personal_status":"PROVISIONAL","personal_level":"II","uncertainty":"MODERATE","primary_gap":-23.3},{"variant_key":"BASE","absolute_level":"III","absolute_score":54,"personal_status":"PROVISIONAL","personal_level":"III","uncertainty":"MODERATE","primary_gap":-1.3},{"variant_key":"HIGH","absolute_level":"IV","absolute_score":80.3,"personal_status":"PROVISIONAL","personal_level":"IV","uncertainty":"MODERATE","primary_gap":25},{"variant_key":"MAX","absolute_level":"V","absolute_score":95,"personal_status":"PROVISIONAL","personal_level":"V","uncertainty":"MODERATE","primary_gap":39.7}]}
    }
  }
}
$json$::jsonb);

set local role anon;
select extensions.throws_ok($$select public.persist_generated_quest((select payload from adaptive_training_fixture))$$,'42501',null,'unauthenticated adaptive Training persistence is denied');

set local role authenticated;
set local request.jwt.claim.sub='f1111111-1111-4111-8111-111111111111';
set constraints all deferred;
select extensions.lives_ok($$select public.persist_generated_quest((select payload from adaptive_training_fixture))$$,'owner persists canonical adaptive Training Quest');
select extensions.is((select generation_mode from public.quests where id='f3333333-3333-4333-8333-333333333333'),'TRAINING','durable Quest mode is TRAINING');
select extensions.is((select player_id from public.quests where id='f3333333-3333-4333-8333-333333333333'),'f1111111-1111-4111-8111-111111111111'::uuid,'ownership derives from auth.uid');
select extensions.is((select metadata->'training_recommendation'->>'materialization_model_version' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'TRN_MAT_V1','recommendation materializer version persists');
select extensions.is((select metadata->'training_recommendation'->>'candidate_model_version' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'TRN_CAND_V1','candidate version persists');
select extensions.is((select metadata->'training_recommendation'->>'scoring_model_version' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'TRN_SCORE_V1','scoring version persists');
select extensions.is((select metadata->'training_recommendation'->>'recommendation_priority_score' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'47.36','priority score persists');
select extensions.is((select metadata->'training_adaptation'->>'adaptation_model_version' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'TRN_ADAPT_V1','adaptation version persists');
select extensions.is((select metadata->'training_adaptation'->>'challenge_target_version' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'TRN_CHALLENGE_TARGET_V1','challenge policy version persists');
select extensions.is((select metadata->'training_adaptation'->>'variant_catalog_version' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'TRN_VARIANTS_V1','variant catalog version persists');
select extensions.is((select metadata->'training_adaptation'->>'challenge_preference' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'CHALLENGE','challenge preference persists');
select extensions.is((select metadata->'training_adaptation'->>'fit' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'EXACT_PREFERRED_BAND','fit persists');
select extensions.is((select metadata->'training_adaptation'->>'selected_variant_key' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'HIGH','selected variant persists');
select extensions.is((select jsonb_array_length(metadata->'training_adaptation'->'evaluated_variants') from public.quests where id='f3333333-3333-4333-8333-333333333333'),4,'all evaluated variant summaries persist');
select extensions.is((select metadata->'training_adaptation'->'personal_difficulty'->>'personal_level' from public.quests where id='f3333333-3333-4333-8333-333333333333'),'IV','personal difficulty snapshot persists');
select extensions.lives_ok($$select public.start_practice_session('f3333333-3333-4333-8333-333333333333')$$,'owner starts ordinary Session');
set local role postgres;

create temporary table adaptive_snapshot as select metadata,resolved_snapshot from public.quests where id='f3333333-3333-4333-8333-333333333333';
update public.practice_sessions set status='ENDED',started_at='2026-09-30T12:00:00Z',ended_at='2026-09-30T12:10:12Z' where quest_id='f3333333-3333-4333-8333-333333333333';
update public.practice_session_events set occurred_at='2026-09-30T12:00:00Z' where session_id=(select id from public.practice_sessions where quest_id='f3333333-3333-4333-8333-333333333333') and event_type='START';
insert into public.practice_session_events(session_id,sequence,event_type,occurred_at)
select id,2,'END','2026-09-30T12:10:12Z' from public.practice_sessions where quest_id='f3333333-3333-4333-8333-333333333333';
insert into public.practice_session_control_events(session_id,sequence,event_type,payload,occurred_at)
select id,1,'METRONOME_BPM_SET','{"bpm":140}','2026-09-30T12:05:00Z' from public.practice_sessions where quest_id='f3333333-3333-4333-8333-333333333333';

set local role authenticated;
set local request.jwt.claim.sub='f2222222-2222-4222-8222-222222222222';
select extensions.throws_ok($$select public.start_practice_session('f3333333-3333-4333-8333-333333333333')$$,'42501',null,'non-owner cannot start adaptive Training Session');
set local request.jwt.claim.sub='f1111111-1111-4111-8111-111111111111';
select extensions.throws_ok($$update public.player_skill_states set proficiency_score=100$$,'42501',null,'browser owner cannot mutate progression directly');
select extensions.lives_ok($$select public.finalize_quest_result((select id from public.practice_sessions where quest_id='f3333333-3333-4333-8333-333333333333'),'[{"ordinal":3,"observed_value":true}]','GOOD_CHALLENGE','REL-004')$$,'adaptive Training uses ordinary Result finalization');
set local role postgres;
select set_config('request.jwt.claim.sub','',true);

select extensions.is((select row(meaningful_attempt,outcome)::text from public.quest_results r join public.practice_sessions s on s.id=r.session_id where s.quest_id='f3333333-3333-4333-8333-333333333333'),'(t,CLEARED)','meaningful Training Result clears through ordinary evidence rules');
select extensions.is((select total_xp_delta from public.practice_xp_ledger x join public.quest_results r on r.id=x.source_result_id join public.practice_sessions s on s.id=r.session_id where s.quest_id='f3333333-3333-4333-8333-333333333333'),15::bigint,'ordinary XP_V1 awards 15 XP without Training bonus');
select extensions.is((select row(assessment_status,visible_level,proficiency_score,confidence_score,readiness_status,exposure_count,evidence_count)::text from public.player_skill_states s join public.taxonomy_entities t on t.id=s.skill_id where s.player_id='f1111111-1111-4111-8111-111111111111' and t.slug='hybrid_picking'),'(ESTIMATED,III,55.30,20.00,HIGH,1,1)','ordinary PROF CONF and READY models update Primary Skill');
select extensions.is((select count(*) from public.player_attribute_states a join public.taxonomy_entities t on t.id=a.attribute_id where a.player_id='f1111111-1111-4111-8111-111111111111' and t.slug in ('coordination','precision') and a.assessment_status='ESTIMATED' and a.score=55.30),2::bigint,'ordinary ATTR_V1 derives affected Attributes');
select extensions.is((select metadata from adaptive_snapshot),(select metadata from public.quests where id='f3333333-3333-4333-8333-333333333333'),'Result progression does not rewrite adaptive metadata');
select extensions.is((select resolved_snapshot from adaptive_snapshot),(select resolved_snapshot from public.quests where id='f3333333-3333-4333-8333-333333333333'),'Result progression does not rewrite historical Quest snapshot');

delete from auth.users where id='f1111111-1111-4111-8111-111111111111';
select extensions.is((select count(*) from public.quests where id='f3333333-3333-4333-8333-333333333333'),0::bigint,'account deletion cascades adaptive Training Quest');
select extensions.is((select count(*) from public.practice_sessions where quest_id='f3333333-3333-4333-8333-333333333333'),0::bigint,'account deletion cascades Training Session');
select extensions.is((select count(*) from public.quest_results r join public.practice_sessions s on s.id=r.session_id where s.quest_id='f3333333-3333-4333-8333-333333333333'),0::bigint,'account deletion leaves no adaptive Result orphan');
select extensions.is((select count(*) from public.practice_xp_ledger where player_id='f1111111-1111-4111-8111-111111111111'),0::bigint,'account deletion cascades Training progression');

select * from extensions.finish();
rollback;
