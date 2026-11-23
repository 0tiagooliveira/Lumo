/* Real PostgREST-over-HTTP contract test in a disposable PostgreSQL instance.
   This uses synthetic JWTs and fake auth.users only; it is NOT Google OAuth.
   Run through the GitHub Actions rest-http-contract job, never against live. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';

const base=process.env.LUMO_TEST_REST_URL;
const secret=process.env.LUMO_TEST_JWT_SECRET;
const OWNER='00000000-0000-4000-8000-000000000951';
const EDITOR='00000000-0000-4000-8000-000000000952';
const VIEWER='00000000-0000-4000-8000-000000000953';
const disposableHttpReady=!!base&&!!secret&&/^https?:\/\/127\.0\.0\.1:\d+\/?$/.test(base)&&
 process.env.LUMO_TEST_DISPOSABLE_DB==='yes';

function sign(sub,{key=secret,validForSeconds=600}={}){
 const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
 const header=encode({alg:'HS256',typ:'JWT'});
 const payload=encode({role:'authenticated',sub,aud:'authenticated',exp:Math.floor(Date.now()/1000)+validForSeconds});
 const message=header+'.'+payload;
 return message+'.'+createHmac('sha256',key).update(message).digest('base64url');
}

async function call(token,path,{method='GET',body}={}){
 const headers={Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{}),
  ...(body===undefined?{}:{'Content-Type':'application/json'})};
 const response=await fetch(base.replace(/\/$/,'')+path,{method,headers,
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const raw=await response.text();
 let value=raw;try{value=JSON.parse(raw)}catch{}
 return {status:response.status,value,raw};
}
async function rpc(token,fn,args){
 return call(token,'/rpc/'+fn,{method:'POST',body:args});
}
function ok(result,where){
 assert.ok(result.status>=200&&result.status<300,
  where+': expected 2xx but got '+result.status+' '+String(result.raw).slice(0,450));
 return result.value;
}
function forbidden(result,where){
 assert.ok([401,403,404].includes(result.status),
  where+': expected access denial but got '+result.status+' '+String(result.raw).slice(0,450));
}

test('isolated HTTP: owner, editor, viewer, revocation, RLS, replay and restoration',
 {skip:disposableHttpReady?false:'requires disposable localhost PostgREST and explicit opt-in'},async()=>{
 const a=sign(OWNER),b=sign(EDITOR),c=sign(VIEWER);
 const unauth=await call(null,'/shopping_lists?select=id');
 forbidden(unauth,'Anonymous table listing');
 forbidden(await rpc(null,'lumo_create_list',{p_title:'not authorized'}),'Anonymous RPC');
 const forged=await call(sign(OWNER,{key:'invalid synthetic signing key'}),'/shopping_lists?select=id');
 assert.equal(forged.status,401,'Forged JWT signature must be rejected before RLS');
 const expired=await call(sign(OWNER,{validForSeconds:-60}),'/shopping_lists?select=id');
 assert.equal(expired.status,401,'Expired JWT must not grant authenticated reads');
 const listId=ok(await rpc(a,'lumo_create_list',{p_title:'Compras HTTPS CI'}),'Create list');
 assert.match(listId,/^[0-9a-f-]{36}$/);
 const itemId=randomUUID(),operationId=randomUUID();
 const initial={name:'Café',quantity:2,unit:'un',unit_price_minor:650,state:'in_cart'};
 const created=ok(await rpc(a,'lumo_apply_item',{
  p_list:listId,p_op:operationId,p_action:'add',p_item:itemId,p_payload:initial,p_expected:null
 }),'Create item');
 assert.equal(created.status,'ack');
 assert.equal(created.item.state,'in_cart');
 assert.equal(created.item.revision,1);
 const replay=ok(await rpc(a,'lumo_apply_item',{
  p_list:listId,p_op:operationId,p_action:'add',p_item:itemId,p_payload:initial,p_expected:null
 }),'Idempotent replay');
 assert.equal(replay.item.id,itemId);
 assert.equal(replay.item.revision,1,'Same operation cannot add duplicate item');
 const reused=await rpc(a,'lumo_apply_item',{
  p_list:listId,p_op:operationId,p_action:'add',p_item:itemId,
  p_payload:{...initial,quantity:20},p_expected:null
 });
 assert.equal(reused.status,409,'Modified payload with same operation UUID is a conflict');
 assert.equal(reused.value?.code,'23505','Server explicitly rejects operation ID reuse');

 const ownerItems=ok(await call(a,'/list_items?select=id,name,state,quantity&list_id=eq.'+listId),'Owner reads own items');
 assert.equal(ownerItems.length,1);
 assert.equal(ownerItems[0].state,'in_cart');
 assert.deepEqual(ok(await call(b,'/list_items?select=id&list_id=eq.'+listId),'Unknown user items'),[]);
 assert.deepEqual(ok(await call(b,'/shopping_lists?select=id&id=eq.'+listId),'Unknown user lists'),[]);
 forbidden(await rpc(b,'lumo_apply_item',{
  p_list:listId,p_op:randomUUID(),p_action:'edit',p_item:itemId,p_payload:{quantity:3},p_expected:1
 }),'Nonmember write');

 const editorInvite=ok(await rpc(a,'lumo_create_invite',{p_list:listId,p_role:'editor'}),'Editor invite');
 assert.match(editorInvite,/^[a-f0-9]{48}$/);
 assert.equal(ok(await rpc(b,'lumo_redeem_invite',{p_token:editorInvite}),'Editor redeems'),listId);
 const editOp=randomUUID(),editArgs={p_list:listId,p_op:editOp,p_action:'edit',p_item:itemId,
  p_payload:{quantity:3,state:'unavailable'},p_expected:1};
 const edited=ok(await rpc(b,'lumo_apply_item',editArgs),'Editor edit');
 assert.equal(edited.item.state,'unavailable');
 assert.equal(edited.item.quantity,3);
 assert.equal(edited.item.revision,2);

 const viewerInvite=ok(await rpc(a,'lumo_create_invite',{p_list:listId,p_role:'viewer'}),'Viewer invite');
 assert.equal(ok(await rpc(c,'lumo_redeem_invite',{p_token:viewerInvite}),'Viewer redeems'),listId);
 assert.equal(ok(await call(c,'/list_items?select=id&list_id=eq.'+listId),'Viewer reads').length,1);
 forbidden(await rpc(c,'lumo_apply_item',{
  p_list:listId,p_op:randomUUID(),p_action:'edit',p_item:itemId,p_payload:{quantity:11},p_expected:2
 }),'Viewer cannot edit');

 const removed=ok(await rpc(a,'lumo_apply_item',{
  p_list:listId,p_op:randomUUID(),p_action:'delete',p_item:itemId,p_payload:{},p_expected:2
 }),'Owner delete');
 assert.ok(removed.item.deleted_at,'Deleted row is tombstoned');
 const restored=ok(await rpc(a,'lumo_apply_item',{
  p_list:listId,p_op:randomUUID(),p_action:'restore',p_item:itemId,
  p_payload:{name:'Café torrado',quantity:5,unit:'un',state:'pending',unit_price_minor:730},p_expected:3
 }),'Owner restore');
 assert.equal(restored.item.deleted_at,null);
 assert.equal(restored.item.name,'Café torrado');
 assert.equal(restored.item.quantity,5);
 assert.equal(restored.item.state,'pending');
 assert.equal(restored.item.unit_price_minor,730);

 assert.equal(ok(await rpc(a,'lumo_revoke_member',{p_list:listId,p_user:EDITOR}),'Revoke editor'),true);
 forbidden(await rpc(b,'lumo_apply_item',editArgs),'Revoked editor replay of previously acknowledged operation');
 assert.deepEqual(ok(await call(b,'/list_items?select=id&list_id=eq.'+listId),'Revoked editor read'),[]);
 assert.equal(ok(await call(c,'/list_items?select=id&list_id=eq.'+listId),'Viewer remains authorized').length,1);
 forbidden(await call(c,'/private.operation_events?select=id'),'Private schema not exposed');
});
