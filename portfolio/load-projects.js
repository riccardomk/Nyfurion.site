// Script per caricare dinamicamente i progetti dai file JSON
(function() {
  console.log('🔄 Loading projects from JSON files...');
  
  const projectFiles = [
    './projects/solosport.json',
    './projects/padel-italia.json',
    './projects/rpg-yacht.json',
    './projects/di-lenarda.json'
  ];
  
  // Carica tutti i progetti
  Promise.all(
    projectFiles.map(file => 
      fetch(file)
        .then(res => res.json())
        .catch(err => {
          console.error(`❌ Error loading ${file}:`, err);
          return null;
        })
    )
  ).then(projects => {
    // Filtra progetti caricati con successo
    const loadedProjects = projects.filter(p => p !== null);
    
    if (loadedProjects.length > 0) {
      console.log(`✅ Loaded ${loadedProjects.length} projects from JSON files`);
      
      // Salva i progetti nel window per accesso globale
      window.CUSTOM_PROJECTS = loadedProjects;
      
      // Trigger evento custom per notificare il React app
      window.dispatchEvent(new CustomEvent('projectsLoaded', { 
        detail: { projects: loadedProjects } 
      }));
      
      console.log('📦 Projects available in window.CUSTOM_PROJECTS:', window.CUSTOM_PROJECTS);
    } else {
      console.warn('⚠️ No projects loaded from JSON files');
    }
  });
})();
