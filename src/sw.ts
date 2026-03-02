/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};
  if (type === "incoming-call") {
    event.waitUntil(
      self.registration.showNotification("Incoming call", {
        body: `${payload.from} is calling you`,
        icon: "/pwa-192x192.png",
        vibrate: [200, 100, 200, 100, 300],
        tag: "call",
        actions: [{ action: "answer", title: "Open chat" }]
      })
    );
  }
  if (type === "incoming-message") {
    event.waitUntil(
      self.registration.showNotification("New DM", {
        body: `${payload.from}: ${payload.body ?? "Message"}`,
        icon: "/pwa-192x192.png",
        vibrate: [120, 80, 120],
        tag: "dm"
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes("/app"));
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow("/app");
    })
  );
});
