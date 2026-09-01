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

// Minimal app-shell cache: lets the installed PWA open (to a basic offline
// notice) even with no network, and is required by some browsers'
// "installable" criteria (an active fetch handler).
const SHELL_CACHE = "chatthere-shell-v1";
const SHELL_URL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.add(SHELL_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key)))),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Network-first: chat data must always be fresh. Cache is only a fallback
  // for the app shell when the network is unavailable.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match(SHELL_URL))),
  );
});

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
