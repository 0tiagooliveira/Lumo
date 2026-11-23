-- LUMO: self-contained PostgreSQL regression smoke.
-- Requires psql and a privileged connection to an approved test database.
-- Explicit opt-in: psql ... -v lumo_test_approved=1 -f tests/supabase_rpc_rollback.sql
-- The transaction ends with ROLLBACK; no fixture or function change is committed.
-- DO NOT RUN in production or with personal data; keep connection strings private.
\set ON_ERROR_STOP on
\if :{?lumo_test_approved}
\else
\echo 'Refused: pass -v lumo_test_approved=1 for an authorized staging/test database.'
\quit
\endif

BEGIN;
\ir ../supabase/migrations/20261123002500_lumo_preserve_item_initial_state.sql

-- Fixed synthetic UUIDs; no real users, emails, passwords or fiscal data.
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-000000000891'),
 ('00000000-0000-4000-8000-000000000892'),
 ('00000000-0000-4000-8000-000000000893');
SET LOCAL ROLE authenticated;

DO $lumo_test$
DECLARE
 a CONSTANT uuid := '00000000-0000-4000-8000-000000000891';
 b CONSTANT uuid := '00000000-0000-4000-8000-000000000892';
 c CONSTANT uuid := '00000000-0000-4000-8000-000000000893';
 l CONSTANT uuid := '10000000-0000-4000-8000-000000000891';
 i CONSTANT uuid := '20000000-0000-4000-8000-000000000891';
 result jsonb;
 token text;
 num integer;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 IF public.lumo_ensure_list(l,'Teste transacional') <> l THEN
  RAISE EXCEPTION 'TEST_LIST_CREATE'; END IF;

 result := public.lumo_apply_item(l,'30000000-0000-4000-8000-000000000891',
  'add',i,'{"name":"Cafe","quantity":2,"unit":"un","unit_price_minor":199,"state":"in_cart"}',null);
 IF result->'item'->>'state' <> 'in_cart' OR result->>'status' <> 'ack' THEN
  RAISE EXCEPTION 'TEST_INITIAL_STATE'; END IF;

 result := public.lumo_apply_item(l,'30000000-0000-4000-8000-000000000892','delete',i,'{}',1);
 IF result->'item'->>'deleted_at' IS NULL THEN
  RAISE EXCEPTION 'TEST_DELETE'; END IF;

 result := public.lumo_apply_item(l,'30000000-0000-4000-8000-000000000893','restore',i,
  '{"name":"Cafe especial","quantity":5,"unit":"un","unit_price_minor":230,"state":"unavailable"}',2);
 IF result->'item'->>'name' <> 'Cafe especial' OR
    (result->'item'->>'quantity')::numeric <> 5 OR
    result->'item'->>'state' <> 'unavailable' OR
    result->'item'->>'deleted_at' IS NOT NULL THEN
  RAISE EXCEPTION 'TEST_RESTORE'; END IF;

 token := public.lumo_create_invite(l,'editor');
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 IF public.lumo_redeem_invite(token) <> l THEN
  RAISE EXCEPTION 'TEST_INVITE'; END IF;

 result := public.lumo_apply_item(l,'30000000-0000-4000-8000-000000000894','edit',i,
  '{"quantity":7}',3);
 IF result->>'status' <> 'ack' THEN RAISE EXCEPTION 'TEST_EDITOR'; END IF;

 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 IF NOT public.lumo_revoke_member(l,b) THEN RAISE EXCEPTION 'TEST_REVOKE'; END IF;
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 BEGIN
  PERFORM public.lumo_apply_item(l,'30000000-0000-4000-8000-000000000894',
   'edit',i,'{"quantity":7}',3);
  RAISE EXCEPTION 'TEST_REVOKED_REPLAY_ALLOWED';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 SELECT count(*) INTO num FROM public.list_items WHERE list_id=l;
 IF num <> 0 THEN RAISE EXCEPTION 'TEST_REVOKED_RLS'; END IF;

 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 SELECT count(*) INTO num FROM public.list_items WHERE list_id=l;
 IF num <> 0 THEN RAISE EXCEPTION 'TEST_NONMEMBER_RLS'; END IF;
 BEGIN
  PERFORM public.lumo_apply_item(l,'30000000-0000-4000-8000-000000000895',
   'edit',i,'{"quantity":8}',4);
  RAISE EXCEPTION 'TEST_NONMEMBER_WRITE_ALLOWED';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
END $lumo_test$;

RESET ROLE;
SELECT 'PASS: Lumo SQL/RLS test (pending rollback)' AS result;
ROLLBACK;

-- A separate privileged read verifies all fixture data was discarded.
SELECT
 (SELECT count(*) FROM auth.users WHERE id IN (
  '00000000-0000-4000-8000-000000000891',
  '00000000-0000-4000-8000-000000000892',
  '00000000-0000-4000-8000-000000000893')) AS remaining_test_users,
 (SELECT count(*) FROM public.shopping_lists
  WHERE id='10000000-0000-4000-8000-000000000891') AS remaining_test_lists,
 (SELECT count(*) FROM public.list_items
  WHERE id='20000000-0000-4000-8000-000000000891') AS remaining_test_items;
