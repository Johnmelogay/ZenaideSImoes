/* Service Worker — Web Push Notifications for Zenaide Simões */

// Push event: show notification
self.addEventListener('push', function (event) {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: '🛍️ Novo Pedido!', body: event.data ? event.data.text() : 'Verifique o painel.' };
    }

    const title = data.title || '🛍️ Novo Pedido!';
    const options = {
        body: data.body || 'Você recebeu um novo pedido pago.',
        icon: './logo192.png',
        badge: './logo192.png',
        vibrate: [200, 100, 200],
        tag: 'order-notification',
        renotify: true,
        requireInteraction: true,
        data: {
            url: data.url || './#/admin'
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: open admin orders page
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const targetUrl = event.notification.data?.url || './#/admin';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If admin is already open, focus it
            for (const client of clientList) {
                if (client.url.includes('/admin') && 'focus' in client) {
                    client.postMessage({ type: 'NAVIGATE_ORDERS' });
                    return client.focus();
                }
            }
            // Otherwise open new window
            return clients.openWindow(targetUrl);
        })
    );
});

// Activate: take control immediately
self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
});
