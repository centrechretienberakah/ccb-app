// ─── CCB Service Worker — Version v5 ────────────────────────────────────────
// RÈGLE FONDAMENTALE : les pages HTML ne sont JAMAIS mises en cache par ce SW.
// Seuls les assets immuables (_next/static/ avec hash de contenu) sont cachés.
// Cela garantit que chaque déploiement Vercel est immédiatement visible sur
// tous les appareils, quelle que soit la qualité de la connexion.
//
// v5 : ajout d'un cache dédié pour /api/bible (Network-First + fallback offline).
// Les chapitres déjà lus restent accessibles hors-ligne.

const CACHE_VERSION = "v9";
const CACHE_NAME = "ccb-" + CACHE_VERSION;
const BIBLE_CACHE = "ccb-bible-" + CACHE_VERSION;
const PAGE_CACHE = "ccb-pages-" + CACHE_VERSION;

// Routes de CONTENU spirituel disponibles hors-ligne (network-first).
const OFFLINE_PAGES = ["/dashboard", "/bible", "/plan-biblique", "/community/prions-ensemble", "/institut"];

// Network-first : réseau d'abord (fraîcheur des déploiements préservée),
// repli sur le cache si hors-ligne. Met à jour le cache à chaque succès.
function networkFirstPage(request) {
  return fetch(request)
    .then((response) => {
      // Ne cache que des réponses HTML 200 same-origin NON redirigées
      // (évite de cacher une redirection vers /auth quand la session manque).
      if (response && response.ok && response.type === "basic" && !response.redirected) {
        const clone = response.clone();
        caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() =>
      caches.match(request, { ignoreVary: true }).then((cached) =>
        cached || new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
          "<body style='font-family:sans-serif;text-align:center;padding:48px 24px;color:#444;background:#f6f3ee'>" +
          "<div style='font-size:46px'>📴</div><h2>Hors ligne</h2>" +
          "<p>Cette page n'est pas encore disponible hors connexion.<br>Reconnecte-toi pour la charger une première fois.</p></body>",
          { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 },
        )
      )
    );
}

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
            if (k !== CACHE_NAME && k !== BIBLE_CACHE && k !== PAGE_CACHE) {
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

  // ❶ Pages de CONTENU spirituel (offline-first) — network-first + repli cache.
  //    Couvre les navigations document (chargement complet + repli plein écran
  //    hors-ligne) ET les fetch() directs de la page (préchargement / réchauffe),
  //    MAIS PAS les requêtes de données RSC de Next (qui restent réseau pour la
  //    fraîcheur). En ligne : toujours frais. Hors-ligne : dernière version cache.
  {
    const reqUrl = new URL(url);
    const path = reqUrl.pathname;
    const isOfflinePage = OFFLINE_PAGES.some((p) => path === p || path.startsWith(p + "/"));
    const isRSC = event.request.headers.get("RSC") === "1" || reqUrl.searchParams.has("_rsc");
    if (isOfflinePage && !isRSC) {
      event.respondWith(networkFirstPage(event.request));
      return;
    }
  }

  // Autres pages (admin, perso…) en navigation document → réseau uniquement.
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
