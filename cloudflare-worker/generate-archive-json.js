/**
 * generate-archive-json.js
 *
 * Genera i file archive.json per ogni token (1–400).
 * Esegui con: node generate-archive-json.js
 *
 * Output: cartella ./r2-upload/token-001/ … token-400/
 * Poi carica su Cloudflare R2 con:
 *   wrangler r2 object put nyfurion-holder-archive/token-001/archive.json --file ./r2-upload/token-001/archive.json
 * oppure usa il bulk upload con rclone.
 *
 * Se hai un CSV con i nomi dei personaggi, modifica readCharacterName() di conseguenza.
 */

const fs   = require('fs');
const path = require('path');

const TOTAL_TOKENS = 400;
const OUTPUT_DIR   = path.join(__dirname, 'r2-upload');

// Mappa opzionale tokenId → nome personaggio.
// Popola questo oggetto con i dati reali dei tuoi NFT.
// Esempio: { 1: 'Aelith', 2: 'Korryn', ... }
const CHARACTER_NAMES = {};

function readCharacterName(tokenId) {
  return CHARACTER_NAMES[tokenId] || `Nyfurion X #${tokenId}`;
}

function padToken(id) {
  return String(id).padStart(3, '0');
}

function generateArchiveJson(tokenId) {
  const pad = padToken(tokenId);
  return {
    tokenId,
    name: `Nyfurion X #${tokenId} - Holder Archive`,
    characterName: readCharacterName(tokenId),
    description: 'Official archive reserved for the current holder. Access is verified on-chain in real time.',
    files: [
      { label: 'Character Sheet', type: 'pdf',   key: `token-${pad}/character-sheet.pdf` },
      { label: 'Lore File',       type: 'pdf',   key: `token-${pad}/lore.pdf` },
      { label: 'Extra Image 01',  type: 'image', key: `token-${pad}/image-extra-01.jpg` },
      { label: 'Extra Image 02',  type: 'image', key: `token-${pad}/image-extra-02.jpg` },
      { label: 'Preview',         type: 'image', key: `token-${pad}/preview.jpg` },
      { label: 'License',         type: 'pdf',   key: `token-${pad}/license.pdf` },
    ],
    licenseUrl: 'https://nyfurion.com/license',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`Generating archive.json for tokens 1–${TOTAL_TOKENS}…`);

for (let id = 1; id <= TOTAL_TOKENS; id++) {
  const pad     = padToken(id);
  const dir     = path.join(OUTPUT_DIR, `token-${pad}`);
  const outFile = path.join(dir, 'archive.json');

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const data = generateArchiveJson(id);
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8');
}

console.log(`Done. Files saved in: ${OUTPUT_DIR}`);
console.log('');
console.log('Next step — upload to R2 with wrangler or rclone:');
console.log('  wrangler r2 object put nyfurion-holder-archive/token-001/archive.json --file ./r2-upload/token-001/archive.json');
console.log('  ... (repeat for all tokens, or use rclone for bulk upload)');
