// Guarda la app y el plan en el teléfono: todo funciona sin conexión.
// Subí VERSION cada vez que cambies un archivo de la app (por ejemplo, plan.js).
const VERSION = 'entreno-v1';
const ARCHIVOS = ['./', 'index.html', 'estilos.css', 'app.js', 'plan.js', 'ejercicios.js', 'manifest.webmanifest', 'icono-180.png', 'icono-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Primero la copia del teléfono (instantáneo); en segundo plano se baja la versión nueva.
  const red = fetch(e.request).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
    return r;
  });
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((m) => m || red));
  e.waitUntil(red.catch(() => {}));
});
