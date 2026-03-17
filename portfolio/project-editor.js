// PROJECT EDITOR - Attiva con Shift+L
(function() {
  let editorActive = false;
  let currentProject = null;

  // Intercetta Shift+L
  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'L') {
      e.preventDefault();
      toggleEditor();
    }
  });

  function toggleEditor() {
    if (editorActive) {
      closeEditor();
    } else {
      openEditor();
    }
  }

  function openEditor() {
    editorActive = true;
    
    // Ottieni il progetto corrente dal path
    const hash = window.location.hash;
    const projectMatch = hash.match(/#\/projects\/(.+)/);
    
    if (!projectMatch) {
      alert('Apri prima una pagina progetto!');
      return;
    }

    const projectId = projectMatch[1];
    loadProjectData(projectId);
  }

  async function loadProjectData(projectId) {
    try {
      const response = await fetch(`./projects/${projectId}.json`);
      currentProject = await response.json();
      showEditorUI();
    } catch (error) {
      alert('Errore caricamento progetto: ' + error.message);
    }
  }

  function showEditorUI() {
    // Crea overlay editor
    const overlay = document.createElement('div');
    overlay.id = 'project-editor-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.95);
      z-index: 999999;
      overflow-y: auto;
      padding: 40px;
    `;

    overlay.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto; background: #1a1a1c; padding: 30px; border-radius: 16px; color: #F2F2F2;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <h2 style="margin: 0; color: #E30B17; font-size: 28px;">📝 EDITOR PROGETTO: ${currentProject.title}</h2>
          <button id="close-editor" style="background: #E30B17; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">✕ CHIUDI (Shift+L)</button>
        </div>

        <div style="background: #080809; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h3 style="color: #00E5FF; margin-bottom: 15px;">🖼️ IMMAGINE PRINCIPALE (Hero/Landing)</h3>
          <label style="display: block; margin-bottom: 8px; color: #999;">Path immagine:</label>
          <input type="text" id="main-image-input" value="${currentProject.mainImage || ''}" 
            style="width: 100%; padding: 12px; background: #1a1a1c; border: 2px solid #333; border-radius: 8px; color: white; font-size: 14px; margin-bottom: 12px;">
          <button id="upload-main-btn" style="background: #00E5FF; color: black; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">📁 Carica File</button>
          <input type="file" id="main-image-file" accept="image/*" style="display: none;">
        </div>

        <div style="background: #080809; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h3 style="color: #00E5FF; margin-bottom: 15px;">🎨 GALLERIA IMMAGINI</h3>
          <div id="gallery-editor"></div>
          <button id="add-gallery-item" style="background: #00E5FF; color: black; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 12px;">➕ Aggiungi Immagine</button>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 30px;">
          <button id="save-changes" style="flex: 1; background: #00E5FF; color: black; border: none; padding: 16px; border-radius: 8px; cursor: pointer; font-size: 18px; font-weight: bold;">💾 SALVA MODIFICHE</button>
          <button id="download-json" style="flex: 1; background: #E30B17; color: white; border: none; padding: 16px; border-radius: 8px; cursor: pointer; font-size: 18px; font-weight: bold;">📥 SCARICA JSON</button>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: rgba(0,229,255,0.1); border-radius: 8px; border-left: 4px solid #00E5FF;">
          <p style="margin: 0; color: #00E5FF; font-size: 14px;">
            💡 <strong>TIP:</strong> Le modifiche vengono salvate in memoria. Clicca "SCARICA JSON" per ottenere il file aggiornato da sostituire in <code>portfolio/projects/${currentProject.id}.json</code>
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Popola galleria esistente
    renderGallery();

    // Event listeners
    document.getElementById('close-editor').onclick = closeEditor;
    document.getElementById('upload-main-btn').onclick = () => document.getElementById('main-image-file').click();
    document.getElementById('main-image-file').onchange = handleMainImageUpload;
    document.getElementById('add-gallery-item').onclick = addGalleryItem;
    document.getElementById('save-changes').onclick = saveChanges;
    document.getElementById('download-json').onclick = downloadJSON;

    // Chiudi con ESC
    overlay.onclick = (e) => {
      if (e.target === overlay) closeEditor();
    };
  }

  function renderGallery() {
    const container = document.getElementById('gallery-editor');
    container.innerHTML = '';

    if (!currentProject.gallery) {
      currentProject.gallery = [];
    }

    currentProject.gallery.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.style.cssText = 'background: #1a1a1c; padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 2px solid #333;';
      itemDiv.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 10px;">
          <span style="background: #E30B17; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px;">IMG ${index + 1}</span>
          <input type="text" class="gallery-url" data-index="${index}" value="${item.url || ''}" placeholder="Path immagine" 
            style="flex: 1; padding: 10px; background: #080809; border: 1px solid #444; border-radius: 6px; color: white;">
          <button class="remove-gallery" data-index="${index}" style="background: #E30B17; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">🗑️</button>
        </div>
        <input type="text" class="gallery-label" data-index="${index}" value="${item.label || ''}" placeholder="Didascalia (opzionale)" 
          style="width: 100%; padding: 10px; background: #080809; border: 1px solid #444; border-radius: 6px; color: white;">
      `;
      container.appendChild(itemDiv);
    });

    // Event listeners per rimozione
    document.querySelectorAll('.remove-gallery').forEach(btn => {
      btn.onclick = () => removeGalleryItem(parseInt(btn.dataset.index));
    });
  }

  function addGalleryItem() {
    currentProject.gallery.push({ url: '', label: '' });
    renderGallery();
  }

  function removeGalleryItem(index) {
    currentProject.gallery.splice(index, 1);
    renderGallery();
  }

  function handleMainImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileName = file.name;
      const suggestedPath = `./images/${fileName}`;
      
      document.getElementById('main-image-input').value = suggestedPath;
      
      alert(`✅ File selezionato: ${fileName}\n\n⚠️ ATTENZIONE: Devi MANUALMENTE copiare questa immagine in:\nportfolio/images/${fileName}\n\nIl path è stato inserito automaticamente.`);
    };
    reader.readAsDataURL(file);
  }

  function saveChanges() {
    // Aggiorna mainImage
    const mainImageInput = document.getElementById('main-image-input');
    currentProject.mainImage = mainImageInput.value;

    // Aggiorna gallery
    document.querySelectorAll('.gallery-url').forEach((input, index) => {
      if (currentProject.gallery[index]) {
        currentProject.gallery[index].url = input.value;
      }
    });

    document.querySelectorAll('.gallery-label').forEach((input, index) => {
      if (currentProject.gallery[index]) {
        currentProject.gallery[index].label = input.value;
      }
    });

    // Salva in localStorage temporaneamente
    localStorage.setItem(`project_${currentProject.id}`, JSON.stringify(currentProject));

    alert('✅ MODIFICHE SALVATE in memoria!\n\n📥 Clicca "SCARICA JSON" per ottenere il file da sostituire in:\nportfolio/projects/' + currentProject.id + '.json');
  }

  function downloadJSON() {
    saveChanges(); // Salva prima

    const jsonStr = JSON.stringify(currentProject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.id}.json`;
    a.click();
    
    URL.revokeObjectURL(url);

    alert(`✅ File "${currentProject.id}.json" scaricato!\n\n📂 Sostituiscilo in:\nportfolio/projects/${currentProject.id}.json\n\nPoi fai commit e push su GitHub.`);
  }

  function closeEditor() {
    editorActive = false;
    const overlay = document.getElementById('project-editor-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Carica modifiche salvate in localStorage al caricamento pagina
  window.addEventListener('load', () => {
    const hash = window.location.hash;
    const projectMatch = hash.match(/#\/projects\/(.+)/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      const saved = localStorage.getItem(`project_${projectId}`);
      if (saved) {
        console.log('📝 Modifiche salvate trovate per:', projectId);
      }
    }
  });

  console.log('🎨 PROJECT EDITOR ATTIVO - Premi Shift+L per modificare immagini progetto');
})();
