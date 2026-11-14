-- JRN-004-R1: Quest-scoped Explore module assignment and presentation order.

begin;

alter table public.player_workbook_context_links
  add column module_key text;

alter table public.player_workbook_context_links
  add constraint player_workbook_context_links_module_scope_check
  check (module_key is null or (stage = 'EXPLORE' and module_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'));

drop index public.player_workbook_context_links_equivalent_idx;
create unique index player_workbook_context_links_equivalent_idx
on public.player_workbook_context_links
(player_id, page_id, quest_id, coalesce(stage, ''), relationship,
 coalesce(session_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(module_key, ''));

create or replace function private.quest_explore_module_keys(p_quest_id uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct value order by value), '{}'::text[])
  from (
    select q.resolved_snapshot #>> '{execution,primary_skill,slug}' as value
    from public.quests q where q.id = p_quest_id
    union all
    select item ->> 'slug'
    from public.quests q,
      jsonb_array_elements(q.resolved_snapshot #> '{execution,secondary_skills}') item
    where q.id = p_quest_id
    union all
    select item ->> 'slug'
    from public.quests q,
      jsonb_array_elements(q.resolved_snapshot #> '{execution,required_techniques}') item
    where q.id = p_quest_id
  ) modules where value is not null;
$$;

revoke all on function private.quest_explore_module_keys(uuid) from public, anon, authenticated;

create table public.player_quest_explore_module_orders (
  player_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  module_keys text[] not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (player_id, quest_id)
);

alter table public.player_quest_explore_module_orders enable row level security;
revoke all on table public.player_quest_explore_module_orders from public, anon, authenticated;
grant select on table public.player_quest_explore_module_orders to authenticated;
grant all on table public.player_quest_explore_module_orders to service_role;
create policy player_quest_explore_module_orders_owner_select
on public.player_quest_explore_module_orders for select to authenticated
using (player_id = (select auth.uid()));

create or replace function private.validate_player_workbook_context_link()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.player_workbook_pages p
    join public.player_workbooks w on w.id = p.workbook_id
    where p.id = new.page_id and w.player_id = new.player_id and p.player_id = new.player_id
  ) then raise exception using errcode = '42501', message = 'Owned Workbook page not found'; end if;
  if not exists (select 1 from public.quests q where q.id = new.quest_id and q.player_id = new.player_id) then
    raise exception using errcode = '42501', message = 'Owned Quest not found';
  end if;
  if new.session_id is not null and not exists (
    select 1 from public.practice_sessions s
    where s.id = new.session_id and s.player_id = new.player_id and s.quest_id = new.quest_id
  ) then raise exception using errcode = '42501', message = 'Owned Quest Session not found'; end if;
  if new.module_key is not null and not (new.module_key = any(private.quest_explore_module_keys(new.quest_id))) then
    raise exception using errcode = '22023', message = 'Explore module is not part of this Quest snapshot';
  end if;
  return new;
end;
$$;

create or replace function public.attach_player_workbook_context_v1(
  p_page_id uuid, p_quest_id uuid, p_stage text, p_relationship text, p_session_id uuid default null
) returns public.player_workbook_context_links
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); result_row public.player_workbook_context_links;
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Authentication is required'; end if;
  if p_stage is not null and p_stage not in ('MAP','EXPLORE','CRAFT') then raise exception using errcode = '22023', message = 'Unsupported Journey stage'; end if;
  if p_relationship not in ('REFERENCE','CREATED_DURING','APPLIES_TO') then raise exception using errcode = '22023', message = 'Unsupported Workbook relationship'; end if;
  insert into public.player_workbook_context_links (player_id,page_id,quest_id,stage,relationship,session_id,module_key)
  values (caller_id,p_page_id,p_quest_id,p_stage,p_relationship,p_session_id,null)
  on conflict (player_id,page_id,quest_id,coalesce(stage,''),relationship,
    coalesce(session_id,'00000000-0000-0000-0000-000000000000'::uuid),coalesce(module_key,''))
  do update set player_id = excluded.player_id returning * into result_row;
  return result_row;
end;
$$;

create or replace function public.attach_player_workbook_explore_module_v1(
  p_page_id uuid, p_quest_id uuid, p_module_key text
) returns public.player_workbook_context_links
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); result_row public.player_workbook_context_links;
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Authentication is required'; end if;
  if p_module_key is null or not (p_module_key = any(private.quest_explore_module_keys(p_quest_id))) then
    raise exception using errcode = '22023', message = 'Explore module is not part of this Quest snapshot';
  end if;
  insert into public.player_workbook_context_links (player_id,page_id,quest_id,stage,relationship,module_key)
  values (caller_id,p_page_id,p_quest_id,'EXPLORE','APPLIES_TO',p_module_key)
  on conflict (player_id,page_id,quest_id,coalesce(stage,''),relationship,
    coalesce(session_id,'00000000-0000-0000-0000-000000000000'::uuid),coalesce(module_key,''))
  do update set player_id = excluded.player_id returning * into result_row;
  return result_row;
end;
$$;

create or replace function public.assign_player_workbook_explore_module_v1(p_link_id uuid, p_module_key text)
returns public.player_workbook_context_links
language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); result_row public.player_workbook_context_links;
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Authentication is required'; end if;
  update public.player_workbook_context_links l set module_key = p_module_key
  where l.id = p_link_id and l.player_id = caller_id and l.stage = 'EXPLORE'
    and p_module_key = any(private.quest_explore_module_keys(l.quest_id))
  returning * into result_row;
  if result_row.id is null then raise exception using errcode = '42501', message = 'Owned Explore link or module not found'; end if;
  return result_row;
end;
$$;

create or replace function public.save_player_quest_explore_module_order_v1(p_quest_id uuid, p_module_keys text[])
returns text[] language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); expected text[]; supplied text[];
begin
  if caller_id is null then raise exception using errcode = '42501', message = 'Authentication is required'; end if;
  if not exists (select 1 from public.quests where id = p_quest_id and player_id = caller_id) then
    raise exception using errcode = '42501', message = 'Owned Quest not found';
  end if;
  expected := private.quest_explore_module_keys(p_quest_id);
  select coalesce(array_agg(distinct value order by value), '{}'::text[]) into supplied from unnest(p_module_keys) value;
  if cardinality(p_module_keys) <> cardinality(supplied) or supplied <> expected then
    raise exception using errcode = '22023', message = 'Module order must contain each Quest module exactly once';
  end if;
  insert into public.player_quest_explore_module_orders(player_id,quest_id,module_keys)
  values (caller_id,p_quest_id,p_module_keys)
  on conflict (player_id,quest_id) do update set module_keys=excluded.module_keys,updated_at=clock_timestamp();
  return p_module_keys;
end;
$$;

revoke all on function public.attach_player_workbook_explore_module_v1(uuid,uuid,text) from public, anon;
revoke all on function public.assign_player_workbook_explore_module_v1(uuid,text) from public, anon;
revoke all on function public.save_player_quest_explore_module_order_v1(uuid,text[]) from public, anon;
grant execute on function public.attach_player_workbook_explore_module_v1(uuid,uuid,text) to authenticated;
grant execute on function public.assign_player_workbook_explore_module_v1(uuid,text) to authenticated;
grant execute on function public.save_player_quest_explore_module_order_v1(uuid,text[]) to authenticated;

commit;
