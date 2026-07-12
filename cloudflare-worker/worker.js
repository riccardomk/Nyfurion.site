/**
 * Nyfurion Holder Archive — Cloudflare Worker (SECURE v2)
 *
 * BINDINGS (Cloudflare Dashboard → Worker → Settings → Bindings):
 *   NYFURION_R2  → R2 Bucket privato  "nyfurion-holder-archive"
 *   NONCE_KV     → KV Namespace
 *                  Crea con: npx wrangler kv namespace create NONCE_KV
 *                  Poi aggiorna wrangler.toml con l'ID restituito.
 *
 * ENV VARIABLES (plain, in wrangler.toml [vars]):
 *   OLD_CONTRACT   = 0x37176275788CFe00B355fF74575753D2E2E50203
 *   CLAIM_CONTRACT = 0xdF2c679F5b40373016FCE49702f1f354689E4007
 *
 * SECRETS (mai nel codice, impostare con: npx wrangler secret put NOME):
 *   RPC_URL        → endpoint Alchemy Ethereum Mainnet
 *   WORKER_SECRET  → stringa random 64+ hex chars
 *
 * SICUREZZA:
 *   - Firma EIP-191 verificata localmente con @noble/curves (zero RPC per recovery)
 *   - KV-backed nonce store (cross-isolate, TTL atomico)
 *   - Rate limiting per wallet via KV
 *   - Constant-time HMAC verify (anti timing-attack)
 *   - Regex strict su fileKey (anti path traversal)
 *   - Limite 4KB body
 *   - Validazione formato firma prima di qualsiasi operazione
 *   - Security headers su ogni risposta
 *   - Nonce 192 bit
 *   - BigInt ABI bool comparison
 *   - Regola doppia ownerOf + canAccess sempre valutate entrambe in parallelo
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';

// ─── ABI selectors ────────────────────────────────────────────────────────────
// Verifica con: cast sig "ownerOf(uint256)"           → 0x6352211e
//               cast sig "canAccess(uint256,address)" → 0x97a1f4f0
const SEL_OWNER_OF   = '0x6352211e';
const SEL_CAN_ACCESS = '0x97a1f4f0';

// ─── Costanti ─────────────────────────────────────────────────────────────────
const NONCE_TTL_SEC  = 300;              // nonce valido 5 minuti
const SESSION_TTL_MS = 30 * 60 * 1000;  // sessione valida 30 minuti
const MAX_TOKEN_ID   = 400;
const MAX_BODY_BYTES = 4096;             // 4 KB max body

const RATE_LIMITS = {
  nonce:  { max: 8,  ttlSec: 300 },
  verify: { max: 12, ttlSec: 600 },
};

// Regex STRICT per fileKey — blocca qualsiasi path traversal
const FILE_KEY_RE = /^token-(\d{3})\/(preview|image-extra-\d{2}|character-sheet|lore|license|card|card-3d|model|archive)\.(jpg|jpeg|png|pdf|json|glb|stl)$/;

// ─── Origins permesse ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://nyfurion.com',
  'https://www.nyfurion.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

// ─── Security headers su ogni risposta ───────────────────────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'DENY',
  'Referrer-Policy':        'no-referrer',
  'Permissions-Policy':     'interest-cohort=()',
};

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...getCorsHeaders(request), ...SECURITY_HEADERS },
      });
    }

    try {
      if (url.pathname === '/api/nonce'         && request.method === 'GET')  return handleNonce(url, env, request);
      if (url.pathname === '/api/verify-wallet' && request.method === 'POST') return handleVerifyWallet(request, env);
      if (url.pathname === '/api/my-tokens'     && request.method === 'POST') return handleMyTokens(request, env);
      if (url.pathname === '/api/check-access'  && request.method === 'POST') return handleCheckAccess(request, env);
      if (url.pathname === '/api/get-file'      && request.method === 'POST') return handleGetFile(request, env);
      if (url.pathname === '/api/villa'         && request.method === 'POST') return handleVilla(request, env);
      return makeJson({ error: 'Not found' }, 404, request);
    } catch (err) {
      console.error('[worker] unhandled:', err?.message);
      return makeJson({ error: 'Internal error' }, 500, request);
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/nonce?wallet=0x...
// ─────────────────────────────────────────────────────────────────────────────
async function handleNonce(url, env, request) {
  const wallet = url.searchParams.get('wallet');
  if (!isValidAddress(wallet)) return makeJson({ error: 'Invalid wallet' }, 400, request);

  const key = wallet.toLowerCase();

  if (await checkRateLimit(env, 'nonce', key, RATE_LIMITS.nonce)) {
    return makeJson({ error: 'Too many requests. Try again in a few minutes.' }, 429, request);
  }

  const nonce   = generateNonce();
  const message = buildSignMessage(key, nonce);

  await env.NONCE_KV.put(
    `nonce:${key}`,
    JSON.stringify({ nonce, exp: Date.now() + NONCE_TTL_SEC * 1000 }),
    { expirationTtl: NONCE_TTL_SEC }
  );

  return makeJson({ nonce, message }, 200, request);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verify-wallet  { wallet, signature, nonce }
// Recovery EIP-191 locale con @noble/curves — zero RPC.
// ─────────────────────────────────────────────────────────────────────────────
async function handleVerifyWallet(request, env) {
  const body = await parseBody(request);
  if (!body) return makeJson({ error: 'Invalid body' }, 400, request);

  const { wallet, signature, nonce } = body;

  if (!isValidAddress(wallet) || !isValidSignature(signature) || !isValidNonceStr(nonce)) {
    return makeJson({ error: 'Invalid parameters' }, 400, request);
  }

  const key = wallet.toLowerCase();

  if (await checkRateLimit(env, 'verify', key, RATE_LIMITS.verify)) {
    return makeJson({ error: 'Too many requests. Try again later.' }, 429, request);
  }

  const stored = await env.NONCE_KV.get(`nonce:${key}`, 'json');
  if (!stored || stored.nonce !== nonce || Date.now() > stored.exp) {
    return makeJson({ error: 'Authentication failed' }, 401, request);
  }

  let recovered;
  try {
    recovered = recoverEIP191Address(buildSignMessage(key, nonce), signature);
  } catch (e) {
    console.error('[verify] recovery error:', e?.message);
    return makeJson({ error: 'Authentication failed' }, 401, request);
  }

  if (!await constantTimeEqual(recovered.toLowerCase(), key)) {
    return makeJson({ error: 'Authentication failed' }, 401, request);
  }

  // Invalida nonce (usa-e-getta)
  await env.NONCE_KV.delete(`nonce:${key}`);

  const sessionToken = await createSessionToken(key, env);
  return makeJson({ verified: true, sessionToken }, 200, request);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/my-tokens  { wallet, sessionToken }
// Restituisce i token ID della collezione OLD_CONTRACT posseduti dal wallet.
// Usa Alchemy NFT API v3 (key estratta da RPC_URL). Se non disponibile,
// fallback a balanceOf + tokenOfOwnerByIndex (ERC721Enumerable).
// ─────────────────────────────────────────────────────────────────────────────
async function handleMyTokens(request, env) {
  const body = await parseBody(request);
  if (!body) return makeJson({ error: 'Invalid body' }, 400, request);

  const { wallet, sessionToken } = body;
  if (!isValidAddress(wallet) || !sessionToken) {
    return makeJson({ error: 'Invalid parameters' }, 400, request);
  }

  const sessionWallet = await verifySessionToken(sessionToken, env);
  if (!sessionWallet || sessionWallet !== wallet.toLowerCase()) {
    return makeJson({ error: 'Session invalid or expired' }, 401, request);
  }

  const tokens = await getNyfurionTokensForWallet(wallet.toLowerCase(), env);
  return makeJson({ tokens }, 200, request);
}

async function getNyfurionTokensForWallet(wallet, env) {
  // ─ Tentativo 1: Alchemy NFT API v3, CON paginazione (il creatore ne ha 400) ─
  try {
    if (env.RPC_URL && env.RPC_URL.includes('alchemy.com/v2/')) {
      const apiKey = env.RPC_URL.split('/v2/')[1];
      if (apiKey) {
        const ids = [];
        let pageKey = '';
        for (let page = 0; page < 6; page++) {
          const nftUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner` +
            `?owner=${wallet}&contractAddresses[]=${env.OLD_CONTRACT}&withMetadata=false&pageSize=100` +
            (pageKey ? `&pageKey=${encodeURIComponent(pageKey)}` : '');
          const res = await fetch(nftUrl);
          if (!res.ok) throw new Error(`alchemy ${res.status}`);
          const data = await res.json();
          for (const n of (data.ownedNfts || [])) {
            const id = parseInt(n.tokenId, 10);
            if (id >= 1 && id <= MAX_TOKEN_ID) ids.push(id);
          }
          pageKey = data.pageKey || '';
          if (!pageKey) break;
        }
        if (ids.length > 0) return ids.sort((a, b) => a - b);
      }
    }
  } catch { /* fallback sotto */ }

  // ─ Tentativo 2: multicall3 — ownerOf di TUTTI i token in una sola eth_call.
  //   Funziona con qualsiasi ERC721 e qualsiasi RPC, per qualunque numero di
  //   token posseduti: niente tetti che tagliano fuori i grandi holder.
  try {
    const owners = await multicallOwnerOf(env.OLD_CONTRACT, 1, MAX_TOKEN_ID, env.RPC_URL);
    const me = wallet.toLowerCase();
    const ids = [];
    owners.forEach((o, i) => { if (o && o === me) ids.push(i + 1); });
    return ids;
  } catch { return []; }
}

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';

