// Aggiungi questo script nel tuo HTML oppure includilo come file separato
// Assicurati di aver avviato il backend chat-server.js

// Carica socket.io-client dal CDN
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
document.head.appendChild(script);

script.onload = function() {
  // Connessione al backend
  const socket = io('http://localhost:3002');

  // Sostituisci la variabile messages con una globale condivisa
  window.messages = {};
  categories.forEach(cat => {
    window.messages[cat] = [];
  });

  // Ricevi la cronologia all'avvio
  socket.on('chat-history', (allMsgs) => {
    // Raggruppa per categoria
    categories.forEach(cat => {
      window.messages[cat] = allMsgs.filter(m => m.category === cat);
    });
    renderMessages(currentCategory);
  });

  // Ricevi nuovo messaggio in tempo reale
  socket.on('new-message', (msg) => {
    if (!window.messages[msg.category]) window.messages[msg.category] = [];
    window.messages[msg.category].push(msg);
    if (msg.category === currentCategory) renderMessages(currentCategory);
  });

  // Ricevi cancellazione messaggio in tempo reale
  socket.on('delete-message', (msgIndex) => {
    const arr = window.messages[currentCategory];
    if (Array.isArray(arr) && typeof msgIndex === 'number' && msgIndex >= 0 && msgIndex < arr.length) {
      arr.splice(msgIndex, 1);
      renderMessages(currentCategory);
    }
  });

  // Ricevi modifica messaggio in tempo reale
  socket.on('edit-message', ({ index, newText }) => {
    const arr = window.messages[currentCategory];
    if (Array.isArray(arr) && typeof index === 'number' && index >= 0 && index < arr.length && typeof newText === 'string') {
      arr[index].text = newText;
      renderMessages(currentCategory);
    }
  });

  // Sovrascrivi l'invio messaggi per usare il backend
  chatForm.onsubmit = function(e) {
    e.preventDefault();
    if (imagePreviewData) {
      document.getElementById('send-image-btn-inline').click();
      return;
    }
    const text = msgInput.value.trim();
    if (!text) return;
    const user = getUser();
    const msgObj = {
      text,
      avatar: user && user.avatar ? user.avatar : 'https://i.imgur.com/0y0y0y0.png',
      category: currentCategory,
      image: null
    };
    socket.emit('new-message', msgObj);
    msgInput.value = '';
  };

  // Invio immagini
  window.sendImageMsg = function() {
    if (!imagePreviewData) return;
    const user = getUser();
    const msgObj = {
      text: '',
      avatar: user && user.avatar ? user.avatar : 'https://i.imgur.com/0y0y0y0.png',
      category: currentCategory,
      image: imagePreviewData
    };
    socket.emit('new-message', msgObj);
    imagePreviewData = null;
    inlinePreview.style.display = 'none';
    msgInput.style.display = '';
    fileInput.value = '';
  };

  // Aggiorna il pulsante invia foto
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(ev) {
        imagePreviewData = ev.target.result;
        document.getElementById('image-preview-inline').src = imagePreviewData;
        inlinePreview.style.display = 'flex';
        msgInput.style.display = 'none';
        // Listener invio foto
        document.getElementById('send-image-btn-inline').onclick = function(e) {
          e.preventDefault();
          window.sendImageMsg();
        };
        document.getElementById('cancel-image-btn-inline').onclick = function(e) {
          e.preventDefault();
          imagePreviewData = null;
          inlinePreview.style.display = 'none';
          msgInput.style.display = '';
          fileInput.value = '';
        };
      };
      reader.readAsDataURL(file);
    }
  });

  // Modifica renderMessages per aggiungere modifica e reazioni
  function renderMessages(cat) {
    const container = document.getElementById('messages-' + cat);
    if (container) {
      container.innerHTML = '';
      (window.messages[cat] || []).forEach((msg, idx) => {
        let text = msg.text || '';
        let avatar = msg.avatar || 'https://i.imgur.com/0y0y0y0.png';
        let image = msg.image || null;
        const div = document.createElement('div');
        div.className = 'msg';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.marginBottom = '0.18em';
        let msgContent = '';
        if (image) {
          msgContent = `<img src="${image}" style="max-width:120px; max-height:90px; border-radius:10px; box-shadow:0 1px 6px #00eaff55; border:2px solid #1bff6a; margin-right:0.7em;" alt="img" />`;
        } else {
          msgContent = `<span class='msg-text' style=\"word-break:break-word;\">${text}</span>`;
        }
        div.innerHTML = `
          <div style=\"display:flex;align-items:center;\">
            <img src=\"${avatar}\" class=\"avatar\" style=\"width:22px;height:22px;border-radius:50%;border:1px solid #1bff6a;margin-right:7px;object-fit:cover;display:block;\" alt=\"avatar\" />
          </div>
          <div style=\"background:#23272b; border-radius:9px; padding:0.32em 0.7em; min-width:28px; max-width:60vw; color:#fff; font-size:0.98em; display:flex; align-items:center; position:relative; box-shadow:0 1px 4px #0002; gap:0.5em;\">
            ${msgContent}
            <div class=\"msg-menu-wrap\" style=\"position:relative; margin-left:4px;\">
              <button class=\"msg-menu-btn\" style=\"background:transparent; border:none; cursor:pointer; padding:0 1.5px; display:flex; flex-direction:column; align-items:center; gap:1.5px; height:18px; justify-content:center;\">
                <span style=\"display:inline-block; width:3px; height:3px; background:#bafff7; border-radius:50%; margin:0;\"></span>
                <span style=\"display:inline-block; width:3px; height:3px; background:#bafff7; border-radius:50%; margin:0;\"></span>
                <span style=\"display:inline-block; width:3px; height:3px; background:#bafff7; border-radius:50%; margin:0;\"></span>
              </button>
              <div class=\"msg-menu-popup\" style=\"display:none; position:absolute; right:0; top:16px; background:#23272b; border-radius:7px; box-shadow:0 2px 8px #0006; min-width:90px; z-index:10;\">
                <button class=\"edit-btn\" style=\"width:100%; background:transparent; border:none; color:#1bff6a; padding:6px 0; font-size:0.93em; border-radius:7px; cursor:pointer;\">Modifica</button>
                <button class=\"delete-btn\" style=\"width:100%; background:transparent; border:none; color:#ff4d4d; padding:6px 0; font-size:0.93em; border-radius:7px; cursor:pointer;\">Elimina</button>
              </div>
            </div>
          </div>
        `;
        // Gestione menu puntini
        const menuBtn = div.querySelector('.msg-menu-btn');
        const menuPopup = div.querySelector('.msg-menu-popup');
        menuBtn.onclick = function(e) {
          e.stopPropagation();
          document.querySelectorAll('.msg-menu-popup').forEach(p => { if(p!==menuPopup) p.style.display='none'; });
          menuPopup.style.display = menuPopup.style.display === 'block' ? 'none' : 'block';
        };
        document.addEventListener('click', function hideMenu(ev) {
          if (!div.contains(ev.target)) menuPopup.style.display = 'none';
        }, { once: true });
        // Modifica messaggio
        div.querySelector('.edit-btn').onclick = function() {
          const msgText = div.querySelector('.msg-text');
          const oldText = msgText.textContent;
          const input = document.createElement('input');
          input.type = 'text';
          input.value = oldText;
          input.style.width = '90%';
          input.style.marginRight = '0.5em';
          msgText.replaceWith(input);
          input.focus();
          input.onkeydown = function(ev) {
            if (ev.key === 'Enter') {
              socket.emit('edit-message', { index: idx, newText: input.value });
              menuPopup.style.display = 'none';
            }
            if (ev.key === 'Escape') {
              input.replaceWith(msgText);
            }
          };
        };
        // Elimina
        div.querySelector('.delete-btn').onclick = function() {
          socket.emit('delete-message', idx);
        };
        container.appendChild(div);
      });
      container.scrollTop = container.scrollHeight;
    }
  }
};
