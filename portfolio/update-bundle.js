// Script per aggiornare il bundle con i progetti dai file JSON
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Updating bundle with projects from JSON files...\n');

// Percorsi
const projectsDir = path.join(__dirname, 'projects');
const bundlePath = path.join(__dirname, 'assets', 'index-DmYQ69Su.js');

// Carica tutti i progetti JSON
const projectFiles = [
  'solosport.json',
  'padel-italia.json',
  'rpg-yacht.json',
  'di-lenarda.json'
];

// Leggi tutti i progetti
const projects = projectFiles.map(file => {
  const filePath = path.join(projectsDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const project = JSON.parse(content);
    console.log(`✅ Loaded: ${file}`);
    return project;
  } catch (err) {
    console.error(`❌ Error loading ${file}:`, err.message);
    return null;
  }
}).filter(p => p !== null);

console.log(`\n📦 Total projects loaded: ${projects.length}\n`);

// Converti progetti in formato JavaScript per il bundle
const projectsJS = JSON.stringify(projects)
  .replace(/"IT":/g, 'IT:')
  .replace(/"EN":/g, 'EN:')
  .replace(/"id":/g, 'id:')
  .replace(/"title":/g, 'title:')
  .replace(/"category":/g, 'category:')
  .replace(/"year":/g, 'year:')
  .replace(/"role":/g, 'role:')
  .replace(/"brief":/g, 'brief:')
  .replace(/"deliverables":/g, 'deliverables:')
  .replace(/"process":/g, 'process:')
  .replace(/"outcome":/g, 'outcome:')
  .replace(/"tools":/g, 'tools:')
  .replace(/"mainImage":/g, 'mainImage:')
  .replace(/"logoUrl":/g, 'logoUrl:')
  .replace(/"videoUrl":/g, 'videoUrl:')
  .replace(/"gallery":/g, 'gallery:')
  .replace(/"url":/g, 'url:')
  .replace(/"label":/g, 'label:')
  .replace(/"collaborationText":/g, 'collaborationText:');

// Leggi il bundle
let bundleContent = fs.readFileSync(bundlePath, 'utf8');

// Trova e sostituisci la sezione progetti (tra [{id:"solo-sport" e }],Mv=[)
const projectsStart = bundleContent.indexOf('[{id:"solo-sport"');
const projectsEnd = bundleContent.indexOf('}],Mv=[');

if (projectsStart === -1 || projectsEnd === -1) {
  console.error('❌ Cannot find projects section in bundle!');
  process.exit(1);
}

// Estrai tutto prima e dopo la sezione progetti
const beforeProjects = bundleContent.substring(0, projectsStart);
const afterProjects = bundleContent.substring(projectsEnd + 2); // +2 per includere "}]"

// Ricostruisci il bundle
const newBundle = beforeProjects + projectsJS + afterProjects;

// Salva il bundle aggiornato
fs.writeFileSync(bundlePath, newBundle, 'utf8');

console.log('✅ Bundle updated successfully!');
console.log(`📄 File: ${bundlePath}`);
console.log('\n🎉 Done! Refresh your browser to see the changes.\n');