async function multicallOwnerOf(contract, fromId, toId, rpcUrl) {
  // tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls)
  const SEL_TRY_AGGREGATE = '0xbce38bd7';
  const n = toId - fromId + 1;
  const target = contract.slice(2).toLowerCase().padStart(64, '0');

  // Tupla (address,bytes): [address][offset 0x40][len 0x24][calldata 36B pad 64B] = 160 byte
  let tuples = '';
  for (let i = 0; i < n; i++) {
    const calldata = SEL_OWNER_OF.slice(2) + encodeUint256(fromId + i);
    tuples += target + encodeUint256(0x40) + encodeUint256(0x24) + calldata.padEnd(128, '0');
  }
  let arr = encodeUint256(n);
  for (let i = 0; i < n; i++) arr += encodeUint256(n * 32 + i * 160);
  const data = SEL_TRY_AGGREGATE + encodeUint256(0) + encodeUint256(0x40) + arr + tuples;

  const result = await ethCall(MULTICALL3, data, rpcUrl);

  // Risposta: (bool success, bytes returnData)[]
  const hex = result.slice(2);
  const word = (i) => hex.slice(i * 64, (i + 1) * 64);
  const arrStart = parseInt(word(0), 16) / 32;
  const count = parseInt(word(arrStart), 16);
  const owners = [];
  for (let i = 0; i < count; i++) {
    const elOff = parseInt(word(arrStart + 1 + i), 16) / 32;
    const base = arrStart + 1 + elOff;
    const success = parseInt(word(base), 16) === 1;
    const dataLen = parseInt(word(base + 2), 16);
    owners.push(success && dataLen >= 32 ? '0x' + word(base + 3).slice(24) : null);
  }
  return owners;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/check-access  { wallet, tokenId, sessionToken }
// ─────────────────────────────────────────────────────────────────────────────
async function handleCheckAccess(request, env) {
  const body = await parseBody(request);
  if (!body) return makeJson({ error: 'Invalid body' }, 400, request);

  const { wallet, tokenId, sessionToken } = body;
  if (!isValidAddress(wallet) || tokenId === undefined || !sessionToken) {
    return makeJson({ error: 'Invalid parameters' }, 400, request);
  }

  const sessionWallet = await verifySessionToken(sessionToken, env);
  if (!sessionWallet || sessionWallet !== wallet.toLowerCase()) {
    return makeJson({ error: 'Session invalid or expired' }, 401, request);
  }

  const tokenIdNum = parseTokenId(tokenId);
  if (tokenIdNum === null) return makeJson({ error: 'Invalid tokenId' }, 400, request);

  // L'accesso segue la proprietà on-chain: possiedi il token = accedi.
  // Il claim on-chain resta facoltativo (hasClaimed è solo informativo).
  const [isOwner, hasClaimed] = await Promise.all([
    checkOwnerOf(tokenIdNum, wallet, env),
    checkCanAccess(tokenIdNum, wallet, env),
  ]);

  return makeJson({ tokenId: tokenIdNum, isOwner, hasClaimed, canAccess: isOwner }, 200, request);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/get-file  { wallet, tokenId, fileKey, sessionToken }
// ─────────────────────────────────────────────────────────────────────────────
async function handleGetFile(request, env) {
  const body = await parseBody(request);
  if (!body) return makeJson({ error: 'Invalid body' }, 400, request);

  const { wallet, tokenId, fileKey, sessionToken } = body;
  if (!isValidAddress(wallet) || tokenId === undefined || !fileKey || !sessionToken) {
    return makeJson({ error: 'Invalid parameters' }, 400, request);
  }

  const sessionWallet = await verifySessionToken(sessionToken, env);
  if (!sessionWallet || sessionWallet !== wallet.toLowerCase()) {
    return makeJson({ error: 'Session invalid or expired' }, 401, request);
  }

  const tokenIdNum = parseTokenId(tokenId);
  if (tokenIdNum === null) return makeJson({ error: 'Invalid tokenId' }, 400, request);

  const match = FILE_KEY_RE.exec(fileKey);
  if (!match) return makeJson({ error: 'Invalid file key' }, 400, request);
  if (parseInt(match[1], 10) !== tokenIdNum) return makeJson({ error: 'Invalid file key' }, 400, request);

  // L'accesso segue la proprietà on-chain: possiedi il token = accedi ai suoi file.
  const isOwner = await checkOwnerOf(tokenIdNum, wallet, env);
  if (!isOwner) return makeJson({ error: 'Access denied' }, 403, request);

  const object = await env.NYFURION_R2.get(fileKey);
  if (!object) return makeJson({ error: 'File not found' }, 404, request);

  return new Response(object.body, {
    status: 200,
    headers: {
      ...getCorsHeaders(request),
      ...SECURITY_HEADERS,
      'Content-Type':        guessContentType(fileKey),
      'Cache-Control':       'private, no-store',
      'Content-Disposition': `inline; filename="${fileKey.split('/').pop()}"`,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/villa  { wallet, sessionToken }
// Serve il modello 3D della Villa Prime SOLO a chi ha firmato ed è holder.
// Il file NON è più pubblico: niente download "di lato" da un URL statico.
// ─────────────────────────────────────────────────────────────────────────────
async function handleVilla(request, env) {
  const body = await parseBody(request);
  if (!body) return makeJson({ error: 'Invalid body' }, 400, request);

  const { wallet, sessionToken } = body;
  if (!isValidAddress(wallet) || !sessionToken) {
    return makeJson({ error: 'Invalid parameters' }, 400, request);
  }

  const sessionWallet = await verifySessionToken(sessionToken, env);
  if (!sessionWallet || sessionWallet !== wallet.toLowerCase()) {
    return makeJson({ error: 'Session invalid or expired' }, 401, request);
  }

  // Deve possedere almeno 1 NFT della collezione (balanceOf > 0)
  let bal = null;
  try {
    bal = await ethCall(env.OLD_CONTRACT, '0x70a08231' + encodeAddress(wallet.toLowerCase()), env.RPC_URL);
  } catch { /* rete giù → nega, non aprire */ }
  if (!bal || BigInt(bal) === 0n) {
    return makeJson({ error: 'Holders only' }, 403, request);
  }

  const object = await env.NYFURION_R2.get('villa/villa-prime.glb');
  if (!object) return makeJson({ error: 'Villa not found' }, 404, request);

  return new Response(object.body, {
    status: 200,
    headers: {
      ...getCorsHeaders(request),
      ...SECURITY_HEADERS,
      'Content-Type':  'model/gltf-binary',
      'Cache-Control': 'private, no-store',
    },
  });
}

// ─── EIP-191 recovery locale (zero RPC, usa @noble/curves + @noble/hashes) ───

/**
 * Recupera l'indirizzo Ethereum che ha firmato `message` con signMessage EIP-191.
 * ethers.js signMessage applica: "\x19Ethereum Signed Message:\n" + len + msg,
 * poi keccak256 e firma con secp256k1.
 */
function recoverEIP191Address(message, hexSignature) {
  const msgBytes = new TextEncoder().encode(message);
  const prefix   = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${msgBytes.length}`);
  const full     = new Uint8Array(prefix.length + msgBytes.length);
  full.set(prefix);
  full.set(msgBytes, prefix.length);

  const msgHash = keccak_256(full);

  const sigHex = hexSignature.startsWith('0x') ? hexSignature.slice(2) : hexSignature;
  if (sigHex.length !== 130) throw new Error('Bad signature length');

  const r        = BigInt('0x' + sigHex.slice(0, 64));
  const s        = BigInt('0x' + sigHex.slice(64, 128));
  const vByte    = parseInt(sigHex.slice(128, 130), 16);
  const recovery = vByte === 27 || vByte === 28 ? vByte - 27 : vByte;

  const sig    = new secp256k1.Signature(r, s).addRecoveryBit(recovery);
  const pubKey = sig.recoverPublicKey(msgHash);

  const pubBytes = pubKey.toRawBytes(false); // 65 byte uncompressed
  const addrHash = keccak_256(pubBytes.slice(1)); // keccak256(x || y)
  return '0x' + bytesToHex(addrHash.slice(12)); // ultimi 20 byte
}

// ─── Ethereum RPC ─────────────────────────────────────────────────────────────

async function checkOwnerOf(tokenId, wallet, env) {
  try {
    const data   = SEL_OWNER_OF + encodeUint256(tokenId);
    const result = await ethCall(env.OLD_CONTRACT, data, env.RPC_URL);
    if (!result || result.length < 66) return false;
    const owner = '0x' + result.slice(-40);
    return owner.toLowerCase() === wallet.toLowerCase();
  } catch { return false; }
}

async function checkCanAccess(tokenId, wallet, env) {
  try {
    const data   = SEL_CAN_ACCESS + encodeUint256(tokenId) + encodeAddress(wallet);
    const result = await ethCall(env.CLAIM_CONTRACT, data, env.RPC_URL);
    if (!result || result.length < 66) return false;
    return BigInt(result) === 1n;
  } catch { return false; }
}

// RPC pubblici di riserva: se il provider primario è giù, la porta resta aperta.
const FALLBACK_RPCS = ['https://ethereum-rpc.publicnode.com', 'https://cloudflare-eth.com'];

async function ethCall(to, data, rpcUrl) {
  let lastErr;
  for (const url of [rpcUrl, ...FALLBACK_RPCS].filter(Boolean)) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to, data }, 'latest'], id: 1 }),
      });
      if (!res.ok) throw new Error(`RPC ${res.status}`);
      const j = await res.json();
      if (j.error) throw new Error(j.error.message);
      return j.result;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('RPC unavailable');
}

function encodeUint256(n) { return BigInt(n).toString(16).padStart(64, '0'); }
function encodeAddress(a) { return a.slice(2).toLowerCase().padStart(64, '0'); }

// ─── Messaggio da firmare ─────────────────────────────────────────────────────

function buildSignMessage(wallet, nonce) {
  return [
    'Nyfurion Holder Archive — Autenticazione',
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    'Domain: nyfurion.com',
    '',
    'Firma per accedere al tuo Holder Archive.',
    'Operazione gratuita. Non autorizza transazioni.',
  ].join('\n');
}

// ─── Session token HMAC-SHA256 ────────────────────────────────────────────────

async function createSessionToken(wallet, env) {
  const payload = btoa(JSON.stringify({ w: wallet, exp: Date.now() + SESSION_TTL_MS }));
  const sig     = await hmacSign(payload, env.WORKER_SECRET);
  return `${payload}.${sig}`;
}

async function verifySessionToken(token, env) {
  try {
    const dot = token.indexOf('.');
    if (dot < 1) return null;
    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);
    const ok      = await hmacVerify(payload, sig, env.WORKER_SECRET);
    if (!ok) return null;
    const data = JSON.parse(atob(payload));
    if (!data.w || !data.exp || Date.now() > data.exp) return null;
    return data.w;
  } catch { return null; }
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function hmacSign(data, secret) {
  const key = await importHmacKey(secret);
  const sig  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bytesToHex(new Uint8Array(sig));
}

async function hmacVerify(data, hexSig, secret) {
  const key      = await importHmacKey(secret);
  const sigBytes = hexToBytes(hexSig);
  if (!sigBytes) return false;
  return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
}

// ─── Rate limiting KV-based ───────────────────────────────────────────────────

async function checkRateLimit(env, endpoint, walletKey, limit) {
  // Finestra fissa: il conteggio e la sua scadenza viaggiano insieme nel valore.
  // Ogni put DEVE portare expirationTtl: un put senza scadenza rende il blocco eterno.
  const kvKey = `rl:${endpoint}:${walletKey}`;
  const now   = Date.now();
  const cur   = await env.NONCE_KV.get(kvKey, 'json');
  if (cur && typeof cur === 'object' && now < cur.exp) {
    if (cur.n >= limit.max) return true;
    const ttl = Math.max(60, Math.ceil((cur.exp - now) / 1000));
    await env.NONCE_KV.put(kvKey, JSON.stringify({ n: cur.n + 1, exp: cur.exp }), { expirationTtl: ttl });
    return false;
  }
  await env.NONCE_KV.put(kvKey, JSON.stringify({ n: 1, exp: now + limit.ttlSec * 1000 }), { expirationTtl: limit.ttlSec });
  return false;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

async function constantTimeEqual(a, b) {
  const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.sign('HMAC', key, enc.encode(a)),
    crypto.subtle.sign('HMAC', key, enc.encode(b)),
  ]);
  const ua = new Uint8Array(ha), ub = new Uint8Array(hb);
  if (ua.length !== ub.length) return false;
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || !/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateNonce() {
  const arr = new Uint8Array(24); // 192 bit
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

function isValidAddress(v)   { return typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v); }
function isValidSignature(v) { return typeof v === 'string' && /^0x[0-9a-fA-F]{130}$/.test(v); }
function isValidNonceStr(v)  { return typeof v === 'string' && /^[0-9a-f]{48}$/.test(v); }

function parseTokenId(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 1 && n <= MAX_TOKEN_ID ? n : null;
}

async function parseBody(request) {
  try {
    const ct = request.headers.get('Content-Type') || '';
    if (!ct.includes('application/json')) return null;
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return null;
    return JSON.parse(text);
  } catch { return null; }
}

function getCorsHeaders(request) {
  const origin  = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function guessContentType(key) {
  if (key.endsWith('.pdf'))                          return 'application/pdf';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  if (key.endsWith('.png'))                          return 'image/png';
  if (key.endsWith('.json'))                         return 'application/json';
  if (key.endsWith('.glb'))                          return 'model/gltf-binary';
  if (key.endsWith('.stl'))                          return 'model/stl';
  return 'application/octet-stream';
}

function makeJson(data, status, request = null) {
  const cors = request ? getCorsHeaders(request) : { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, ...SECURITY_HEADERS, 'Content-Type': 'application/json' },
  });
}
