const CACHE_NAME = "asg-pwa-v2";
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.png",
  "/logo-asg.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return undefined;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignorar requisições que não sejam GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Nunca interceptar chamadas de banco/autenticação/storage do Supabase ou rotas de API
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/_server") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Navegação de páginas HTML: Network-First com fallback para cache ou página offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const cachedRoot = await caches.match("/");
          if (cachedRoot) return cachedRoot;
          return caches.match("/offline.html");
        }),
    );
    return;
  }

  // Arquivos estáticos (CSS, JS, Fontes, Ícones locais): Stale-While-Revalidate
  const isStaticAsset =
    url.origin === self.location.origin &&
    /\.(?:js|mjs|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|webmanifest|json)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
  }
});
