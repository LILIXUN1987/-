var CACHE_NAME = 'logistics-v1';
var PRECACHE_URLS = ['/login', '/register', '/'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.indexOf('/api/') !== -1) return;
  event.respondWith(
    fetch(event.request).catch(function() { return caches.match(event.request); })
  );
});

self.addEventListener('push', function(event) {
  if (!event.data) return;
  try {
    var data = event.data.json();
    var title = data.title || '123共享外贸物流社区';
    var options = { body: data.body || '', icon: '/vite.svg', badge: '/vite.svg', tag: data.tag || 'default', data: { url: data.url || '/admin/inbox' } };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch(e) {
    event.waitUntil(self.registration.showNotification('123共享外贸物流社区', { body: event.data.text(), icon: '/vite.svg' }));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/admin/inbox';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf(url) !== -1 && 'focus' in clients[i]) return clients[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
