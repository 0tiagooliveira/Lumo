-- Lumo: fix initial item status on first cloud insert.
-- Replaces the existing RPC without altering signatures, grants, RLS or historical rows.
-- 'pending' is the default only when the client leaves state unset/null.
-- This rejects invalid states, rejects replay after member revocation and preserves
-- edited fields during explicit restore of a deleted item.
-- Apply only after reviewing and testing the release candidate.

create or replace function public.lumo_apply_item(p_list uuid,p_op uuid,p_action text,p_item uuid,
 p_payload jsonb default '{}'::jsonb,p_expected bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();l public.shopping_lists%rowtype;i public.list_items%rowtype;
 e private.operation_events%rowtype;r jsonb;n text;q numeric(12,3);u text;pr bigint;g text;s text;newrev bigint;
begin
 if a is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
 if p_op is null or p_item is null or p_action not in('add','edit','delete','restore','increment') or p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'INVALID_OPERATION';end if;
 -- Authorize before replay: revocation must also invalidate old operation ACKs.
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
  s:=coalesce(p_payload->>'state','pending');
  if length(n) not between 1 and 160 or q<=0 or q>=10000 or scale(q)>3 or u not in('un','kg','g','l','ml')
   or (u='un' and q<>trunc(q)) or s not in('pending','in_cart','unavailable')
   or pr<0 or pr>1000000000 then raise exception 'INVALID_ITEM';end if;
  insert into public.list_items(id,list_id,name,quantity,unit,unit_price_minor,gtin,state,created_by)
   values(p_item,p_list,n,q,u,pr,g,s,a) returning * into i;
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
   -- A restore must also carry the user's retained edits; reviving the old row
   -- without payload would silently discard changes made while it was deleted.
   update public.list_items set name=n,quantity=q,unit=u,unit_price_minor=pr,gtin=g,state=s,
    deleted_at=case when p_action='restore' then null else i.deleted_at end,
    revision=revision+1,updated_at=now() where id=p_item returning * into i;
  end if;
 end if;
 update public.shopping_lists set revision=newrev,updated_at=now() where id=p_list;
 r:=jsonb_build_object('status','ack','list_revision',newrev,'item',to_jsonb(i));
 insert into private.operation_events(id,list_id,actor_id,item_id,action,payload,expected_revision,accepted_revision,result)
 values(p_op,p_list,a,p_item,p_action,p_payload,p_expected,newrev,r);
 return r;
end;$$;
