// Open Build service worker — network-first for the shell so updates are never
// stale, with an offline fallback to the last-cached page. Cross-origin requests
// (the vote/suggest Worker API, share links) are left untouched.
const CACHE = "open-build-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let the Worker API / CDN handle their own
  const isShell = req.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith("/index.html");
  if (!isShell) return; // only the shell is cached; everything else is normal

  e.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("/", fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match("/")) || (await cache.match(req)) || Response.error();
      }
    })(),
  );
});
