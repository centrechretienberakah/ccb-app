// ─── CCB Service Worker — Version v4 ────────────────────────────────────────
// RÈGLE FONDAMENTALE : les pages HTML ne sont JAMAIS mises en cache par ce SW.
// Seuls les assets immuables (_next/static/ avec hash de contenu) sont cachés.
// Cela garantit que chaque déploiement Vercel est immédiatement visible sur
// tous les appareils, quelle que soit la qualité de la connexion.

const CACHE_VERSION = "v4";
const CACHE_NAME = "ccb-" + CACHE_VERSION;

// ── INSTALLATION ─────────────────────────────────────────────────────────────
self.addEventListener("install", () => {
  // Prend le contrôle immédiatement, sans attendre la fermeture des onglets
  self.skipWaiting();
});

// ── ACTIVATION — supprime TOUS les anciens caches ───────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => {
            if (k !== CACHE_NAME) {
              console.log("CCB SW: suppression cache obsolète →", k);
              return caches.delete(k);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  const method = event.request.method;

  // Ignorer tout ce qui n'est pas GET
  if (method !== "GET") return;

  // ❶ Pages HTML → JAMAIS de cache. Toujours depuis le réseau.
  //    Si hors-ligne, laisse le navigateur gérer (erreur réseau normale).
  if (event.request.destination === "document") return;

  // ❷ APIs Supabase, API interne → réseau uniquement, pas de cache
  if (url.includes("supabase.co")) return;
  if (url.includes("/api/")) return;
  if (url.includes("chrome-extension")) return;

  // ❸ Assets Next.js avec hash (_next/static/) → Cache First (immuables)
  if (url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, clone)
            );
          }
          return response;
        });
      })
    );
    return;
  }

  // ❹ Icônes et images statiques → Cache First avec fallback réseau
  if (
    url.includes("/icon-") ||
    url.includes("/logo-") ||
    url.includes("/apple-touch-icon") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".webp") ||
    url.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, clone)
            );
          }
          return response;
        });
      })
    );
    return;
  }

  // ❺ Tout le reste → réseau uniquement (fonts Google, manifests, etc.)
  // Pas de mise en cache pour éviter les problèmes de version
});

// ── MESSAGE — force la mise à jour depuis la page ────────────────────────────
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
