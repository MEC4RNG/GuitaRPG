-- JRN-002: Player-owned Workbook persistence, revisions, and trusted mutations.

begin;

create table public.player_workbooks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  kind text not null default 'WORKBOOK' check (kind in ('WORKBOOK', 'QUICK_NOTES')),
  archived_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, player_id)
);

create unique index player_workbooks_one_quick_notes_per_player
  on public.player_workbooks(player_id) where kind = 'QUICK_NOTES';
create index player_workbooks_owner_updated
  on public.player_workbooks(player_id, archived_at, updated_at desc);

create table public.player_workbook_pages (
  id uuid primary key default gen_random_uuid(),
  workbook_id uuid not null,
  player_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  position integer not null check (position > 0),
  document_schema_version integer not null default 1 check (document_schema_version = 1),
  document jsonb not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_workbook_pages_workbook_owner_fk
    foreign key (workbook_id, player_id)
    references public.player_workbooks(id, player_id) on delete cascade,
  unique (id, player_id),
  unique (workbook_id, position)
);

create index player_workbook_pages_owner_workbook
  on public.player_workbook_pages(player_id, workbook_id, position);

create table public.player_workbook_page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null,
  player_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  document_schema_version integer not null check (document_schema_version = 1),
  document jsonb not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint player_workbook_page_revisions_page_owner_fk
    foreign key (page_id, player_id)
    references public.player_workbook_pages(id, player_id) on delete cascade,
  unique (page_id, revision),
  unique (page_id, request_id)
);

create index player_workbook_page_revisions_history
  on public.player_workbook_page_revisions(player_id, page_id, revision desc);

comment on table public.player_workbook_page_revisions is
  'Immutable accepted page snapshots. Trusted writes retain the newest 50 snapshots per page, including the current revision.';

create or replace function public.workbook_document_v1_is_valid(p_document jsonb)
returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  block jsonb;
  event jsonb;
  note jsonb;
  string_state jsonb;
  block_ids text[] := '{}';
  event_ids text[];
  block_count integer;
  total_events integer := 0;
