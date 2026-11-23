import {UUID,itemPayload,itemSignature,cloudSignature,fromCloud,isConflict,normalizeInvite,safeReadState,needsLocalPush} from './experience-sync-core.mjs';
import {PENDING_INVITE_KEY,forgetPendingInvite} from './oauth.mjs';

/* Progressive, opt-in cloud synchronization for the original v1.7 list UI.
   ONLY lists + list_items. Receipt, catalog, history, photos, themes stay in their
   existing local stores until their dedicated secure contracts are implemented.
   Persist operation UUID + immutable payload BEFORE sending to guarantee replay. */
export function attachCloudSync({legacy,account,session,status,panel}){
 const storageKey=`lumo-experience-sync-${account}`;
 let cloud=safeReadState(localStorage.getItem(storageKey));
 let running=false,debounce=null,interval=null,stopped=false;
 const $=id=>document.getElementById(id);
 const notice=$('lumo-cloud-warning');
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(cloud))}catch{message('Não foi possível guardar o estado da sincronização. Interrompa e exporte seu backup.');throw Error('Armazenamento local indisponível.')}};
 const message=s=>{notice.textContent=s};
 const localState=()=>legacy.getState();
 const mapped=id=>cloud.lists[id];
 const remoteIdForItem=id=>cloud.items[id]||id;
 const cloudIdForList=id=>cloud.lists[id]||null;
 const keyFor=(id,item)=>`${id}:${item}`;
 const saveShadow=(remoteList,localItemId,row)=>{cloud.shadow[keyFor(remoteList,localItemId)]={revision:Number(row.revision),signature:cloudSignature(row),deleted:!!row.deleted_at};persist()};
 const report=()=>{
  const count=Object.keys(cloud.lists).length;
  if(!navigator.onLine)status.textContent='Offline • alterações locais';
  else if(cloud.conflicts.length)status.textContent=`${cloud.conflicts.length} conflito(s)`;
  else if(cloud.pending.length)status.textContent=`${cloud.pending.length} alteração(ões) pendente(s)`;
  else status.textContent=count?`${count} lista(s) na nuvem; histórico local`:'Listas locais • conectar nuvem';
  refreshPanel();
 };
 const getList=()=>localState().lists.find(l=>l.id===legacy.activeListId());
 function refreshPanel(){
  const list=getList();const id=list?.id;
  $('lumo-cloud-current').textContent=list?`Lista atual: ${list.name}`:'Abra uma lista para conectá-la ao casal.';
  const connected=!!id&&!!mapped(id);
  $('lumo-cloud-activate').hidden=!list||connected;
  $('lumo-cloud-create-invite').hidden=!connected;
  $('lumo-cloud-create-invite').disabled=!navigator.onLine;
  if(connected)$('lumo-cloud-desc').textContent='Esta lista tem sincronização de itens e quantidades no Supabase. Fotos, documentos fiscais e histórico permanecem locais nesta etapa.';
  else $('lumo-cloud-desc').textContent='Escolha uma lista e confirme para compartilhar apenas seus itens. Não enviaremos notas fiscais, fotos ou histórico.';
  const n=cloud.pending.length,c=cloud.conflicts.length;
  const conflictText=c?`${c} conflito(s) exigem revisão. Suas alterações não foram descartadas.`:'';
  if(c)$('lumo-cloud-warning').textContent=conflictText;
  const conflictContainer=$('lumo-cloud-conflicts');conflictContainer.replaceChildren();
  cloud.conflicts.forEach((c,index)=>{
   const row=document.createElement('div');row.className='lumo-conflict';
   const label=document.createElement('strong');label.textContent=`Alteração ${index+1} precisa de revisão`;row.appendChild(label);
   const desc=document.createElement('p');desc.textContent=c.error||'Outro celular alterou o item. Nada foi sobrescrito.';row.appendChild(desc);
   const controls=document.createElement('div');controls.className='lumo-conflict-actions';
   if(c.server&&c.localItemId){for(const [choice,caption] of [['remote','Usar versão da nuvem'],['local','Reaplicar minha edição']]){
    const button=document.createElement('button');button.type='button';button.dataset.cloudChoice=choice;button.dataset.cloudIndex=String(index);button.textContent=caption;controls.appendChild(button);
   }}else{const hint=document.createElement('p');hint.textContent='Corrija o item no Lumo; não reenviaremos automaticamente uma alteração rejeitada.';controls.appendChild(hint);}
   row.appendChild(controls);conflictContainer.appendChild(row);
  });
  const pendingInvite=sessionStorage.getItem(PENDING_INVITE_KEY);
  if(pendingInvite&&!$('lumo-invite-input').value)$('lumo-invite-input').value=pendingInvite;
 }
 const rpc=(name,payload)=>session.rpc(name,payload);
 const listRows=()=>session.request('/rest/v1/shopping_lists?select=id,title,owner_id,revision,updated_at&status=eq.active&order=updated_at.desc');
 const itemsFor=rid=>session.request(`/rest/v1/list_items?select=*&list_id=eq.${encodeURIComponent(rid)}&order=created_at.asc`);
 const listIsMapped=lid=>Object.prototype.hasOwnProperty.call(cloud.lists,lid);
 const localIdForRemote=rid=>Object.entries(cloud.lists).find(([,v])=>v===rid)?.[0];
 const uuidForLocal=lid=>cloud.items[lid]||(cloud.items[lid]=UUID.test(lid)?lid:crypto.randomUUID());
 function createPending(localListId,localItemId,action,payload,expected){
  const rid=cloudIdForList(localListId);if(!rid)return;
  if(cloud.pending.some(p=>p.localListId===localListId&&p.localItemId===localItemId)||cloud.conflicts.some(p=>p.localListId===localListId&&p.localItemId===localItemId))return;
  const op={operation_id:crypto.randomUUID(),localListId,remoteListId:rid,localItemId,remoteItemId:uuidForLocal(localItemId),action,payload,expected_revision:expected??null,createdAt:Date.now()};
  cloud.pending.push(op);persist();report();
 }
 async function applyQueue(){
  for(const op of [...cloud.pending].sort((a,b)=>a.createdAt-b.createdAt)){
   if(!navigator.onLine)break;
   try{
    const result=await rpc('lumo_apply_item',{p_list:op.remoteListId,p_op:op.operation_id,p_action:op.action,p_item:op.remoteItemId,p_payload:op.payload,p_expected:op.expected_revision});
    if(result?.status==='conflict'){
     cloud.conflicts.push({...op,server:result.current});cloud.pending=cloud.pending.filter(x=>x.operation_id!==op.operation_id);persist();message('Houve edição simultânea. Abra o painel de nuvem para revisar; o Lumo não sobrescreveu o outro aparelho.');break;
    }
    if(result?.status!=='ack'||!result.item)throw Error('Servidor não confirmou a alteração.');
    saveShadow(op.remoteListId,op.localItemId,result.item);
    cloud.pending=cloud.pending.filter(x=>x.operation_id!==op.operation_id);persist();
   }catch(err){
    if(err.status&&err.status>=400&&err.status<500&&err.status!==429){
     cloud.conflicts.push({...op,error:err.message});cloud.pending=cloud.pending.filter(x=>x.operation_id!==op.operation_id);persist();message(`Alteração mantida localmente: ${err.message}. Reveja os dados.`);
    }else{message('Servidor indisponível. Operação salva no aparelho, será reenviada com a mesma identificação.');}
    break;
   }
  }
 }
 async function mergeRemoteLists(rows){
  const local=localState(),known=new Set(Object.values(cloud.lists));const additions=[];
  for(const row of rows){
   if(known.has(row.id))continue;
   if(local.lists.some(x=>x.id===row.id)&&!mapped(row.id)){
    // A locally-owned UUID must never be silently linked to another user's list.
    cloud.conflicts.push({localListId:row.id,remoteListId:row.id,error:'ID de lista já existe no armazenamento local; confirme associação manualmente.'});continue;
   }
   cloud.lists[row.id]=row.id;known.add(row.id);additions.push({id:row.id,name:row.title,icon:'🛍️',createdAt:new Date().toISOString(),updatedAt:row.updated_at});
  }
  if(additions.length)legacy.applyRemote(state=>{for(const l of additions)if(!state.lists.some(x=>x.id===l.id))state.lists.push(l)});
  // Resolve title changes separately from item revisions; no silent loss of a
  // concurrently edited title and no server rename by non-owners.
  for(const row of rows){
   const lid=localIdForRemote(row.id),local=localState().lists.find(x=>x.id===lid);
   if(!lid||!local)continue;
   const confirmed=cloud.titles[row.id];
   if(!confirmed){cloud.titles[row.id]={title:row.title,revision:row.revision};continue;}
   if(local.name===row.title){cloud.titles[row.id]={title:row.title,revision:row.revision};continue;}
   if(local.name!==confirmed.title&&row.title===confirmed.title){
    if(row.owner_id!==account){
     if(!cloud.conflicts.some(x=>x.localListId===lid&&x.type==='list_title'))cloud.conflicts.push({type:'list_title',localListId:lid,error:'Apenas o dono da lista pode alterar o nome compartilhado. Seu nome local foi mantido.'});
     continue;
    }
    try{
     const result=await rpc('lumo_rename_list',{p_list:row.id,p_title:local.name,p_expected:row.revision});
     if(result.status==='ack')cloud.titles[row.id]={title:local.name,revision:result.revision};
     else if(!cloud.conflicts.some(x=>x.localListId===lid&&x.type==='list_title'))cloud.conflicts.push({type:'list_title',localListId:lid,error:'Outro celular alterou a lista. Confira o nome antes de sincronizar.'});
    }catch(err){message(`Não foi possível atualizar o nome da lista: ${err.message}`)}
   }else if(local.name===confirmed.title&&row.title!==confirmed.title){
    legacy.applyRemote(state=>{const current=state.lists.find(x=>x.id===lid);if(current)current.name=row.title;});
    cloud.titles[row.id]={title:row.title,revision:row.revision};
   }else if(!cloud.conflicts.some(x=>x.localListId===lid&&x.type==='list_title'))cloud.conflicts.push({type:'list_title',localListId:lid,error:'Nome alterado nos dois celulares. Revise qual nome manter.'});
  }
  // Nunca grave o mapa de listas antes de confirmar que a lista recebida
  // foi salva neste aparelho; uma falha de IndexedDB não pode torná-la invisível.
  await legacy.waitForLocalSave?.();
  persist();
 }
 async function reconcileList(localListId,remoteListId){
  const remote=await itemsFor(remoteListId),remoteById=new Map(remote.map(x=>[x.id,x]));
  const state=localState();const locals=state.items.filter(x=>x.listId===localListId),localByRemote=new Map(locals.map(x=>[remoteIdForItem(x.id),x]));
  const syncAdditions=[],syncUpdates=[],syncRemovals=[],syncShadows=[];
  // Handle local operations first, preserving the payload in the queue before sending.
  for(const local of locals){
   const rid=uuidForLocal(local.id),server=remoteById.get(rid),shadow=cloud.shadow[keyFor(remoteListId,local.id)];
   let signature;try{signature=itemSignature(local);}catch(err){message(`${local.name}: ${err.message}`);continue;}
   if(cloud.pending.some(x=>x.localItemId===local.id&&x.remoteListId===remoteListId)||cloud.conflicts.some(x=>x.localItemId===local.id&&x.remoteListId===remoteListId))continue;
   if(server?.deleted_at){
    if(shadow&&signature===shadow.signature){syncRemovals.push(local.id);syncShadows.push({localId:local.id,row:server});}
    else if(shadow){cloud.conflicts.push({localListId,remoteListId,localItemId:local.id,server,error:'Excluído no outro celular; alterações locais mantidas.'});persist();}
    else{cloud.conflicts.push({localListId,remoteListId,localItemId:local.id,server,error:'Item já excluído na nuvem com este identificador.'});persist();}
    continue;
   }
   if(!shadow){
    if(server){
     if(signature===cloudSignature(server)){saveShadow(remoteListId,local.id,server);continue;}
     cloud.conflicts.push({localListId,remoteListId,localItemId:local.id,server,error:'Existe outro item na nuvem com o mesmo ID. Nenhum dado foi apagado.'});persist();continue;
    }
    createPending(localListId,local.id,'add',itemPayload(local),null);continue;
   }
   if(signature!==shadow.signature){
    if(server&&Number(server.revision)!==Number(shadow.revision)){
     // Recupera ACK remoto persistido no aparelho antes do shadow (crash entre os dois).
     if(signature===cloudSignature(server)){saveShadow(remoteListId,local.id,server);continue;}
     cloud.conflicts.push({localListId,remoteListId,localItemId:local.id,server,error:'Edição simultânea; alterações locais preservadas.'});persist();continue;
    }
    if(shadow.deleted){createPending(localListId,local.id,'restore',itemPayload(local),shadow.revision);continue;}
    createPending(localListId,local.id,'edit',itemPayload(local),shadow.revision);
   }else if(server&&Number(server.revision)!==Number(shadow.revision)){
    syncUpdates.push({localId:local.id,row:server});syncShadows.push({localId:local.id,row:server});
   }
  }
  // Não deduza uma exclusão de um item ausente após reiniciar: isso também pode
  // significar armazenamento local indisponível. Só eventos locais confirmados
  // (onLocalChange após persistência) criam operações de exclusão na nuvem.
  for(const server of remote){
   if(server.deleted_at)continue;
   const local=localByRemote.get(server.id);
   if(local)continue;
   const pending=cloud.pending.some(x=>x.remoteItemId===server.id&&x.remoteListId===remoteListId);
   const conflict=cloud.conflicts.some(x=>x.remoteItemId===server.id&&x.remoteListId===remoteListId);
   if(pending||conflict)continue;
   const originalLocalId=Object.entries(cloud.items).find(([,v])=>v===server.id)?.[0]||server.id;
   const shadow=cloud.shadow[keyFor(remoteListId,originalLocalId)];
   if(shadow&&!shadow.deleted){
    // Item was deleted here, not yet ACKed. Preserve the deletion request.
    continue;
   }
   syncAdditions.push({server,localId:originalLocalId});syncShadows.push({localId:originalLocalId,row:server});
  }
  if(syncAdditions.length||syncUpdates.length||syncRemovals.length){
   legacy.applyRemote(current=>{
   for(const localId of syncRemovals)current.items=current.items.filter(x=>x.id!==localId);
   for(const {localId,row} of syncUpdates){const item=current.items.find(x=>x.id===localId&&x.listId===localListId);if(item)Object.assign(item,{...fromCloud(row,localListId),id:localId,details:item.details,category:item.category});}
   for(const {server,localId} of syncAdditions)if(!current.items.some(x=>x.id===localId&&x.listId===localListId))current.items.push({...fromCloud(server,localListId),id:localId});
   });
   // A nuvem só é marcada como recebida depois que a gravação em IndexedDB terminou.
   // Se fechar durante o salvamento, o próximo sync deve tentar o mesmo item novamente.
   await legacy.waitForLocalSave?.();
   for(const {localId,row} of syncShadows)saveShadow(remoteListId,localId,row);
  }
 }
 async function syncOnce(){
  if(running||stopped||!navigator.onLine)return;
  running=true;report();
  try{
   await legacy.waitForLocalSave?.();
   const rows=await listRows();
   await mergeRemoteLists(rows);
   for(const [localId,remoteId] of Object.entries(cloud.lists)){
    if(!localState().lists.find(l=>l.id===localId))continue;
    await reconcileList(localId,remoteId);
   }
   await applyQueue();
   // Read new ACKs and changes made on another phone after all writes.
   if(!cloud.pending.length&&!cloud.conflicts.length){
    for(const [localId,remoteId] of Object.entries(cloud.lists))await reconcileList(localId,remoteId);
   }
  }catch(err){message('Não foi possível atualizar a nuvem. Seus dados locais permanecem no aparelho. '+(err.message||''));}
  finally{running=false;report()}
 }
 async function activateCurrent(){
  const current=getList();if(!current){message('Abra primeiro uma lista.');return;}
  if(!navigator.onLine){message('Conecte-se à internet para criar uma lista compartilhada.');return;}
  if(mapped(current.id)){message('Esta lista já está conectada.');return;}
  try{
   const rid=UUID.test(current.id)?current.id:crypto.randomUUID();
   const confirmed=await rpc('lumo_ensure_list',{p_list:rid,p_title:current.name});
   if(confirmed!==rid)throw Error('O servidor devolveu uma identificação de lista inesperada.');
   cloud.lists[current.id]=rid;cloud.titles[rid]={title:current.name,revision:0};persist();await syncOnce();message('Lista conectada. Os itens serão enviados com confirmação do servidor.');report();
  }catch(err){message(`Não foi possível conectar a lista: ${err.message}`)}
 }
 async function createInvite(){
  const current=getList();const id=cloudIdForList(current?.id);
  if(!id){message('Conecte a lista antes de convidar outra pessoa.');return;}
  try{
   const token=await rpc('lumo_create_invite',{p_list:id,p_role:'editor'});
   const link=`${location.origin}${location.pathname}#invite=${token}`;
   if(navigator.share){try{await navigator.share({title:'Convite Lumo',text:'Vamos fazer compras juntos?',url:link});message('Convite compartilhado. Ele expira em 24 horas.');return;}catch{}}
   await navigator.clipboard.writeText(link);message('Convite de uso único copiado. Compartilhe com a outra conta Google.');
  }catch(err){message(`Não foi possível criar convite: ${err.message}`)}
 }
 async function resolveConflict(index,choice){
  const conflict=cloud.conflicts[index];if(!conflict?.server||!conflict.localItemId)return;
  const {localListId,remoteListId,localItemId,server}=conflict;
  if(choice==='remote'){
   legacy.applyRemote(state=>{
    const current=state.items.find(x=>x.id===localItemId&&x.listId===localListId);
    if(server.deleted_at){state.items=state.items.filter(x=>!(x.id===localItemId&&x.listId===localListId));}
    else if(current)Object.assign(current,{...fromCloud(server,localListId),id:localItemId,details:current.details,category:current.category});
    else state.items.push({...fromCloud(server,localListId),id:localItemId});
   });
   // Resolver um conflito também é uma atualização recebida da nuvem:
   // somente confirme o shadow depois que a escrita local for durável.
   try{
    await legacy.waitForLocalSave?.();
    saveShadow(remoteListId,localItemId,server);
   }catch(err){
    message('Não foi possível salvar a versão da nuvem neste aparelho. O conflito foi mantido para tentar novamente. '+(err?.message||''));
    report();
    return;
   }
  }else if(choice==='local'){
   // The user explicitly chose to reapply a local edit. Commit the shadow,
   // removal of the old conflict and the replacement operation in ONE durable
   // localStorage write. A crash or quota error must leave the original
   // conflict available for retry, never a half-acknowledged edit.
   let local,payload,remoteItemId;
   try{
    await legacy.waitForLocalSave?.();
    local=localState().items.find(x=>x.id===localItemId&&x.listId===localListId);
    if(!local)throw Error('Item não encontrado neste aparelho.');
    payload=itemPayload(local);
    remoteItemId=cloud.items[localItemId]||(UUID.test(localItemId)?localItemId:crypto.randomUUID());
   }catch(err){message('Sua edição continua em conflito: '+(err?.message||''));return;}
   if(cloud.pending.some(p=>p.localItemId===localItemId&&p.remoteListId===remoteListId)){
    message('Já existe uma operação pendente para este item.');return;
   }
   const next={...cloud,items:{...cloud.items},shadow:{...cloud.shadow},
    conflicts:cloud.conflicts.filter((_,i)=>i!==index),pending:[...cloud.pending]};
   next.items[localItemId]=remoteItemId;
   next.shadow[keyFor(remoteListId,localItemId)]={
    revision:Number(server.revision),signature:cloudSignature(server),deleted:!!server.deleted_at
   };
   next.pending.push({operation_id:crypto.randomUUID(),localListId,remoteListId,localItemId,
    remoteItemId,action:server.deleted_at?'restore':'edit',payload,
    expected_revision:Number(server.revision),createdAt:Date.now()});
   try{localStorage.setItem(storageKey,JSON.stringify(next));}
   catch(err){
    message('Sem espaço para guardar a tentativa. O conflito foi preservado; exporte um backup e libere armazenamento. '+(err?.message||''));
    return;
   }
   cloud=next;report();void syncOnce();return;
  }else return;
  cloud.conflicts.splice(index,1);persist();report();message(choice==='remote'?'Versão da nuvem aplicada somente neste item.':'Sua edição foi enviada para revisão.');
 }
 async function redeemInvite(){
  const token=normalizeInvite($('lumo-invite-input').value);
  if(!token){message('Cole um link de convite Lumo ou um código de 48 caracteres.');return;}
  try{
   const id=await rpc('lumo_redeem_invite',{p_token:token});
   forgetPendingInvite(sessionStorage);$('lumo-invite-input').value='';
   await syncOnce();message('Convite aceito. A lista compartilhada está disponível em Minhas listas.');
   report();
  }catch(err){message(`Não foi possível aceitar o convite: ${err.message}`)}
 }
 function queueExplicitLocalDeletions(){
  const state=localState(),listIds=new Set(state.lists.map(l=>l.id));
  for(const [localListId,remoteListId] of Object.entries(cloud.lists)){
   if(!listIds.has(localListId))continue;
   const present=new Set(state.items.filter(i=>i.listId===localListId).map(i=>i.id));
   for(const [key,shadow] of Object.entries(cloud.shadow)){
    if(!key.startsWith(`${remoteListId}:`)||shadow.deleted)continue;
    const localItemId=key.slice(remoteListId.length+1);
    if(present.has(localItemId))continue;
    if(cloud.pending.some(op=>op.localItemId===localItemId&&op.remoteListId===remoteListId))continue;
    if(cloud.conflicts.some(op=>op.localItemId===localItemId&&op.remoteListId===remoteListId))continue;
    createPending(localListId,localItemId,'delete',{},shadow.revision);
   }
  }
 }
 function onLocalChange(){
  if(debounce)clearTimeout(debounce);
  // O evento ocorre ao alterar a UI; as exclusões só podem ser enviadas
  // depois de IndexedDB/localStorage confirmar a gravação da alteração.
  void Promise.resolve(legacy.waitForLocalSave?.()).then(()=>{
   if(stopped)return;
   queueExplicitLocalDeletions();
   debounce=setTimeout(()=>{void syncOnce()},750);
  }).catch(err=>message('Exclusão não enviada: falha ao salvar neste aparelho. '+(err?.message||'')));
 }
 function start(){
  $('lumo-cloud-activate').addEventListener('click',()=>{void activateCurrent()});
  $('lumo-cloud-create-invite').addEventListener('click',()=>{void createInvite()});
  $('lumo-cloud-redeem').addEventListener('click',()=>{void redeemInvite()});
  $('lumo-cloud-refresh').addEventListener('click',()=>{void syncOnce()});
  $('lumo-cloud-conflicts').addEventListener('click',e=>{const button=e.target.closest('button[data-cloud-choice]');if(button)void resolveConflict(Number(button.dataset.cloudIndex),button.dataset.cloudChoice)});
  $('lumo-cloud-share-text').addEventListener('click',()=>{legacy.shareText();});
  window.addEventListener('lumo:local-changed',onLocalChange);
  window.addEventListener('online',()=>{void syncOnce()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void syncOnce()});
  interval=setInterval(()=>{void syncOnce()},12000);
  const pending=sessionStorage.getItem(PENDING_INVITE_KEY);
  if(pending){$('lumo-invite-input').value=pending;panel.showModal();message('Convite recebido. Confirme em Aceitar para compartilhar esta lista.');}
  report();void syncOnce();
 }
 return {start,refreshPanel,syncOnce,stop:()=>{stopped=true;clearInterval(interval);window.removeEventListener('lumo:local-changed',onLocalChange)}};
}
