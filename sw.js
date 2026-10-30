// Guarda la app en el móvil para que abra sin cobertura. Con cobertura siempre se usa la versión más nueva.
// Los datos (Supabase) van siempre por red.
const CACHE = 'montaje-mvuqdu3n';
const SHELL = ['./', './index.html', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
self.addEventListener('install', (e) => {
  // cache: 'reload' → nunca se mezcla un index.html viejo con un app.js nuevo
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname === 'cdn.jsdelivr.net') { // librerías con versión fija: se guardan la primera vez
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  if (u.origin !== location.origin) return;
  // Primero la red (comprobando si hay versión nueva); sin cobertura, lo guardado.
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const key = u.origin + u.pathname;
    try {
      // Lo guardado solo se renueva entero al instalar una versión nueva (index.html y app.js siempre a la par).
      const r = await fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' });
      if (r.ok || !(await c.match(key))) return r;
      throw new Error('http ' + r.status);
    } catch {
      return (await c.match(key)) || (await c.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' ? await c.match(u.origin + u.pathname.replace(/[^/]*$/, '') + 'index.html') : null) || Response.error();
    }
  })());
});
