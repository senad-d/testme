const CACHE_NAME = "moja-trgovina-ljubimaca-shell-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];
const OFFLINE_HTML = `<!doctype html><html lang="hr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Igra nije dostupna izvan mreže</title><style>body{font:18px system-ui;margin:2rem;max-width:42rem;background:#fffaf0;color:#24324a}h1{color:#214e45}</style><h1>Igra trenutačno nije dostupna izvan mreže</h1><p>Poveži uređaj s internetom i jednom uspješno otvori igru. Nakon toga pokušaj ponovno.</p>`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("moja-trgovina-ljubimaca-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isNavigation = request.mode === "navigate";
  const isStatic = ["script", "style", "image", "font", "manifest"].includes(request.destination);
  if (!isNavigation && !isStatic) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (isNavigation) return new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        return Response.error();
      }),
  );
});
