const CACHE_NAME = "ccb-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/bible",
  "/devotion",
  "/prayer",
  "/manifest.json",
  "/logo-officiel.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

// Installation — mise en cache des ressources statiques
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activation — suppression des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — stratégie Network First avec fallback cache
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non-GET et Supabase API
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("supabase.co")) return;
  if (event.request.url.includes("chrome-extension")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache les nouvelles ressources
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback sur le cache si hors-ligne
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Page offline de fallback
          if (event.request.destination === "document") {
            return caches.match("/dashboard");
          }
        });
      })
  );
});

// Notifications push (pour plus tard)
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
