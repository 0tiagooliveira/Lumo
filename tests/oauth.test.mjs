import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {
 buildGoogleAuthorization, consumeGoogleCallback, exchangeGoogleCode,
 getGoogleAvailability, oauthRedirect, preserveInviteFromUrl,
 readPendingInvite, forgetPendingInvite, GOOGLE_PKCE_KEY
} from '../web/oauth.mjs';

class MemoryStorage {
 #data = new Map();
 getItem(k) {return this.#data.get(k) ?? null;}
 setItem(k,v) {this.#data.set(k,String(v));}
 removeItem(k) {this.#data.delete(k);}
}
const callback = 'https://lumo.example/index.html';
const supabaseUrl = 'https://example.supabase.co';

async function getAuthorize(storage=new MemoryStorage(), now=1732280400000) {
 return {url:new URL(await buildGoogleAuthorization({supabaseUrl,redirectTo:callback,storage,cryptoApi:webcrypto,now})),storage,now};
}

test('OAuth Google gera autorização com PKCE S256, sem client secret',async()=>{
 const {url,storage}=await getAuthorize();
 assert.equal(url.pathname,'/auth/v1/authorize');
 assert.equal(url.searchParams.get('provider'),'google');
 assert.equal(url.searchParams.get('redirect_to'),callback);
 assert.equal(url.searchParams.get('code_challenge_method'),'s256');
 assert.match(url.searchParams.get('code_challenge'),/^[A-Za-z0-9_-]{43}$/);
 const pending=JSON.parse(storage.getItem(GOOGLE_PKCE_KEY));
 assert.match(pending.verifier,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(pending.redirectTo,callback);
 assert.ok(!url.href.includes(pending.verifier));
});

test('Verificador aleatório muda a cada tentativa',async()=>{
 const {url:a}=await getAuthorize();const {url:b}=await getAuthorize();
 assert.notEqual(a.searchParams.get('code_challenge'),b.searchParams.get('code_challenge'));
});

test('Não permite redirect HTTP aberto ou inseguro',async()=>{
 await assert.rejects(()=>buildGoogleAuthorization({supabaseUrl,redirectTo:'http://site-externo.example/',storage:new MemoryStorage(),cryptoApi:webcrypto}));
 await assert.rejects(()=>buildGoogleAuthorization({supabaseUrl,redirectTo:'javascript:alert(1)',storage:new MemoryStorage(),cryptoApi:webcrypto}));
});

test('localhost é permitido como retorno no desenvolvimento',async()=>{
 const url=await buildGoogleAuthorization({supabaseUrl,redirectTo:'http://localhost:5173/',storage:new MemoryStorage(),cryptoApi:webcrypto});
 assert.match(url,/redirect_to=http%3A%2F%2Flocalhost%3A5173%2F/);
});

test('OAuth não inicia sem Web Crypto em contexto seguro',async()=>{
 await assert.rejects(()=>buildGoogleAuthorization({supabaseUrl,redirectTo:callback,storage:new MemoryStorage(),cryptoApi:{}}),/HTTPS/);
});

test('Código de login é consumido uma vez e removido da URL',async()=>{
 const {storage,now}=await getAuthorize();
 const result=consumeGoogleCallback({url:callback+'?code=temporary-code&lang=pt',storage,now:now+1000});
 assert.equal(result.handled,true);assert.equal(result.code,'temporary-code');
 assert.match(result.verifier,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(result.cleanedUrl,callback+'?lang=pt');
 assert.equal(storage.getItem(GOOGLE_PKCE_KEY),null);
 const replay=consumeGoogleCallback({url:callback+'?code=temporary-code',storage,now:now+1100});
 assert.match(replay.error,/expirou|não pertence/);
});

test('Rejeita código com verificador expirado',async()=>{
 const {storage,now}=await getAuthorize();
 const result=consumeGoogleCallback({url:callback+'?code=abc',storage,now:now+301000});
 assert.ok(result.error);assert.equal(storage.getItem(GOOGLE_PKCE_KEY),null);
});

test('Rejeita código criado para endereço diferente',async()=>{
 const {storage,now}=await getAuthorize();
 const result=consumeGoogleCallback({url:'https://other.example/?code=abc',storage,now:now+1000});
 assert.ok(result.error);
});

test('Cancelamento OAuth não exibe detalhes do provedor na UI',()=>{
 const storage=new MemoryStorage();
 const result=consumeGoogleCallback({url:callback+'?error=access_denied&error_description=secret-detail',storage});
 assert.equal(result.handled,true);assert.ok(!result.cleanedUrl.includes('secret-detail'));assert.ok(!result.error.includes('secret-detail'));
});

test('Exchange PKCE manda code/verifier ao Supabase e exige sessão completa',async()=>{
 let called=false;
 const data=await exchangeGoogleCode({supabaseUrl,publishableKey:'test-public',code:'abc',verifier:'xyz',fetchImpl:async(url,options)=>{
  called=true;assert.equal(url,`${supabaseUrl}/auth/v1/token?grant_type=pkce`);
  assert.equal(options.headers.apikey,'test-public');assert.equal(options.cache,'no-store');
  assert.deepEqual(JSON.parse(options.body),{auth_code:'abc',code_verifier:'xyz'});
  return {ok:true,json:async()=>({access_token:'jwt',refresh_token:'token',user:{id:'123'}})};
 }});
 assert.ok(called);assert.equal(data.user.id,'123');
});

test('Exchange rejeita resposta sem usuário ou token',async()=>{
 await assert.rejects(()=>exchangeGoogleCode({supabaseUrl,publishableKey:'pub',code:'abc',verifier:'xyz',fetchImpl:async()=>({ok:true,json:async()=>({access_token:'jwt'})})}),/sessão completa/);
});

test('Disponibilidade do Google depende de settings externa verdadeira',async()=>{
 const ok=await getGoogleAvailability({supabaseUrl,publishableKey:'pub',fetchImpl:async()=>({ok:true,json:async()=>({external:{google:true}})})});
 assert.equal(ok,true);
 const disabled=await getGoogleAvailability({supabaseUrl,publishableKey:'pub',fetchImpl:async()=>({ok:true,json:async()=>({external:{google:false}})})});
 assert.equal(disabled,false);
});

test('Convite de uma utilização sobrevive ao redirecionamento sem URL pública',()=>{
 const storage=new MemoryStorage();
 const token='a'.repeat(48);
 const pres=preserveInviteFromUrl({url:callback+'#invite='+token,storage});
 assert.equal(pres.found,true);assert.equal(pres.cleanedUrl,callback);
 assert.equal(readPendingInvite(storage),token);
 forgetPendingInvite(storage);assert.equal(readPendingInvite(storage),null);
});

test('Redirect padrão remove busca e hash',()=>{
 assert.equal(oauthRedirect({origin:'https://lumo.example',pathname:'/app/',search:'?code=X',hash:'#invite=Y'}),'https://lumo.example/app/');
});