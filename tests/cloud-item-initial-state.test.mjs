import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {itemPayload,fromCloud} from '../web/experience-sync-core.mjs';

// Contract test: checks checked-in SQL, not a running Postgres instance.
// A separate real-database authorization + RPC smoke is a release gate.
const migration=readFileSync(new URL('../supabase/migrations/20261122_lumo_preserve_item_initial_state.sql',import.meta.url),'utf8');
const addPart=migration.split("if p_action='add' then")[1]?.split("\n else\n  select * into i")[0]||'';

test('SQL insert records initial state and validates allowed states',()=>{
 assert.ok(addPart,'SQL add branch found');
 assert.match(addPart,/s\s*:=\s*coalesce\(p_payload->>'state','pending'\)/);
 assert.match(addPart,/s not in\('pending','in_cart','unavailable'\)/);
 assert.match(addPart,/insert into public\.list_items\(id,list_id,name,quantity,unit,unit_price_minor,gtin,state,created_by\)/);
 assert.match(addPart,/values\(p_item,p_list,n,q,u,pr,g,s,a\)/);
 assert.match(migration,/security definer set search_path=''/i,'Existing explicit search_path preserved');
 assert.match(migration,/if not private\.is_editor\(p_list\)/,'Membership authorization preserved');
});

test('first-time local states roundtrip through shared cloud contract',()=>{
 const states=[['pending','pending'],['bought','in_cart'],['later','unavailable']];
 for(const [localStatus,remoteStatus] of states){
  const item={id:'20000000-0000-4000-8000-000000000799',name:'Produto',qty:2,unit:'un',unitPriceCents:349,barcode:'',status:localStatus};
  const payload=itemPayload(item);
  assert.equal(payload.state,remoteStatus);
  const row={...payload,id:item.id,created_at:'2026-11-22T00:00:00Z'};
  assert.equal(fromCloud(row,'10000000-0000-4000-8000-000000000799').status,localStatus);
 }
});
