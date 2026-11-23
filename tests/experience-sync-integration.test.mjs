/* In-process simulation of two phone sessions. NO real network or live OAuth. */
import {test} from 'node:test';import assert from 'node:assert/strict';
import {attachCloudSync} from '../web/experience-sync.mjs';
const A='00000000-0000-4000-8000-000000000701',B='00000000-0000-4000-8000-000000000702';
const LIST='10000000-0000-4000-8000-000000000701', ITEM='20000000-0000-4000-8000-000000000701';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class El{
 constructor(){this.textContent='';this.value='';this.hidden=false;this.disabled=false;this.dataset={};this.children=[];this.handlers={};this.className='';}
 addEventListener(type,fn){this.handlers[type]=fn;}
 fire(type='click'){this.handlers[type]?.({target:this});}
 appendChild(c){this.children.push(c)}
 replaceChildren(...children){this.children=children}
 showModal(){this.open=true}
 close(){this.open=false}
 closest(){return null}
}
class FakeDB{
 constructor(){this.lists=new Map();this.items=new Map();this.members=new Map();this.invites=new Map();this.ops=new Map();this.clipboard='';}
 member(l,u){return this.members.has(`${l}:${u}`)}
 async rpc(user,name,p){
  if(name==='lumo_ensure_list'){
   const x=this.lists.get(p.p_list);if(x&&x.owner_id!==user)throw Error('forbidden');
   if(!x)this.lists.set(p.p_list,{id:p.p_list,title:p.p_title,owner_id:user,revision:0,updated_at:new Date().toISOString()});
   this.members.set(`${p.p_list}:${user}`,'owner');return p.p_list;
  }
  if(name==='lumo_rename_list'){
   const l=this.lists.get(p.p_list);if(!l||l.owner_id!==user)throw Error('owner required');
   if(l.revision!==p.p_expected)return {status:'conflict',revision:l.revision};
   l.title=p.p_title;l.revision++;return {status:'ack',revision:l.revision};
  }
  if(name==='lumo_create_invite'){
   const l=this.lists.get(p.p_list);if(!l||l.owner_id!==user)throw Error('owner required');
   const token='a'.repeat(47)+String(this.invites.size%10);this.invites.set(token,{listId:p.p_list,used:false});return token;
  }
  if(name==='lumo_redeem_invite'){
   const i=this.invites.get(p.p_token);if(!i||i.used)throw Error('invalid invite');i.used=true;this.members.set(`${i.listId}:${user}`,'editor');return i.listId;
  }
  if(name==='lumo_apply_item'){
   if(!this.member(p.p_list,user))throw Error('forbidden');
   if(this.ops.has(p.p_op))return this.ops.get(p.p_op);
   let r=this.items.get(p.p_item);
   if(p.p_action==='add'){
    if(r)throw Error('already exists');
    r={id:p.p_item,list_id:p.p_list,...p.p_payload,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),revision:1,deleted_at:null};
   }else{
    if(!r)throw Error('missing');
    if(r.revision!==p.p_expected)return {status:'conflict',current:r};
    r={...r,...p.p_payload,revision:r.revision+1,deleted_at:p.p_action==='delete'?new Date().toISOString():p.p_action==='restore'?null:r.deleted_at};
   }
   this.items.set(r.id,r);const result={status:'ack',item:{...r},list_revision:1};this.ops.set(p.p_op,result);return result;
  }
  throw Error('unknown RPC '+name);
 }
 async get(user,path){
  if(path.startsWith('/rest/v1/shopping_lists'))return [...this.lists.values()].filter(x=>this.member(x.id,user)).map(x=>({...x}));
  if(path.startsWith('/rest/v1/list_items')){const rid=decodeURIComponent(new URL('https://x.test'+path).searchParams.get('list_id')?.replace('eq.','')||'');return [...this.items.values()].filter(x=>x.list_id===rid&&this.member(x.list_id,user)).map(x=>({...x}));}
  throw Error('Unknown GET '+path);
 }
}
function fakeDom(){const elements=new Map();const get=id=>elements.get(id)||(elements.set(id,new El()),elements.get(id));return {get,getElementById:get,createElement:()=>new El(),addEventListener(){}}}
const accountStores=new Map();
function setup(user,db,list=[],items=[],options={}){
 const doc=fakeDom();globalThis.document=doc;globalThis.window=new EventTarget();globalThis.location={origin:'https://lumo-preview.example',pathname:'/'};
 const store=accountStores.get(user)||new Map();accountStores.set(user,store);globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 globalThis.sessionStorage={getItem:k=>store.get('ss:'+k)||null,setItem:(k,v)=>store.set('ss:'+k,v),removeItem:k=>store.delete('ss:'+k)};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,clipboard:{writeText:async txt=>{db.clipboard=txt}}}});
 const state={lists:structuredClone(list),items:structuredClone(items)};
 const legacy={getState:()=>state,activeListId:()=>state.lists[0]?.id,waitForLocalSave:()=>options.saveCheck?options.saveCheck(state):Promise.resolve(),applyRemote:cb=>cb(state),shareText:()=>{}};
 const session={rpc:(name,p)=>db.rpc(user,name,p),request:path=>db.get(user,path)};
 const status=doc.get('lumo-cloud-status'),panel=doc.get('lumo-cloud-panel');
 const sync=attachCloudSync({legacy,account:user,session,status,panel});sync.start();
 return {sync,state,doc,stop:()=>sync.stop()};
}
test('dois celulares: compartilhar, propagar atualização, offline e conflito sem sobrescrever',async()=>{
 const db=new FakeDB();
 const original={id:ITEM,listId:LIST,name:'Arroz',qty:1,unit:'un',unitPriceCents:600,status:'pending',barcode:''};
 const a=setup(A,db,[{id:LIST,name:'Mercado do mês'}],[original]);
 await sleep(20);a.doc.get('lumo-cloud-activate').fire();await sleep(150);
 assert.equal(db.lists.size,1,'Stable cloud list created');
 assert.equal(db.items.get(ITEM)?.quantity,1,'Original item synced');
 a.doc.get('lumo-cloud-create-invite').fire();await sleep(25);assert.match(db.clipboard,/invite=[a-f0-9]{48}/);
 const savedA=structuredClone(a.state);a.stop();
 const b=setup(B,db,[],[]);await sleep(25);
 b.doc.get('lumo-invite-input').value=db.clipboard;b.doc.get('lumo-cloud-redeem').fire();await sleep(110);
 assert.equal(b.state.lists.length,1,'Invited user B sees list');assert.equal(b.state.items.length,1,'Invited user B sees item');
 b.state.items[0].qty=2;await b.sync.syncOnce();assert.equal(db.items.get(ITEM).quantity,2,'B updated to 2');
 // Durable local draft remains local without connectivity.
 navigator.onLine=false;b.state.items[0].qty=3;await b.sync.syncOnce();
 assert.equal(db.items.get(ITEM).quantity,2,'Offline edit cannot touch server');
 navigator.onLine=true;await b.sync.syncOnce();assert.equal(db.items.get(ITEM).quantity,3,'Reconnection posts offline edit');
 const savedB=structuredClone(b.state);b.stop();
 // Owner A gets changed value and makes an independent change to 5.
 const a2=setup(A,db,savedA.lists,savedA.items);await sleep(50);
 assert.equal(a2.state.items[0].qty,3,'Owner gets new value from second phone');
 a2.state.items[0].qty=5;await a2.sync.syncOnce();
 assert.equal(db.items.get(ITEM).quantity,5,'Owner edit to 5 accepted');a2.stop();
 // B was disconnected again and edited to 4 before seeing revision 5.
 savedB.items[0].qty=4;
 const b2=setup(B,db,savedB.lists,savedB.items);await sleep(80);
 assert.equal(db.items.get(ITEM).quantity,5,'Server value was not overwritten by stale B');
 assert.equal(b2.state.items[0].qty,4,'Local unsynced version preserved');
 const children=b2.doc.get('lumo-cloud-conflicts').children;
 assert.ok(children.length>0,'Conflict shown to user, not silently discarded');
 b2.stop();
});

