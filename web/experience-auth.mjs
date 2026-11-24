/* Account gate for the restored v1.7 experience.
   Tokens are issued only by Supabase Auth, never by this UI.
   The full legacy UI does not render until the user is verified. */
import {SUPABASE_URL,SUPABASE_KEY} from './config.js';
import {buildGoogleAuthorization,consumeGoogleCallback,exchangeGoogleCode,getGoogleAvailability,oauthRedirect,preserveInviteFromUrl} from './oauth.mjs';
import {attachCloudSync} from './experience-sync.mjs';
import {FRUITS,PALETTE,appearance,readKey,writeKey,GUEST_KEY,accountKey,applyAppearance,renderMascot} from './appearance.mjs';

const AUTH_KEY='lumo_beta_auth_v1';
const gate=document.getElementById('lumo-identity-gate');
const text=document.getElementById('lumo-gate-message');
const googleButton=document.getElementById('lumo-login-google');
const dock=document.getElementById('lumo-cloud-dock');
const status=document.getElementById('lumo-cloud-status');
const $=id=>document.getElementById(id);
let session=null;
let cloud=null;
const setGateMessage=message=>{text.textContent=message};

let appearanceAccount=null;
const currentGuest=()=>readKey(GUEST_KEY);
let gateAppearance=currentGuest();
function hasStored(key){try{return localStorage.getItem(key)!==null}catch{return false}}
function chooseGuest(changes){
 gateAppearance=appearance({...gateAppearance,...changes,updatedAt:new Date().toISOString()});
 writeKey(GUEST_KEY,gateAppearance);applyAppearance(gateAppearance);
 refreshAppearanceControls();
}
function refreshAppearanceControls(){
 const current=gateAppearance;
 const mascots=$('lumo-gate-mascot-options');
 const colors=$('lumo-gate-color-options');
 if(mascots)mascots.innerHTML=FRUITS.map(f=>`<button type="button" class="lumo-gate-mascot-option" data-guest-mascot="${f.id}" aria-pressed="${current.mascot===f.id}" aria-label="${f.name}" title="${f.name}"><span class="lumo-gate-mascot-thumb" aria-hidden="true">${renderMascot('guest-picker-mascot',f.id)}</span><span>${f.name}</span></button>`).join('');
 if(colors)colors.innerHTML=PALETTE.map(([name,hex])=>`<button type="button" class="lumo-gate-color-option" data-guest-color="${hex}" title="${name}" aria-label="${name}" aria-pressed="${current.accentColor===hex}" style="--swatch:${hex}"><span aria-hidden="true">${current.accentColor===hex?'✓':''}</span></button>`).join('');
 const input=$('lumo-gate-color-input');if(input)input.value=current.accentColor;
 for(const button of document.querySelectorAll('[data-lumo-theme]'))button.setAttribute('aria-pressed',String(current.theme===button.dataset.lumoTheme));
}
function setupAppearance(){
 const toggle=$('lumo-gate-customize'),panel=$('lumo-gate-custom-panel');
 toggle?.addEventListener('click',()=>{
  const open=panel.hidden;panel.hidden=!open;
  toggle.setAttribute('aria-expanded',String(open));
 });
 panel?.addEventListener('click',event=>{
  const target=event.target.closest('button');
  if(!target)return;
  if(target.dataset.guestMascot)chooseGuest({mascot:target.dataset.guestMascot});
  else if(target.dataset.guestColor)chooseGuest({accentColor:target.dataset.guestColor});
  else if(target.dataset.lumoTheme)chooseGuest({theme:target.dataset.lumoTheme});
 });
 $('lumo-gate-color-input')?.addEventListener('input',event=>chooseGuest({accentColor:event.target.value}));
 applyAppearance(gateAppearance);refreshAppearanceControls();
}
window.LumoAppearance={
 forUser:()=>appearanceAccount&&hasStored(accountKey(appearanceAccount))?readKey(accountKey(appearanceAccount)):gateAppearance,
 updateFromApp(raw,committed=false){
  const prefs=appearance(raw);
  if(committed&&appearanceAccount){
   const key=accountKey(appearanceAccount),prior=hasStored(key)?readKey(key):null;
   const isNew=!prior||prior.mascot!==prefs.mascot||prior.accentColor!==prefs.accentColor||prior.theme!==prefs.theme;
   if(isNew){
    const next={...prefs,updatedAt:prefs.updatedAt||new Date().toISOString()};
    writeKey(key,next);gateAppearance=next;applyAppearance(next);
   }else applyAppearance(prefs);
  }else if(!committed)applyAppearance(prefs);
 }
};
setupAppearance();

