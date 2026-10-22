// Keep app/API requests network-only: never cache login responses or live telemetry.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Use safe defaults. */ }
  event.waitUntil(self.registration.showNotification(payload.title || 'Raah corridor alert', {
    body: payload.body || 'Open Raah to view the latest corridor update.',
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: payload.alertId || 'raahat-demo', renotify: true,
    data: { url: '/' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.focus();
    return self.clients.openWindow('/');
  }));
});
