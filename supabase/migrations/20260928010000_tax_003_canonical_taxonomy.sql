-- TAX-003: canonical taxonomy schema + v1 seed.
-- Authority: TAX-001, TAX-002, DATA-001.
-- Canonical data is system-owned, read-only to ordinary clients, and migration-driven.

begin;

create table if not exists public.taxonomy_entities (
  id uuid primary key,
  kind text not null check (
    kind in ('DOMAIN', 'SKILL', 'CONCEPT', 'CONTEXT', 'CONSTRAINT', 'ATTRIBUTE', 'TAG')
  ),
  slug text not null check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  display_name text not null check (btrim(display_name) <> ''),
  lifecycle text not null default 'ACTIVE' check (lifecycle in ('ACTIVE', 'DEPRECATED')),
  replacement_entity_id uuid null references public.taxonomy_entities(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug),
  check (replacement_entity_id is null or replacement_entity_id <> id)
);

create index if not exists taxonomy_entities_kind_lifecycle_idx
  on public.taxonomy_entities (kind, lifecycle);

create table if not exists public.taxonomy_relationships (
  id uuid primary key,
  relationship_type text not null check (
    relationship_type in (
      'BELONGS_TO',
      'SUBSKILL_OF',
      'REQUIRES',
      'SUPPORTS',
      'RELATED_TO',
      'AFFECTS'
    )
  ),
  source_entity_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  target_entity_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (relationship_type, source_entity_id, target_entity_id),
  check (
    relationship_type not in ('SUBSKILL_OF', 'REQUIRES')
    or source_entity_id <> target_entity_id
  )
);

create unique index if not exists taxonomy_one_primary_domain_per_skill_idx
  on public.taxonomy_relationships (source_entity_id)
  where relationship_type = 'BELONGS_TO';

create index if not exists taxonomy_relationships_target_idx
  on public.taxonomy_relationships (target_entity_id, relationship_type);

create table if not exists private.taxonomy_legacy_mappings (
  id uuid primary key,
  legacy_value text not null unique,
  disposition text not null check (
    disposition in ('KEEP', 'RENAME', 'MERGE', 'SPLIT', 'RECLASSIFY', 'DEFER', 'REMOVE')
  ),
  source_occurrences jsonb not null check (jsonb_typeof(source_occurrences) = 'array'),
  legacy_levels_are_provenance_only boolean not null check (legacy_levels_are_provenance_only),
  notes text not null check (btrim(notes) <> ''),
  created_at timestamptz not null default now()
);

create table if not exists private.taxonomy_legacy_mapping_targets (
  mapping_id uuid not null references private.taxonomy_legacy_mappings(id) on delete cascade,
  ordinal smallint not null check (ordinal > 0),
  entity_id uuid not null references public.taxonomy_entities(id) on delete restrict,
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  primary key (mapping_id, ordinal)
);

create or replace function private.taxonomy_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.taxonomy_validate_entity_update()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  replacement_kind text;
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id then
      raise exception 'taxonomy entity IDs are immutable';
    end if;
    if new.kind <> old.kind then
      raise exception 'taxonomy entity kinds are immutable';
    end if;
    if new.slug <> old.slug then
      raise exception 'published taxonomy slugs are immutable';
    end if;
  end if;

  if new.replacement_entity_id is not null then
    select kind
      into replacement_kind
      from public.taxonomy_entities
      where id = new.replacement_entity_id;

    if replacement_kind is null then
      raise exception 'replacement taxonomy entity does not exist';
    end if;

    if replacement_kind <> new.kind then
      raise exception 'replacement taxonomy entity must use the same kind';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.taxonomy_validate_relationship()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  source_kind text;
  target_kind text;
  has_cycle boolean;
begin
  select kind into source_kind
    from public.taxonomy_entities
    where id = new.source_entity_id;

  select kind into target_kind
    from public.taxonomy_entities
    where id = new.target_entity_id;

  if source_kind is null or target_kind is null then
    raise exception 'taxonomy relationship endpoints must exist';
  end if;

  if new.relationship_type = 'BELONGS_TO'
     and not (source_kind = 'SKILL' and target_kind = 'DOMAIN') then
    raise exception 'BELONGS_TO requires SKILL -> DOMAIN';
  end if;

  if new.relationship_type in ('SUBSKILL_OF', 'REQUIRES', 'SUPPORTS')
     and not (source_kind = 'SKILL' and target_kind = 'SKILL') then
    raise exception '% requires SKILL -> SKILL', new.relationship_type;
  end if;

  if new.relationship_type = 'AFFECTS'
     and not (source_kind = 'SKILL' and target_kind = 'ATTRIBUTE') then
    raise exception 'AFFECTS requires SKILL -> ATTRIBUTE';
  end if;

  if new.relationship_type in ('SUBSKILL_OF', 'REQUIRES') then
    if new.source_entity_id = new.target_entity_id then
      raise exception '% cannot self-reference', new.relationship_type;
    end if;

    with recursive reach(entity_id) as (
      select r.target_entity_id
      from public.taxonomy_relationships r
      where r.relationship_type = new.relationship_type
        and r.source_entity_id = new.target_entity_id
        and (tg_op <> 'UPDATE' or r.id <> new.id)

      union

      select r.target_entity_id
      from public.taxonomy_relationships r
      join reach on r.source_entity_id = reach.entity_id
      where r.relationship_type = new.relationship_type
        and (tg_op <> 'UPDATE' or r.id <> new.id)
    )
    select exists (
      select 1
      from reach
      where entity_id = new.source_entity_id
    )
    into has_cycle;

    if has_cycle then
      raise exception '% relationship would create a cycle', new.relationship_type;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists taxonomy_entities_validate_update on public.taxonomy_entities;
create trigger taxonomy_entities_validate_update
before insert or update on public.taxonomy_entities
for each row execute function private.taxonomy_validate_entity_update();

drop trigger if exists taxonomy_entities_touch_updated_at on public.taxonomy_entities;
create trigger taxonomy_entities_touch_updated_at
before update on public.taxonomy_entities
for each row execute function private.taxonomy_touch_updated_at();

drop trigger if exists taxonomy_relationships_validate on public.taxonomy_relationships;
create trigger taxonomy_relationships_validate
before insert or update on public.taxonomy_relationships
for each row execute function private.taxonomy_validate_relationship();

alter table public.taxonomy_entities enable row level security;
alter table public.taxonomy_relationships enable row level security;

revoke all on table public.taxonomy_entities from anon, authenticated;
revoke all on table public.taxonomy_relationships from anon, authenticated;
grant select on table public.taxonomy_entities to anon, authenticated;
grant select on table public.taxonomy_relationships to anon, authenticated;
grant all on table public.taxonomy_entities to service_role;
grant all on table public.taxonomy_relationships to service_role;

drop policy if exists taxonomy_entities_public_read on public.taxonomy_entities;
create policy taxonomy_entities_public_read
  on public.taxonomy_entities
  for select
  to anon, authenticated
  using (true);

drop policy if exists taxonomy_relationships_public_read on public.taxonomy_relationships;
create policy taxonomy_relationships_public_read
  on public.taxonomy_relationships
  for select
  to anon, authenticated
  using (true);

