-- QST-003-R2: enable TRAINING at the existing authenticated QST_GEN_V1 persistence boundary.
-- The prior applied function remains authoritative; this forward-only migration changes only its
-- explicit generation-mode allowlist and associated diagnostic.

begin;

do $migration$
declare
  function_definition text;
  old_guard constant text := 'not in (''QUICK'', ''CUSTOM'')';
  new_guard constant text := 'not in (''QUICK'', ''CUSTOM'', ''TRAINING'')';
  old_message constant text := 'Only QUICK or CUSTOM generated Quests are supported';
  new_message constant text := 'Only QUICK, CUSTOM, or TRAINING generated Quests are supported';
begin
  select pg_get_functiondef('public.persist_generated_quest(jsonb)'::regprocedure)
  into function_definition;

  if position(old_guard in function_definition) = 0
     or position(old_message in function_definition) = 0 then
    raise exception 'QST-003-R2 expected the QST-003-R1 persistence guard';
  end if;

  function_definition := replace(function_definition, old_guard, new_guard);
  function_definition := replace(function_definition, old_message, new_message);
  execute function_definition;
end;
$migration$;

commit;
