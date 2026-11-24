const CACHE = 'lumo-restore-v2-20261123';
const CORE = ['./', './index.html', './experience.css', './experience-auth.mjs', './experience-sync.mjs', './experience-sync-core.mjs', './oauth.mjs', './config.js', './manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
 const req = event.request;
 if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
 const url = new URL(req.url);
 // Never cache an OAuth callback URL containing a one-time authorization code.
 if (req.mode === 'navigate' || url.searchParams.has('code') || url.searchParams.has('error')) {
  event.respondWith(fetch(req, {cache:'no-store'}).catch(() => caches.match('./index.html')));
  return;
 }
 event.respondWith(fetch(req).then(response => {
  if (response.ok && response.type === 'basic') {
   const copy = response.clone();
   event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
  }
  return response;
 }).catch(() => caches.match(req)));
});
