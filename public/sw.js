// ─── CCB Service Worker — Version v5 ────────────────────────────────────────
// RÈGLE FONDAMENTALE : les pages HTML ne sont JAMAIS mises en cache par ce SW.
// Seuls les assets immuables (_next/static/ avec hash de contenu) sont cachés.
// Cela garantit que chaque déploiement Vercel est immédiatement visible sur
// tous les appareils, quelle que soit la qualité de la connexion.
//
// v5 : ajout d'un cache dédié pour /api/bible (Network-First + fallback offline).
// Les chapitres déjà lus restent accessibles hors-ligne.

const CACHE_VERSION = "v7";
const CACHE_NAME = "ccb-" + CACHE_VERSION;
const BIBLE_CACHE = "ccb-bible-" + CACHE_VERSION;

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
            if (k !== CACHE_NAME && k !== BIBLE_CACHE) {
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

  // ❷ APIs Supabase → réseau uniquement
  if (url.includes("supabase.co")) return;
  if (url.includes("chrome-extension")) return;

  // ❷.1 /api/bible → Network-First + cache fallback (lecture offline)
  if (url.includes("/api/bible")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(BIBLE_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // ❷.2 Reste des /api/ → réseau uniquement
  if (url.includes("/api/")) return;

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
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "CCB", body: event.data.text() }; }
  const url = data.url || "/dashboard";
  // Détecte un appel : type explicite OU url d'appel/réunion (groupe inclus)
  const isCall = data.type === "call" || /\/call(\?|$)|\/meeting(\?|$)|[?&]join=1/.test(url);

  const options = {
    body: data.body || "",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    data: { url: url },
    vibrate: data.vibrate || (isCall ? [500, 250, 500, 250, 500, 250, 800] : [200, 100, 200]),
    tag: data.tag || (isCall ? "ccb-call" : undefined),
    renotify: data.renotify === true || isCall,
    requireInteraction: data.requireInteraction === true || isCall,
  };
  if (isCall) {
    options.actions = [
      { action: "accept", title: "✅ Accepter" },
      { action: "decline", title: "❌ Refuser" },
    ];
  }
  event.waitUntil(self.registration.showNotification(data.title || "CCB", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "decline") return; // refuser → ferme simplement
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          if (c.navigate) { try { c.navigate(url); } catch {} }
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
