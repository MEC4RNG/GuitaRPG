-- JRN-004: optional owner-scoped Workbook context for MEC Quest Journeys.

begin;

create table public.player_workbook_context_links (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid not null references public.player_workbook_pages(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  stage text check (stage is null or stage in ('MAP','EXPLORE','CRAFT')),
  relationship text not null check (relationship in ('REFERENCE','CREATED_DURING','APPLIES_TO')),
  session_id uuid references public.practice_sessions(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp()
);

create unique index player_workbook_context_links_equivalent_idx
on public.player_workbook_context_links
(player_id, page_id, quest_id, coalesce(stage, ''), relationship, coalesce(session_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index player_workbook_context_links_quest_idx
on public.player_workbook_context_links (player_id, quest_id, stage, created_at);

create or replace function private.validate_player_workbook_context_link()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.player_workbook_pages p
    join public.player_workbooks w on w.id = p.workbook_id
    where p.id = new.page_id and w.player_id = new.player_id and p.player_id = new.player_id
  ) then
    raise exception using errcode = '42501', message = 'Owned Workbook page not found';
  end if;
  if not exists (select 1 from public.quests q where q.id = new.quest_id and q.player_id = new.player_id) then
    raise exception using errcode = '42501', message = 'Owned Quest not found';
  end if;
  if new.session_id is not null and not exists (
    select 1 from public.practice_sessions s
    where s.id = new.session_id and s.player_id = new.player_id and s.quest_id = new.quest_id
  ) then
    raise exception using errcode = '42501', message = 'Owned Quest Session not found';
  end if;
  return new;
end;
$$;

create trigger player_workbook_context_links_validate
before insert or update on public.player_workbook_context_links
for each row execute function private.validate_player_workbook_context_link();

revoke all on function private.validate_player_workbook_context_link() from public, anon, authenticated;
alter table public.player_workbook_context_links enable row level security;
revoke all on table public.player_workbook_context_links from public, anon, authenticated;
grant select on table public.player_workbook_context_links to authenticated;
grant all on table public.player_workbook_context_links to service_role;

create policy player_workbook_context_links_owner_select
on public.player_workbook_context_links for select to authenticated
using (player_id = (select auth.uid()));

create or replace function public.attach_player_workbook_context_v1(
  p_page_id uuid,
  p_quest_id uuid,
  p_stage text,
  p_relationship text,
  p_session_id uuid default null
) returns public.player_workbook_context_links
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  result_row public.player_workbook_context_links;
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Authentication is required'; end if;
  if p_stage is not null and p_stage not in ('MAP','EXPLORE','CRAFT') then
    raise exception using errcode = '22023', message = 'Unsupported Journey stage';
  end if;
  if p_relationship not in ('REFERENCE','CREATED_DURING','APPLIES_TO') then
    raise exception using errcode = '22023', message = 'Unsupported Workbook relationship';
  end if;

  insert into public.player_workbook_context_links (
    player_id, page_id, quest_id, stage, relationship, session_id
  ) values (caller_id, p_page_id, p_quest_id, p_stage, p_relationship, p_session_id)
  on conflict (player_id, page_id, quest_id, coalesce(stage, ''), relationship, coalesce(session_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set player_id = excluded.player_id
  returning * into result_row;
  return result_row;
end;
$$;

create or replace function public.detach_player_workbook_context_v1(p_link_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); removed integer;
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Authentication is required'; end if;
  delete from public.player_workbook_context_links where id = p_link_id and player_id = caller_id;
  get diagnostics removed = row_count;
  return removed = 1;
end;
$$;

revoke all on function public.attach_player_workbook_context_v1(uuid,uuid,text,text,uuid) from public, anon;
revoke all on function public.detach_player_workbook_context_v1(uuid) from public, anon;
grant execute on function public.attach_player_workbook_context_v1(uuid,uuid,text,text,uuid) to authenticated;
grant execute on function public.detach_player_workbook_context_v1(uuid) to authenticated;

commit;