test('exclusão intencional sincroniza após alteração local salva',async()=>{
 const user='00000000-0000-4000-8000-000000000713';
 const listId='10000000-0000-4000-8000-000000000713';
 const itemId='20000000-0000-4000-8000-000000000713';
 const db=new FakeDB();
 const a=setup(user,db,[{id:listId,name:'Mercado'}],[{id:itemId,listId,name:'Arroz',qty:1,unit:'un',unitPriceCents:100,status:'pending',barcode:''}]);
 await sleep(20);a.doc.get('lumo-cloud-activate').fire();await sleep(130);
 assert.ok(db.items.get(itemId)&&!db.items.get(itemId).deleted_at);
 a.state.items.splice(0,1);
 globalThis.window.dispatchEvent(new Event('lumo:local-changed'));
 await sleep(25);await a.sync.syncOnce();
 assert.ok(db.items.get(itemId).deleted_at,'Deletion was sent only after an explicit local change');
 a.stop();
});
test('reinício com item local ausente não exclui automaticamente o item em nuvem',async()=>{
 const user='00000000-0000-4000-8000-000000000714';
 const listId='10000000-0000-4000-8000-000000000714';
 const itemId='20000000-0000-4000-8000-000000000714';
 const list={id:listId,name:'Compras'};
 const product={id:itemId,listId,name:'Leite',qty:2,unit:'un',unitPriceCents:600,status:'pending',barcode:''};
 const db=new FakeDB();
 const a=setup(user,db,[list],[product]);
 await sleep(20);a.doc.get('lumo-cloud-activate').fire();await sleep(130);a.stop();
 const reboot=setup(user,db,[list],[]);
 await sleep(70);
 assert.equal(db.items.get(itemId).deleted_at,null,'A missing local database is not a delete request');
 reboot.stop();
});
test('falha de salvamento impede registro prematuro de item recebido da nuvem',async()=>{
 const owner='00000000-0000-4000-8000-000000000715';
 const guest='00000000-0000-4000-8000-000000000716';
 const listId='10000000-0000-4000-8000-000000000715';
 const itemId='20000000-0000-4000-8000-000000000715';
 const db=new FakeDB();
 const a=setup(owner,db,[{id:listId,name:'Feira'}],[{id:itemId,listId,name:'Banana',qty:3,unit:'un',unitPriceCents:230,status:'pending',barcode:''}]);
 await sleep(20);a.doc.get('lumo-cloud-activate').fire();await sleep(130);
 a.doc.get('lumo-cloud-create-invite').fire();await sleep(25);
 const invite=db.clipboard;a.stop();
 const b=setup(guest,db,[],[],{saveCheck:state=>state.items.length?Promise.reject(new Error('IndexedDB indisponível')):Promise.resolve()});
 await sleep(20);b.doc.get('lumo-invite-input').value=invite;b.doc.get('lumo-cloud-redeem').fire();await sleep(90);
 assert.equal(b.state.items.length,1,'Item exists only in memory');
 const cloudState=JSON.parse(accountStores.get(guest).get('lumo-experience-sync-'+guest));
 assert.equal(Object.keys(cloudState.shadow).length,0,'No server ACK until local database save succeeds');
 const previouslySeenList=structuredClone(b.state.lists);
 b.stop();
 const restarted=setup(guest,db,previouslySeenList,[]);
 await sleep(90);
 assert.equal(restarted.state.items.length,1,'Item recovered on restart instead of being permanently skipped');
 restarted.stop();
});

