// Browser-only Google OAuth through Supabase Auth (PKCE S256).
// No Google or Supabase client secret is ever used by the frontend.
export const GOOGLE_PKCE_KEY = 'lumo_google_pkce_v1';
export const PENDING_INVITE_KEY = 'lumo_pending_invite_v1';
const MAX_AUTH_AGE_MS = 5 * 60 * 1000; // Supabase code is valid for five minutes.

const encodeBase64Url = input => {
 const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
 // btoa is available in modern browsers and Node 20+. No TextDecoder required.
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const oauthRedirect = location => `${location.origin}${location.pathname}`;

export async function buildGoogleAuthorization({supabaseUrl, redirectTo, storage, cryptoApi, now = Date.now()}) {
 if (!storage || typeof storage.setItem !== 'function') throw Error('O navegador não permite guardar a verificação temporária do login.');
 if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== 'function') throw Error('O login Google exige HTTPS (ou localhost).');
 const redirect = new URL(redirectTo);
 if (!['https:', 'http:'].includes(redirect.protocol) || (redirect.protocol === 'http:' && redirect.hostname !== 'localhost' && redirect.hostname !== '127.0.0.1') || redirect.hash || redirect.search) {
  throw Error('Endereço de retorno de login inválido.');
 }
 const verifierBytes = new Uint8Array(32);
 cryptoApi.getRandomValues(verifierBytes);
 const verifier = encodeBase64Url(verifierBytes);
 const hashed = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
 const challenge = encodeBase64Url(hashed);
 storage.setItem(GOOGLE_PKCE_KEY, JSON.stringify({verifier, redirectTo: redirect.href, startedAt: now}));
 const url = new URL('/auth/v1/authorize', supabaseUrl);
 url.searchParams.set('provider', 'google');
 url.searchParams.set('redirect_to', redirect.href);
 url.searchParams.set('code_challenge', challenge);
 url.searchParams.set('code_challenge_method', 's256');
 return url.href;
}

// Remove the single-use code from the visible URL BEFORE any network request.
// Tokens are never read from URL fragments; an implicit-flow callback is rejected.
export function consumeGoogleCallback({url, storage, now = Date.now()}) {
 const current = new URL(url);
 const code = current.searchParams.get('code');
 const error = current.searchParams.get('error');
 const description = current.searchParams.get('error_description');
 if (!code && !error) return {handled: false};
 for (const key of ['code', 'error', 'error_description', 'error_code']) current.searchParams.delete(key);
 const cleanedUrl = current.href;
 const pendingRaw = storage.getItem(GOOGLE_PKCE_KEY);
 storage.removeItem(GOOGLE_PKCE_KEY);
 if (error) return {handled: true, cleanedUrl, error: 'O acesso pelo Google foi cancelado ou recusado. Tente novamente.'};
 let pending;
 try {pending = JSON.parse(pendingRaw || 'null');} catch {pending = null;}
 if (!pending || !pending.verifier || pending.redirectTo !== `${current.origin}${current.pathname}` || !Number.isFinite(pending.startedAt) || now < pending.startedAt || now - pending.startedAt > MAX_AUTH_AGE_MS || !/^[A-Za-z0-9_\-]{43,128}$/.test(pending.verifier)) {
  return {handled: true, cleanedUrl, error: 'Este retorno do Google expirou ou não pertence a uma tentativa deste aparelho. Entre novamente.'};
 }
 return {handled: true, cleanedUrl, code, verifier: pending.verifier};
}

export async function exchangeGoogleCode({supabaseUrl, publishableKey, code, verifier, fetchImpl = fetch}) {
 const result = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
  method: 'POST',
  headers: {'apikey': publishableKey, 'Content-Type': 'application/json'},
  body: JSON.stringify({auth_code: code, code_verifier: verifier}),
  cache: 'no-store'
 });
 if (!result.ok) throw Error('Não foi possível concluir o login Google. Reinicie a entrada.');
 const session = await result.json();
 if (!session?.access_token || !session?.refresh_token || !session?.user?.id) throw Error('O Supabase não devolveu uma sessão completa.');
 return session;
}

export async function getGoogleAvailability({supabaseUrl, publishableKey, fetchImpl = fetch}) {
 const response = await fetchImpl(`${supabaseUrl}/auth/v1/settings`, {
  headers: {'apikey': publishableKey}, cache: 'no-store'
 });
 if (!response.ok) throw Error('Não foi possível consultar a configuração do Google no Supabase.');
 const settings = await response.json();
 // Settings are informative; protection must also exist on the server.
 return settings?.external?.google === true;
}

export function preserveInviteFromUrl({url, storage}) {
 const current = new URL(url);
 const match = /^#invite=([a-f0-9]{48})$/.exec(current.hash);
 if (!match) return {found: false, cleanedUrl: current.href};
 storage.setItem(PENDING_INVITE_KEY, match[1]);
 current.hash = '';
 return {found: true, cleanedUrl: current.href};
}

export function readPendingInvite(storage) {
 const token = storage.getItem(PENDING_INVITE_KEY);
 return token && /^[a-f0-9]{48}$/.test(token) ? token : null;
}

export function forgetPendingInvite(storage) {storage.removeItem(PENDING_INVITE_KEY);}