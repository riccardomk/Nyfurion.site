# Nyfurion — Faction War counter (Phase 1)

Live tally of who sides with **Ordine / Caos / Predatori**.
Works **with a wallet** (detects if the address holds the Nyfurion NFT → "Guardiano verificato") and **without** (anonymous, 1 vote per device).

The website calls two endpoints:
- `GET /api/tally` → current counts
- `POST /api/pledge` → records one vote, returns the new counts

## Deploy (5 minuti)

From this folder:

```bash
# 1. Login to your Cloudflare account
npx wrangler login

# 2. Create the KV namespace (stores the counters)
npx wrangler kv namespace create WAR_KV
#    -> copy the printed id into wrangler.toml (replace PASTE_YOUR_KV_ID_HERE)

# 3. Deploy
npx wrangler deploy
```

## Wire it to the site (choose ONE)

**A) Same domain (recommended).** In `wrangler.toml`, uncomment the `routes` block so the
Worker answers `nyfurion.com/api/*`. Then the site (already on nyfurion.com) just works —
`war.js` calls `/api/...` on the same origin. Nothing else to change.

**B) workers.dev URL.** If you don't route it on the domain, after `wrangler deploy` you get a URL
like `https://nyfurion-war.<account>.workers.dev`. Open `war.js` (in the site root) and set:

```js
const API = 'https://nyfurion-war.<account>.workers.dev/api';
```

## Holder check
Uses a free public Ethereum RPC and `balanceOf(wallet)` on the collection contract
`0x37176275788cfe00b355ff74575753d2e2e50203`. If `balance > 0` → tagged as holder.
For heavy traffic, set your own RPC (Alchemy/Infura) via the `ETH_RPC` var in `wrangler.toml`.

## Notes
- One vote per wallet (preferred) or per device. Re-voting keeps the first choice.
- Counters use KV (fine for this scale). For very high concurrency, upgrade to D1 or a Durable Object.
- Reset the war: `npx wrangler kv key delete --binding WAR_KV "count:order"` (and chaos/shadow), etc.
