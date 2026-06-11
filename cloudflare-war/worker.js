/* ============================================================
   NYFURION — Faction War counter (Cloudflare Worker + KV)
   Phase 1: live tally for Ordine / Caos / Predatori.
   - Works WITH wallet (detects if the address holds the NFT) and WITHOUT (anonymous, 1 per device).
   - Endpoints:
       GET  /api/tally   -> { total, order:{count,holders}, chaos:{...}, shadow:{...} }
       POST /api/pledge  -> body { faction, device, wallet? } -> records 1 vote, returns tally
   Bind a KV namespace as WAR_KV (see wrangler.toml).
   ============================================================ */

const FACTIONS = ['order', 'chaos', 'shadow'];
const CONTRACT = '0x37176275788cfe00b355ff74575753d2e2e50203'; // Nyfurion collection
const DEFAULT_RPC = 'https://ethereum-rpc.publicnode.com';      // free public Ethereum RPC

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      if (url.pathname === '/api/tally' && request.method === 'GET') {
        return json(await getTally(env), cors);
      }

      if (url.pathname === '/api/pledge' && request.method === 'POST') {
        let body = {};
        try { body = await request.json(); } catch (e) {}
        const faction = String(body.faction || '').toLowerCase();
        if (!FACTIONS.includes(faction)) return json({ error: 'bad faction' }, cors, 400);

        const device = String(body.device || '').slice(0, 80);
        const wallet = String(body.wallet || '').toLowerCase();
        // a voter is identified by wallet (preferred) or device id
        const voterKey = /^0x[0-9a-f]{40}$/.test(wallet) ? 'w:' + wallet : (device ? 'd:' + device : '');
        if (!voterKey) return json({ error: 'no id' }, cors, 400);

        // already voted? keep their first choice, do not double count
        const prev = await env.WAR_KV.get('voter:' + voterKey);
        if (prev) {
          return json({ ok: true, already: true, choice: prev, tally: await getTally(env) }, cors);
        }

        // optional holder verification
        let holder = false;
        if (/^0x[0-9a-f]{40}$/.test(wallet)) {
          holder = await isHolder(wallet, env);
        }

        // record the vote + bump counters
        await env.WAR_KV.put('voter:' + voterKey, faction);
        await bump(env, 'count:' + faction);
        if (holder) await bump(env, 'holders:' + faction);

        return json({ ok: true, choice: faction, holder, tally: await getTally(env) }, cors);
      }

      return new Response('Nyfurion War API', { headers: cors });
    } catch (err) {
      return json({ error: 'server', detail: String(err) }, cors, 500);
    }
  },
};

async function bump(env, key) {
  const cur = parseInt((await env.WAR_KV.get(key)) || '0', 10);
  await env.WAR_KV.put(key, String(cur + 1));
}

async function getTally(env) {
  const out = { total: 0 };
  for (const f of FACTIONS) {
    const c = parseInt((await env.WAR_KV.get('count:' + f)) || '0', 10);
    const h = parseInt((await env.WAR_KV.get('holders:' + f)) || '0', 10);
    out[f] = { count: c, holders: h };
    out.total += c;
  }
  return out;
}

// ERC-721 balanceOf(address) > 0  => holder
async function isHolder(wallet, env) {
  const rpc = (env && env.ETH_RPC) || DEFAULT_RPC;
  const data = '0x70a08231' + wallet.replace('0x', '').padStart(64, '0');
  try {
    const r = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: CONTRACT, data }, 'latest'] }),
    });
    const j = await r.json();
    if (!j || !j.result) return false;
    return BigInt(j.result) > 0n;
  } catch (e) {
    return false;
  }
}

function json(obj, cors, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
