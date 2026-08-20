/* eslint-env serviceworker */
/* global importScripts, firebase */

/**
 * GENERATO da scripts/sw-firebase.mjs — non modificare a mano.
 * I valori vengono da .env.local e sono la configurazione PUBBLICA
 * dell'app web: non sono segreti. I permessi veri stanno nelle Rules.
 *
 * Serve solo alla versione web (iPhone, tablet, computer).
 * Android usa il canale nativo e non passa di qui.
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  "apiKey": "AIzaSyCPZmsRs0xGDvZsxqEdYCcFzUQVyseh8jg",
  "authDomain": "nyfurion-app.firebaseapp.com",
  "projectId": "nyfurion-app",
  "storageBucket": "nyfurion-app.firebasestorage.app",
  "messagingSenderId": "1092306856",
  "appId": "1:1092306856:web:92859fe739b52d2aa27f9d"
});

const messaging = firebase.messaging();

/** Notifica arrivata mentre l'app e' chiusa o in secondo piano. */
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification ?? {};
  self.registration.showNotification(n.title ?? 'Nyfurion', {
    body: n.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Stesso tag = la notifica nuova sostituisce la vecchia invece di
    // impilarsi: nessuno vuole venti avvisi uguali.
    tag: payload.data?.kind ?? 'nyfurion',
    data: payload.data ?? {},
  });
});

/** Toccando la notifica si torna nell'app, senza aprire un doppione. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) {
        if ('focus' in f) return f.focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});
