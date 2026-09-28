-- TAX-003 canonical taxonomy seed.
-- Migrations install the schema and seed function; local resets may safely re-run this seed.
-- Player-owned data must never be committed here.

select private.seed_taxonomy_v1();
