-- DATA-002: persistence/security foundation.
-- No product tables are created by this migration.

begin;

create schema if not exists private;

comment on schema private is
  'GuitaRPG server/private database objects. Not exposed through the client Data API.';

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

-- Ordinary API roles may use public objects only when later migrations explicitly
-- grant access. They may never create objects in the exposed schema.
revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

-- Migrations run as the database owner. Keep future objects opt-in for client roles
-- instead of relying on broad platform defaults.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

alter default privileges in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges in schema public
  revoke execute on functions from anon, authenticated;

commit;
