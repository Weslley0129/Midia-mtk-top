// Service worker do app do painel: guarda a "casca" do painel para abrir rápido.
// Dados de pedidos e acessos (/api/...) nunca são guardados: sempre vêm ao vivo.
const CACHE = "painel-v1";
const CASCA = ["/admin", "/manifest.webmanifest", "/icons/icon-192.png", "/favicon.ico"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Rede primeiro; se estiver sem internet, usa a cópia guardada.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && CASCA.includes(url.pathname)) {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/admin")))
  );
});
