/* ============== POPQUIZ SERVICE WORKER ============== */
const CACHE = "popquiz-v14";

// Soubory, které se uloží do cache při instalaci
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./auth.js",
  "./manifest.webmanifest",
  "./data/questions.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

/* ===== INSTALL – uložení souborů do cache ===== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* ===== ACTIVATE – smazání starých cache verzí ===== */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ===== FETCH – strategie cache ===== */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Pouze GET požadavky
  if (req.method !== "GET") return;

  // Pro questions.json: nejdřív zkus síť (aby šly aktualizovat otázky),
  // pak fallback na cache
  if (req.url.endsWith("questions.json")) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Pro ostatní soubory: nejdřív cache, pak síť
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});
