-- TAX-003-R1: canonical tuning Context remediation.
-- Adds the TAX-001 tuning examples required by PLY-001 without rewriting TAX-003 history.

begin;

create or replace function private.seed_taxonomy_tuning_contexts_v1()
returns void
language plpgsql
security definer
set search_path = ''
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
    (
      '40000000-0000-4000-8000-000000000029'::uuid,
      'CONTEXT',
      'standard_tuning',
      'Standard Tuning',
      'ACTIVE',
      null,
      '{"source":"TAX-001","legacy_derived":false,"context_family":"TUNING","string_count":6,"open_strings_low_to_high":["E2","A2","D3","G3","B3","E4"]}'::jsonb
    ),
    (
      '40000000-0000-4000-8000-000000000030'::uuid,
      'CONTEXT',
      'dadgad',
      'DADGAD',
      'ACTIVE',
      null,
      '{"source":"TAX-001","legacy_derived":false,"context_family":"TUNING","string_count":6,"open_strings_low_to_high":["D2","A2","D3","G3","A3","D4"]}'::jsonb
    ),
    (
      '40000000-0000-4000-8000-000000000031'::uuid,
      'CONTEXT',
      'drop_d',
      'Drop D',
      'ACTIVE',
      null,
      '{"source":"TAX-001","legacy_derived":false,"context_family":"TUNING","string_count":6,"open_strings_low_to_high":["D2","A2","D3","G3","B3","E4"]}'::jsonb
    )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    lifecycle = excluded.lifecycle,
    replacement_entity_id = excluded.replacement_entity_id,
    metadata = excluded.metadata;
end;
$$;

revoke all on function private.seed_taxonomy_tuning_contexts_v1()
  from public, anon, authenticated;
grant execute on function private.seed_taxonomy_tuning_contexts_v1()
  to service_role;

select private.seed_taxonomy_tuning_contexts_v1();

do $tax_003_r1$
declare
  entity_count bigint;
  context_count bigint;
  tuning_count bigint;
begin
  select count(*) into entity_count
  from public.taxonomy_entities;

  select count(*) into context_count
  from public.taxonomy_entities
  where kind = 'CONTEXT';

  select count(*) into tuning_count
  from public.taxonomy_entities
  where kind = 'CONTEXT'
    and metadata ->> 'context_family' = 'TUNING'
    and slug in ('standard_tuning', 'dadgad', 'drop_d');

  if entity_count <> 199 then
    raise exception 'TAX-003-R1 expected 199 canonical entities, found %', entity_count;
  end if;

  if context_count <> 31 then
    raise exception 'TAX-003-R1 expected 31 canonical Contexts, found %', context_count;
  end if;

  if tuning_count <> 3 then
    raise exception 'TAX-003-R1 expected 3 canonical tuning Contexts, found %', tuning_count;
  end if;
end;
$tax_003_r1$;

commit;
