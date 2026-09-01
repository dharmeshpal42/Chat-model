/* eslint-disable no-restricted-globals */
/* eslint-env serviceworker */
/* global firebase */

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// CAUTION: process.env isn't available here — this file is served statically,
// so the config must be hardcoded (kept in sync with src/firebase/firebase.ts).
firebase.initializeApp({
  apiKey: "AIzaSyDlL-uTbOVjdmPhOG0CJzLRRBm4LxJyuvU",
  authDomain: "chat-app-f9def.firebaseapp.com",
  projectId: "chat-app-f9def",
  storageBucket: "chat-app-f9def.firebasestorage.app",
  messagingSenderId: "644786107012",
  appId: "1:644786107012:web:e47a936020e9a4f8b1c8d1",
  measurementId: "G-PZQFSHRTJ7",
});

const messaging = firebase.messaging();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

messaging.onBackgroundMessage((payload) => {
  console.log("[sw.js] Received background message", payload);
  const link = payload.data?.link;

  self.registration.showNotification(payload.notification?.title || "New Message", {
    body: payload.notification?.body,
    data: { url: link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (!url) return;

  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
