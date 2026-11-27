/* Built with the exact list and content version of the public app files. */
const files = ["account-pages.js","assets/emblem.svg","assets/favicon.svg","assets/icons.svg","assets/touch-icon.png","assets/vendor/LICENSE.supabase","assets/vendor/README.md","assets/vendor/supabase.js","auth.css","auth.js","design.css","device.js","duet-client.js","duet-price.js","duet.css","duet.js","game.css","game.html","game.js","index.html","manifest.webmanifest","music-links.js","music.css","music.js","privacy.css","privacy.html","privacy.js","pwa.js","questions.js","quiet.css","quiet.html","random.js","reset.html","responsive.css","safety-gate.js","signin.html","signup.html","supabase-config.js","terms.html"];
const cachePrefix = 'kama-ios:' + self.registration.scope + ':';
const cacheName = cachePrefix + '7eadb4b3f1fb5fe8f12e';
const scope = new URL(self.registration.scope);
const index = new URL('index.html', scope).href;
const urlsByPath = new Map(files.map(file => {
  const url = new URL(file, scope);
  return [url.pathname, url.href];
}));
urlsByPath.set(scope.pathname, index);

self.addEventListener('install', event => {
  const requests = files.map(file => new Request(new URL(file, scope), { cache: 'reload' }));
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(requests)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;
  const cachedUrl = urlsByPath.get(url.pathname);
  if (!cachedUrl) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(cachedUrl) || fetch(request);
  })());
});
