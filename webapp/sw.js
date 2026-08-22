/* eslint-env serviceworker */

/**
 * Service worker della web app Nyfurion.
 *
 * Fa due cose, e nessuna delle due deve poter rompere l'app:
 *   1. tiene una copia locale di quello che serve, così funziona senza rete;
 *   2. si accorge da solo quando c'è una versione nuova e la installa.
 *
 * Regola di fondo: se qualcosa qui dentro fallisce, si passa alla rete e
 * l'utente non se ne accorge. Meglio lenti che bloccati.
 */

const VERSIONE = 'nyf-1.5.6-mt42fyzv';
const GUSCIO = `${VERSIONE}-guscio`;
const ROBA = `${VERSIONE}-roba`;

/**
 * La cartella in cui l'app vive, ricavata da dove sta questo file.
 * Nell'APK e' la radice; sul sito e' /webapp/. Cosi' lo stesso service
 * worker funziona in tutti e due i posti senza saperlo in anticipo.
 */
const BASE = self.location.pathname.replace(/sw\.js$/, '');

/** Il minimo per aprire l'app anche senza rete. */
const ESSENZIALI = [BASE, `${BASE}index.html`, `${BASE}manifest.webmanifest`, `${BASE}favicon.png`, `${BASE}icon-192.png`];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(GUSCIO)
      .then((c) => c.addAll(ESSENZIALI))
      // Se anche un solo file non c'è, si installa lo stesso.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomi) =>
        Promise.all(nomi.filter((n) => !n.startsWith(VERSIONE)).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Il documento: prima la rete, così le novità arrivano subito. */
async function documento(req) {
  try {
    const fresca = await fetch(req);
    const c = await caches.open(GUSCIO);
    c.put(`${BASE}index.html`, fresca.clone());
    return fresca;
  } catch {
    return (await caches.match(`${BASE}index.html`)) ?? Response.error();
  }
}

/** Immagini, font e file compilati: prima la copia locale, è più veloce. */
async function risorsa(req) {
  const salvata = await caches.match(req);
  if (salvata) return salvata;
  try {
    const fresca = await fetch(req);
    if (fresca.ok && fresca.type === 'basic') {
      const c = await caches.open(ROBA);
      c.put(req, fresca.clone());
    }
    return fresca;
  } catch {
    return salvata ?? Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Tutto ciò che non è una lettura semplice passa dritto alla rete.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Il feed dei dispacci NON si mette mai in cache: deve essere sempre vero.
  if (url.pathname.endsWith('app-feed.json')) return;

  if (request.mode === 'navigate') {
    e.respondWith(documento(request));
    return;
  }

  e.respondWith(risorsa(request));
});

/** Permette all'app di dire "installa subito la versione nuova". */
self.addEventListener('message', (e) => {
  if (e.data === 'AGGIORNA_ORA') self.skipWaiting();
});
