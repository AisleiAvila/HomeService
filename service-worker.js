// This is a basic service worker for handling push notifications.

// Listen for the 'install' event, which fires when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  // Skip waiting to force the service worker to activate immediately.
  self.skipWaiting();
});

// Listen for the 'activate' event, which fires when the service worker becomes active.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  // Take control of all open clients (pages) immediately.
  event.waitUntil(self.clients.claim());
});

// The main event for push notifications is 'push', but since we are simulating it
// from the client without a real push server, we will listen for a 'message' event.
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message Received', event.data);
  const { title, body, icon } = event.data;

  const options = {
    body: body,
    icon: icon || './favicon.ico', // Default icon
    badge: './favicon.ico', // Icon for Android notifications
  };

  // Display the notification.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Listen for the 'notificationclick' event, which fires when a user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification Click Received.');

  // Close the notification.
  event.notification.close();

  // Focus the client window if it's open.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // If the client is already focused, do nothing.
        // Otherwise, focus the client and navigate to the root.
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If no client is found, open a new one.
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
