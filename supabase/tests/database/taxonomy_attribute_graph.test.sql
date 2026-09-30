begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.is((select count(*)::bigint from public.taxonomy_entities),216::bigint,'TAX-004 changes no canonical entity rows');
select extensions.is((select count(*)::bigint from public.taxonomy_relationships where relationship_type='BELONGS_TO'),72::bigint,'all 72 BELONGS_TO edges remain unchanged');
select extensions.is((select count(*)::bigint from public.taxonomy_relationships where relationship_type='AFFECTS'),141::bigint,'ATTRIBUTE_GRAPH_V1 contains 141 AFFECTS edges');
select extensions.is((select count(*)::bigint from public.taxonomy_relationships),213::bigint,'only relationship count increases');
select extensions.is((select count(*)::bigint from public.taxonomy_entities s where s.kind='SKILL' and s.lifecycle='ACTIVE' and exists(select 1 from public.taxonomy_relationships r where r.relationship_type='AFFECTS' and r.source_entity_id=s.id)),72::bigint,'all active Skills have AFFECTS coverage');
select extensions.is((select count(*)::bigint from public.taxonomy_entities a where a.kind='ATTRIBUTE' and a.lifecycle='ACTIVE' and exists(select 1 from public.taxonomy_relationships r where r.relationship_type='AFFECTS' and r.target_entity_id=a.id)),11::bigint,'all Attributes have contributors');
select extensions.is((select count(*)::bigint from public.taxonomy_relationships r join public.taxonomy_entities s on s.id=r.source_entity_id join public.taxonomy_entities a on a.id=r.target_entity_id where r.relationship_type='AFFECTS' and (s.kind<>'SKILL' or a.kind<>'ATTRIBUTE')),0::bigint,'all AFFECTS endpoints are Skill to Attribute');
select extensions.is((select count(*)::bigint from (select source_entity_id,target_entity_id from public.taxonomy_relationships where relationship_type='AFFECTS' group by source_entity_id,target_entity_id having count(*)>1) duplicate_pairs),0::bigint,'AFFECTS contains no duplicate pair');
select extensions.is((select count(*)::bigint from public.taxonomy_relationships where relationship_type='AFFECTS' and metadata->>'graph_version'='ATTRIBUTE_GRAPH_V1'),141::bigint,'all AFFECTS edges retain graph version metadata');
select extensions.is((select count(*)::bigint from public.taxonomy_relationships where relationship_type='AFFECTS' and metadata ?| array['weight','contribution','importance']),0::bigint,'AFFECTS metadata has no numeric weighting fields');

select extensions.ok(exists(select 1 from public.taxonomy_relationships r join public.taxonomy_entities s on s.id=r.source_entity_id join public.taxonomy_entities a on a.id=r.target_entity_id where r.relationship_type='AFFECTS' and s.slug='hybrid_picking' and a.slug='coordination'),'Hybrid Picking affects Coordination');
select extensions.ok(exists(select 1 from public.taxonomy_relationships r join public.taxonomy_entities s on s.id=r.source_entity_id join public.taxonomy_entities a on a.id=r.target_entity_id where r.relationship_type='AFFECTS' and s.slug='scale_mapping' and a.slug='fretboard'),'Scale Mapping affects Fretboard');
select extensions.ok(exists(select 1 from public.taxonomy_relationships r join public.taxonomy_entities s on s.id=r.source_entity_id join public.taxonomy_entities a on a.id=r.target_entity_id where r.relationship_type='AFFECTS' and s.slug='syncopation_control' and a.slug='rhythm'),'Syncopation Control affects Rhythm');

set local role anon;
select extensions.is((select count(*)::bigint from public.taxonomy_relationships where relationship_type='AFFECTS'),141::bigint,'anonymous clients can read canonical AFFECTS edges');
select extensions.throws_ok($$insert into public.taxonomy_relationships(id,relationship_type,source_entity_id,target_entity_id) select gen_random_uuid(),'AFFECTS',s.id,a.id from public.taxonomy_entities s cross join public.taxonomy_entities a where s.kind='SKILL' and a.kind='ATTRIBUTE' limit 1$$,'42501',null,'anonymous clients cannot insert taxonomy relationships');
set local role authenticated;
select extensions.is((select count(*)::bigint from public.taxonomy_relationships where relationship_type='AFFECTS'),141::bigint,'authenticated clients can read canonical AFFECTS edges');
select extensions.throws_ok($$update public.taxonomy_relationships set metadata='{}' where relationship_type='AFFECTS'$$,'42501',null,'authenticated clients cannot update taxonomy relationships');
select extensions.throws_ok($$delete from public.taxonomy_relationships where relationship_type='AFFECTS'$$,'42501',null,'authenticated clients cannot delete taxonomy relationships');
set local role postgres;

select extensions.is((select count(*)::bigint from public.player_skill_states),0::bigint,'TAX-004 creates no Player Skill state');
select extensions.is((select count(*)::bigint from public.player_attribute_states),0::bigint,'TAX-004 derives no Player Attribute state');

select * from extensions.finish();
rollback;
