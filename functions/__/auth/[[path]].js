/**
 * Il ritorno da Google, servito da nyfurion.com.
 *
 * Perche' esiste: quando l'accesso torna da Google, Firebase deve
 * rileggere quello che aveva messo da parte prima di partire. Quel
 * deposito appartiene al dominio che gestisce il ritorno, e finora era
 * nyfurion-app.firebaseapp.com — un dominio diverso da quello dell'app.
 * Chrome non lascia piu' leggere i dati di un dominio dentro un altro,
 * quindi si tornava indietro puliti: nessun errore, nessun accesso, e
 * la stessa schermata di prima.
 *
 * Qui il ritorno viene servito da nyfurion.com, lo stesso indirizzo
 * dell'app. Niente piu' due domini, niente piu' deposito irraggiungibile.
 * Il contenuto resta quello vero di Firebase: questa e' solo la strada.
 */

const ORIGINE = 'https://nyfurion-app.firebaseapp.com';

export async function onRequest({ request, params }) {
  const url = new URL(request.url);
  const coda = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '');
  const destinazione = `${ORIGINE}/__/auth/${coda}${url.search}`;

  const risposta = await fetch(destinazione, {
    method: request.method,
    headers: request.headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });

  // Gli header vanno ricostruiti: quelli originali sono immutabili.
  const header = new Headers(risposta.headers);
  // Il gestore deve poter stare in un frame dell'app, altrimenti la
  // pagina di ritorno viene bloccata dal browser.
  header.delete('content-security-policy');
  header.delete('x-frame-options');

  return new Response(risposta.body, {
    status: risposta.status,
    statusText: risposta.statusText,
    headers: header,
  });
}
