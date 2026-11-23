-- Lumo Beta privada - schema 01 - 2026-11-22.
-- Tabelas e RPC autenticas; sem dados pessoais de exemplo.
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;
create table public.shopping_lists (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 100),
 status text not null default 'active' check(status in('active','archived','deleted')),
 revision bigint not null default 0 check(revision>=0),
 deleted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.list_members (
 list_id uuid not null references public.shopping_lists(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in('owner','editor','viewer')),
 joined_at timestamptz not null default now(),revoked_at timestamptz,
 primary key(list_id,user_id)
);
create index lumo_members_by_user on public.list_members(user_id,list_id) where revoked_at is null;
create table public.list_items (
 id uuid primary key default gen_random_uuid(),
 list_id uuid not null references public.shopping_lists(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 160),
 gtin text check(gtin is null or gtin ~ '^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$'),
 quantity numeric(12,3) not null default 1 check(quantity>0 and quantity<10000),
 unit text not null default 'un' check(unit in('un','kg','g','l','ml')),
 unit_price_minor bigint check(unit_price_minor is null or unit_price_minor between 0 and 1000000000),
 state text not null default 'pending' check(state in('pending','in_cart','unavailable')),
 revision bigint not null default 1 check(revision>=1),
 created_by uuid not null references auth.users(id),
 deleted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(unit<>'un' or quantity=trunc(quantity))
);
create index lumo_items_list on public.list_items(list_id,created_at) where deleted_at is null;
create unique index lumo_items_unique_gtin on public.list_items(list_id,gtin) where gtin is not null and deleted_at is null;
create table private.operation_events (
 id uuid primary key,
 list_id uuid not null references public.shopping_lists(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 item_id uuid not null,
 action text not null,
 payload jsonb not null,
 expected_revision bigint,
 accepted_revision bigint not null,
 result jsonb not null,
 created_at timestamptz not null default now()
);
create index lumo_ops_list_revision on private.operation_events(list_id,accepted_revision);
create table private.sync_conflicts (
 operation_id uuid primary key,
 list_id uuid not null references public.shopping_lists(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 item_id uuid not null,
 expected_revision bigint,actual_revision bigint,
 proposed jsonb not null,current_value jsonb not null,
 created_at timestamptz not null default now()
);
create table private.list_invitations (
 id uuid primary key default gen_random_uuid(),
 list_id uuid not null references public.shopping_lists(id) on delete cascade,
 invited_by uuid not null references auth.users(id),
 token_hash text not null unique,
 role text not null check(role in('editor','viewer')),
 expires_at timestamptz not null,
 redeemed_at timestamptz,redeemed_by uuid references auth.users(id),
 revoked_at timestamptz,created_at timestamptz not null default now()
);
-- Futuro histórico: tabelas independentes da lista planejada.
create table public.shopping_sessions (
 id uuid primary key default gen_random_uuid(),
 list_id uuid not null references public.shopping_lists(id),
 created_by uuid not null references auth.users(id),
 status text not null default 'active' check(status in('active','reviewing','completed','cancelled')),
 store_label text,final_total_minor bigint,final_source text check(final_source in('manual','fiscal')),
 started_at timestamptz not null default now(),finished_at timestamptz
);
create unique index lumo_one_active_session on public.shopping_sessions(list_id) where status in('active','reviewing');
create table public.session_items (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.shopping_sessions(id) on delete cascade,
 list_item_id uuid references public.list_items(id) on delete set null,
 name_snapshot text not null,gtin_snapshot text,quantity numeric(12,3) not null,
 unit text not null,unit_price_minor bigint,state text not null,
 created_at timestamptz not null default now()
);
create index lumo_session_items_fk on public.session_items(session_id);
-- RLS + retirar grants automaticos de Data API.
revoke all on all tables in schema public from anon,authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on schema private from public,anon,authenticated;
grant usage on schema public to authenticated;
grant select on public.shopping_lists,public.list_members,public.list_items,public.shopping_sessions,public.session_items to authenticated;
alter table public.shopping_lists enable row level security;
alter table public.list_members enable row level security;
alter table public.list_items enable row level security;
alter table public.shopping_sessions enable row level security;
alter table public.session_items enable row level security;

create function private.is_member(p_list uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(
 select 1 from public.list_members m where m.list_id=p_list and m.user_id=(select auth.uid()) and m.revoked_at is null);
$$;
create function private.is_editor(p_list uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(
 select 1 from public.list_members m where m.list_id=p_list and m.user_id=(select auth.uid()) and m.revoked_at is null and m.role in('owner','editor'));
$$;
revoke all on function private.is_member(uuid),private.is_editor(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid),private.is_editor(uuid) to authenticated;
create policy lumo_lists_select on public.shopping_lists for select to authenticated
 using ((select private.is_member(id)) and deleted_at is null);
create policy lumo_members_select on public.list_members for select to authenticated
 using ((select private.is_member(list_id)) and revoked_at is null);
create policy lumo_items_select on public.list_items for select to authenticated
 using ((select private.is_member(list_id)) and deleted_at is null);
create policy lumo_sessions_select on public.shopping_sessions for select to authenticated
 using ((select private.is_member(list_id)));
create policy lumo_session_items_select on public.session_items for select to authenticated
 using (exists(select 1 from public.shopping_sessions s where s.id=session_id and (select private.is_member(s.list_id))));

create function public.lumo_create_list(p_title text) returns uuid
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();id uuid;
begin
 if a is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
 if length(btrim(coalesce(p_title,''))) not between 1 and 100 then raise exception 'INVALID_TITLE';end if;
 insert into public.shopping_lists(owner_id,title) values(a,btrim(p_title)) returning shopping_lists.id into id;
 insert into public.list_members(list_id,user_id,role) values(id,a,'owner');
 return id;
end;$$;

-- Atomic item mutation. Sender generates stable op UUID + item UUID in IndexedDB.
-- Different items can be edited independently; a same-item revision mismatch is a conflict.
create function public.lumo_apply_item(p_list uuid,p_op uuid,p_action text,p_item uuid,
 p_payload jsonb default '{}'::jsonb,p_expected bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();l public.shopping_lists%rowtype;i public.list_items%rowtype;
 e private.operation_events%rowtype;r jsonb;n text;q numeric(12,3);u text;pr bigint;g text;s text;newrev bigint;
begin
 if a is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
 if p_op is null or p_item is null or p_action not in('add','edit','delete','restore','increment') or p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'INVALID_OPERATION';end if;
 select * into e from private.operation_events where id=p_op;
 if found then
  if e.actor_id<>a or e.list_id<>p_list or e.item_id<>p_item or e.action<>p_action or e.payload is distinct from p_payload or e.expected_revision is distinct from p_expected then
   raise exception 'OP_ID_REUSED' using errcode='23505';end if;
  return e.result;
 end if;
 if not private.is_editor(p_list) then raise exception 'LIST_FORBIDDEN' using errcode='42501';end if;
 select * into l from public.shopping_lists where id=p_list and status='active' and deleted_at is null for update;
 if not found then raise exception 'LIST_NOT_ACTIVE';end if;
 select * into e from private.operation_events where id=p_op;
 if found then
  if e.actor_id<>a or e.list_id<>p_list or e.item_id<>p_item or e.action<>p_action or e.payload is distinct from p_payload or e.expected_revision is distinct from p_expected then raise exception 'OP_ID_REUSED' using errcode='23505';end if;
  return e.result;
 end if;
 newrev:=l.revision+1;
 if p_action='add' then
  n:=btrim(coalesce(p_payload->>'name',''));
  u:=coalesce(p_payload->>'unit','un');q:=coalesce((p_payload->>'quantity')::numeric,1);
  pr:=(p_payload->>'unit_price_minor')::bigint;g:=nullif(btrim(p_payload->>'gtin'),'');
  if length(n) not between 1 and 160 or q<=0 or q>=10000 or scale(q)>3 or u not in('un','kg','g','l','ml')
   or (u='un' and q<>trunc(q)) or pr<0 or pr>1000000000 then raise exception 'INVALID_ITEM';end if;
  insert into public.list_items(id,list_id,name,quantity,unit,unit_price_minor,gtin,created_by)
   values(p_item,p_list,n,q,u,pr,g,a) returning * into i;
 else
  select * into i from public.list_items where id=p_item and list_id=p_list for update;
  if not found then raise exception 'ITEM_NOT_FOUND';end if;
  if p_expected is null or p_expected<>i.revision then
   insert into private.sync_conflicts(operation_id,list_id,actor_id,item_id,expected_revision,actual_revision,proposed,current_value)
    values(p_op,p_list,a,p_item,p_expected,i.revision,p_payload,to_jsonb(i)) on conflict(operation_id) do nothing;
   return jsonb_build_object('status','conflict','current',to_jsonb(i));
  end if;
  if p_action='delete' then
   update public.list_items set deleted_at=now(),revision=revision+1,updated_at=now() where id=p_item returning * into i;
  elsif p_action='restore' then
   update public.list_items set deleted_at=null,revision=revision+1,updated_at=now() where id=p_item returning * into i;
  elsif p_action='increment' then
   q:=(p_payload->>'delta')::numeric;
   if q<=0 or q>1000 or scale(q)>3 then raise exception 'INVALID_DELTA';end if;
   update public.list_items set quantity=quantity+q,revision=revision+1,updated_at=now() where id=p_item returning * into i;
  else
   if not (p_payload ?| array['name','quantity','unit','unit_price_minor','state','gtin']) then raise exception 'EMPTY_EDIT';end if;
   n:=btrim(coalesce(p_payload->>'name',i.name));q:=coalesce((p_payload->>'quantity')::numeric,i.quantity);
   u:=coalesce(p_payload->>'unit',i.unit);
   pr:=case when p_payload?'unit_price_minor' then (p_payload->>'unit_price_minor')::bigint else i.unit_price_minor end;
   g:=case when p_payload?'gtin' then nullif(btrim(p_payload->>'gtin'),'') else i.gtin end;
   s:=coalesce(p_payload->>'state',i.state);
   if length(n) not between 1 and 160 or q<=0 or q>=10000 or scale(q)>3 or u not in('un','kg','g','l','ml')
    or (u='un' and q<>trunc(q)) or s not in('pending','in_cart','unavailable') or pr<0 or pr>1000000000 then
    raise exception 'INVALID_EDIT';end if;
   update public.list_items set name=n,quantity=q,unit=u,unit_price_minor=pr,gtin=g,state=s,revision=revision+1,updated_at=now() where id=p_item returning * into i;
  end if;
 end if;
 update public.shopping_lists set revision=newrev,updated_at=now() where id=p_list;
 r:=jsonb_build_object('status','ack','list_revision',newrev,'item',to_jsonb(i));
 insert into private.operation_events(id,list_id,actor_id,item_id,action,payload,expected_revision,accepted_revision,result)
 values(p_op,p_list,a,p_item,p_action,p_payload,p_expected,newrev,r);
 return r;
end;$$;

create function public.lumo_create_invite(p_list uuid,p_role text default 'editor') returns text
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();tok text;
begin
 if a is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
 if p_role not in ('editor','viewer') then raise exception 'INVALID_ROLE';end if;
 if not exists(select 1 from public.shopping_lists where id=p_list and owner_id=a and status='active') then raise exception 'OWNER_REQUIRED' using errcode='42501';end if;
 tok:=encode(extensions.gen_random_bytes(24),'hex');
 insert into private.list_invitations(list_id,invited_by,token_hash,role,expires_at)
 values(p_list,a,encode(extensions.digest(tok,'sha256'),'hex'),p_role,now()+interval '24 hours');
 return tok;
end;$$;
create function public.lumo_redeem_invite(p_token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();v private.list_invitations%rowtype;
begin
 if a is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
 if p_token is null or p_token !~ '^[a-f0-9]{48}$' then raise exception 'INVALID_INVITE';end if;
 select * into v from private.list_invitations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found or v.revoked_at is not null or v.redeemed_at is not null or v.expires_at<now() then raise exception 'INVITE_EXPIRED_OR_USED' using errcode='42501';end if;
 if exists(select 1 from public.shopping_lists where id=v.list_id and owner_id=a) then raise exception 'OWNER_ALREADY_MEMBER';end if;
 if not exists(select 1 from public.shopping_lists where id=v.list_id and status='active' and deleted_at is null) then raise exception 'LIST_NOT_ACTIVE';end if;
 insert into public.list_members(list_id,user_id,role,revoked_at) values(v.list_id,a,v.role,null)
 on conflict(list_id,user_id) do update set role=excluded.role,revoked_at=null
 where public.list_members.role<>'owner';
 update private.list_invitations set redeemed_at=now(),redeemed_by=a where id=v.id;
 return v.list_id;
end;$$;
create function public.lumo_revoke_member(p_list uuid,p_user uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();
begin
 if a is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
 if not exists(select 1 from public.shopping_lists where id=p_list and owner_id=a and status='active') then raise exception 'OWNER_REQUIRED' using errcode='42501';end if;
 if p_user=a then raise exception 'CANNOT_REMOVE_OWNER';end if;
 update public.list_members set revoked_at=now() where list_id=p_list and user_id=p_user and role<>'owner' and revoked_at is null;
 return found;
end;$$;

revoke all on function public.lumo_create_list(text),public.lumo_apply_item(uuid,uuid,text,uuid,jsonb,bigint),
 public.lumo_create_invite(uuid,text),public.lumo_redeem_invite(text),public.lumo_revoke_member(uuid,uuid) from public,anon;
grant execute on function public.lumo_create_list(text),public.lumo_apply_item(uuid,uuid,text,uuid,jsonb,bigint),
 public.lumo_create_invite(uuid,text),public.lumo_redeem_invite(text),public.lumo_revoke_member(uuid,uuid) to authenticated;
alter default privileges in schema public revoke all on tables from anon,authenticated;
alter default privileges in schema public revoke all on functions from public,anon;
