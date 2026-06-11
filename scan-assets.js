/**
 * scan-assets.js — Nyfurion Character Builder
 *
 * Legge tutte le cartelle dentro assets/characters/
 * e genera assets/characters/manifest.json
 *
 * Uso:
 *   node scan-assets.js
 *   oppure doppio click su scan-assets.bat
 *
 * Il builder carica manifest.json in automatico al refresh del browser.
 * Ogni volta che aggiungi nuovi PNG, rilancia questo script.
 */

const fs   = require('fs');
const path = require('path');

const CHARS_DIR = path.join(__dirname, 'assets', 'characters');

// Mappa: cartella → category ID del builder
const FOLDER_TO_CATS = {
  'base':          ['base'],
  'body-extras':   ['bodyExtras'],
  'head':          ['head'],
  'eyes':          ['eyes'],
  'hair':          ['hair'],
  'head-elements': ['headElements'],
  'outfit':        ['outfit'],
  'accessories':   ['accessory'],
};

// Filtro prefisso per cartelle condivise tra più categorie.
const FOLDER_CAT_PREFIX = {};

// Converte nome file in label leggibile
// "head_golden_crown_01.png" → "Head Golden Crown 01"
function toLabel(filename) {
  return filename
    .replace(/\.png$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

// Converte nome file in id sicuro
// "head_golden_crown_01.png" → "head_golden_crown_01"
function toId(filename) {
  return filename.replace(/\.png$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
}

// ── SCAN ──────────────────────────────────────────────────

var manifest = {};
var totalFiles = 0;

Object.entries(FOLDER_TO_CATS).forEach(function([folder, catIds]) {
  var dir = path.join(CHARS_DIR, folder);

  if (!fs.existsSync(dir)) {
    console.log('  [SKIP] cartella non trovata: ' + folder + '/');
    return;
  }

  var files = fs.readdirSync(dir)
    .filter(function(f) {
      return /\.png$/i.test(f) && !f.startsWith('.');
    })
    .sort();

  catIds.forEach(function(catId) {
    var catFiles = files;

    // Applica filtro prefisso se configurato
    var prefixMap = FOLDER_CAT_PREFIX[folder];
    if (prefixMap && catId in prefixMap) {
      var prefix = prefixMap[catId];
      if (prefix === '') {
        // "" = tutti i file che NON appartengono a nessun'altra categoria con prefisso
        var otherPrefixes = Object.values(prefixMap).filter(function(p) { return p !== ''; });
        catFiles = files.filter(function(f) {
          return !otherPrefixes.some(function(p) { return f.startsWith(p); });
        });
      } else {
        catFiles = files.filter(function(f) { return f.startsWith(prefix); });
      }
    }

    manifest[catId] = catFiles.map(function(f) {
      return {
        id:    toId(f),
        label: toLabel(f),
        file:  f
      };
    });
  });

  totalFiles += files.length;
  console.log('  [OK]   ' + folder + '/  —  ' + files.length + ' PNG  →  categorie: ' + catIds.join(', '));
  if (files.length > 0) {
    files.forEach(function(f) { console.log('         · ' + f); });
  }
});

// ── SCRIVI MANIFEST ───────────────────────────────────────

var outPath = path.join(CHARS_DIR, 'manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log('');
console.log('✓ manifest.json generato — ' + totalFiles + ' file totali');
console.log('  ' + outPath);
console.log('');
console.log('Ricarica il browser per vedere le nuove opzioni nel builder.');
