begin;
set local search_path=extensions,public;
set local role postgres;
create extension if not exists pgtap with schema extensions;
select * from extensions.no_plan();

select extensions.has_table('public','player_workbooks','Workbook table exists');
select extensions.has_table('public','player_workbook_pages','Workbook page table exists');
select extensions.has_table('public','player_workbook_page_revisions','Workbook revision table exists');
select extensions.ok((select relrowsecurity from pg_class where oid='public.player_workbooks'::regclass),'Workbook RLS enabled');
select extensions.ok((select relrowsecurity from pg_class where oid='public.player_workbook_pages'::regclass),'page RLS enabled');
select extensions.ok((select relrowsecurity from pg_class where oid='public.player_workbook_page_revisions'::regclass),'revision RLS enabled');
select extensions.ok(not has_table_privilege('authenticated','public.player_workbooks','insert'),'direct Workbook insert denied');
select extensions.ok(not has_table_privilege('authenticated','public.player_workbook_pages','update'),'direct page update denied');
select extensions.ok(not has_table_privilege('authenticated','public.player_workbook_page_revisions','delete'),'direct revision delete denied');
select extensions.ok(has_function_privilege('authenticated','public.save_player_workbook_page_v1(uuid,integer,text,jsonb,uuid)','execute'),'authenticated save RPC allowed');
select extensions.ok(not has_function_privilege('anon','public.save_player_workbook_page_v1(uuid,integer,text,jsonb,uuid)','execute'),'anon save RPC denied');
select extensions.is((select proconfig from pg_proc where oid='public.save_player_workbook_page_v1(uuid,integer,text,jsonb,uuid)'::regprocedure),array['search_path=""']::text[],'save RPC has empty search path');

insert into auth.users(id,email,is_anonymous) values
('c2111111-1111-4111-8111-111111111111','workbook-owner@example.com',false),
('c2222222-2222-4222-8222-222222222222','workbook-other@example.com',false),
('c2333333-3333-4333-8333-333333333333',null,true);

set local role authenticated;
set local request.jwt.claim.sub='c2111111-1111-4111-8111-111111111111';

create temporary table created_workbook as
select public.create_player_workbook_v1(
  'Technique notes',null,'WORKBOOK',
  '{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}',
  'c2444444-4444-4444-8444-444444444444'
) value;

select extensions.is((select count(*)::bigint from public.player_workbooks),1::bigint,'owner reads created Workbook');
select extensions.is((select count(*)::bigint from public.player_workbook_pages),1::bigint,'create also creates first page');
select extensions.is((select count(*)::bigint from public.player_workbook_page_revisions),1::bigint,'initial snapshot recorded');

create temporary table ids as select
  (value#>>'{workbook,id}')::uuid workbook_id,
  (value#>>'{page,id}')::uuid page_id
from created_workbook;

select extensions.is(
  (public.save_player_workbook_page_v1(
    (select page_id from ids),1,'First page',
    '{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[{"id":"c2555555-5555-4555-8555-555555555555","version":1,"type":"paragraph","content":[{"text":"saved"}]}]}',
    'c2666666-6666-4666-8666-666666666666'
  )->>'status'),'accepted','current revision saves');
select extensions.is((select revision from public.player_workbook_pages where id=(select page_id from ids)),2,'accepted save advances revision');
select extensions.is((select count(*)::bigint from public.player_workbook_page_revisions where page_id=(select page_id from ids)),2::bigint,'accepted save appends snapshot');

select extensions.is(
  (public.save_player_workbook_page_v1(
    (select page_id from ids),1,'First page',
    '{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}',
    'c2777777-7777-4777-8777-777777777777'
  )->>'status'),'conflict','stale revision conflicts');
select extensions.is((select revision from public.player_workbook_pages where id=(select page_id from ids)),2,'conflict does not mutate current page');

select extensions.is(
  (public.save_player_workbook_page_v1(
    (select page_id from ids),1,'First page',
    '{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}',
    'c2666666-6666-4666-8666-666666666666'
  )->>'idempotent'),'true','duplicate request is idempotent');
select extensions.is((select count(*)::bigint from public.player_workbook_page_revisions where page_id=(select page_id from ids)),2::bigint,'duplicate request creates no revision');

select extensions.throws_ok(
  $$select public.save_player_workbook_page_v1((select page_id from ids),2,'Bad','{"type":"bad"}','c2888888-8888-4888-8888-888888888888')$$,
  '22023',null,'malformed documents are rejected');

set local request.jwt.claim.sub='c2222222-2222-4222-8222-222222222222';
select extensions.is((select count(*)::bigint from public.player_workbooks),0::bigint,'other Player reads no Workbooks');
select extensions.throws_ok(
  $$select public.save_player_workbook_page_v1((select page_id from ids),2,'Forged','{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}','c2999999-9999-4999-8999-999999999999')$$,
  '42501',null,'other Player cannot forge page ownership');

set local request.jwt.claim.sub='c2333333-3333-4333-8333-333333333333';
select public.create_player_quick_note_v1(null,'{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}','c2aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select public.create_player_quick_note_v1(null,'{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}','c2bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select extensions.is((select count(*)::bigint from public.player_workbooks where kind='QUICK_NOTES'),1::bigint,'consecutive Quick Notes share one owner Workbook');
select extensions.is((select count(*)::bigint from public.player_workbook_pages),2::bigint,'guest can own multiple Quick Note pages');

set local role postgres;
delete from auth.users where id='c2111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::bigint from public.player_workbooks where player_id='c2111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes Workbooks');
select extensions.is((select count(*)::bigint from public.player_workbook_pages where player_id='c2111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes pages');
select extensions.is((select count(*)::bigint from public.player_workbook_page_revisions where player_id='c2111111-1111-4111-8111-111111111111'),0::bigint,'account deletion removes revisions');

select * from extensions.finish();
rollback;