create or replace function private.seed_taxonomy_v1()
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  insert into public.taxonomy_entities (
    id,
    kind,
    slug,
    display_name,
    lifecycle,
    replacement_entity_id,
    metadata
  )
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'DOMAIN', 'technique', 'Technique', 'ACTIVE', NULL, '{"source":"TAX-001","legacy_derived":false}'::jsonb),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'DOMAIN', 'fretboard', 'Fretboard', 'ACTIVE', NULL, '{"source":"TAX-001","legacy_derived":false}'::jsonb),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'DOMAIN', 'harmony_theory', 'Harmony & Theory', 'ACTIVE', NULL, '{"source":"TAX-001","legacy_derived":false}'::jsonb),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'DOMAIN', 'rhythm', 'Rhythm', 'ACTIVE', NULL, '{"source":"TAX-001","legacy_derived":false}'::jsonb),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'DOMAIN', 'ear_musicianship', 'Ear & Musicianship', 'ACTIVE', NULL, '{"source":"TAX-001","legacy_derived":false}'::jsonb),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'DOMAIN', 'creativity_expression', 'Creativity & Expression', 'ACTIVE', NULL, '{"source":"TAX-001","legacy_derived":false}'::jsonb),
    ('20000000-0000-4000-8000-000000000001'::uuid, 'SKILL', 'alternate_picking', 'Alternate Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'SKILL', 'anticipation_placement', 'Anticipation Placement', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'SKILL', 'arpeggio_sequencing', 'Arpeggio Sequencing', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000004'::uuid, 'SKILL', 'artificial_harmonics', 'Artificial Harmonics', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000005'::uuid, 'SKILL', 'backbeat_placement', 'Backbeat Placement', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000006'::uuid, 'SKILL', 'barre_chord_fretting', 'Barre-Chord Fretting', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000007'::uuid, 'SKILL', 'basic_chord_fretting', 'Basic Chord Fretting', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000008'::uuid, 'SKILL', 'bending', 'Bending', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000009'::uuid, 'SKILL', 'chicken_picking', 'Chicken Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000010'::uuid, 'SKILL', 'chord_inversion_navigation', 'Chord Inversion Navigation', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000011'::uuid, 'SKILL', 'chord_melody_playing', 'Chord-Melody Playing', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000012'::uuid, 'SKILL', 'chord_substitution_application', 'Chord Substitution Application', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000013'::uuid, 'SKILL', 'classical_fingerstyle', 'Classical Fingerstyle', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000014'::uuid, 'SKILL', 'counterpoint_application', 'Counterpoint Application', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000015'::uuid, 'SKILL', 'cross_rhythm_performance', 'Cross-Rhythm Performance', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000016'::uuid, 'SKILL', 'dead_note_articulation', 'Dead-Note Articulation', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000017'::uuid, 'SKILL', 'double_stop_execution', 'Double-Stop Execution', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000018'::uuid, 'SKILL', 'downstroke_picking', 'Downstroke Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000019'::uuid, 'SKILL', 'economy_picking', 'Economy Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000020'::uuid, 'SKILL', 'finger_independence', 'Finger Independence', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000021'::uuid, 'SKILL', 'finger_placement', 'Finger Placement', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000022'::uuid, 'SKILL', 'fingerstyle', 'Fingerstyle', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000023'::uuid, 'SKILL', 'fingerstyle_tremolo', 'Fingerstyle Tremolo', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000024'::uuid, 'SKILL', 'flatpicking', 'Flatpicking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000025'::uuid, 'SKILL', 'free_stroke', 'Free Stroke', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000026'::uuid, 'SKILL', 'fret_hand_muting', 'Fret-Hand Muting', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000027'::uuid, 'SKILL', 'ghost_note_articulation', 'Ghost-Note Articulation', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000028'::uuid, 'SKILL', 'gypsy_jazz_picking', 'Gypsy Jazz Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000029'::uuid, 'SKILL', 'hammer_on', 'Hammer-On', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000030'::uuid, 'SKILL', 'harp_harmonics', 'Harp Harmonics', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000031'::uuid, 'SKILL', 'hybrid_picking', 'Hybrid Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000032'::uuid, 'SKILL', 'interval_recognition', 'Interval Recognition', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000033'::uuid, 'SKILL', 'legato', 'Legato', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000034'::uuid, 'SKILL', 'metric_modulation_performance', 'Metric Modulation Performance', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000035'::uuid, 'SKILL', 'microtonal_bending', 'Microtonal Bending', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000036'::uuid, 'SKILL', 'modal_application', 'Modal Application', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000037'::uuid, 'SKILL', 'modulation_application', 'Modulation Application', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000038'::uuid, 'SKILL', 'note_location', 'Note Location', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000039'::uuid, 'SKILL', 'odd_meter_fluency', 'Odd-Meter Fluency', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000040'::uuid, 'SKILL', 'open_chord_fluency', 'Open Chord Fluency', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000041'::uuid, 'SKILL', 'open_string_chord_voicing', 'Open-String Chord Voicing', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000042'::uuid, 'SKILL', 'palm_muting', 'Palm Muting', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000043'::uuid, 'SKILL', 'percussive_strumming', 'Percussive Strumming', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000044'::uuid, 'SKILL', 'pick_scrape', 'Pick Scrape', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000045'::uuid, 'SKILL', 'pick_tapping', 'Pick Tapping', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000046'::uuid, 'SKILL', 'pinch_harmonics', 'Pinch Harmonics', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000047'::uuid, 'SKILL', 'polyrhythm_performance', 'Polyrhythm Performance', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000048'::uuid, 'SKILL', 'power_chord_fretting', 'Power Chord Fretting', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000049'::uuid, 'SKILL', 'pull_off', 'Pull-Off', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000050'::uuid, 'SKILL', 'rake_picking', 'Rake Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000051'::uuid, 'SKILL', 'rest_stroke', 'Rest Stroke', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000052'::uuid, 'SKILL', 'rhythmic_displacement_control', 'Rhythmic Displacement Control', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000053'::uuid, 'SKILL', 'scalar_fingering', 'Scalar Fingering', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000054'::uuid, 'SKILL', 'scalar_sequence_execution', 'Scalar Sequence Execution', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000055'::uuid, 'SKILL', 'scale_application', 'Scale Application', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000056'::uuid, 'SKILL', 'scale_degree_recognition', 'Scale-Degree Recognition', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000057'::uuid, 'SKILL', 'scale_mapping', 'Scale Mapping', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000058'::uuid, 'SKILL', 'slap_and_pop', 'Slap and Pop', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000059'::uuid, 'SKILL', 'sliding', 'Sliding', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000060'::uuid, 'SKILL', 'string_skipping', 'String Skipping', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000061'::uuid, 'SKILL', 'subdivision_control', 'Subdivision Control', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000062'::uuid, 'SKILL', 'sweep_picking', 'Sweep Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000063'::uuid, 'SKILL', 'syncopation_control', 'Syncopation Control', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000064'::uuid, 'SKILL', 'tremolo_picking', 'Tremolo Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000065'::uuid, 'SKILL', 'tremolo_strumming', 'Tremolo Strumming', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000066'::uuid, 'SKILL', 'triad_construction', 'Triad Construction', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000067'::uuid, 'SKILL', 'two_hand_tapping', 'Two-Hand Tapping', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000068'::uuid, 'SKILL', 'two_voice_independence', 'Two-Voice Independence', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000069'::uuid, 'SKILL', 'upstroke_picking', 'Upstroke Picking', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000070'::uuid, 'SKILL', 'vibrato', 'Vibrato', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000071'::uuid, 'SKILL', 'voice_leading', 'Voice Leading', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('20000000-0000-4000-8000-000000000072'::uuid, 'SKILL', 'wide_interval_fretting', 'Wide-Interval Fretting', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000001'::uuid, 'CONCEPT', 'aeolian', 'Aeolian', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000002'::uuid, 'CONCEPT', 'approach_notes', 'Approach Notes', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000003'::uuid, 'CONCEPT', 'arabian_scale', 'Arabian', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000004'::uuid, 'CONCEPT', 'arpeggio', 'Arpeggio', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000005'::uuid, 'CONCEPT', 'atonality', 'Atonality', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000006'::uuid, 'CONCEPT', 'bebop_chromaticism', 'Bebop Chromaticism', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000007'::uuid, 'CONCEPT', 'bebop_dominant', 'Bebop Dominant', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000008'::uuid, 'CONCEPT', 'bebop_major', 'Bebop Major', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000009'::uuid, 'CONCEPT', 'bebop_minor', 'Bebop Minor', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000010'::uuid, 'CONCEPT', 'blues_scale', 'Blues Scale', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000011'::uuid, 'CONCEPT', 'byzantine', 'Byzantine', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000012'::uuid, 'CONCEPT', 'chord_inversion', 'Chord Inversion', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000013'::uuid, 'CONCEPT', 'chord_substitution', 'Chord Substitution', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000014'::uuid, 'CONCEPT', 'chord_voicing', 'Chord Voicing', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000015'::uuid, 'CONCEPT', 'counterpoint', 'Counterpoint', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000016'::uuid, 'CONCEPT', 'cross_rhythm', 'Cross-Rhythm', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000017'::uuid, 'CONCEPT', 'diatonic_harmony', 'Diatonic Harmony', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000018'::uuid, 'CONCEPT', 'diminished_whole_half', 'Diminished (Whole-Half)', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000019'::uuid, 'CONCEPT', 'djent_groove', 'Djent Groove', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000020'::uuid, 'CONCEPT', 'dorian', 'Dorian', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000021'::uuid, 'CONCEPT', 'double_stop', 'Double Stop', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000022'::uuid, 'CONCEPT', 'eighth_note_subdivision', 'Eighth-Note Subdivision', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000023'::uuid, 'CONCEPT', 'enigmatic', 'Enigmatic', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000024'::uuid, 'CONCEPT', 'extended_chords', 'Extended Chords', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000025'::uuid, 'CONCEPT', 'gallop_rhythm', 'Gallop Rhythm', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000026'::uuid, 'CONCEPT', 'harmonic_anticipation', 'Harmonic Anticipation', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000027'::uuid, 'CONCEPT', 'harmonic_minor', 'Harmonic Minor', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000028'::uuid, 'CONCEPT', 'hirajoshi', 'Hirajoshi', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000029'::uuid, 'CONCEPT', 'hungarian_minor', 'Hungarian Minor', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000030'::uuid, 'CONCEPT', 'i_iv_v_progression', 'I–IV–V Progression', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000031'::uuid, 'CONCEPT', 'in_sen', 'In Sen', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000032'::uuid, 'CONCEPT', 'ionian', 'Ionian', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000033'::uuid, 'CONCEPT', 'locrian', 'Locrian', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000034'::uuid, 'CONCEPT', 'lydian', 'Lydian', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000035'::uuid, 'CONCEPT', 'major_pentatonic', 'Pentatonic Major', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000036'::uuid, 'CONCEPT', 'major_scale', 'Major Scale', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000037'::uuid, 'CONCEPT', 'melodic_minor', 'Melodic Minor', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000038'::uuid, 'CONCEPT', 'melody', 'Melody', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000039'::uuid, 'CONCEPT', 'meter_5_4', '5/4', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000040'::uuid, 'CONCEPT', 'meter_7_8', '7/8', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000041'::uuid, 'CONCEPT', 'metric_modulation', 'Metric Modulation', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000042'::uuid, 'CONCEPT', 'minor_pentatonic', 'Pentatonic Minor', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000043'::uuid, 'CONCEPT', 'mixolydian', 'Mixolydian', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000044'::uuid, 'CONCEPT', 'modal_interchange', 'Modal Interchange', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000045'::uuid, 'CONCEPT', 'modulation', 'Modulation', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000046'::uuid, 'CONCEPT', 'natural_minor', 'Natural Minor', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000047'::uuid, 'CONCEPT', 'octatonic_half_whole', 'Octatonic (Half-Whole)', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000048'::uuid, 'CONCEPT', 'passing_chords', 'Passing Chords', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000049'::uuid, 'CONCEPT', 'pentatonic_scale_family', 'Pentatonic Scale Family', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000050'::uuid, 'CONCEPT', 'persian_scale', 'Persian Scale', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000051'::uuid, 'CONCEPT', 'phrygian', 'Phrygian', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000052'::uuid, 'CONCEPT', 'polyrhythm', 'Polyrhythm', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000053'::uuid, 'CONCEPT', 'polytonality', 'Polytonality', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000054'::uuid, 'CONCEPT', 'power_chord', 'Power Chord', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000055'::uuid, 'CONCEPT', 'quarter_note_subdivision', 'Quarter-Note Subdivision', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000056'::uuid, 'CONCEPT', 'rhythmic_displacement', 'Rhythmic Displacement', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000057'::uuid, 'CONCEPT', 'secondary_dominant', 'Secondary Dominant', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000058'::uuid, 'CONCEPT', 'serialism', 'Serialism', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000059'::uuid, 'CONCEPT', 'shuffle_feel', 'Shuffle Feel', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000060'::uuid, 'CONCEPT', 'ska_offbeat_rhythm', 'Ska Offbeat Rhythm', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000061'::uuid, 'CONCEPT', 'swing_eighths', 'Swing Eighths', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000062'::uuid, 'CONCEPT', 'syncopation', 'Syncopation', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000063'::uuid, 'CONCEPT', 'triplet_feel', 'Triplet Feel', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('30000000-0000-4000-8000-000000000064'::uuid, 'CONCEPT', 'whole_tone', 'Whole-Tone', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000001'::uuid, 'CONTEXT', 'ambient_soundscapes', 'Ambient / Soundscapes', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000002'::uuid, 'CONTEXT', 'avant_garde_noise', 'Avant-Garde / Noise', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000003'::uuid, 'CONTEXT', 'blues', 'Blues', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000004'::uuid, 'CONTEXT', 'blues_rock', 'Blues-Rock', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000005'::uuid, 'CONTEXT', 'bossa_nova', 'Bossa Nova', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000006'::uuid, 'CONTEXT', 'classical', 'Classical', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000007'::uuid, 'CONTEXT', 'country', 'Country', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000008'::uuid, 'CONTEXT', 'djent', 'Djent', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000009'::uuid, 'CONTEXT', 'flamenco', 'Flamenco', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000010'::uuid, 'CONTEXT', 'flamenco_rumba', 'Flamenco Rumba', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000011'::uuid, 'CONTEXT', 'folk', 'Folk', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000012'::uuid, 'CONTEXT', 'gypsy_jazz', 'Gypsy Jazz', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000013'::uuid, 'CONTEXT', 'jazz', 'Jazz', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000014'::uuid, 'CONTEXT', 'jazz_fusion', 'Jazz Fusion', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000015'::uuid, 'CONTEXT', 'math_rock', 'Math Rock', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000016'::uuid, 'CONTEXT', 'metal', 'Metal', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000017'::uuid, 'CONTEXT', 'neoclassical', 'Neoclassical', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000018'::uuid, 'CONTEXT', 'percussive_fingerstyle', 'Percussive Fingerstyle', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000019'::uuid, 'CONTEXT', 'playing_role_lead_guitar', 'Lead Guitar', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000020'::uuid, 'CONTEXT', 'playing_role_rhythm_guitar', 'Rhythm Guitar', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000021'::uuid, 'CONTEXT', 'pop', 'Pop', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000022'::uuid, 'CONTEXT', 'post_rock', 'Post-Rock', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000023'::uuid, 'CONTEXT', 'progressive_rock_metal', 'Progressive Rock / Metal', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000024'::uuid, 'CONTEXT', 'reggae', 'Reggae', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000025'::uuid, 'CONTEXT', 'rock', 'Rock', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000026'::uuid, 'CONTEXT', 'ska', 'Ska', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000027'::uuid, 'CONTEXT', 'slide_guitar', 'Slide Guitar', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('40000000-0000-4000-8000-000000000028'::uuid, 'CONTEXT', 'tonal_center', 'Tonal Center', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true,"legacy_parameter_examples":[{"pitch_class":"A"},{"pitch_class":"A#/Bb"},{"pitch_class":"B"},{"pitch_class":"C"},{"pitch_class":"C#/Db"},{"pitch_class":"D"},{"pitch_class":"D#/Eb"},{"pitch_class":"E"},{"pitch_class":"F"},{"pitch_class":"F#/Gb"},{"pitch_class":"G"},{"pitch_class":"G#/Ab"}]}'::jsonb),
    ('50000000-0000-4000-8000-000000000001'::uuid, 'CONSTRAINT', 'adjacent_strings_only', 'Adjacent Strings Only', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000002'::uuid, 'CONSTRAINT', 'change_strings_each_bar', 'Change Strings Each Bar', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000003'::uuid, 'CONSTRAINT', 'double_stop_texture', 'Double-Stop Texture', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000004'::uuid, 'CONSTRAINT', 'even_strings_only', 'Even Strings Only', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000005'::uuid, 'CONSTRAINT', 'high_strings_only', 'High Strings Only', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000006'::uuid, 'CONSTRAINT', 'low_strings_only', 'Low Strings Only', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000007'::uuid, 'CONSTRAINT', 'non_adjacent_strings_only', 'Non-Adjacent Strings Only', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000008'::uuid, 'CONSTRAINT', 'odd_strings_only', 'Odd Strings Only', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000009'::uuid, 'CONSTRAINT', 'single_string_only', 'Single String Only', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000010'::uuid, 'CONSTRAINT', 'single_string_per_measure', 'Single String per Measure', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000011'::uuid, 'CONSTRAINT', 'skip_every_other_string', 'Skip Every Other String', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000012'::uuid, 'CONSTRAINT', 'skip_two_strings', 'Skip Two Strings', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('50000000-0000-4000-8000-000000000013'::uuid, 'CONSTRAINT', 'string_count', 'String Count', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true,"legacy_parameter_examples":[{"count":2}]}'::jsonb),
    ('60000000-0000-4000-8000-000000000001'::uuid, 'ATTRIBUTE', 'control', 'Control', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000002'::uuid, 'ATTRIBUTE', 'coordination', 'Coordination', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000003'::uuid, 'ATTRIBUTE', 'creativity', 'Creativity', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000004'::uuid, 'ATTRIBUTE', 'dexterity', 'Dexterity', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000005'::uuid, 'ATTRIBUTE', 'ear', 'Ear', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000006'::uuid, 'ATTRIBUTE', 'endurance', 'Endurance', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000007'::uuid, 'ATTRIBUTE', 'expression', 'Expression', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000008'::uuid, 'ATTRIBUTE', 'fretboard', 'Fretboard', 'ACTIVE', NULL, '{"source":"TAX-001","legacy_derived":false}'::jsonb),
    ('60000000-0000-4000-8000-000000000009'::uuid, 'ATTRIBUTE', 'precision', 'Precision', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000010'::uuid, 'ATTRIBUTE', 'rhythm', 'Rhythm', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('60000000-0000-4000-8000-000000000011'::uuid, 'ATTRIBUTE', 'theory', 'Theory', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('70000000-0000-4000-8000-000000000001'::uuid, 'TAG', 'bend_variants', 'Bend Variants', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb),
    ('70000000-0000-4000-8000-000000000002'::uuid, 'TAG', 'exotic_scale_family', 'Exotic Scale Family', 'ACTIVE', NULL, '{"source":"TAX-002","legacy_derived":true}'::jsonb)
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    lifecycle = excluded.lifecycle,
    replacement_entity_id = excluded.replacement_entity_id,
    metadata = excluded.metadata;

  insert into public.taxonomy_relationships (
    id,
    relationship_type,
    source_entity_id,
    target_entity_id,
    metadata
  )
  values
    ('90000000-0000-4000-8000-000000000001'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000002'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000003'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000003'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000004'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000004'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000005'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000005'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000006'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000006'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000007'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000007'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000008'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000008'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000009'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000009'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000010'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000010'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000011'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000011'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000012'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000012'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000013'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000013'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000014'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000014'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000015'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000015'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000016'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000016'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000017'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000017'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000018'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000018'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000019'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000019'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000020'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000020'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000021'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000021'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000022'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000022'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000023'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000023'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000024'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000024'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000025'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000025'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000026'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000026'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000027'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000027'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000028'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000028'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000029'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000029'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000030'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000030'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000031'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000031'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000032'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000032'::uuid, '10000000-0000-4000-8000-000000000005'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000033'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000033'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000034'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000034'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000035'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000035'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000036'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000036'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000037'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000037'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000038'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000038'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000039'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000039'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000040'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000040'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000041'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000041'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000042'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000042'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000043'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000043'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000044'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000044'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000045'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000045'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000046'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000046'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000047'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000047'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000048'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000048'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000049'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000049'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000050'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000050'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000051'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000051'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000052'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000052'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000053'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000053'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000054'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000054'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000055'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000055'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000056'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000056'::uuid, '10000000-0000-4000-8000-000000000005'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000057'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000057'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000058'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000058'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000059'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000059'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000060'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000060'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000061'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000061'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000062'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000062'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000063'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000063'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000064'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000064'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000065'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000065'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000066'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000066'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000067'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000067'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000068'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000068'::uuid, '10000000-0000-4000-8000-000000000006'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000069'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000069'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000070'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000070'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000071'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000071'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb),
    ('90000000-0000-4000-8000-000000000072'::uuid, 'BELONGS_TO', '20000000-0000-4000-8000-000000000072'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, '{"source":"TAX-002","primary_domain":true}'::jsonb)
  on conflict (id) do update
  set
    relationship_type = excluded.relationship_type,
    source_entity_id = excluded.source_entity_id,
    target_entity_id = excluded.target_entity_id,
    metadata = excluded.metadata;

  insert into private.taxonomy_legacy_mappings (
    id,
    legacy_value,
    disposition,
    source_occurrences,
    legacy_levels_are_provenance_only,
    notes
  )
  values
    ('80000000-0000-4000-8000-000000000001'::uuid, 'A', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000002'::uuid, 'A# / Bb', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000003'::uuid, 'Adaptability', 'REMOVE', '[{"source":"mentalAttributeList","level":null}]'::jsonb, true, 'Too broad to function as a canonical v1 musical Attribute; adaptability may emerge through evidence variety rather than a direct stat.'),
    ('80000000-0000-4000-8000-000000000004'::uuid, 'Adjacent Strings Only', 'RENAME', '[{"source":"stringChallenge","level":2}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000005'::uuid, 'Advanced Bebop Chromaticism', 'RENAME', '[{"source":"guitarmanship","level":5}]'::jsonb, true, 'Advanced removed from identity.'),
    ('80000000-0000-4000-8000-000000000006'::uuid, 'Advanced Bends (pre-bends, release)', 'MERGE', '[{"source":"frettingHand","level":4}]'::jsonb, true, 'Pre-bend/release become technique variants/Quest parameters; Advanced is removed.'),
    ('80000000-0000-4000-8000-000000000007'::uuid, 'Advanced Hybrid Picking', 'MERGE', '[{"source":"pickingHand","level":5}]'::jsonb, true, 'Advanced is Quest/player demand, not a second Skill.'),
    ('80000000-0000-4000-8000-000000000008'::uuid, 'Advanced Modulation Schemes', 'RENAME', '[{"source":"musicianship","level":5}]'::jsonb, true, 'Advanced removed; separates device from application.'),
    ('80000000-0000-4000-8000-000000000009'::uuid, 'Advanced Voice Leading', 'MERGE', '[{"source":"musicianship","level":4}]'::jsonb, true, 'Advanced becomes Quest demand.'),
    ('80000000-0000-4000-8000-000000000010'::uuid, 'Alternate Picking', 'KEEP', '[{"source":"pickingHand","level":1},{"source":"rhythm","level":1}]'::jsonb, true, 'One canonical technique Skill; Rhythm duplicate merges here.'),
    ('80000000-0000-4000-8000-000000000011'::uuid, 'Ambient/Soundscapes', 'RECLASSIFY', '[{"source":"playStyle","level":4}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000012'::uuid, 'Approach Notes (Jazz)', 'SPLIT', '[{"source":"guitarmanship","level":3}]'::jsonb, true, 'Musical device separated from style context.'),
    ('80000000-0000-4000-8000-000000000013'::uuid, 'Arabian', 'KEEP', '[{"source":"scales","level":5}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000014'::uuid, 'Arpeggio Sequences', 'RENAME', '[{"source":"guitarmanship","level":3}]'::jsonb, true, 'Trainable application Skill.'),
    ('80000000-0000-4000-8000-000000000015'::uuid, 'Artificial Harmonics', 'KEEP', '[{"source":"pickingHand","level":4},{"source":"frettingHand","level":4}]'::jsonb, true, 'One canonical Skill shared by picking/fretting legacy occurrences.'),
    ('80000000-0000-4000-8000-000000000016'::uuid, 'Atonal & Serial Techniques', 'SPLIT', '[{"source":"musicianship","level":5}]'::jsonb, true, 'Compound theory label becomes distinct Concepts.'),
    ('80000000-0000-4000-8000-000000000017'::uuid, 'Aural', 'RENAME', '[{"source":"mentalAttributeList","level":null}]'::jsonb, true, 'Production terminology uses Ear.'),
    ('80000000-0000-4000-8000-000000000018'::uuid, 'Avant-Garde/Noise', 'RECLASSIFY', '[{"source":"playStyle","level":5}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000019'::uuid, 'B', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000020'::uuid, 'Backbeat Emphasis', 'RENAME', '[{"source":"rhythm","level":2}]'::jsonb, true, 'Trainable placement Skill.'),
    ('80000000-0000-4000-8000-000000000021'::uuid, 'Barre Chords', 'RENAME', '[{"source":"frettingHand","level":2}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000022'::uuid, 'Basic Chord Progression (I–IV–V)', 'RENAME', '[{"source":"musicianship","level":1}]'::jsonb, true, 'Basic removed from identity.'),
    ('80000000-0000-4000-8000-000000000023'::uuid, 'Basic Chords', 'RENAME', '[{"source":"frettingHand","level":1}]'::jsonb, true, 'Legacy phrase describes execution ability, not a chord Concept.'),
    ('80000000-0000-4000-8000-000000000024'::uuid, 'Bebop Dominant', 'KEEP', '[{"source":"scales","level":4}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000025'::uuid, 'Bebop Major', 'KEEP', '[{"source":"scales","level":4}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000026'::uuid, 'Bebop Minor', 'KEEP', '[{"source":"scales","level":4}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000027'::uuid, 'Bending', 'RENAME', '[{"source":"frettingHand","level":2}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000028'::uuid, 'Blended Freeform', 'REMOVE', '[{"source":"stringChallenge","level":5}]'::jsonb, true, 'Too vague to normalize as taxonomy; freeform behavior belongs to generator/Quest-mode design.'),
    ('80000000-0000-4000-8000-000000000029'::uuid, 'Blues', 'KEEP', '[{"source":"playStyle","level":1}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000030'::uuid, 'Blues Scale', 'KEEP', '[{"source":"scales","level":1}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000031'::uuid, 'Blues Scale Extensions', 'SPLIT', '[{"source":"guitarmanship","level":2}]'::jsonb, true, 'Extension/application becomes Quest demand rather than a standalone entity.'),
    ('80000000-0000-4000-8000-000000000032'::uuid, 'Blues-Rock', 'KEEP', '[{"source":"playStyle","level":3}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000033'::uuid, 'Bossa Nova', 'KEEP', '[{"source":"playStyle","level":2}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000034'::uuid, 'Byzantine', 'KEEP', '[{"source":"scales","level":5}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000035'::uuid, 'C', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000036'::uuid, 'C# / Db', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000037'::uuid, 'Changing Strings Each Bar', 'RENAME', '[{"source":"stringChallenge","level":5}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000038'::uuid, 'Chicken Picking', 'KEEP', '[{"source":"pickingHand","level":2}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000039'::uuid, 'Chord Anticipation', 'SPLIT', '[{"source":"rhythm","level":4}]'::jsonb, true, 'Harmony/rhythm device + timing ability.'),
    ('80000000-0000-4000-8000-000000000040'::uuid, 'Chord Inversions', 'SPLIT', '[{"source":"guitarmanship","level":2},{"source":"frettingHand","level":3}]'::jsonb, true, 'Separates ability to locate/apply inversions from inversion structure; both duplicate source occurrences share this mapping.'),
    ('80000000-0000-4000-8000-000000000041'::uuid, 'Chord on One String, Melody on Another', 'DEFER', '[{"source":"stringChallenge","level":4}]'::jsonb, true, 'Compound arrangement/Quest-template pattern, not a canonical taxonomy entity.'),
    ('80000000-0000-4000-8000-000000000042'::uuid, 'Chord Substitutions', 'SPLIT', '[{"source":"guitarmanship","level":4},{"source":"musicianship","level":3}]'::jsonb, true, 'Separates knowledge/device from application; duplicate source occurrence shares mapping.'),
    ('80000000-0000-4000-8000-000000000043'::uuid, 'Chord-Melody Playing', 'RENAME', '[{"source":"frettingHand","level":4}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000044'::uuid, 'Chords w/ Open Strings', 'RENAME', '[{"source":"frettingHand","level":3}]'::jsonb, true, 'Normalizes voicing/application ability.'),
    ('80000000-0000-4000-8000-000000000045'::uuid, 'Classical', 'KEEP', '[{"source":"playStyle","level":2}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000046'::uuid, 'Classical Fingerstyle', 'KEEP', '[{"source":"frettingHand","level":5}]'::jsonb, true, 'Canonical technique Skill.'),
    ('80000000-0000-4000-8000-000000000047'::uuid, 'Classical Fingerstyle Techniques', 'MERGE', '[{"source":"pickingHand","level":5}]'::jsonb, true, 'Normalizes broad legacy label.'),
    ('80000000-0000-4000-8000-000000000048'::uuid, 'Coordination', 'KEEP', '[{"source":"physicalAttributeList","level":null}]'::jsonb, true, 'Canonical Physical Attribute.'),
    ('80000000-0000-4000-8000-000000000049'::uuid, 'Counterpoint', 'SPLIT', '[{"source":"guitarmanship","level":5}]'::jsonb, true, 'Separates musical system from ability.'),
    ('80000000-0000-4000-8000-000000000050'::uuid, 'Counterpoint 2-Part', 'SPLIT', '[{"source":"musicianship","level":4}]'::jsonb, true, 'Two-part execution + Concept.'),
    ('80000000-0000-4000-8000-000000000051'::uuid, 'Counterpoint Two-Voice', 'SPLIT', '[{"source":"frettingHand","level":5}]'::jsonb, true, 'Separates execution/arrangement ability from Counterpoint Concept.'),
    ('80000000-0000-4000-8000-000000000052'::uuid, 'Country', 'KEEP', '[{"source":"playStyle","level":2}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000053'::uuid, 'Creativity', 'KEEP', '[{"source":"mentalAttributeList","level":null}]'::jsonb, true, 'Canonical Musical Attribute.'),
    ('80000000-0000-4000-8000-000000000054'::uuid, 'Cross-Rhythms', 'SPLIT', '[{"source":"rhythm","level":4}]'::jsonb, true, 'Concept + application Skill.'),
    ('80000000-0000-4000-8000-000000000055'::uuid, 'D', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000056'::uuid, 'D# / Eb', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000057'::uuid, 'Dead Notes', 'RENAME', '[{"source":"rhythm","level":3}]'::jsonb, true, 'Trainable articulation Skill.'),
    ('80000000-0000-4000-8000-000000000058'::uuid, 'Dexterity', 'KEEP', '[{"source":"physicalAttributeList","level":null}]'::jsonb, true, 'Canonical Physical Attribute.'),
    ('80000000-0000-4000-8000-000000000059'::uuid, 'Diatonic Harmony', 'KEEP', '[{"source":"musicianship","level":2}]'::jsonb, true, 'Canonical Concept; merges with parenthetical guitarmanship variant.'),
    ('80000000-0000-4000-8000-000000000060'::uuid, 'Diatonic Harmony (Maj/Min Keys)', 'RENAME', '[{"source":"guitarmanship","level":3}]'::jsonb, true, 'Parenthetical key scope becomes context rather than identity.'),
    ('80000000-0000-4000-8000-000000000061'::uuid, 'Diminished (Whole-Half)', 'KEEP', '[{"source":"scales","level":3}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000062'::uuid, 'Displaced Rhythms', 'MERGE', '[{"source":"rhythm","level":5}]'::jsonb, true, 'Normalized to Rhythmic Displacement semantics.'),
    ('80000000-0000-4000-8000-000000000063'::uuid, 'Djent', 'KEEP', '[{"source":"playStyle","level":5}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000064'::uuid, 'Djent Groove', 'SPLIT', '[{"source":"rhythm","level":5}]'::jsonb, true, 'Style context separated from pattern concept.'),
    ('80000000-0000-4000-8000-000000000065'::uuid, 'Dorian', 'KEEP', '[{"source":"scales","level":2}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000066'::uuid, 'Double Stops', 'SPLIT', '[{"source":"frettingHand","level":2},{"source":"stringChallenge","level":2}]'::jsonb, true, 'Same legacy label served fretting and string-challenge roles; production semantics separate ability, material, and restriction.'),
    ('80000000-0000-4000-8000-000000000067'::uuid, 'Downstrokes', 'RENAME', '[{"source":"pickingHand","level":1},{"source":"rhythm","level":1}]'::jsonb, true, 'Canonical technique Skill; duplicate Rhythm occurrence merges here.'),
    ('80000000-0000-4000-8000-000000000068'::uuid, 'E', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000069'::uuid, 'Economy Picking', 'KEEP', '[{"source":"pickingHand","level":2}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000070'::uuid, 'Eighth Notes', 'RENAME', '[{"source":"rhythm","level":1}]'::jsonb, true, 'Rhythmic material.'),
    ('80000000-0000-4000-8000-000000000071'::uuid, 'Emotion', 'RENAME', '[{"source":"mentalAttributeList","level":null}]'::jsonb, true, 'Production terminology uses Expression rather than Emotion.'),
    ('80000000-0000-4000-8000-000000000072'::uuid, 'Enigmatic', 'KEEP', '[{"source":"scales","level":5}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000073'::uuid, 'Even Strings Only', 'RENAME', '[{"source":"stringChallenge","level":3}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000074'::uuid, 'Exotic Scales (Persian, Hungarian, Byzantine)', 'RECLASSIFY', '[{"source":"guitarmanship","level":5}]'::jsonb, true, 'Legacy collection label becomes editorial/grouping metadata; named scales remain individual Concepts.'),
    ('80000000-0000-4000-8000-000000000075'::uuid, 'Extended Chords (9th, 11th, 13th)', 'RENAME', '[{"source":"guitarmanship","level":4}]'::jsonb, true, 'Specific extension examples become Concept metadata/examples.'),
    ('80000000-0000-4000-8000-000000000076'::uuid, 'Extended Modes', 'DEFER', '[{"source":"musicianship","level":4}]'::jsonb, true, 'Underspecified collection label; specific modes should be canonical Concepts instead.'),
    ('80000000-0000-4000-8000-000000000077'::uuid, 'F', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000078'::uuid, 'F# / Gb', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000079'::uuid, 'Finger Independence Exercises', 'RENAME', '[{"source":"frettingHand","level":5}]'::jsonb, true, 'Exercise wording removed from Skill identity.'),
    ('80000000-0000-4000-8000-000000000080'::uuid, 'Finger Placement', 'RENAME', '[{"source":"frettingHand","level":1}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000081'::uuid, 'Fingerpicking', 'RENAME', '[{"source":"pickingHand","level":2}]'::jsonb, true, 'Broad fingerstyle execution Skill.'),
    ('80000000-0000-4000-8000-000000000082'::uuid, 'Fingerpicking on Non-Adjacent', 'SPLIT', '[{"source":"stringChallenge","level":5}]'::jsonb, true, 'Technique + restriction.'),
    ('80000000-0000-4000-8000-000000000083'::uuid, 'Fingerstyle Tremolo', 'RENAME', '[{"source":"pickingHand","level":3}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000084'::uuid, 'Flamenco', 'KEEP', '[{"source":"playStyle","level":4}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000085'::uuid, 'Flamenco Rumba', 'RECLASSIFY', '[{"source":"playStyle","level":4}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000086'::uuid, 'Flatpicking', 'RENAME', '[{"source":"pickingHand","level":4}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000087'::uuid, 'Flexibility', 'MERGE', '[{"source":"physicalAttributeList","level":null}]'::jsonb, true, 'Standalone flexibility stat is not retained; relevant range/fingering capability contributes through Skills and Dexterity.'),
    ('80000000-0000-4000-8000-000000000088'::uuid, 'Focus', 'REMOVE', '[{"source":"mentalAttributeList","level":null}]'::jsonb, true, 'Not retained as a canonical musical Attribute; focus may be session UX/behavioral metadata later.'),
    ('80000000-0000-4000-8000-000000000089'::uuid, 'Folk', 'KEEP', '[{"source":"playStyle","level":1}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000090'::uuid, 'Free Strokes', 'RENAME', '[{"source":"pickingHand","level":1}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000091'::uuid, 'Fret-Hand Muting', 'RENAME', '[{"source":"frettingHand","level":3}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000092'::uuid, 'Fretboard Memorization', 'RENAME', '[{"source":"guitarmanship","level":2}]'::jsonb, true, 'Production Skill describes demonstrable fretboard note-location ability.'),
    ('80000000-0000-4000-8000-000000000093'::uuid, 'G', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000094'::uuid, 'G# / Ab', 'RECLASSIFY', '[{"source":"keys","level":null}]'::jsonb, true, 'Legacy key selector becomes a tonal-center/key Context value; enharmonic spelling is presentation metadata.'),
    ('80000000-0000-4000-8000-000000000095'::uuid, 'Gallop Rhythm', 'RENAME', '[{"source":"rhythm","level":3}]'::jsonb, true, 'Rhythm-pattern Concept.'),
    ('80000000-0000-4000-8000-000000000096'::uuid, 'Ghost Notes', 'RENAME', '[{"source":"rhythm","level":3}]'::jsonb, true, 'Trainable articulation/placement Skill.'),
    ('80000000-0000-4000-8000-000000000097'::uuid, 'Gypsy Jazz', 'KEEP', '[{"source":"playStyle","level":3}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000098'::uuid, 'Gypsy Picking', 'RENAME', '[{"source":"pickingHand","level":5}]'::jsonb, true, 'Clarifies the established style-specific picking approach.'),
    ('80000000-0000-4000-8000-000000000099'::uuid, 'Hammer-ons', 'RENAME', '[{"source":"frettingHand","level":1}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000100'::uuid, 'Hammer-Ons & Pull-Offs', 'SPLIT', '[{"source":"guitarmanship","level":1}]'::jsonb, true, 'Compound legacy label becomes two independently trainable Skills.'),
    ('80000000-0000-4000-8000-000000000101'::uuid, 'Harmonic Minor', 'KEEP', '[{"source":"scales","level":2}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000102'::uuid, 'Harp Harmonics', 'RENAME', '[{"source":"pickingHand","level":5}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000103'::uuid, 'High Strings Only', 'RENAME', '[{"source":"stringChallenge","level":3}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000104'::uuid, 'Hirajoshi', 'KEEP', '[{"source":"scales","level":5}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000105'::uuid, 'Hungarian Minor', 'KEEP', '[{"source":"scales","level":4}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000106'::uuid, 'Hybrid Picking', 'KEEP', '[{"source":"pickingHand","level":2}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000107'::uuid, 'Hybrid Picking Non-Adjacent', 'SPLIT', '[{"source":"stringChallenge","level":5}]'::jsonb, true, 'Technique + restriction.'),
    ('80000000-0000-4000-8000-000000000108'::uuid, 'Hybrid Rhythms', 'DEFER', '[{"source":"rhythm","level":5}]'::jsonb, true, 'Too vague to serve as a canonical Concept; future Quest must name the actual rhythmic combination.'),
    ('80000000-0000-4000-8000-000000000109'::uuid, 'Hybrid Scales & Chords', 'DEFER', '[{"source":"frettingHand","level":5}]'::jsonb, true, 'Underspecified compound legacy label; should be expressed as specific Skills + Concepts by Quest composition rather than minted as one entity.'),
    ('80000000-0000-4000-8000-000000000110'::uuid, 'Hybrid Scales & Passing Chords', 'SPLIT', '[{"source":"guitarmanship","level":4}]'::jsonb, true, 'Passing Chords retained; ''Hybrid Scales'' is underspecified and deferred rather than minted as a vague canonical entity.'),
    ('80000000-0000-4000-8000-000000000111'::uuid, 'In Sen', 'KEEP', '[{"source":"scales","level":5}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000112'::uuid, 'Interval Identification', 'RENAME', '[{"source":"musicianship","level":1}]'::jsonb, true, 'Canonical ear-training terminology.'),
    ('80000000-0000-4000-8000-000000000113'::uuid, 'Jazz Fusion', 'KEEP', '[{"source":"playStyle","level":3}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000114'::uuid, 'Lead Guitar', 'RECLASSIFY', '[{"source":"playStyle","level":1}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000115'::uuid, 'Legato', 'RENAME', '[{"source":"frettingHand","level":2}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000116'::uuid, 'Legato Runs', 'MERGE', '[{"source":"frettingHand","level":3}]'::jsonb, true, 'Run complexity belongs to Quest demand.'),
    ('80000000-0000-4000-8000-000000000117'::uuid, 'Locrian', 'KEEP', '[{"source":"scales","level":3}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000118'::uuid, 'Low Strings Only', 'RENAME', '[{"source":"stringChallenge","level":3}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000119'::uuid, 'Lydian', 'KEEP', '[{"source":"scales","level":2}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000120'::uuid, 'Major (Ionian)', 'SPLIT', '[{"source":"scales","level":1}]'::jsonb, true, 'Legacy label conflated tonal major and modal Ionian; production preserves both semantics.'),
    ('80000000-0000-4000-8000-000000000121'::uuid, 'Math Rock', 'KEEP', '[{"source":"playStyle","level":4}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000122'::uuid, 'Melodic Minor', 'KEEP', '[{"source":"scales","level":2}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000123'::uuid, 'Melodic Minor Shapes', 'SPLIT', '[{"source":"guitarmanship","level":3}]'::jsonb, true, 'Fretboard ability separated from scale material.'),
    ('80000000-0000-4000-8000-000000000124'::uuid, 'Metal', 'KEEP', '[{"source":"playStyle","level":5}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000125'::uuid, 'Metric Modulation', 'SPLIT', '[{"source":"musicianship","level":3},{"source":"rhythm","level":4}]'::jsonb, true, 'Concept + trainable execution; duplicate Rhythm occurrence shares mapping.'),
    ('80000000-0000-4000-8000-000000000126'::uuid, 'Metric Modulation Mastery', 'MERGE', '[{"source":"musicianship","level":5}]'::jsonb, true, 'Mastery is player proficiency, not taxonomy identity.'),
    ('80000000-0000-4000-8000-000000000127'::uuid, 'Microtonal Bending', 'RENAME', '[{"source":"frettingHand","level":4}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000128'::uuid, 'Mixolydian', 'KEEP', '[{"source":"scales","level":2}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000129'::uuid, 'Modal Basics', 'RENAME', '[{"source":"musicianship","level":2}]'::jsonb, true, 'Basics removed; ability is applying modal material.'),
    ('80000000-0000-4000-8000-000000000130'::uuid, 'Modal Interchange', 'KEEP', '[{"source":"musicianship","level":3}]'::jsonb, true, 'Canonical Concept.'),
    ('80000000-0000-4000-8000-000000000131'::uuid, 'Modal Interchange Advanced', 'MERGE', '[{"source":"guitarmanship","level":5}]'::jsonb, true, 'Advanced removed from identity; difficulty belongs to Quest demand.'),
    ('80000000-0000-4000-8000-000000000132'::uuid, 'Modal Interchange Basics', 'MERGE', '[{"source":"guitarmanship","level":3}]'::jsonb, true, 'Basics removed from identity; difficulty belongs to the Quest.'),
    ('80000000-0000-4000-8000-000000000133'::uuid, 'Natural Minor (Aeolian)', 'SPLIT', '[{"source":"scales","level":1}]'::jsonb, true, 'Legacy label conflated tonal natural minor and modal Aeolian.'),
    ('80000000-0000-4000-8000-000000000134'::uuid, 'Neoclassical', 'KEEP', '[{"source":"playStyle","level":5}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000135'::uuid, 'Neoclassical Fingering', 'SPLIT', '[{"source":"frettingHand","level":5}]'::jsonb, true, 'Technique separated from style context.'),
    ('80000000-0000-4000-8000-000000000136'::uuid, 'Neoclassical Runs', 'SPLIT', '[{"source":"guitarmanship","level":4}]'::jsonb, true, 'Execution ability separated from style.'),
    ('80000000-0000-4000-8000-000000000137'::uuid, 'Non-Adjacent Strings', 'RENAME', '[{"source":"stringChallenge","level":2}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000138'::uuid, 'Octatonic (Half-Whole)', 'KEEP', '[{"source":"scales","level":3}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000139'::uuid, 'Odd Strings Only', 'RENAME', '[{"source":"stringChallenge","level":3}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000140'::uuid, 'Odd Time (5/4, 7/8)', 'SPLIT', '[{"source":"rhythm","level":3}]'::jsonb, true, 'Ability separated from specific meter Concepts.'),
    ('80000000-0000-4000-8000-000000000141'::uuid, 'One String Rhythm + Another Lead', 'DEFER', '[{"source":"stringChallenge","level":4}]'::jsonb, true, 'Compound arrangement/Quest-template pattern, not a canonical taxonomy entity.'),
    ('80000000-0000-4000-8000-000000000142'::uuid, 'Open Chord Fluency', 'KEEP', '[{"source":"guitarmanship","level":1}]'::jsonb, true, 'Trainable chord-execution Skill.'),
    ('80000000-0000-4000-8000-000000000143'::uuid, 'Palm Muting', 'KEEP', '[{"source":"pickingHand","level":2}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000144'::uuid, 'Pentatonic Major', 'KEEP', '[{"source":"scales","level":1}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000145'::uuid, 'Pentatonic Minor', 'KEEP', '[{"source":"scales","level":1}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000146'::uuid, 'Pentatonic Scale Variations', 'SPLIT', '[{"source":"guitarmanship","level":2}]'::jsonb, true, 'Legacy phrase combines fretboard application with scale material.'),
    ('80000000-0000-4000-8000-000000000147'::uuid, 'Percussive Fingerstyle', 'RECLASSIFY', '[{"source":"playStyle","level":3}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000148'::uuid, 'Percussive Strumming', 'KEEP', '[{"source":"rhythm","level":3}]'::jsonb, true, 'Canonical technique Skill.'),
    ('80000000-0000-4000-8000-000000000149'::uuid, 'Persian Scale', 'KEEP', '[{"source":"scales","level":4}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000150'::uuid, 'Phrygian', 'KEEP', '[{"source":"scales","level":3}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.'),
    ('80000000-0000-4000-8000-000000000151'::uuid, 'Pick Scrape', 'RENAME', '[{"source":"pickingHand","level":3}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000152'::uuid, 'Pinch Harmonics', 'RENAME', '[{"source":"pickingHand","level":3}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000153'::uuid, 'Polyrhythms', 'SPLIT', '[{"source":"musicianship","level":3},{"source":"rhythm","level":4}]'::jsonb, true, 'Concept + trainable execution; duplicate Rhythm occurrence shares mapping.'),
    ('80000000-0000-4000-8000-000000000154'::uuid, 'Polytonal Concepts', 'RENAME', '[{"source":"guitarmanship","level":5}]'::jsonb, true, 'Normalized terminology.'),
    ('80000000-0000-4000-8000-000000000155'::uuid, 'Polytonality', 'KEEP', '[{"source":"musicianship","level":4}]'::jsonb, true, 'Canonical Concept.'),
    ('80000000-0000-4000-8000-000000000156'::uuid, 'Pop', 'KEEP', '[{"source":"playStyle","level":1}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000157'::uuid, 'Post-Rock', 'KEEP', '[{"source":"playStyle","level":3}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000158'::uuid, 'Power Chord Basics', 'SPLIT', '[{"source":"guitarmanship","level":1}]'::jsonb, true, 'Removes ''Basics'' difficulty from identity and separates execution from musical object.'),
    ('80000000-0000-4000-8000-000000000159'::uuid, 'Precision', 'KEEP', '[{"source":"physicalAttributeList","level":null}]'::jsonb, true, 'Canonical Physical Attribute.'),
    ('80000000-0000-4000-8000-000000000160'::uuid, 'Progressive Rock/Metal', 'RECLASSIFY', '[{"source":"playStyle","level":5}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000161'::uuid, 'Proper Finger Placement', 'MERGE', '[{"source":"guitarmanship","level":1}]'::jsonb, true, 'Same capability as the fretting-hand Finger Placement entry.'),
    ('80000000-0000-4000-8000-000000000162'::uuid, 'Pull-offs', 'RENAME', '[{"source":"frettingHand","level":1}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000163'::uuid, 'Quarter Notes', 'RENAME', '[{"source":"rhythm","level":1}]'::jsonb, true, 'Rhythmic material.'),
    ('80000000-0000-4000-8000-000000000164'::uuid, 'Rake Picking', 'RENAME', '[{"source":"pickingHand","level":3}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000165'::uuid, 'Reggae', 'KEEP', '[{"source":"playStyle","level":2}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000166'::uuid, 'Rest Strokes', 'RENAME', '[{"source":"pickingHand","level":1}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000167'::uuid, 'Rhythm', 'RECLASSIFY', '[{"source":"physicalAttributeList","level":null}]'::jsonb, true, 'Moves from selectable Physical Attribute to derived Musical Attribute.'),
    ('80000000-0000-4000-8000-000000000168'::uuid, 'Rhythm Guitar', 'RECLASSIFY', '[{"source":"playStyle","level":1}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000169'::uuid, 'Rhythmic Displacement', 'SPLIT', '[{"source":"musicianship","level":5}]'::jsonb, true, 'Concept + application Skill.'),
    ('80000000-0000-4000-8000-000000000170'::uuid, 'Rhythmic Subdivisions', 'RENAME', '[{"source":"musicianship","level":2}]'::jsonb, true, 'Trainable rhythm Skill.'),
    ('80000000-0000-4000-8000-000000000171'::uuid, 'Rock', 'KEEP', '[{"source":"playStyle","level":2}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000172'::uuid, 'Rumba Flamenca', 'MERGE', '[{"source":"rhythm","level":4}]'::jsonb, true, 'Style-specific rhythm becomes Context; merges with playStyle Flamenco Rumba.'),
    ('80000000-0000-4000-8000-000000000173'::uuid, 'Scale Box Shapes', 'RENAME', '[{"source":"guitarmanship","level":2}]'::jsonb, true, 'Shape knowledge is represented by the broader Scale Mapping Skill.'),
    ('80000000-0000-4000-8000-000000000174'::uuid, 'Scale-Degree Ear Training', 'RENAME', '[{"source":"musicianship","level":1}]'::jsonb, true, 'Exercise wording removed from identity.'),
    ('80000000-0000-4000-8000-000000000175'::uuid, 'Secondary Dominants', 'RENAME', '[{"source":"musicianship","level":2}]'::jsonb, true, 'Canonical singular Concept identity.'),
    ('80000000-0000-4000-8000-000000000176'::uuid, 'Shuffle', 'RENAME', '[{"source":"rhythm","level":2}]'::jsonb, true, 'Rhythmic feel Concept.'),
    ('80000000-0000-4000-8000-000000000177'::uuid, 'Simple Slides', 'MERGE', '[{"source":"guitarmanship","level":1}]'::jsonb, true, 'Difficulty adjective removed; merges with Sliding.'),
    ('80000000-0000-4000-8000-000000000178'::uuid, 'Single String', 'RENAME', '[{"source":"stringChallenge","level":1}]'::jsonb, true, 'Constraint, not Skill.'),
    ('80000000-0000-4000-8000-000000000179'::uuid, 'Single String Arpeggios', 'SPLIT', '[{"source":"stringChallenge","level":1}]'::jsonb, true, 'Compound challenge becomes constraint + Concept.'),
    ('80000000-0000-4000-8000-000000000180'::uuid, 'Single String Chord Voicings', 'DEFER', '[{"source":"stringChallenge","level":1}]'::jsonb, true, 'Original wording is musically ambiguous for simultaneous voicing; retain single-string restriction and rewrite objective during Quest migration.'),
    ('80000000-0000-4000-8000-000000000181'::uuid, 'Single String Melodies', 'SPLIT', '[{"source":"stringChallenge","level":1}]'::jsonb, true, 'Compound challenge becomes constraint + musical material.'),
    ('80000000-0000-4000-8000-000000000182'::uuid, 'Single String Pentatonic', 'SPLIT', '[{"source":"stringChallenge","level":1}]'::jsonb, true, 'Compound challenge becomes constraint + Concept.'),
    ('80000000-0000-4000-8000-000000000183'::uuid, 'Single String per Measure', 'RENAME', '[{"source":"stringChallenge","level":5}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000184'::uuid, 'Ska Rhythm', 'SPLIT', '[{"source":"rhythm","level":5}]'::jsonb, true, 'Style context separated from rhythm pattern.'),
    ('80000000-0000-4000-8000-000000000185'::uuid, 'Skip Every Other String', 'RENAME', '[{"source":"stringChallenge","level":4}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000186'::uuid, 'Skip Two Strings', 'RENAME', '[{"source":"stringChallenge","level":4}]'::jsonb, true, 'Legacy string challenge becomes a reusable execution Constraint.'),
    ('80000000-0000-4000-8000-000000000187'::uuid, 'Slap and Pop', 'RENAME', '[{"source":"pickingHand","level":4}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000188'::uuid, 'Slide Guitar', 'RECLASSIFY', '[{"source":"playStyle","level":4}]'::jsonb, true, 'Legacy play style becomes a Style/Playing-Role Context.'),
    ('80000000-0000-4000-8000-000000000189'::uuid, 'Sliding', 'RENAME', '[{"source":"frettingHand","level":1}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000190'::uuid, 'Strength', 'MERGE', '[{"source":"physicalAttributeList","level":null}]'::jsonb, true, 'Standalone Strength is removed; relevant physical capacity is represented through Endurance/Control contributions from specific Skills.'),
    ('80000000-0000-4000-8000-000000000191'::uuid, 'Stretching for Wide Intervals', 'RENAME', '[{"source":"frettingHand","level":4}]'::jsonb, true, 'Trainable physical execution ability.'),
    ('80000000-0000-4000-8000-000000000192'::uuid, 'String Skipping', 'KEEP', '[{"source":"pickingHand","level":5}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000193'::uuid, 'Sweep Picking', 'KEEP', '[{"source":"pickingHand","level":4}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000194'::uuid, 'Swing Eighths', 'RENAME', '[{"source":"rhythm","level":2}]'::jsonb, true, 'Rhythmic feel Concept.'),
    ('80000000-0000-4000-8000-000000000195'::uuid, 'Syncopation', 'SPLIT', '[{"source":"rhythm","level":2}]'::jsonb, true, 'Rhythmic device + application Skill.'),
    ('80000000-0000-4000-8000-000000000196'::uuid, 'Tapping (two-handed)', 'RENAME', '[{"source":"frettingHand","level":3}]'::jsonb, true, 'Canonical execution name.'),
    ('80000000-0000-4000-8000-000000000197'::uuid, 'Tapping (with pick)', 'RENAME', '[{"source":"pickingHand","level":4}]'::jsonb, true, 'Canonical execution name.'),
    ('80000000-0000-4000-8000-000000000198'::uuid, 'Theory', 'KEEP', '[{"source":"mentalAttributeList","level":null}]'::jsonb, true, 'Canonical Musical Attribute.'),
    ('80000000-0000-4000-8000-000000000199'::uuid, 'Tremolo Picking', 'KEEP', '[{"source":"pickingHand","level":3}]'::jsonb, true, 'Canonical picking/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000200'::uuid, 'Tremolo Strumming', 'KEEP', '[{"source":"rhythm","level":5}]'::jsonb, true, 'Canonical technique Skill.'),
    ('80000000-0000-4000-8000-000000000201'::uuid, 'Triad Construction', 'KEEP', '[{"source":"musicianship","level":1}]'::jsonb, true, 'Canonical theory Skill.'),
    ('80000000-0000-4000-8000-000000000202'::uuid, 'Triplet Feel', 'KEEP', '[{"source":"rhythm","level":2}]'::jsonb, true, 'Rhythmic feel Concept.'),
    ('80000000-0000-4000-8000-000000000203'::uuid, 'Two Strings for Chords', 'SPLIT', '[{"source":"stringChallenge","level":2}]'::jsonb, true, 'Parameterized string restriction + Concept.'),
    ('80000000-0000-4000-8000-000000000204'::uuid, 'Upstrokes', 'RENAME', '[{"source":"pickingHand","level":1},{"source":"rhythm","level":1}]'::jsonb, true, 'Canonical technique Skill; duplicate Rhythm occurrence merges here.'),
    ('80000000-0000-4000-8000-000000000205'::uuid, 'Vibrato', 'RENAME', '[{"source":"frettingHand","level":2}]'::jsonb, true, 'Canonical fretting/execution Skill; legacy level is provenance only.'),
    ('80000000-0000-4000-8000-000000000206'::uuid, 'Voice Leading', 'KEEP', '[{"source":"guitarmanship","level":4}]'::jsonb, true, 'Canonical Harmony & Theory Skill.'),
    ('80000000-0000-4000-8000-000000000207'::uuid, 'Whole-Tone', 'KEEP', '[{"source":"scales","level":3}]'::jsonb, true, 'Scale/mode material is a Concept; prototype level is not retained as inherent difficulty.')
  on conflict (id) do update
  set
    legacy_value = excluded.legacy_value,
    disposition = excluded.disposition,
    source_occurrences = excluded.source_occurrences,
    legacy_levels_are_provenance_only = excluded.legacy_levels_are_provenance_only,
    notes = excluded.notes;

  insert into private.taxonomy_legacy_mapping_targets (
    mapping_id,
    ordinal,
    entity_id,
    parameters
  )
  values
    ('80000000-0000-4000-8000-000000000001'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"A"}'::jsonb),
    ('80000000-0000-4000-8000-000000000002'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"A#/Bb"}'::jsonb),
    ('80000000-0000-4000-8000-000000000004'::uuid, 1, '50000000-0000-4000-8000-000000000001'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000005'::uuid, 1, '30000000-0000-4000-8000-000000000006'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000006'::uuid, 1, '20000000-0000-4000-8000-000000000008'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000006'::uuid, 2, '70000000-0000-4000-8000-000000000001'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000007'::uuid, 1, '20000000-0000-4000-8000-000000000031'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000008'::uuid, 1, '20000000-0000-4000-8000-000000000037'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000008'::uuid, 2, '30000000-0000-4000-8000-000000000045'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000009'::uuid, 1, '20000000-0000-4000-8000-000000000071'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000010'::uuid, 1, '20000000-0000-4000-8000-000000000001'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000011'::uuid, 1, '40000000-0000-4000-8000-000000000001'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000012'::uuid, 1, '30000000-0000-4000-8000-000000000002'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000012'::uuid, 2, '40000000-0000-4000-8000-000000000013'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000013'::uuid, 1, '30000000-0000-4000-8000-000000000003'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000014'::uuid, 1, '20000000-0000-4000-8000-000000000003'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000015'::uuid, 1, '20000000-0000-4000-8000-000000000004'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000016'::uuid, 1, '30000000-0000-4000-8000-000000000005'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000016'::uuid, 2, '30000000-0000-4000-8000-000000000058'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000017'::uuid, 1, '60000000-0000-4000-8000-000000000005'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000018'::uuid, 1, '40000000-0000-4000-8000-000000000002'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000019'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"B"}'::jsonb),
    ('80000000-0000-4000-8000-000000000020'::uuid, 1, '20000000-0000-4000-8000-000000000005'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000021'::uuid, 1, '20000000-0000-4000-8000-000000000006'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000022'::uuid, 1, '30000000-0000-4000-8000-000000000030'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000023'::uuid, 1, '20000000-0000-4000-8000-000000000007'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000024'::uuid, 1, '30000000-0000-4000-8000-000000000007'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000025'::uuid, 1, '30000000-0000-4000-8000-000000000008'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000026'::uuid, 1, '30000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000027'::uuid, 1, '20000000-0000-4000-8000-000000000008'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000029'::uuid, 1, '40000000-0000-4000-8000-000000000003'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000030'::uuid, 1, '30000000-0000-4000-8000-000000000010'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000031'::uuid, 1, '20000000-0000-4000-8000-000000000055'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000031'::uuid, 2, '30000000-0000-4000-8000-000000000010'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000032'::uuid, 1, '40000000-0000-4000-8000-000000000004'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000033'::uuid, 1, '40000000-0000-4000-8000-000000000005'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000034'::uuid, 1, '30000000-0000-4000-8000-000000000011'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000035'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"C"}'::jsonb),
    ('80000000-0000-4000-8000-000000000036'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"C#/Db"}'::jsonb),
    ('80000000-0000-4000-8000-000000000037'::uuid, 1, '50000000-0000-4000-8000-000000000002'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000038'::uuid, 1, '20000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000039'::uuid, 1, '30000000-0000-4000-8000-000000000026'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000039'::uuid, 2, '20000000-0000-4000-8000-000000000002'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000040'::uuid, 1, '20000000-0000-4000-8000-000000000010'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000040'::uuid, 2, '30000000-0000-4000-8000-000000000012'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000042'::uuid, 1, '20000000-0000-4000-8000-000000000012'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000042'::uuid, 2, '30000000-0000-4000-8000-000000000013'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000043'::uuid, 1, '20000000-0000-4000-8000-000000000011'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000044'::uuid, 1, '20000000-0000-4000-8000-000000000041'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000045'::uuid, 1, '40000000-0000-4000-8000-000000000006'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000046'::uuid, 1, '20000000-0000-4000-8000-000000000013'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000047'::uuid, 1, '20000000-0000-4000-8000-000000000013'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000048'::uuid, 1, '60000000-0000-4000-8000-000000000002'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000049'::uuid, 1, '20000000-0000-4000-8000-000000000014'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000049'::uuid, 2, '30000000-0000-4000-8000-000000000015'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000050'::uuid, 1, '20000000-0000-4000-8000-000000000068'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000050'::uuid, 2, '30000000-0000-4000-8000-000000000015'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000051'::uuid, 1, '20000000-0000-4000-8000-000000000068'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000051'::uuid, 2, '30000000-0000-4000-8000-000000000015'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000052'::uuid, 1, '40000000-0000-4000-8000-000000000007'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000053'::uuid, 1, '60000000-0000-4000-8000-000000000003'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000054'::uuid, 1, '30000000-0000-4000-8000-000000000016'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000054'::uuid, 2, '20000000-0000-4000-8000-000000000015'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000055'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"D"}'::jsonb),
    ('80000000-0000-4000-8000-000000000056'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"D#/Eb"}'::jsonb),
    ('80000000-0000-4000-8000-000000000057'::uuid, 1, '20000000-0000-4000-8000-000000000016'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000058'::uuid, 1, '60000000-0000-4000-8000-000000000004'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000059'::uuid, 1, '30000000-0000-4000-8000-000000000017'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000060'::uuid, 1, '30000000-0000-4000-8000-000000000017'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000061'::uuid, 1, '30000000-0000-4000-8000-000000000018'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000062'::uuid, 1, '30000000-0000-4000-8000-000000000056'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000062'::uuid, 2, '20000000-0000-4000-8000-000000000052'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000063'::uuid, 1, '40000000-0000-4000-8000-000000000008'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000064'::uuid, 1, '40000000-0000-4000-8000-000000000008'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000064'::uuid, 2, '30000000-0000-4000-8000-000000000019'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000065'::uuid, 1, '30000000-0000-4000-8000-000000000020'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000066'::uuid, 1, '20000000-0000-4000-8000-000000000017'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000066'::uuid, 2, '30000000-0000-4000-8000-000000000021'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000066'::uuid, 3, '50000000-0000-4000-8000-000000000003'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000067'::uuid, 1, '20000000-0000-4000-8000-000000000018'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000068'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"E"}'::jsonb),
    ('80000000-0000-4000-8000-000000000069'::uuid, 1, '20000000-0000-4000-8000-000000000019'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000070'::uuid, 1, '30000000-0000-4000-8000-000000000022'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000071'::uuid, 1, '60000000-0000-4000-8000-000000000007'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000072'::uuid, 1, '30000000-0000-4000-8000-000000000023'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000073'::uuid, 1, '50000000-0000-4000-8000-000000000004'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000074'::uuid, 1, '70000000-0000-4000-8000-000000000002'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000075'::uuid, 1, '30000000-0000-4000-8000-000000000024'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000077'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"F"}'::jsonb),
    ('80000000-0000-4000-8000-000000000078'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"F#/Gb"}'::jsonb),
    ('80000000-0000-4000-8000-000000000079'::uuid, 1, '20000000-0000-4000-8000-000000000020'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000080'::uuid, 1, '20000000-0000-4000-8000-000000000021'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000081'::uuid, 1, '20000000-0000-4000-8000-000000000022'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000082'::uuid, 1, '20000000-0000-4000-8000-000000000022'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000082'::uuid, 2, '50000000-0000-4000-8000-000000000007'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000083'::uuid, 1, '20000000-0000-4000-8000-000000000023'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000084'::uuid, 1, '40000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000085'::uuid, 1, '40000000-0000-4000-8000-000000000010'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000086'::uuid, 1, '20000000-0000-4000-8000-000000000024'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000087'::uuid, 1, '60000000-0000-4000-8000-000000000004'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000089'::uuid, 1, '40000000-0000-4000-8000-000000000011'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000090'::uuid, 1, '20000000-0000-4000-8000-000000000025'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000091'::uuid, 1, '20000000-0000-4000-8000-000000000026'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000092'::uuid, 1, '20000000-0000-4000-8000-000000000038'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000093'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"G"}'::jsonb),
    ('80000000-0000-4000-8000-000000000094'::uuid, 1, '40000000-0000-4000-8000-000000000028'::uuid, '{"pitch_class":"G#/Ab"}'::jsonb),
    ('80000000-0000-4000-8000-000000000095'::uuid, 1, '30000000-0000-4000-8000-000000000025'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000096'::uuid, 1, '20000000-0000-4000-8000-000000000027'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000097'::uuid, 1, '40000000-0000-4000-8000-000000000012'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000098'::uuid, 1, '20000000-0000-4000-8000-000000000028'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000099'::uuid, 1, '20000000-0000-4000-8000-000000000029'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000100'::uuid, 1, '20000000-0000-4000-8000-000000000029'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000100'::uuid, 2, '20000000-0000-4000-8000-000000000049'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000101'::uuid, 1, '30000000-0000-4000-8000-000000000027'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000102'::uuid, 1, '20000000-0000-4000-8000-000000000030'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000103'::uuid, 1, '50000000-0000-4000-8000-000000000005'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000104'::uuid, 1, '30000000-0000-4000-8000-000000000028'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000105'::uuid, 1, '30000000-0000-4000-8000-000000000029'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000106'::uuid, 1, '20000000-0000-4000-8000-000000000031'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000107'::uuid, 1, '20000000-0000-4000-8000-000000000031'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000107'::uuid, 2, '50000000-0000-4000-8000-000000000007'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000110'::uuid, 1, '30000000-0000-4000-8000-000000000048'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000111'::uuid, 1, '30000000-0000-4000-8000-000000000031'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000112'::uuid, 1, '20000000-0000-4000-8000-000000000032'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000113'::uuid, 1, '40000000-0000-4000-8000-000000000014'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000114'::uuid, 1, '40000000-0000-4000-8000-000000000019'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000115'::uuid, 1, '20000000-0000-4000-8000-000000000033'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000116'::uuid, 1, '20000000-0000-4000-8000-000000000033'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000117'::uuid, 1, '30000000-0000-4000-8000-000000000033'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000118'::uuid, 1, '50000000-0000-4000-8000-000000000006'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000119'::uuid, 1, '30000000-0000-4000-8000-000000000034'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000120'::uuid, 1, '30000000-0000-4000-8000-000000000036'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000120'::uuid, 2, '30000000-0000-4000-8000-000000000032'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000121'::uuid, 1, '40000000-0000-4000-8000-000000000015'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000122'::uuid, 1, '30000000-0000-4000-8000-000000000037'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000123'::uuid, 1, '20000000-0000-4000-8000-000000000057'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000123'::uuid, 2, '30000000-0000-4000-8000-000000000037'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000124'::uuid, 1, '40000000-0000-4000-8000-000000000016'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000125'::uuid, 1, '30000000-0000-4000-8000-000000000041'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000125'::uuid, 2, '20000000-0000-4000-8000-000000000034'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000126'::uuid, 1, '30000000-0000-4000-8000-000000000041'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000126'::uuid, 2, '20000000-0000-4000-8000-000000000034'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000127'::uuid, 1, '20000000-0000-4000-8000-000000000035'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000128'::uuid, 1, '30000000-0000-4000-8000-000000000043'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000129'::uuid, 1, '20000000-0000-4000-8000-000000000036'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000130'::uuid, 1, '30000000-0000-4000-8000-000000000044'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000131'::uuid, 1, '30000000-0000-4000-8000-000000000044'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000132'::uuid, 1, '30000000-0000-4000-8000-000000000044'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000133'::uuid, 1, '30000000-0000-4000-8000-000000000046'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000133'::uuid, 2, '30000000-0000-4000-8000-000000000001'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000134'::uuid, 1, '40000000-0000-4000-8000-000000000017'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000135'::uuid, 1, '20000000-0000-4000-8000-000000000053'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000135'::uuid, 2, '40000000-0000-4000-8000-000000000017'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000136'::uuid, 1, '20000000-0000-4000-8000-000000000054'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000136'::uuid, 2, '40000000-0000-4000-8000-000000000017'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000137'::uuid, 1, '50000000-0000-4000-8000-000000000007'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000138'::uuid, 1, '30000000-0000-4000-8000-000000000047'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000139'::uuid, 1, '50000000-0000-4000-8000-000000000008'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000140'::uuid, 1, '20000000-0000-4000-8000-000000000039'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000140'::uuid, 2, '30000000-0000-4000-8000-000000000039'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000140'::uuid, 3, '30000000-0000-4000-8000-000000000040'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000142'::uuid, 1, '20000000-0000-4000-8000-000000000040'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000143'::uuid, 1, '20000000-0000-4000-8000-000000000042'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000144'::uuid, 1, '30000000-0000-4000-8000-000000000035'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000145'::uuid, 1, '30000000-0000-4000-8000-000000000042'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000146'::uuid, 1, '20000000-0000-4000-8000-000000000057'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000146'::uuid, 2, '30000000-0000-4000-8000-000000000049'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000147'::uuid, 1, '40000000-0000-4000-8000-000000000018'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000148'::uuid, 1, '20000000-0000-4000-8000-000000000043'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000149'::uuid, 1, '30000000-0000-4000-8000-000000000050'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000150'::uuid, 1, '30000000-0000-4000-8000-000000000051'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000151'::uuid, 1, '20000000-0000-4000-8000-000000000044'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000152'::uuid, 1, '20000000-0000-4000-8000-000000000046'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000153'::uuid, 1, '30000000-0000-4000-8000-000000000052'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000153'::uuid, 2, '20000000-0000-4000-8000-000000000047'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000154'::uuid, 1, '30000000-0000-4000-8000-000000000053'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000155'::uuid, 1, '30000000-0000-4000-8000-000000000053'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000156'::uuid, 1, '40000000-0000-4000-8000-000000000021'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000157'::uuid, 1, '40000000-0000-4000-8000-000000000022'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000158'::uuid, 1, '20000000-0000-4000-8000-000000000048'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000158'::uuid, 2, '30000000-0000-4000-8000-000000000054'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000159'::uuid, 1, '60000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000160'::uuid, 1, '40000000-0000-4000-8000-000000000023'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000161'::uuid, 1, '20000000-0000-4000-8000-000000000021'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000162'::uuid, 1, '20000000-0000-4000-8000-000000000049'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000163'::uuid, 1, '30000000-0000-4000-8000-000000000055'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000164'::uuid, 1, '20000000-0000-4000-8000-000000000050'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000165'::uuid, 1, '40000000-0000-4000-8000-000000000024'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000166'::uuid, 1, '20000000-0000-4000-8000-000000000051'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000167'::uuid, 1, '60000000-0000-4000-8000-000000000010'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000168'::uuid, 1, '40000000-0000-4000-8000-000000000020'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000169'::uuid, 1, '30000000-0000-4000-8000-000000000056'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000169'::uuid, 2, '20000000-0000-4000-8000-000000000052'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000170'::uuid, 1, '20000000-0000-4000-8000-000000000061'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000171'::uuid, 1, '40000000-0000-4000-8000-000000000025'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000172'::uuid, 1, '40000000-0000-4000-8000-000000000010'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000173'::uuid, 1, '20000000-0000-4000-8000-000000000057'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000174'::uuid, 1, '20000000-0000-4000-8000-000000000056'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000175'::uuid, 1, '30000000-0000-4000-8000-000000000057'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000176'::uuid, 1, '30000000-0000-4000-8000-000000000059'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000177'::uuid, 1, '20000000-0000-4000-8000-000000000059'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000178'::uuid, 1, '50000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000179'::uuid, 1, '50000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000179'::uuid, 2, '30000000-0000-4000-8000-000000000004'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000180'::uuid, 1, '50000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000181'::uuid, 1, '50000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000181'::uuid, 2, '30000000-0000-4000-8000-000000000038'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000182'::uuid, 1, '50000000-0000-4000-8000-000000000009'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000182'::uuid, 2, '30000000-0000-4000-8000-000000000049'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000183'::uuid, 1, '50000000-0000-4000-8000-000000000010'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000184'::uuid, 1, '40000000-0000-4000-8000-000000000026'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000184'::uuid, 2, '30000000-0000-4000-8000-000000000060'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000185'::uuid, 1, '50000000-0000-4000-8000-000000000011'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000186'::uuid, 1, '50000000-0000-4000-8000-000000000012'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000187'::uuid, 1, '20000000-0000-4000-8000-000000000058'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000188'::uuid, 1, '40000000-0000-4000-8000-000000000027'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000189'::uuid, 1, '20000000-0000-4000-8000-000000000059'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000190'::uuid, 1, '60000000-0000-4000-8000-000000000006'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000190'::uuid, 2, '60000000-0000-4000-8000-000000000001'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000191'::uuid, 1, '20000000-0000-4000-8000-000000000072'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000192'::uuid, 1, '20000000-0000-4000-8000-000000000060'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000193'::uuid, 1, '20000000-0000-4000-8000-000000000062'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000194'::uuid, 1, '30000000-0000-4000-8000-000000000061'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000195'::uuid, 1, '30000000-0000-4000-8000-000000000062'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000195'::uuid, 2, '20000000-0000-4000-8000-000000000063'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000196'::uuid, 1, '20000000-0000-4000-8000-000000000067'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000197'::uuid, 1, '20000000-0000-4000-8000-000000000045'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000198'::uuid, 1, '60000000-0000-4000-8000-000000000011'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000199'::uuid, 1, '20000000-0000-4000-8000-000000000064'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000200'::uuid, 1, '20000000-0000-4000-8000-000000000065'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000201'::uuid, 1, '20000000-0000-4000-8000-000000000066'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000202'::uuid, 1, '30000000-0000-4000-8000-000000000063'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000203'::uuid, 1, '50000000-0000-4000-8000-000000000013'::uuid, '{"count":2}'::jsonb),
    ('80000000-0000-4000-8000-000000000203'::uuid, 2, '30000000-0000-4000-8000-000000000014'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000204'::uuid, 1, '20000000-0000-4000-8000-000000000069'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000205'::uuid, 1, '20000000-0000-4000-8000-000000000070'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000206'::uuid, 1, '20000000-0000-4000-8000-000000000071'::uuid, '{}'::jsonb),
    ('80000000-0000-4000-8000-000000000207'::uuid, 1, '30000000-0000-4000-8000-000000000064'::uuid, '{}'::jsonb)
  on conflict (mapping_id, ordinal) do update
  set
    entity_id = excluded.entity_id,
    parameters = excluded.parameters;
end;
$$;

revoke all on function private.seed_taxonomy_v1() from public, anon, authenticated;
grant execute on function private.seed_taxonomy_v1() to service_role;

select private.seed_taxonomy_v1();

commit;
