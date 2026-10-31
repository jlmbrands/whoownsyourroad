// Who Owns Your Road map: service worker.
// Caches the app shell and the small data files so the map opens instantly from the home screen.
// Road tiles are streamed by byte range and are not cached here (the Cache API cannot store partial responses).
const VERSION = "wyr-map-v1";
const SHELL = ["/map/", "/map/index.html", "/map/map.js?v=20261030c", "/map/vendor/maplibre-gl.min.js", "/map/vendor/pmtiles.js",
  "/map/data/concessions.json", "/map/data/stats.json", "/map/data/us_states.geojson", "/map/data/us_counties.geojson", "/map/data/parts_us/manifest.json",
  "/fonts/overpass-latin-400-normal.woff2", "/fonts/overpass-latin-600-normal.woff2", "/fonts/overpass-latin-900-normal.woff2"];

self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith(".pmtiles")) return;                       // tiles: always network, byte ranges
  if (url.pathname.startsWith("/api/")) return;
  // Shell and data: cache first, refresh in the background so the next open is current.
  e.respondWith(caches.open(VERSION).then(async c => {
    const key = url.pathname === "/map/" ? "/map/index.html" : req;
    const hit = await c.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(r => { if (r.ok && r.status === 200) c.put(key, r.clone()); return r; }).catch(() => null);
    return hit || (await fresh) || new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
  }));
});
