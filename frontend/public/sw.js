// Minimal service worker for web push notifications.
// No build-time plugin needed — plain static file served from /sw.js.
self.addEventListener("push", (event) => {
  let data = { title: "Learnova", body: "You have a new update." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // Non-JSON payload — fall back to defaults above.
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Learnova", {
      body: data.body || "",
      icon: "/favicon.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/home"));
});
