// ─── VERSION — Incrémenter à chaque déploiement important ───────────────────
const CACHE_VERSION = "v3";
const CACHE_NAME = "ccb-" + CACHE_VERSION;

// Assets critiques mis en cache à l'installation
const STATIC_ASSETS = [
  "/manifest.json",
  "/logo-officiel.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

// ── INSTALLATION ─────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ne pas bloquer l'install si une icône manque
        console.warn("CCB SW: certains assets n'ont pas pu être mis en cache");
      });
    })
  );
  // Prend le contrôle immédiatement sans attendre que les onglets se ferment
  self.skipWaiting();
});

// ── ACTIVATION ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("ccb-") && k !== CACHE_NAME)
          .map((k) => {
            console.log("CCB SW: suppression ancien cache", k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — Network First, fallback Cache ────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Ignorer non-GET, Supabase API, extensions
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("supabase.co")) return;
  if (event.request.url.includes("chrome-extension")) return;
  if (event.request.url.includes("_next/static")) {
    // Assets Next.js buildés = cache-first (ils ont un hash dans leur nom)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Pages HTML et autres = Network First (toujours la dernière version)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.destination === "document") {
            return caches.match("/dashboard");
          }
        });
      })
  );
});

// ── MESSAGE — permet à la page de forcer la mise à jour ─────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── NOTIFICATIONS PUSH ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "CCB", {
      body: data.body || "",
      icon: "/icon-192x192.png",
      badge: "/icon-72x72.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/dashboard")
  );
});