test('falha ao salvar lista compartilhada não registra mapa remoto antes da hora',async()=>{
 const owner='00000000-0000-4000-8000-000000000717';
 const guest='00000000-0000-4000-8000-000000000718';
 const listId='10000000-0000-4000-8000-000000000717';
 const db=new FakeDB();
 const a=setup(owner,db,[{id:listId,name:'Lista da família'}],[]);
 await sleep(20);a.doc.get('lumo-cloud-activate').fire();await sleep(110);
 a.doc.get('lumo-cloud-create-invite').fire();await sleep(25);
 const invite=db.clipboard;a.stop();
 const b=setup(guest,db,[],[],{saveCheck:state=>state.lists.length?Promise.reject(Error('IDB falhou ao salvar a lista')):Promise.resolve()});
 await sleep(25);b.doc.get('lumo-invite-input').value=invite;b.doc.get('lumo-cloud-redeem').fire();await sleep(80);
 assert.equal(b.state.lists.length,1,'Lista chega na memória');
 const raw=accountStores.get(guest).get('lumo-experience-sync-'+guest);
 assert.equal(Object.keys(JSON.parse(raw||'{}').lists||{}).length,0,'Lista não confirmada no mapeamento remoto');
 b.stop();
 const recovery=setup(guest,db,[],[]);
 await sleep(85);
 assert.equal(recovery.state.lists.length,1,'Lista recebida novamente após reiniciar');
 recovery.stop();
});


test('resolver conflito remoto aguarda salvamento local e conserva conflito após falha',async()=>{
 const user='00000000-0000-4000-8000-000000000719';
 const listId='10000000-0000-4000-8000-000000000719';
 const itemId='20000000-0000-4000-8000-000000000719';
 const db=new FakeDB();let failSave=false;
 const a=setup(user,db,[{id:listId,name:'Mercado'}],
  [{id:itemId,listId,name:'Feijão',qty:1,unit:'un',unitPriceCents:800,status:'pending',barcode:''}],
  {saveCheck:()=>failSave?Promise.reject(Error('falha simulada de IndexedDB')):Promise.resolve()});
 await sleep(20);a.doc.get('lumo-cloud-activate').fire();await sleep(130);
 const key='lumo-experience-sync-'+user,shadowKey=listId+':'+itemId;
 const read=()=>JSON.parse(accountStores.get(user).get(key));
 assert.equal(read().shadow[shadowKey].revision,1,'Original was confirmed locally');
 db.items.set(itemId,{...db.items.get(itemId),quantity:2,revision:2,updated_at:new Date().toISOString()});
 a.state.items[0].qty=3;
 await a.sync.syncOnce();
 assert.equal(read().conflicts.length,1,'Concurrent edit created a reviewable conflict');
 const clickRemote=()=>a.doc.get('lumo-cloud-conflicts').handlers.click({
  target:{closest:()=>({dataset:{cloudChoice:'remote',cloudIndex:'0'}})}
 });
 failSave=true;clickRemote();await sleep(25);
 assert.equal(read().shadow[shadowKey].revision,1,'Failed local write must not ACK remote revision');
 assert.equal(read().conflicts.length,1,'Conflict remains available for retry');
 failSave=false;clickRemote();await sleep(25);
 assert.equal(read().shadow[shadowKey].revision,2,'Revision confirmed after successful local write');
 assert.equal(read().conflicts.length,0,'Conflict cleared only after durable local write');
 a.stop();
});