begin
  if p_document is null
    or jsonb_typeof(p_document) <> 'object'
    or p_document->>'type' <> 'GUITARPG_WORKBOOK_DOCUMENT_V1'
    or p_document->>'schema_version' <> '1'
    or jsonb_typeof(p_document->'blocks') <> 'array'
    or octet_length(p_document::text) > 524288 then
    return false;
  end if;

  block_count := jsonb_array_length(p_document->'blocks');
  if block_count > 200 then return false; end if;

  for block in select value from jsonb_array_elements(p_document->'blocks') loop
    if jsonb_typeof(block) <> 'object'
      or char_length(coalesce(block->>'id', '')) not between 1 and 100
      or block->>'id' = any(block_ids)
      or coalesce((block->>'version')::integer, 0) < 1
      or coalesce(block->>'type', '') not in
        ('paragraph','heading','bullet_list','ordered_list','guitar_tab','chord_diagram','unsupported') then
      return false;
    end if;
    block_ids := array_append(block_ids, block->>'id');

    if block->>'type' in ('paragraph','heading') then
      if jsonb_typeof(block->'content') <> 'array' or octet_length((block->'content')::text) > 32768 then return false; end if;
    elsif block->>'type' in ('bullet_list','ordered_list') then
      if jsonb_typeof(block->'items') <> 'array' or jsonb_array_length(block->'items') > 100
        or octet_length((block->'items')::text) > 65536 then return false; end if;
    elsif block->>'type' = 'guitar_tab' then
      if block->>'version' <> '1' or jsonb_typeof(block->'events') <> 'array'
        or jsonb_array_length(block->'events') not between 1 and 512
        or coalesce((block->>'positions_per_line')::integer, 16) not in (4,8,12,16)
        or block#>>'{tuning,slug}' not in ('standard','dadgad')
        or coalesce(jsonb_array_length(block#>'{tuning,strings_low_to_high}'),-1) <> 6 then return false; end if;
      total_events := total_events + jsonb_array_length(block->'events');
      if total_events > 2048 then return false; end if;
      event_ids := '{}';
      for event in select value from jsonb_array_elements(block->'events') loop
        if char_length(coalesce(event->>'id','')) not between 1 and 100
          or event->>'id' = any(event_ids)
          or jsonb_typeof(event->'notes') <> 'array'
          or jsonb_array_length(event->'notes') > 6 then return false; end if;
        event_ids := array_append(event_ids, event->>'id');
        for note in select value from jsonb_array_elements(event->'notes') loop
          if coalesce((note->>'string_number')::integer, 0) not between 1 and 6
            or note->>'state' not in ('FRETTED','OPEN','MUTED')
            or (note->>'state' = 'FRETTED' and coalesce((note->>'fret')::integer, -1) not between 0 and 36)
            then return false; end if;
        end loop;
      end loop;
    elsif block->>'type' = 'chord_diagram' then
      if block->>'version' <> '1' or char_length(coalesce(block->>'name','')) not between 1 and 80
        or block#>>'{tuning,slug}' not in ('standard','dadgad')
        or coalesce(jsonb_array_length(block#>'{tuning,strings_low_to_high}'),-1) <> 6
        or jsonb_typeof(block->'strings') <> 'array' or jsonb_array_length(block->'strings') <> 6
        or jsonb_typeof(block->'barres') <> 'array' or jsonb_array_length(block->'barres') > 6
        or coalesce((block->>'fret_window_start')::integer, 0) not between 1 and 33 then return false; end if;
      for string_state in select value from jsonb_array_elements(block->'strings') loop
        if coalesce((string_state->>'string_number')::integer, 0) not between 1 and 6
          or string_state->>'state' not in ('FRETTED','OPEN','MUTED')
          or (string_state->>'state' = 'FRETTED' and coalesce((string_state->>'fret')::integer, -1) not between 0 and 36)
          then return false; end if;
      end loop;
    elsif block->>'type' = 'unsupported' and not (block ? 'original') then
      return false;
    end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

alter table public.player_workbook_pages add constraint player_workbook_pages_document_valid
  check (public.workbook_document_v1_is_valid(document));
alter table public.player_workbook_page_revisions add constraint player_workbook_revisions_document_valid
  check (public.workbook_document_v1_is_valid(document));

alter table public.player_workbooks enable row level security;
alter table public.player_workbook_pages enable row level security;
alter table public.player_workbook_page_revisions enable row level security;

create policy player_workbooks_owner_read on public.player_workbooks for select to authenticated
  using (player_id = auth.uid());
create policy player_workbook_pages_owner_read on public.player_workbook_pages for select to authenticated
  using (player_id = auth.uid());
create policy player_workbook_revisions_owner_read on public.player_workbook_page_revisions for select to authenticated
  using (player_id = auth.uid());

revoke all on table public.player_workbooks, public.player_workbook_pages,
  public.player_workbook_page_revisions from public, anon, authenticated;
grant select on table public.player_workbooks, public.player_workbook_pages,
  public.player_workbook_page_revisions to authenticated;

create or replace function public.create_player_workbook_v1(
  p_title text,
  p_description text default null,
  p_kind text default 'WORKBOOK',
  p_document jsonb default '{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}'::jsonb,
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); workbook_row public.player_workbooks; page_row public.player_workbook_pages;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  if p_kind not in ('WORKBOOK','QUICK_NOTES') or char_length(btrim(p_title)) not between 1 and 120
    or (p_description is not null and char_length(p_description) > 1000) then
    raise exception using errcode='22023', message='Invalid Workbook metadata';
  end if;
  if not public.workbook_document_v1_is_valid(p_document) then
    raise exception using errcode='22023', message='Invalid Workbook document';
  end if;
  insert into public.player_workbooks(player_id,title,description,kind)
    values(caller_id,btrim(p_title),nullif(btrim(p_description),''),p_kind) returning * into workbook_row;
  insert into public.player_workbook_pages(workbook_id,player_id,title,position,document)
    values(workbook_row.id,caller_id,'First page',1,p_document) returning * into page_row;
  insert into public.player_workbook_page_revisions(page_id,player_id,revision,document_schema_version,document,title,request_id)
    values(page_row.id,caller_id,1,1,p_document,page_row.title,p_request_id);
  return jsonb_build_object('workbook',to_jsonb(workbook_row),'page',to_jsonb(page_row));
end;
$$;

create or replace function public.update_player_workbook_v1(
  p_workbook_id uuid, p_expected_revision integer, p_title text, p_description text, p_archived boolean
) returns public.player_workbooks
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); result public.player_workbooks;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  if char_length(btrim(p_title)) not between 1 and 120 or (p_description is not null and char_length(p_description)>1000)
    then raise exception using errcode='22023', message='Invalid Workbook metadata'; end if;
  update public.player_workbooks set title=btrim(p_title), description=nullif(btrim(p_description),''),
    archived_at=case when p_archived then coalesce(archived_at,now()) else null end,
    revision=revision+1, updated_at=now()
    where id=p_workbook_id and player_id=caller_id and revision=p_expected_revision returning * into result;
  if result.id is null then raise exception using errcode='40001', message='Workbook changed or is unavailable'; end if;
  return result;
end;
$$;

create or replace function public.create_player_workbook_page_v1(
  p_workbook_id uuid, p_title text,
  p_document jsonb default '{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}'::jsonb,
  p_request_id uuid default gen_random_uuid()
) returns public.player_workbook_pages
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); next_position integer; result public.player_workbook_pages;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  perform 1 from public.player_workbooks where id=p_workbook_id and player_id=caller_id for update;
  if not found then raise exception using errcode='42501', message='Workbook is unavailable'; end if;
  if char_length(btrim(p_title)) not between 1 and 120 or not public.workbook_document_v1_is_valid(p_document)
    then raise exception using errcode='22023', message='Invalid page'; end if;
  select coalesce(max(position),0)+1 into next_position from public.player_workbook_pages where workbook_id=p_workbook_id;
  insert into public.player_workbook_pages(workbook_id,player_id,title,position,document)
    values(p_workbook_id,caller_id,btrim(p_title),next_position,p_document) returning * into result;
  insert into public.player_workbook_page_revisions(page_id,player_id,revision,document_schema_version,document,title,request_id)
    values(result.id,caller_id,1,1,p_document,result.title,p_request_id);
  update public.player_workbooks set updated_at=now() where id=p_workbook_id;
  return result;
end;
$$;

create or replace function public.save_player_workbook_page_v1(
  p_page_id uuid, p_expected_revision integer, p_title text, p_document jsonb, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); current_page public.player_workbook_pages; prior public.player_workbook_page_revisions; next_revision integer;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  if p_request_id is null then raise exception using errcode='22023', message='A request ID is required'; end if;
  if char_length(btrim(p_title)) not between 1 and 120 or not public.workbook_document_v1_is_valid(p_document)
    then raise exception using errcode='22023', message='Invalid Workbook page'; end if;
  select * into current_page from public.player_workbook_pages where id=p_page_id and player_id=caller_id for update;
  if current_page.id is null then raise exception using errcode='42501', message='Page is unavailable'; end if;
  select * into prior from public.player_workbook_page_revisions where page_id=p_page_id and request_id=p_request_id;
  if prior.id is not null then
    return jsonb_build_object('status','accepted','revision',prior.revision,'idempotent',true,'page',to_jsonb(current_page));
  end if;
  if current_page.revision <> p_expected_revision then
    return jsonb_build_object('status','conflict','revision',current_page.revision,'idempotent',false,'page',to_jsonb(current_page));
  end if;
  next_revision := current_page.revision+1;
  update public.player_workbook_pages set title=btrim(p_title),document=p_document,
    revision=next_revision,updated_at=now() where id=p_page_id returning * into current_page;
  insert into public.player_workbook_page_revisions(page_id,player_id,revision,document_schema_version,document,title,request_id)
    values(p_page_id,caller_id,next_revision,1,p_document,btrim(p_title),p_request_id);
  delete from public.player_workbook_page_revisions r where r.page_id=p_page_id and r.revision <= next_revision-50;
  update public.player_workbooks set updated_at=now() where id=current_page.workbook_id;
  return jsonb_build_object('status','accepted','revision',next_revision,'idempotent',false,'page',to_jsonb(current_page));
end;
$$;

create or replace function public.duplicate_player_workbook_page_v1(p_page_id uuid, p_request_id uuid)
returns public.player_workbook_pages
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); source public.player_workbook_pages; result public.player_workbook_pages; next_position integer;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  select * into source from public.player_workbook_pages where id=p_page_id and player_id=caller_id;
  if source.id is null then raise exception using errcode='42501', message='Page is unavailable'; end if;
  perform 1 from public.player_workbooks where id=source.workbook_id and player_id=caller_id for update;
  select coalesce(max(position),0)+1 into next_position from public.player_workbook_pages where workbook_id=source.workbook_id;
  insert into public.player_workbook_pages(workbook_id,player_id,title,position,document)
    values(source.workbook_id,caller_id,left(source.title||' copy',120),next_position,source.document) returning * into result;
  insert into public.player_workbook_page_revisions(page_id,player_id,revision,document_schema_version,document,title,request_id)
    values(result.id,caller_id,1,1,result.document,result.title,p_request_id);
  update public.player_workbooks set updated_at=now() where id=source.workbook_id;
  return result;
end;
$$;

create or replace function public.delete_player_workbook_page_v1(p_page_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); parent_id uuid;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  select workbook_id into parent_id from public.player_workbook_pages where id=p_page_id and player_id=caller_id for update;
  if parent_id is null then raise exception using errcode='42501', message='Page is unavailable'; end if;
  if (select count(*) from public.player_workbook_pages where workbook_id=parent_id) <= 1
    then raise exception using errcode='22023', message='A Workbook must retain one page'; end if;
  delete from public.player_workbook_pages where id=p_page_id;
  update public.player_workbook_pages set position=position+100000 where workbook_id=parent_id;
  with ranked as (select id,row_number() over(order by position,id) n from public.player_workbook_pages where workbook_id=parent_id)
    update public.player_workbook_pages p set position=ranked.n from ranked where p.id=ranked.id;
  update public.player_workbooks set updated_at=now() where id=parent_id;
end;
$$;

create or replace function public.reorder_player_workbook_pages_v1(p_workbook_id uuid, p_page_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); expected_count integer;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  perform 1 from public.player_workbooks where id=p_workbook_id and player_id=caller_id for update;
  if not found then raise exception using errcode='42501', message='Workbook is unavailable'; end if;
  select count(*) into expected_count from public.player_workbook_pages where workbook_id=p_workbook_id;
  if cardinality(p_page_ids)<>expected_count or (select count(distinct value) from unnest(p_page_ids) value)<>expected_count
    or exists(select 1 from unnest(p_page_ids) value left join public.player_workbook_pages p on p.id=value and p.workbook_id=p_workbook_id where p.id is null)
    then raise exception using errcode='22023', message='Page order must contain every page exactly once'; end if;
  update public.player_workbook_pages set position=position+100000 where workbook_id=p_workbook_id;
  update public.player_workbook_pages p set position=o.ordinality from unnest(p_page_ids) with ordinality o(id,ordinality) where p.id=o.id;
  update public.player_workbooks set updated_at=now() where id=p_workbook_id;
end;
$$;

create or replace function public.delete_player_workbook_v1(p_workbook_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid();
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  delete from public.player_workbooks where id=p_workbook_id and player_id=caller_id;
  if not found then raise exception using errcode='42501', message='Workbook is unavailable'; end if;
end;
$$;

create or replace function public.restore_player_workbook_page_revision_v1(
  p_page_id uuid, p_revision integer, p_expected_revision integer, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); snapshot public.player_workbook_page_revisions;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  select * into snapshot from public.player_workbook_page_revisions where page_id=p_page_id and player_id=caller_id and revision=p_revision;
  if snapshot.id is null then raise exception using errcode='22023', message='Revision is unavailable'; end if;
  return public.save_player_workbook_page_v1(p_page_id,p_expected_revision,snapshot.title,snapshot.document,p_request_id);
end;
$$;

create or replace function public.create_player_quick_note_v1(
  p_title text default null,
  p_document jsonb default '{"type":"GUITARPG_WORKBOOK_DOCUMENT_V1","schema_version":1,"blocks":[]}'::jsonb,
  p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); workbook_row public.player_workbooks; page_row public.player_workbook_pages; next_position integer;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication is required'; end if;
  if not public.workbook_document_v1_is_valid(p_document) then raise exception using errcode='22023', message='Invalid Workbook document'; end if;
  insert into public.player_workbooks(player_id,title,kind) values(caller_id,'Quick Notes','QUICK_NOTES')
    on conflict (player_id) where kind='QUICK_NOTES' do update set updated_at=public.player_workbooks.updated_at returning * into workbook_row;
  perform 1 from public.player_workbooks where id=workbook_row.id for update;
  select coalesce(max(position),0)+1 into next_position from public.player_workbook_pages where workbook_id=workbook_row.id;
  insert into public.player_workbook_pages(workbook_id,player_id,title,position,document)
    values(workbook_row.id,caller_id,coalesce(nullif(btrim(p_title),''),to_char(current_date,'Mon DD, YYYY')),next_position,p_document) returning * into page_row;
  insert into public.player_workbook_page_revisions(page_id,player_id,revision,document_schema_version,document,title,request_id)
    values(page_row.id,caller_id,1,1,p_document,page_row.title,p_request_id);
  return jsonb_build_object('workbook',to_jsonb(workbook_row),'page',to_jsonb(page_row));
end;
$$;

revoke all on function public.workbook_document_v1_is_valid(jsonb) from public, anon, authenticated;
grant execute on function public.workbook_document_v1_is_valid(jsonb) to service_role;

revoke all on function public.create_player_workbook_v1(text,text,text,jsonb,uuid),
  public.update_player_workbook_v1(uuid,integer,text,text,boolean),
  public.create_player_workbook_page_v1(uuid,text,jsonb,uuid),
  public.save_player_workbook_page_v1(uuid,integer,text,jsonb,uuid),
  public.duplicate_player_workbook_page_v1(uuid,uuid),
  public.delete_player_workbook_page_v1(uuid),
  public.delete_player_workbook_v1(uuid),
  public.reorder_player_workbook_pages_v1(uuid,uuid[]),
  public.restore_player_workbook_page_revision_v1(uuid,integer,integer,uuid),
  public.create_player_quick_note_v1(text,jsonb,uuid)
from public, anon, authenticated;

grant execute on function public.create_player_workbook_v1(text,text,text,jsonb,uuid),
  public.update_player_workbook_v1(uuid,integer,text,text,boolean),
  public.create_player_workbook_page_v1(uuid,text,jsonb,uuid),
  public.save_player_workbook_page_v1(uuid,integer,text,jsonb,uuid),
  public.duplicate_player_workbook_page_v1(uuid,uuid),
  public.delete_player_workbook_page_v1(uuid),
  public.delete_player_workbook_v1(uuid),
  public.reorder_player_workbook_pages_v1(uuid,uuid[]),
  public.restore_player_workbook_page_revision_v1(uuid,integer,integer,uuid),
  public.create_player_quick_note_v1(text,jsonb,uuid)
to authenticated, service_role;

create or replace function public.reject_workbook_revision_mutation()
returns trigger language plpgsql set search_path='' as $$ begin raise exception using errcode='42501', message='Workbook revisions are immutable'; end; $$;
create trigger player_workbook_revisions_immutable before update on public.player_workbook_page_revisions
  for each row execute function public.reject_workbook_revision_mutation();

revoke all on function public.reject_workbook_revision_mutation() from public, anon, authenticated;

commit;
