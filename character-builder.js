/* ========================================================
   Nyfurion — Character Builder v4  |  character-builder.js
   Pannello laterale NFT Builder — professionale, zero emoji
   ======================================================== */

(function () {
  'use strict';

  var ASSETS = './assets/characters/';

  /* ── CATEGORIE — ordine = overlay basso→alto ────────────
     isSub: true  → non appare nella sidebar, solo come sotto-sezione
     subCat: 'id' → mostra inline quella categoria quando questo tab è attivo
  ────────────────────────────────────────────────────────── */
  var CATEGORIES = [
    {
      id: 'base', label: 'Personaggio', abbr: 'PRS',
      desc: 'Corpo principale del personaggio',
      folder: 'base', layerId: 'cb-layer-base',
      subCat: 'bodyExtras',
      options: [{ id: 'none', label: 'Nessuno', file: null }],
      default: 'none'
    },
    {
      id: 'bodyExtras', label: 'Dettagli Corpo', abbr: 'DET',
      desc: 'Elementi decorativi aggiuntivi sovrapposti al corpo',
      folder: 'body-extras', layerId: 'cb-layer-body-extras',
      isSub: true,
      options: [{ id: 'none', label: 'Nessuno', file: null }],
      default: 'none'
    },
    {
      id: 'head', label: 'Testa', abbr: 'HED',
      desc: 'Testa, elmo o maschera facciale',
      folder: 'head', layerId: 'cb-layer-head',
      options: [{ id: 'none', label: 'Nessuno', file: null }],
      default: 'none'
    },
    {
      id: 'eyes', label: 'Occhi', abbr: 'EYE',
      desc: 'Occhi, visiera o espressione oculare',
      folder: 'eyes', layerId: 'cb-layer-eyes',
      options: [{ id: 'none', label: 'Nessuno', file: null }],
      default: 'none'
    },
    {
      id: 'hair', label: 'Capelli', abbr: 'CAP',
      desc: 'Capelli del personaggio',
      folder: 'hair', layerId: 'cb-layer-hair',
      options: [{ id: 'none', label: 'Nessuno', file: null }],
      default: 'none'
    },
    {
      id: 'headElements', label: 'Elementi Testa', abbr: 'ELT',
      desc: 'Corna, aureola, ornamenti per la testa',
      folder: 'head-elements', layerId: 'cb-layer-head-elements',
      options: [{ id: 'none', label: 'Nessuno', file: null }],
      default: 'none'
    },
    {
      id: 'outfit', label: 'Abbigliamento', abbr: 'ABB',
      desc: 'Vestito o armatura',
      folder: 'outfit', layerId: 'cb-layer-outfit',
      options: [{ id: 'none', label: 'Nessuno', file: null }],
      default: 'none'
    },
    {
      id: 'accessory', label: 'Accessori', abbr: 'ACC',
      desc: 'Spallacci, collare, maschera e altri accessori',
      folder: 'accessories', layerId: 'cb-layer-accessory',
      options: [{ id: 'none', label: 'Nessuno', file: null }],
      default: 'none'
    }
  ];

  /* categorie visibili nella nav (non sub) */
  var NAV_CATS = CATEGORIES.filter(function(c) { return !c.isSub; });

  /* ── STATO ──────────────────────────────────────────────── */
  var state = {};
  CATEGORIES.forEach(function(cat) { state[cat.id] = cat.default; });
  var activeCatId = NAV_CATS[0].id;
  var charVisible = true;

  /* filtri colore per-opzione: key = "catId|optId" → {hue, sat, bright} */
  var optionFilters = {};
  function getOptFilter(catId, optId) {
    var key = catId + '|' + optId;
    if (!optionFilters[key]) optionFilters[key] = { hue: 0, sat: 100, bright: 100 };
    return optionFilters[key];
  }
  var layerFilters = {};
  CATEGORIES.forEach(function(cat) {
    layerFilters[cat.id] = getOptFilter(cat.id, cat.default);
  });

  /* trasformazioni per layer: posizione + scala */
  var layerTransforms = {};
  CATEGORIES.forEach(function(cat) {
    layerTransforms[cat.id] = { x: 0, y: 0, sw: 100, sh: 100 };
  });

  /* ── BUILD HTML ─────────────────────────────────────────── */
  function sRow(label, id, min, max, unit, def) {
    return '<div class="cb-srow">'
      + '<span class="cb-slabel">' + label + '</span>'
      + '<input type="range"  id="' + id + '"     class="cb-srange" min="' + min + '" max="' + max + '" value="' + def + '">'
      + '<input type="number" id="' + id + '-num" class="cb-snum"   min="' + min + '" max="' + max + '" value="' + def + '">'
      + '<span class="cb-sunit">' + unit + '</span>'
      + '</div>';
  }

  function buildUI() {
    var link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = './character-builder.css';
    document.head.appendChild(link);

    /* layer immagini in scena 3D */
    var sceneEl = document.createElement('div');
    sceneEl.id = 'cb-character-in-scene';
    var inner = '<div id="cb-char-glow"></div>'
      + '<div id="cb-char-placeholder"><div class="ph-silhouette"></div>'
      + '<span>Carica PNG in<br>assets/characters/</span></div>';
    CATEGORIES.forEach(function(cat) {
      inner += '<img id="' + cat.layerId + '" src="" alt="' + cat.label + '">';
      inner += '<div id="' + cat.layerId + '-glow" class="cb-layer-glow"></div>';
    });
    sceneEl.innerHTML = inner;
    document.body.appendChild(sceneEl);

    /* pulsante toggle */
    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'cb-toggle-btn';
    toggleBtn.innerHTML = '<span class="cb-toggle-dot"></span>Character Builder';
    document.body.appendChild(toggleBtn);

    /* pannello laterale */
    var panel = document.createElement('div');
    panel.id = 'cb-side-panel';
    var html = '';

    /* header */
    html += '<div id="cb-panel-header">'
      +   '<div id="cb-panel-title">'
      +     '<span class="cb-brand">NYFURION</span>'
      +     '<span class="cb-heading">CHARACTER BUILDER</span>'
      +   '</div>'
      +   '<button id="cb-close-btn">&#x2715;</button>'
      + '</div>';

    /* preview + azioni */
    html += '<div id="cb-preview-row">'
      +   '<div id="cb-mini-frame"><span class="cb-mini-empty-label">PREV</span>';
    CATEGORIES.forEach(function(cat) { html += '<img id="cb-mini-' + cat.id + '" src="" alt="">'; });
    html += '</div>'
      +   '<div id="cb-action-col">'
      +     '<button id="cb-save-btn">&#x2193;&nbsp;Salva PNG</button>'
      +     '<button id="cb-char-vis-btn">Nascondi nel 3D</button>'
      +   '</div>'
      + '</div>';

    /* navigazione categorie */
    html += '<nav id="cb-cat-nav">';
    NAV_CATS.forEach(function(cat) {
      html += '<button class="cb-cat-btn" data-cat="' + cat.id + '">'
        + '<span class="cb-cat-dot"></span>'
        + '<span class="cb-cat-name">' + cat.label + '</span>'
        + '<span class="cb-cat-cur" id="cb-cur-' + cat.id + '">&#8212;</span>'
        + '</button>';
    });
    html += '</nav>';

    /* area editing (scorribile) */
    html += '<div id="cb-edit-area">';

    /* header sezione corrente */
    html += '<div id="cb-sec-hdr">'
      +   '<span id="cb-sec-name"></span>'
      +   '<span id="cb-sec-desc"></span>'
      + '</div>';

    /* griglia opzioni principale */
    html += '<div id="cb-options-grid"></div>';

    /* sotto-sezione (es. Dettagli Corpo) */
    html += '<div id="cb-sub-sec" class="is-hidden">'
      +   '<div id="cb-sub-hdr"><span id="cb-sub-title"></span></div>'
      +   '<div id="cb-sub-grid"></div>'
      + '</div>';

    /* tool: COLORE */
    html += '<div class="cb-tool-block" id="cb-tool-color">'
      +   '<div class="cb-tool-hdr">'
      +     '<span class="cb-tool-title">COLORE</span>'
      +     '<span id="cb-color-opt-lbl" class="cb-tool-sublabel"></span>'
      +     '<button id="cb-color-reset" class="cb-tool-reset">Reset</button>'
      +   '</div>'
      +   sRow('HUE',    'cb-hue',    0,   359, '&deg;', 0  )
      +   sRow('SAT',    'cb-sat',    0,   300, '%',     100)
      +   sRow('BRIGHT', 'cb-bright', 0,   200, '%',     100)
      + '</div>';

    /* tool: DIMENSIONE & POSIZIONE */
    html += '<div class="cb-tool-block" id="cb-tool-transform">'
      +   '<div class="cb-tool-hdr">'
      +     '<span class="cb-tool-title">DIMENSIONE &amp; POSIZIONE</span>'
      +     '<button id="cb-transform-reset" class="cb-tool-reset">Reset</button>'
      +   '</div>'
      +   sRow('W %',  'cb-sw',  10,  300, '%',  100)
      +   sRow('H %',  'cb-sh',  10,  300, '%',  100)
      +   sRow('X',    'cb-px', -500, 500, 'px', 0  )
      +   sRow('Y',    'cb-py', -500, 500, 'px', 0  )
      + '</div>';

    html += '</div>'; /* fine cb-edit-area */

    panel.innerHTML = html;
    document.body.appendChild(panel);
  }

  /* ── RENDER LAYERS ──────────────────────────────────────── */
  function getTStr(catId) {
    var t = layerTransforms[catId] || { x:0, y:0, sw:100, sh:100 };
    return 'translate(' + t.x + 'px,' + t.y + 'px) scaleX(' + (t.sw/100) + ') scaleY(' + (t.sh/100) + ')';
  }

  function renderLayers() {
    var hasAny = false;
    CATEGORIES.forEach(function(cat) {
      var img = document.getElementById(cat.layerId);
      if (!img) return;
      var opt = getOpt(cat, state[cat.id]);
      if (opt && opt.file) {
        img.src = ASSETS + cat.folder + '/' + opt.file;
        img.style.display = '';
        var f = layerFilters[cat.id];
        if (f) img.style.filter = 'hue-rotate(' + f.hue + 'deg) saturate(' + f.sat + '%) brightness(' + f.bright + '%)';
        img.style.transform = getTStr(cat.id);
        hasAny = true;
      } else {
        img.src = ''; img.style.display = 'none';
      }
    });
    var ph = document.getElementById('cb-char-placeholder');
    if (ph) ph.classList.toggle('has-content', hasAny);
    renderMini();
  }

  function renderMini() {
    CATEGORIES.forEach(function(cat) {
      var img = document.getElementById('cb-mini-' + cat.id);
      if (!img) return;
      var opt = getOpt(cat, state[cat.id]);
      if (opt && opt.file) {
        img.src = ASSETS + cat.folder + '/' + opt.file;
        img.style.display = '';
        var f = layerFilters[cat.id];
        if (f) img.style.filter = 'hue-rotate(' + f.hue + 'deg) saturate(' + f.sat + '%) brightness(' + f.bright + '%)';
      } else { img.src = ''; img.style.display = 'none'; }
    });
  }

  /* ── RENDER OPZIONI ─────────────────────────────────────── */
  function renderOptions(catId) {
    var cat = getCat(catId);
    if (!cat) return;
    var sn = document.getElementById('cb-sec-name');
    var sd = document.getElementById('cb-sec-desc');
    if (sn) sn.textContent = cat.label.toUpperCase();
    if (sd) sd.textContent = cat.desc || '';
    var grid = document.getElementById('cb-options-grid');
    if (grid) grid.innerHTML = buildGrid(cat);
    /* sotto-sezione */
    var subSec = document.getElementById('cb-sub-sec');
    if (subSec) {
      if (cat.subCat) {
        var subCat = getCat(cat.subCat);
        if (subCat) {
          subSec.classList.remove('is-hidden');
          var t = document.getElementById('cb-sub-title');
          if (t) t.textContent = subCat.label.toUpperCase();
          var sg = document.getElementById('cb-sub-grid');
          if (sg) sg.innerHTML = buildGrid(subCat);
        }
      } else { subSec.classList.add('is-hidden'); }
    }
    updateNavLabels();
  }

  function buildGrid(cat) {
    var html = '';
    cat.options.forEach(function(opt) {
      var active = state[cat.id] === opt.id;
      var thumb = opt.file
        ? '<img class="cb-opt-img" src="' + ASSETS + cat.folder + '/' + opt.file + '" alt="' + opt.label + '">'
        : '<div class="cb-opt-none">' + cat.abbr + '</div>';
      html += '<button class="cb-opt-card' + (active ? ' active' : '') + '" data-cat="' + cat.id + '" data-opt="' + opt.id + '">'
        + thumb + '<span class="cb-opt-lbl">' + opt.label + '</span></button>';
    });
    return html;
  }

  /* ── HIGHLIGHT GLOW ─────────────────────────────────────── */
  function highlightLayer(catId) {
    CATEGORIES.forEach(function(cat) {
      var g = document.getElementById(cat.layerId + '-glow');
      if (g) g.classList.toggle('active', cat.id === catId);
    });
  }

  /* ── SET TAB ────────────────────────────────────────────── */
  function setActiveTab(catId) {
    activeCatId = catId;
    document.querySelectorAll('.cb-cat-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.cat === catId);
    });
    renderOptions(catId);
    syncPanel(catId);
    highlightLayer(catId);
  }

  /* ── SYNC PANNELLO ──────────────────────────────────────── */
  function syncPanel(catId) {
    var cat = getCat(catId);
    var f = layerFilters[catId]    || { hue:0, sat:100, bright:100 };
    var t = layerTransforms[catId] || { x:0, y:0, sw:100, sh:100 };
    var lbl = document.getElementById('cb-color-opt-lbl');
    if (lbl && cat) {
      var ao = getOpt(cat, state[catId]);
      lbl.textContent = ' — ' + cat.label + (ao && ao.id !== 'none' ? ' / ' + ao.label : '');
    }
    setS('cb-hue',    f.hue);   setS('cb-sat',    f.sat);   setS('cb-bright', f.bright);
    setS('cb-sw',     t.sw);    setS('cb-sh',     t.sh);
    setS('cb-px',     t.x);     setS('cb-py',     t.y);
  }
  function setS(id, val) {
    var r = document.getElementById(id); var n = document.getElementById(id + '-num');
    if (r) r.value = val; if (n) n.value = val;
  }

  /* ── APPLICA STILE ──────────────────────────────────────── */
  function applyStyle(catId) {
    var cat = getCat(catId); if (!cat) return;
    var img  = document.getElementById(cat.layerId);
    var mini = document.getElementById('cb-mini-' + catId);
    var f = layerFilters[catId];
    var t = layerTransforms[catId];
    var fStr = f ? 'hue-rotate(' + f.hue + 'deg) saturate(' + f.sat + '%) brightness(' + f.bright + '%)' : 'none';
    if (img)  { img.style.filter  = fStr; if (t) img.style.transform = getTStr(catId); }
    if (mini) { mini.style.filter = fStr; }
  }

  /* ── NAV LABELS ─────────────────────────────────────────── */
  function updateNavLabels() {
    NAV_CATS.forEach(function(cat) {
      var el = document.getElementById('cb-cur-' + cat.id);
      if (!el) return;
      var opt = getOpt(cat, state[cat.id]);
      el.textContent = (opt && opt.id !== 'none') ? opt.label : '—';
    });
  }

  /* ── STATUS DOTS ────────────────────────────────────────── */
  function updateCatDots() {
    NAV_CATS.forEach(function(cat) {
      var btn = document.querySelector('.cb-cat-btn[data-cat="' + cat.id + '"]');
      if (btn) btn.classList.toggle('has-sel', state[cat.id] !== 'none');
    });
  }

  /* ── EXPORT PNG ─────────────────────────────────────────── */
  function exportPNG() {
    var W = 2000, H = 3000;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var layers = [];
    CATEGORIES.forEach(function(cat) {
      var img = document.getElementById(cat.layerId);
      if (img && img.src && img.src !== window.location.href && img.style.display !== 'none') {
        layers.push({ src: img.src, catId: cat.id });
      }
    });
    if (!layers.length) { alert('Nessun layer attivo. Seleziona almeno una parte del personaggio.'); return; }
    var btn = document.getElementById('cb-save-btn');
    if (btn) btn.textContent = 'Elaborazione...';
    function drawLayer(i) {
      if (i >= layers.length) {
        try {
          var url = canvas.toDataURL('image/png');
          var a = document.createElement('a');
          a.download = 'nyfurion-character.png'; a.href = url; a.click();
          if (btn) { btn.textContent = 'Salvato!'; setTimeout(function() { btn.innerHTML = '&#x2193;&nbsp;Salva PNG'; }, 2200); }
        } catch(e) {
          if (btn) btn.innerHTML = '&#x2193;&nbsp;Salva PNG';
          alert('Errore: usa localhost.');
        }
        return;
      }
      var item = layers[i];
      var el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = function() {
        var baseScale = Math.min(W / el.naturalWidth, H / el.naturalHeight);
        var t = layerTransforms[item.catId] || { x:0, y:0, sw:100, sh:100 };
        var w = el.naturalWidth  * baseScale * (t.sw / 100);
        var h = el.naturalHeight * baseScale * (t.sh / 100);
        var x = (W - w) / 2 + Math.round(t.x * (W / 400));
        var y = H - h       + Math.round(t.y * (H / 700));
        var f = layerFilters[item.catId];
        ctx.filter = (f && (f.hue || f.sat !== 100 || f.bright !== 100))
          ? 'hue-rotate(' + f.hue + 'deg) saturate(' + f.sat + '%) brightness(' + f.bright + '%)'
          : 'none';
        ctx.drawImage(el, x, y, w, h);
        ctx.filter = 'none';
        drawLayer(i + 1);
      };
      el.onerror = function() { drawLayer(i + 1); };
      el.src = item.src;
    }
    drawLayer(0);
  }

  /* ── EVENTI ─────────────────────────────────────────────── */
  function bindEvents() {
    var toggleBtn = document.getElementById('cb-toggle-btn');
    var panel     = document.getElementById('cb-side-panel');
    var closeBtn  = document.getElementById('cb-close-btn');
    var saveBtn   = document.getElementById('cb-save-btn');
    var visBtn    = document.getElementById('cb-char-vis-btn');
    var sceneEl   = document.getElementById('cb-character-in-scene');

    toggleBtn.addEventListener('click', function() { panel.classList.add('open'); toggleBtn.classList.add('hidden'); });
    closeBtn.addEventListener('click',  function() { panel.classList.remove('open'); toggleBtn.classList.remove('hidden'); });
    saveBtn.addEventListener('click', exportPNG);
    visBtn.addEventListener('click', function() {
      charVisible = !charVisible;
      sceneEl.classList.toggle('hidden', !charVisible);
      visBtn.textContent = charVisible ? 'Nascondi nel 3D' : 'Mostra nel 3D';
      visBtn.classList.toggle('off', !charVisible);
    });

    /* click su categoria o card opzione */
    panel.addEventListener('click', function(e) {
      var catBtn = e.target.closest('.cb-cat-btn');
      if (catBtn) { setActiveTab(catBtn.dataset.cat); return; }
      var card = e.target.closest('.cb-opt-card');
      if (card) {
        var catId = card.dataset.cat;
        var optId = card.dataset.opt;
        state[catId] = optId;
        layerFilters[catId] = getOptFilter(catId, optId);
        renderLayers();
        renderOptions(activeCatId);
        if (catId === activeCatId) syncPanel(activeCatId);
        updateCatDots();
      }
    });

    /* colore */
    function applyColor() {
      var f = layerFilters[activeCatId]; if (!f) return;
      f.hue    = getV('cb-hue');
      f.sat    = getV('cb-sat');
      f.bright = getV('cb-bright');
      setSN({'cb-hue': f.hue, 'cb-sat': f.sat, 'cb-bright': f.bright});
      applyStyle(activeCatId);
    }
    bindSR('cb-hue',    0,   359, applyColor);
    bindSR('cb-sat',    0,   300, applyColor);
    bindSR('cb-bright', 0,   200, applyColor);
    document.getElementById('cb-color-reset').addEventListener('click', function() {
      var f = layerFilters[activeCatId];
      if (f) { f.hue = 0; f.sat = 100; f.bright = 100; }
      syncPanel(activeCatId); applyStyle(activeCatId);
    });

    /* trasformazione */
    function applyTransform() {
      var t = layerTransforms[activeCatId]; if (!t) return;
      t.sw = getV('cb-sw'); t.sh = getV('cb-sh');
      t.x  = getV('cb-px'); t.y  = getV('cb-py');
      setSN({'cb-sw': t.sw, 'cb-sh': t.sh, 'cb-px': t.x, 'cb-py': t.y});
      applyStyle(activeCatId);
    }
    bindSR('cb-sw',  10,  300, applyTransform);
    bindSR('cb-sh',  10,  300, applyTransform);
    bindSR('cb-px', -500, 500, applyTransform);
    bindSR('cb-py', -500, 500, applyTransform);
    document.getElementById('cb-transform-reset').addEventListener('click', function() {
      var t = layerTransforms[activeCatId];
      if (t) { t.x = 0; t.y = 0; t.sw = 100; t.sh = 100; }
      syncPanel(activeCatId); applyStyle(activeCatId);
    });
  }

  /* ── UTILS ──────────────────────────────────────────────── */
  function getV(id) { var el = document.getElementById(id); return el ? (parseInt(el.value)||0) : 0; }
  function setSN(map) { Object.keys(map).forEach(function(id) { var n = document.getElementById(id+'-num'); if (n) n.value = map[id]; }); }
  function bindSR(id, min, max, cb) {
    var rng = document.getElementById(id); var num = document.getElementById(id+'-num');
    if (rng) rng.addEventListener('input', cb);
    if (num) {
      function fn() { var v=Math.max(min,Math.min(max,parseInt(num.value)||0)); num.value=v; if(rng)rng.value=v; cb(); }
      num.addEventListener('input', fn); num.addEventListener('change', fn);
    }
  }
  function getCat(id) { for(var i=0;i<CATEGORIES.length;i++) if(CATEGORIES[i].id===id) return CATEGORIES[i]; return null; }
  function getOpt(cat,id) { for(var i=0;i<cat.options.length;i++) if(cat.options[i].id===id) return cat.options[i]; return null; }

  /* ── MANIFEST AUTO ──────────────────────────────────────── */
  function loadManifest(callback) {
    fetch('./assets/characters/manifest.json')
      .then(function(r) { return r.json(); })
      .then(function(manifest) {
        CATEGORIES.forEach(function(cat) {
          var list = manifest[cat.id];
          if (list && list.length > 0) {
            cat.options = [{ id: 'none', label: 'Nessuno', file: null }].concat(list);
          }
        });
        callback();
      })
      .catch(function() { callback(); });
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  function init() {
    buildUI();
    bindEvents();
    loadManifest(function() {
      setActiveTab(NAV_CATS[0].id);
      renderLayers();
      updateCatDots();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
