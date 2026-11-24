-- Secure, idempotent opt-in linking of an existing local Lumo list to cloud identity.
-- Signed-in members can see deleted item tombstones to reconcile offline deletes;
-- the UI continues to filter them. No anonymous grants and no fiscal-data upload.
create or replace function public.lumo_ensure_list(p_list uuid,p_title text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();owner uuid;
begin
 if actor is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
 if p_list is null or length(btrim(coalesce(p_title,''))) not between 1 and 100 then raise exception 'INVALID_LIST';end if;
 insert into public.shopping_lists(id,owner_id,title) values(p_list,actor,btrim(p_title)) on conflict(id) do nothing;
 select owner_id into owner from public.shopping_lists where id=p_list and status='active' and deleted_at is null;
 if owner is distinct from actor then raise exception 'LIST_FORBIDDEN' using errcode='42501';end if;
 insert into public.list_members(list_id,user_id,role) values(p_list,actor,'owner')
 on conflict(list_id,user_id) do update set revoked_at=null where public.list_members.role='owner';
 return p_list;
end;$$;
create or replace function public.lumo_rename_list(p_list uuid,p_title text,p_expected bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();current_revision bigint;new_revision bigint;
begin
 if actor is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
 if length(btrim(coalesce(p_title,''))) not between 1 and 100 then raise exception 'INVALID_TITLE';end if;
 select revision into current_revision from public.shopping_lists
  where id=p_list and owner_id=actor and status='active' and deleted_at is null for update;
 if not found then raise exception 'OWNER_REQUIRED' using errcode='42501';end if;
 if current_revision is distinct from p_expected then
  return jsonb_build_object('status','conflict','revision',current_revision);
 end if;
 update public.shopping_lists set title=btrim(p_title),revision=revision+1,updated_at=now()
  where id=p_list returning revision into new_revision;
 return jsonb_build_object('status','ack','revision',new_revision);
end;$$;
revoke all on function public.lumo_ensure_list(uuid,text),public.lumo_rename_list(uuid,text,bigint) from public,anon;
grant execute on function public.lumo_ensure_list(uuid,text),public.lumo_rename_list(uuid,text,bigint) to authenticated;
drop policy if exists lumo_items_select on public.list_items;
create policy lumo_items_select on public.list_items for select to authenticated
 using ((select private.is_member(list_id)));
