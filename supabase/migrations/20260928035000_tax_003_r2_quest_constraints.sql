-- TAX-003-R2: canonical QST-001 parameterized Constraint Definitions.
begin;
insert into public.taxonomy_entities (id, kind, slug, display_name, lifecycle, metadata)
values
('50000000-0000-4000-8000-000000000014','CONSTRAINT','borrowed_chord_count','Borrowed Chord Count','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000015','CONSTRAINT','fret_range','Fret Range','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000016','CONSTRAINT','modulation_count','Modulation Count','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000017','CONSTRAINT','output_length','Output Length','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000018','CONSTRAINT','phrase_length','Phrase Length','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000019','CONSTRAINT','pitch_count','Pitch Count','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000020','CONSTRAINT','practice_duration','Practice Duration','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000021','CONSTRAINT','prompt_count','Prompt Count','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000022','CONSTRAINT','ratio','Ratio','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000023','CONSTRAINT','response_count','Response Count','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000024','CONSTRAINT','source_note_count','Source Note Count','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000025','CONSTRAINT','source_phrase_count','Source Phrase Count','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000026','CONSTRAINT','string_set','String Set','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000027','CONSTRAINT','target_tempo','Target Tempo','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000028','CONSTRAINT','time_limit','Time Limit','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000029','CONSTRAINT','top_voice_motion','Top Voice Motion','ACTIVE','{"source":"QST-001","legacy_derived":false}'),
('50000000-0000-4000-8000-000000000030','CONSTRAINT','variation_count','Variation Count','ACTIVE','{"source":"QST-001","legacy_derived":false}')
on conflict (id) do update set metadata = excluded.metadata where public.taxonomy_entities.kind = 'CONSTRAINT' and public.taxonomy_entities.slug = excluded.slug;
do $$ declare total_count bigint; constraint_count bigint; missing_count bigint; begin
 select count(*) into total_count from public.taxonomy_entities; select count(*) into constraint_count from public.taxonomy_entities where kind='CONSTRAINT';
 select count(*) into missing_count from (values ('borrowed_chord_count'),('fret_range'),('modulation_count'),('output_length'),('phrase_length'),('pitch_count'),('practice_duration'),('prompt_count'),('ratio'),('response_count'),('source_note_count'),('source_phrase_count'),('string_set'),('target_tempo'),('time_limit'),('top_voice_motion'),('variation_count')) x(slug) left join public.taxonomy_entities e on e.slug=x.slug and e.kind='CONSTRAINT' and e.lifecycle='ACTIVE' where e.id is null;
 if total_count <> 216 or constraint_count <> 30 or missing_count <> 0 then raise exception 'TAX-003-R2 taxonomy assertion failed: entities %, constraints %, missing %', total_count,constraint_count,missing_count; end if;
end $$;
commit;