const read=()=>{try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')}catch{return null}};
const store=value=>{if(value)localStorage.setItem(AUTH_KEY,JSON.stringify(value));else localStorage.removeItem(AUTH_KEY)};
const authHeaders=(bearer)=>({'apikey':SUPABASE_KEY,'Content-Type':'application/json',...(bearer?{'Authorization':`Bearer ${bearer}`}:{})});

async function refresh(current){
 if(!current?.refresh_token)throw new Error('Sessão inválida.');
 const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:authHeaders(),body:JSON.stringify({refresh_token:current.refresh_token}),cache:'no-store'});
 if(!response.ok)throw new Error('Sua sessão expirou. Entre novamente com Google.');
 const updated=await response.json();
 if(!updated?.user?.id||updated.user.id!==current.user?.id||!updated.access_token||!updated.refresh_token)throw Error('Conta inválida após atualização.');
 const next={...current,...updated};store(next);return next;
}
async function validate(current){
 if(!current?.access_token||!current.user?.id)return null;
 try{
  let response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(current.access_token),cache:'no-store'});
  if(response.status===401){current=await refresh(current);response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(current.access_token),cache:'no-store'});}
  if(!response.ok)throw new Error('Não foi possível validar sua conta.');
  const user=await response.json();
  if(!user?.id||user.id!==current.user.id)throw new Error('A conta retornada não corresponde à sessão deste aparelho.');
  session={...current,user};store(session);return session;
 }catch(error){
  // Existing account data can still be used locally without network, never as cloud ACK.
  if(!navigator.onLine&&current?.user?.id){session=current;status.textContent='Somente local • sem internet';return current;}
  throw error;
 }
}
async function authenticateCallback(){
 const data=consumeGoogleCallback({url:location.href,storage:sessionStorage});
 if(!data.handled)return null;
 history.replaceState(null,'',data.cleanedUrl);
 if(data.error)throw new Error(data.error);
 const result=await exchangeGoogleCode({supabaseUrl:SUPABASE_URL,publishableKey:SUPABASE_KEY,code:data.code,verifier:data.verifier});
 session=result;store(result);
 return result;
}
async function beginGoogle(){
 googleButton.disabled=true;
 try{
  if(!(await getGoogleAvailability({supabaseUrl:SUPABASE_URL,publishableKey:SUPABASE_KEY})))throw new Error('O provedor Google ainda não está ativo no Supabase.');
  const url=await buildGoogleAuthorization({supabaseUrl:SUPABASE_URL,redirectTo:oauthRedirect(location),storage:sessionStorage,cryptoApi:crypto});
  location.assign(url);
 }catch(err){setGateMessage(err?.message||'Não foi possível entrar com Google.');googleButton.disabled=false;}
}
googleButton.addEventListener('click',()=>{void beginGoogle()});

async function request(path,{method='GET',body,retry=true}={}){
 if(!navigator.onLine)throw new Error('Sem internet. As mudanças desta lista ficam no aparelho.');
 if(!session?.access_token)throw new Error('Entre com Google antes de compartilhar listas.');
 let response=await fetch(`${SUPABASE_URL}${path}`,{method,headers:authHeaders(session.access_token),body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 if(response.status===401&&retry){session=await refresh(session);return request(path,{method,body,retry:false});}
 const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data={message:raw}};
 if(!response.ok){const err=new Error(data.message||data.msg||data.error_description||`Erro ${response.status}`);err.status=response.status;throw err;}
 return data;
}
const rpc=(name,body)=>request(`/rest/v1/rpc/${name}`,{method:'POST',body});

async function signOut(){
 if(!confirm('Sair da conta neste aparelho? Seus dados locais serão mantidos separadamente para esta conta.'))return;
 const access=session?.access_token;
 store(null);session=null;
 if(access&&navigator.onLine)fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:authHeaders(access),cache:'no-store'}).catch(()=>{});
 location.replace(oauthRedirect(location));
}
$('lumo-cloud-logout').addEventListener('click',()=>{void signOut()});
const panel=$('lumo-cloud-panel');
$('lumo-cloud-open').addEventListener('click',()=>{cloud?.refreshPanel();panel.showModal()});
$('lumo-cloud-close').addEventListener('click',()=>panel.close());
window.addEventListener('lumo:share',()=>{cloud?.refreshPanel();panel.showModal()});

async function init(){
 const invitation=preserveInviteFromUrl({url:location.href,storage:sessionStorage});
 if(invitation.found)history.replaceState(null,'',invitation.cleanedUrl);
 try{
  const callback=await authenticateCallback();
  const current=callback||read();
  if(!current){setGateMessage('Entre com Google para abrir seu espaço privado.');googleButton.hidden=false;return;}
  session=await validate(current);
  if(!session){store(null);setGateMessage('Entre com Google para abrir suas listas.');googleButton.hidden=false;return;}
  appearanceAccount=session.user.id;
  const accountPrefs=hasStored(accountKey(appearanceAccount))?readKey(accountKey(appearanceAccount)):null;
  const freshest=accountPrefs&&Date.parse(accountPrefs.updatedAt||'')>=Date.parse(gateAppearance.updatedAt||'')?accountPrefs:gateAppearance;
  gateAppearance=appearance(freshest);
  applyAppearance(gateAppearance);
  refreshAppearanceControls();
  window.__lumoUserId=session.user.id;
  window.__lumoSession={get:()=>session,request,rpc,refresh:async()=>{session=await refresh(session);return session}};
  status.textContent=navigator.onLine?'Listas locais • conectar nuvem':'Offline • somente neste aparelho';
  window.addEventListener('lumo:legacy-loaded',()=>{
   document.body.classList.add('lumo-authenticated');gate.hidden=true;dock.hidden=false;
   cloud=attachCloudSync({legacy:window.LumoLegacy,account:session.user.id,session:window.__lumoSession,status,panel});
   void cloud.start();
  },{once:true});
  window.dispatchEvent(new Event('lumo:auth-ready'));
 }catch(err){
  store(null);setGateMessage((err?.message||'Não foi possível validar o login.')+' Tente novamente.');googleButton.hidden=false;
 }
}
await init();
