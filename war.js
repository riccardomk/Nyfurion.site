/* ============================================================
   NYFURION — Faction War (frontend, Phase 1) + share on choice
   IMPORTANT: this NEVER runs on localhost. It only activates on the live
   site once the Cloudflare Worker (/api) is reachable. No demo, no fake numbers.
   ============================================================ */
(function () {
  // Cloudflare Worker endpoint (deployed). CORS is handled by the Worker.
  const API = 'https://nyfurion-war.riccardo97-duca.workers.dev/api';
  const SITE_URL = 'https://nyfurion.com'; // shared links always point to the live site
  const LOCAL = ['127.0.0.1', 'localhost', ''].includes(location.hostname) || location.protocol === 'file:';
  const IT = (navigator.language || 'en').toLowerCase().startsWith('it');

  // one-time reset (also clears any previous choice/preview data)
  if (localStorage.getItem('nyf_war_ver') !== '3') {
    localStorage.removeItem('nyf_choice');
    localStorage.removeItem('nyf_mock');
    localStorage.setItem('nyf_war_ver', '3');
  }

  // NEVER works in local — the war is live only on the real site.
  if (LOCAL) return;

  const FACTIONS = ['order', 'chaos', 'shadow'];
  const NAMES = IT
    ? { order: 'Ordine', chaos: 'Caos', shadow: 'Predatori' }
    : { order: 'Order', chaos: 'Chaos', shadow: 'Predators' };

  const box = document.getElementById('war-box');
  const bar = document.getElementById('war-bar');
  const statusEl = document.getElementById('war-status');
  const walletBtn = document.getElementById('war-wallet');
  const shareBox = document.getElementById('war-share');
  const shareLabel = document.getElementById('war-share-label');
  const countEls = {};
  FACTIONS.forEach((f) => (countEls[f] = document.getElementById('warc-' + f)));
  if (!box || !bar) return;

  let device = localStorage.getItem('nyf_dev');
  if (!device) {
    device = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(16).slice(2));
    localStorage.setItem('nyf_dev', device);
  }
  let wallet = localStorage.getItem('nyf_wallet') || '';
  let myChoice = localStorage.getItem('nyf_choice') || '';
  let wired = false;

  const fmt = (n) => (n || 0).toLocaleString(IT ? 'it-IT' : 'en-US');

  function render(t) {
    if (!t) return;
    const total = t.total || 0;
    FACTIONS.forEach((f) => {
      const c = (t[f] && t[f].count) || 0;
      if (countEls[f]) { countEls[f].textContent = fmt(c); countEls[f].classList.add('show'); }
    });
    bar.innerHTML = FACTIONS.map((f) => {
      const c = (t[f] && t[f].count) || 0;
      const pct = total ? (c / total) * 100 : 33.34;
      return '<span class="war-seg ' + f + '" style="width:' + pct.toFixed(2) + '%"></span>';
    }).join('');
    box.classList.add('live');
    if (!myChoice && statusEl && !statusEl.dataset.locked) {
      statusEl.textContent = total ? (IT ? 'La guerra è in corso. Scegli.' : 'The war is on. Choose.') : (IT ? 'La guerra inizia ora. Schierati.' : 'The war begins now. Take a side.');
    }
  }

  function markChosen(f) {
    document.querySelectorAll('#final .cf').forEach((a) => a.classList.toggle('chosen', a.classList.contains(f)));
  }

  function showResult(f, note) {
    markChosen(f);
    // switch the section from "choose" to the chosen/share state
    const lbl = document.getElementById('t-choose-eyebrow');
    if (lbl) lbl.style.display = 'none';
    if (statusEl) {
      statusEl.dataset.locked = '1';
      const base = (IT ? 'Sei schierato con ' : 'You stand with ') + '<b>' + NAMES[f] + '</b>';
      statusEl.innerHTML = note ? base + ' · ' + note : base;
    }
    buildShare(f);
  }

  function buildShare(f) {
    if (!shareBox) return;
    const msg = IT
      ? 'Mi sono schierato con ' + NAMES[f] + ' nella guerra di Nyfurion. E tu, da che parte stai?'
      : 'I have sided with ' + NAMES[f] + ' in the war of Nyfurion. Where do you stand?';
    const url = SITE_URL;
    const u = encodeURIComponent(url);
    const m = encodeURIComponent(msg);
    const set = (id, href) => { const e = document.getElementById(id); if (e) e.href = href; };
    set('sh-x', 'https://twitter.com/intent/tweet?text=' + m + '&url=' + u + '&hashtags=Nyfurion');
    set('sh-wa', 'https://wa.me/?text=' + encodeURIComponent(msg + ' ' + url));
    set('sh-tg', 'https://t.me/share/url?url=' + u + '&text=' + m);
    if (shareLabel) shareLabel.textContent = IT ? 'Invita altri a schierarsi' : 'Invite others to take a side';
    shareBox.hidden = false;

    const copyBtn = document.getElementById('sh-copy');
    if (copyBtn) {
      copyBtn.textContent = IT ? 'Copia link' : 'Copy link';
      copyBtn.onclick = async () => {
        try { await navigator.clipboard.writeText(msg + ' ' + url); } catch (e) {}
        copyBtn.textContent = IT ? 'Copiato' : 'Copied';
        setTimeout(() => (copyBtn.textContent = IT ? 'Copia link' : 'Copy link'), 1600);
      };
    }
    const igBtn = document.getElementById('sh-ig');
    if (igBtn) {
      igBtn.textContent = 'Instagram';
      igBtn.onclick = async () => {
        try { await navigator.clipboard.writeText(msg + ' ' + url); } catch (e) {}
        if (navigator.share) {
          navigator.share({ title: 'Nyfurion', text: msg, url }).catch(() => {});
        } else {
          window.open('https://www.instagram.com/', '_blank', 'noopener');
        }
        igBtn.textContent = IT ? 'Copiato! Incolla su IG' : 'Copied! Paste on IG';
        setTimeout(() => (igBtn.textContent = 'Instagram'), 2200);
      };
    }
    const nativeBtn = document.getElementById('sh-native');
    if (nativeBtn) {
      if (navigator.share) {
        nativeBtn.hidden = false;
        nativeBtn.textContent = IT ? 'Condividi' : 'Share';
        nativeBtn.onclick = () => navigator.share({ title: 'Nyfurion', text: msg, url }).catch(() => {});
      } else { nativeBtn.hidden = true; }
    }
  }

  function wireEmblems() {
    if (wired) return; wired = true;
    document.querySelectorAll('#final .cf').forEach((a) => {
      const f = FACTIONS.find((x) => a.classList.contains(x));
      if (!f) return;
      a.addEventListener('click', (e) => { e.preventDefault(); pledge(f); });
    });
  }

  async function loadTally() {
    try {
      const r = await fetch(API + '/tally');
      if (!r.ok) return;
      render(await r.json());
      wireEmblems();
      if (myChoice) showResult(myChoice);
    } catch (e) { /* backend not live yet -> emblems stay normal links, war hidden */ }
  }

  async function pledge(faction) {
    if (myChoice) { showResult(myChoice); return; }
    if (statusEl) statusEl.textContent = IT ? 'Schieramento in corso...' : 'Pledging...';
    try {
      const r = await fetch(API + '/pledge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faction, device, wallet }),
      });
      const j = await r.json();
      if (j.tally) render(j.tally);
      const choice = j.choice || faction;
      myChoice = choice; localStorage.setItem('nyf_choice', choice);
      showResult(choice, j.holder ? (IT ? 'Guardiano verificato' : 'Verified holder') : '');
    } catch (e) {
      if (statusEl) statusEl.textContent = IT ? 'Schieramento non disponibile ora.' : 'Pledging unavailable right now.';
    }
  }

  if (walletBtn) {
    walletBtn.textContent = IT ? 'Connetti wallet' : 'Connect wallet';
    if (wallet) walletBtn.textContent = wallet.slice(0, 6) + '...' + wallet.slice(-4);
    walletBtn.addEventListener('click', async () => {
      if (!window.ethereum) { if (statusEl) statusEl.textContent = IT ? 'Nessun wallet rilevato (installa MetaMask).' : 'No wallet detected (install MetaMask).'; return; }
      try {
        const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
        wallet = String((accs && accs[0]) || '').toLowerCase();
        localStorage.setItem('nyf_wallet', wallet);
        walletBtn.textContent = wallet.slice(0, 6) + '...' + wallet.slice(-4);
        if (statusEl && !myChoice) statusEl.textContent = IT ? 'Wallet connesso. Scegli la tua fazione.' : 'Wallet connected. Choose your side.';
      } catch (e) {}
    });
  }

  loadTally();
})();
