import {SUPABASE_URL,SUPABASE_KEY} from './config.js';
import {parseMoney,formatMoney,cartMinor,validQuantity,canReplay,summarizeQueue,isRecoverableFailure} from './logic.mjs';
import {buildGoogleAuthorization,consumeGoogleCallback,exchangeGoogleCode,getGoogleAvailability,oauthRedirect,preserveInviteFromUrl,readPendingInvite,forgetPendingInvite} from './oauth.mjs';
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const AUTH_KEY='lumo_beta_auth_v1'; const CACHE_KEY='lumo_beta_cache_v1';
let auth=null,lists=[],activeList=null,items=[],outbox=[],editing=null,refreshing=false,flushing=false,noticeTimeout=null;
const sessionFromStore=()=>{try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')}catch{return null}};
auth=sessionFromStore();
function show(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>$('toast').classList.add('hidden'),4700)}
function saveAuth(){if(auth)localStorage.setItem(AUTH_KEY,JSON.stringify(auth));else localStorage.removeItem(AUTH_KEY)}
function saveCache(){if(!auth?.user?.id)return;localStorage.setItem(CACHE_KEY,JSON.stringify({user:auth.user.id,lists,activeList,items,savedAt:Date.now()}))}
function restoreCache(){try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(c?.user===auth?.user?.id){lists=c.lists||[];activeList=c.activeList;items=c.items||[]}}catch{}}
function networkLabel(){const q=summarizeQueue(outbox);let msg='Sincronizado',css='';if(!navigator.onLine){msg='Sem internet';css='offline'}else if(q.conflict){msg=`${q.conflict} conflito(s)`;css='offline'}else if(q.pending){msg=`${q.pending} pendente(s)`;css='pending'}else if(!auth){msg='Conecte sua conta';css='pending'}$('networkStatus').textContent=msg;$('networkStatus').className=`network-status ${css}`}
const queueDB=new Promise((resolve,reject)=>{const r=indexedDB.open('lumo-beta-outbox',1);r.onupgradeneeded=()=>r.result.createObjectStore('operations',{keyPath:'operation_id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function queueAll(){const db=await queueDB;return new Promise((resolve,reject)=>{const tx=db.transaction('operations','readonly'),r=tx.objectStore('operations').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function queuePut(op){const db=await queueDB;return new Promise((resolve,reject)=>{const tx=db.transaction('operations','readwrite');tx.objectStore('operations').put(op);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function queueDelete(id){const db=await queueDB;return new Promise((resolve,reject)=>{const tx=db.transaction('operations','readwrite');tx.objectStore('operations').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function loadQueue(){try{outbox=(await queueAll()).filter(x=>x.user===auth?.user?.id)}catch(e){show('Armazenamento local indisponível. Não é seguro editar offline.')}networkLabel()}
const headers=(requiresAuth=true)=>{const h={'apikey':SUPABASE_KEY,'Content-Type':'application/json'};if(requiresAuth&&auth?.access_token)h.Authorization=`Bearer ${auth.access_token}`;return h};
async function call(path,{method='GET',body,requiresAuth=true}={}){
 if(requiresAuth&&!auth?.access_token)throw Error('Faça login para continuar.');
 const r=await fetch(`${SUPABASE_URL}${path}`,{method,headers:headers(requiresAuth),body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const raw=await r.text();let obj;try{obj=JSON.parse(raw)}catch{obj={message:raw}};
 if(!r.ok){const e=new Error(obj.msg||obj.message||obj.error_description||obj.error||`Erro HTTP ${r.status}`);e.status=r.status;throw e}return obj;
}
const rpc=(name,body)=>call(`/rest/v1/rpc/${name}`,{method:'POST',body});
async function refreshToken(){
 if(!auth?.refresh_token||!navigator.onLine)return;
 try{
  const before=auth.user?.id;
  const data=await call('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:auth.refresh_token},requiresAuth:false});
  if(!data.access_token||!data.refresh_token||!before||data.user?.id&&data.user.id!==before)throw Error('Sessão inválida');
  auth={...auth,...data,user:data.user||auth.user};saveAuth();
 }catch(e){
  if(e.status===400||e.status===401||e.message==='Sessão inválida'){
   auth=null;saveAuth();lists=[];items=[];activeList=null;show('Sessão expirada. Entre novamente.');
  }
 }
}
async function signOut(){
 if(outbox.some(op=>op.user===auth?.user?.id&&['pending','conflict'].includes(op.status))&&
  !window.confirm('Existem alterações salvas neste aparelho que não foram sincronizadas. Sair da conta? Elas permanecerão guardadas para quando você entrar novamente.'))return;
 const token=auth?.access_token;
 // Local sign-out is immediate. Remote revocation is best-effort if online.
 auth=null;lists=[];items=[];activeList=null;outbox=[];saveAuth();localStorage.removeItem(CACHE_KEY);render();networkLabel();
 if(token&&navigator.onLine){try{await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`},cache:'no-store'});}catch{show('Saiu deste aparelho. A revogação remota não pôde ser confirmada.')}}
}
async function authSubmit(){
 const email=$('email').value.trim(),password=$('password').value;if(!email||!password)return;
 try{
  const data=await call('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},requiresAuth:false});
  if(!data?.user?.id||!data?.access_token)throw Error('Sessão incompleta');
  if(auth?.user?.id!==data.user.id){lists=[];activeList=null;items=[];}
  auth=data;saveAuth();restoreCache();await loadQueue();render();await refreshLists();show('Bem-vindo ao Lumo.');
 }catch(e){show(`Não foi possível entrar: ${e.message}`)}
}
async function loginWithGoogle(){
 const button=$('googleLoginBtn');button.disabled=true;
 try{
  const enabled=await getGoogleAvailability({supabaseUrl:SUPABASE_URL,publishableKey:SUPABASE_KEY});
  if(!enabled)throw Error('O provedor Google ainda não foi habilitado no Supabase. Consulte a configuração da Beta.');
  const url=await buildGoogleAuthorization({supabaseUrl:SUPABASE_URL,redirectTo:oauthRedirect(location),storage:sessionStorage,cryptoApi:crypto});
  window.location.assign(url);
 }catch(e){show(e.message||'Não foi possível iniciar o login Google.');button.disabled=false}
}
async function finishGoogleCallback(){
 const result=consumeGoogleCallback({url:location.href,storage:sessionStorage});
 if(!result.handled)return false;
 history.replaceState(null,'',result.cleanedUrl);
 if(result.error){show(result.error);return true}
 try{
  const session=await exchangeGoogleCode({supabaseUrl:SUPABASE_URL,publishableKey:SUPABASE_KEY,code:result.code,verifier:result.verifier});
  // Never trust identity from the URL; validate the Supabase-issued session remotely.
  const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
  if(!response.ok)throw Error('Sessão não validada pelo servidor.');
  const user=await response.json();
  if(!user?.id||user.id!==session.user.id)throw Error('Identidade da sessão não corresponde.');
  if(auth?.user?.id!==user.id){lists=[];activeList=null;items=[];}
  auth={...session,user};saveAuth();restoreCache();
  show('Conta Google conectada.');
 }catch(e){show(e.message||'Falha no retorno do Google. Tente novamente.')}
 return true;
}
async function refreshLists(){if(!auth?.access_token||!navigator.onLine||refreshing)return;refreshing=true;try{const data=await call('/rest/v1/shopping_lists?select=id,title,revision,owner_id,updated_at&status=eq.active&order=updated_at.desc');lists=Array.isArray(data)?data:[];if(!lists.find(l=>l.id===activeList))activeList=lists[0]?.id||null;await refreshItems();saveCache()}catch(e){if(e.status===401){await refreshToken()}else show('Sem acesso ao servidor. Exibindo conteúdo salvo neste aparelho.')}finally{refreshing=false;render()}}
async function refreshItems(){if(!activeList||!auth?.access_token||!navigator.onLine)return;try{const result=await call(`/rest/v1/list_items?select=*&list_id=eq.${encodeURIComponent(activeList)}&order=created_at.asc`);items=Array.isArray(result)?result:[];saveCache()}catch(e){console.warn('list refresh unavailable:',e.status||'offline')}}
function currentItems(){const changes=outbox.filter(op=>op.list_id===activeList&&op.user===auth?.user?.id&&op.status==='pending');const set=new Map(items.map(x=>[x.id,{...x}]));for(const op of changes){const item=set.get(op.item_id);if(op.action==='add'){set.set(op.item_id,{id:op.item_id,list_id:activeList,...op.payload,revision:0,_pending:true})}else if(item){if(op.action==='edit')Object.assign(item,op.payload);if(op.action==='delete')item.deleted_at='pending';if(op.action==='restore')item.deleted_at=null;if(op.action==='increment')item.quantity=Number(item.quantity)+Number(op.payload.delta);item._pending=true}}return [...set.values()].filter(x=>!x.deleted_at)}
function render(){const logged=!!auth?.access_token;const n=auth?.user?.user_metadata?.full_name||auth?.user?.email||'';if(logged)$('welcomeText').textContent=n?`Compras organizadas para ${n}.`:'Suas listas, sempre à mão.';$('loginStage').classList.toggle('hidden',logged);$('mainStage').classList.toggle('hidden',!logged);$('logoutBtn').classList.toggle('hidden',!logged);networkLabel();if(!logged)return;
 $('listsCount').textContent=String(lists.length);$('lists').innerHTML=lists.map(l=>`<button type="button" class="list-tile ${activeList===l.id?'active':''}" data-list="${escapeHTML(l.id)}"><span class="list-glyph" aria-hidden="true">◉</span><span class="list-tile-name">${escapeHTML(l.title)}</span></button>`).join('');
 const l=lists.find(l=>l.id===activeList);if(!l){$('listArea').innerHTML='<div class="empty"><div class="empty-symbol">✳</div><h2>Sua próxima lista começa aqui</h2><p>Crie uma lista ou abra uma das suas para começar.</p></div>';return}
 const rows=currentItems();const q=summarizeQueue(outbox.filter(x=>x.list_id===activeList));
 const summary=q.conflict?'<span class="status error">Conflito pendente</span>':q.pending?'<span class="status pending">Salvo neste aparelho</span>':'<span class="status good">Sincronizado</span>';
 const conflictCards=outbox.filter(op=>op.list_id===activeList&&op.status==='conflict'&&op.user===auth?.user?.id).map(op=>`<div class="conflict"><strong>Alteração precisa de atenção</strong><p>O servidor não aceitou uma mudança simultânea${op.error?' ou inválida':''}. Seus dados foram preservados neste aparelho.</p><div class="tools"><button type="button" data-discard="${escapeHTML(op.operation_id)}">Usar versão do servidor</button><button type="button" data-review="${escapeHTML(op.operation_id)}">Revisar minha alteração</button></div></div>`).join('');
 $('listArea').innerHTML=`<div class="list-head"><div><p class="eyebrow">Lista compartilhada</p><h2>${escapeHTML(l.title)}</h2><p>${rows.length} ${rows.length===1?'item':'itens'} · Preços em reais</p></div>${summary}</div><form id="addItemForm" class="add-item"><label class="sr-only" for="itemName">Adicionar produto</label><input id="itemName" maxlength="160" required placeholder="O que está faltando?"><button class="primary" type="submit">Adicionar</button></form>${conflictCards}<div class="item-list">${rows.length?rows.map(itemHTML).join(''):'<div class="empty" style="margin:40px auto"><div class="empty-symbol">＋</div><h2>Uma lista cheia de possibilidades</h2><p>Adicione o primeiro produto.</p></div>'}</div><div class="footer-sum"><div><small>Produtos no carrinho</small><div>Subtotal informado</div></div><strong>${formatMoney(cartMinor(rows))}</strong></div><div class="tools"><button type="button" id="inviteBtn">Compartilhar lista</button><button type="button" id="syncBtn">Sincronizar agora</button><button type="button" id="offlineInfoBtn">Como funciona offline?</button></div><p class="form-note">Compra finalizada e importação fiscal serão habilitadas após os testes de segurança e do histórico. Nenhuma nota real deve ser enviada nesta versão.</p>`;
}
function itemHTML(i){const state=i.state||'pending';return `<div class="item" aria-busy="${i._pending?'true':'false'}"><button type="button" class="item-state ${escapeHTML(state)}" data-check="${escapeHTML(i.id)}" aria-label="${state==='in_cart'?'Retirar do carrinho':'Marcar no carrinho'}" ${i._pending?'disabled':''}></button><div class="item-text"><div class="item-name">${escapeHTML(i.name)}</div><div class="item-meta">${escapeHTML(i.quantity)} ${escapeHTML(i.unit)} ${i._pending?'· Salvo neste aparelho':''} ${state==='unavailable'?'· Não tinha':''}</div></div><div class="item-right"><span class="item-price">${i.unit_price_minor==null?'—':formatMoney(i.unit_price_minor)}</span><button type="button" class="mini" data-edit="${escapeHTML(i.id)}" aria-label="Editar ${escapeHTML(i.name)}" ${i._pending?'disabled':''}>⋯</button></div></div>`}
function activeItem(id){return currentItems().find(x=>x.id===id)}
async function enqueue(action,item_id,payload,expected){if(!navigator.onLine&&!(await queueDB.catch(()=>null)))throw Error('Armazenamento offline não está disponível');const op={operation_id:crypto.randomUUID(),list_id:activeList,item_id,action,payload,expected_revision:expected??null,user:auth.user.id,status:'pending',created_at:Date.now()};await queuePut(op);outbox.push(op);render();if(navigator.onLine)void flushQueue();else show('Salvo neste aparelho. Sincroniza quando a internet voltar.');return op}
async function flushQueue(){if(flushing||!auth?.access_token||!navigator.onLine)return;flushing=true;try{const all=await queueAll();outbox=all.filter(op=>op.user===auth.user.id);for(const op of [...outbox].filter(x=>x.status==='pending').sort((a,b)=>a.created_at-b.created_at)){if(!canReplay(op))continue;try{const result=await rpc('lumo_apply_item',{p_list:op.list_id,p_op:op.operation_id,p_action:op.action,p_item:op.item_id,p_payload:op.payload,p_expected:op.expected_revision});if(result.status==='ack'){await queueDelete(op.operation_id);outbox=outbox.filter(x=>x.operation_id!==op.operation_id)}else if(result.status==='conflict'){op.status='conflict';op.server_value=result.current;await queuePut(op);show('Conflito de edição. Sua alteração foi preservada, sem sobrescrever o outro celular.')}else throw Error('ACK inválido do servidor')}catch(e){if(e.status===401){await refreshToken();break}if(isRecoverableFailure(e))break;op.status='conflict';op.error=e.message;await queuePut(op);show(`Não foi possível sincronizar: ${e.message}`);break}}await refreshLists()}finally{flushing=false;networkLabel();render()}}
async function createList(title){if(!navigator.onLine){show('Para criar uma lista compartilhada, conecte-se à internet.');return}try{const id=await rpc('lumo_create_list',{p_title:title});activeList=id;await refreshLists();show('Lista criada.')}catch(e){show(`Não foi possível criar: ${e.message}`)}}
function openEditor(item){editing=item;$('editName').value=item.name;$('editQty').value=item.quantity;$('editUnit').value=item.unit;$('editPrice').value=item.unit_price_minor==null?'':(item.unit_price_minor/100).toFixed(2).replace('.',',');$('itemEditor').classList.remove('hidden');$('editName').focus()}
function closeEditor(){editing=null;$('itemEditor').classList.add('hidden')}
$('authForm').addEventListener('submit',e=>{e.preventDefault();void authSubmit()});$('googleLoginBtn').addEventListener('click',()=>void loginWithGoogle());
$('logoutBtn').addEventListener('click',()=>void signOut());
$('newListForm').addEventListener('submit',e=>{e.preventDefault();const value=$('newListName').value.trim();if(!value)return;$('newListName').value='';void createList(value)});
$('joinForm').addEventListener('submit',async e=>{e.preventDefault();if(!navigator.onLine)return show('Conecte-se para aceitar um convite.');try{const id=await rpc('lumo_redeem_invite',{p_token:$('inviteToken').value.trim()});$('inviteToken').value='';activeList=id;forgetPendingInvite(sessionStorage);await refreshLists();show('Convite aceito.')}catch(err){show(`Convite inválido ou expirado: ${err.message}`)}});
$('lists').addEventListener('click',async e=>{const b=e.target.closest('[data-list]');if(!b)return;activeList=b.dataset.list;items=[];render();if(navigator.onLine)await refreshItems();saveCache();render()});
$('listArea').addEventListener('submit',async e=>{if(e.target.id!=='addItemForm')return;e.preventDefault();const name=$('itemName').value.trim();if(!name)return;try{await enqueue('add',crypto.randomUUID(),{name,quantity:1,unit:'un',unit_price_minor:null},null);$('itemName').value=''}catch(err){show(err.message)}});
$('listArea').addEventListener('click',async e=>{const check=e.target.closest('[data-check]'),edit=e.target.closest('[data-edit]');if(check){const item=activeItem(check.dataset.check);if(item)await enqueue('edit',item.id,{state:item.state==='in_cart'?'pending':'in_cart'},item.revision)}if(edit){const item=activeItem(edit.dataset.edit);if(item)openEditor(item)}if(e.target.closest('#inviteBtn')){try{const token=await rpc('lumo_create_invite',{p_list:activeList,p_role:'editor'});const url=`${location.origin}${location.pathname}#invite=${token}`;await navigator.clipboard.writeText(url);show('Convite copiado. Válido por 24 horas e uma única utilização.')}catch(err){show(`Não foi possível gerar convite: ${err.message}`)}}const discard=e.target.closest('[data-discard]'),review=e.target.closest('[data-review]');if(discard){await queueDelete(discard.dataset.discard);outbox=outbox.filter(op=>op.operation_id!==discard.dataset.discard);await refreshItems();render();show('Alteração local descartada; versão do servidor mantida.')}if(review){const op=outbox.find(op=>op.operation_id===review.dataset.review);if(op){const server=op.server_value||items.find(x=>x.id===op.item_id);if(!server){show('Recarregue a lista para revisar este item.');return}const original={...server,...(op.action==='edit'?op.payload:{})};await queueDelete(op.operation_id);outbox=outbox.filter(x=>x.operation_id!==op.operation_id);render();openEditor(original);editing={...server};show('Revise os valores e salve novamente se desejar.')}}if(e.target.closest('#syncBtn'))await flushQueue();if(e.target.closest('#offlineInfoBtn'))show('As mudanças são guardadas no aparelho antes do envio. Sincronizado só aparece após confirmação do servidor. Conflitos não são sobrescritos.')});
$('closeEditor').addEventListener('click',closeEditor);$('cancelEditor').addEventListener('click',closeEditor);
$('editForm').addEventListener('submit',async e=>{e.preventDefault();if(!editing)return;try{const price=parseMoney($('editPrice').value);const quantity=+$('editQty').value;const unit=$('editUnit').value;if(!validQuantity(quantity,unit))throw Error('Quantidade inválida para a unidade selecionada');const payload={name:$('editName').value.trim(),quantity,unit,unit_price_minor:price};if(!payload.name)throw Error('Informe o nome do produto');await enqueue('edit',editing.id,payload,editing.revision);closeEditor()}catch(err){show(err.message)}});
window.addEventListener('online',()=>{networkLabel();void flushQueue()});window.addEventListener('offline',networkLabel);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&auth?.access_token){void flushQueue();void refreshLists()}});
async function init(){
 // Preserve one-use list invitation through the external Google redirect.
 const invitation=preserveInviteFromUrl({url:location.href,storage:sessionStorage});
 if(invitation.found)history.replaceState(null,'',invitation.cleanedUrl);
 const callbackHandled=await finishGoogleCallback();
 const pendingInvite=readPendingInvite(sessionStorage);
 if(pendingInvite){$('inviteToken').value=pendingInvite;show('Convite identificado. Entre com Google e aceite o convite.');}
 if(auth?.access_token){
  restoreCache();await loadQueue();render();
  if(!callbackHandled)await refreshToken();
  if(auth?.access_token){await refreshLists();void flushQueue();}
 }else render();
 if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
 setInterval(()=>{if(auth?.access_token){void flushQueue();void refreshLists()}},18000);
}
void init();