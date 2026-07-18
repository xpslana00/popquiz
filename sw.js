/* ============== POPQUIZ SERVICE WORKER ============== */
const CACHE = "popquiz-v30";

// Soubory, které se uloží do cache při instalaci
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./auth.js",
  "./manifest.webmanifest",
  "./data/questions.json",
  "./data/questions_harry_potter.js",
  "./data/questions_big_bang_theory.js",
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

/* ===== MESSAGE – skipWaiting na žádost klienta ===== */
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});

/* ===== FETCH – strategie cache ===== */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Pouze GET požadavky
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // HTML dokumenty: nejdřív síť, pak cache (aby se vždy načetla nová verze)
  if (req.headers.get("accept") && req.headers.get("accept").includes("text/html")) {
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

  // Pro questions.json a JS/CSS soubory s ?v= parametrem: nejdřív síť, pak cache
  if (req.url.endsWith("questions.json") || url.searchParams.has("v")) {
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
