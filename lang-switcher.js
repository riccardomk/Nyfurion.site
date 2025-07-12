// Dizionario IT/EN
const translations = {
    it: {
        "nyfurion-title": "NYFURION",
        "nyfurion-subtitle": "La Guerra dell'Equilibrio e il Destino dei Guardiani",
        "nft-collection-title": "Collezione NFT",
        "roadmap-title": "Roadmap",
        "contacts-title": "Contatti",
        "contacts-desc": "Per collaborazioni, richieste professionali o informazioni sul progetto Nyfurion, compila il form o usa i link diretti.",
        "portal-btn": "Portale",
        "footer": "© 2024 Riccardo Duca – Tutti i diritti riservati.",
        "quiz-title": "Quiz: La Guerra dell'Equilibrio & Il Destino dei Guardiani",
        "quiz-close": "Chiudi quiz",
    },
    en: {
        "nyfurion-title": "NYFURION",
        "nyfurion-subtitle": "The War of Balance and the Fate of the Guardians",
        "nft-collection-title": "NFT Collection",
        "roadmap-title": "Roadmap",
        "contacts-title": "Contacts",
        "contacts-desc": "For collaborations, professional requests or information about the Nyfurion project, fill out the form or use the direct links.",
        "portal-btn": "Portal",
        "footer": "© 2024 Riccardo Duca – All rights reserved.",
        "quiz-title": "Quiz: The War of Balance & Fate of the Guardians",
        "quiz-close": "Close quiz",
    }
};

let currentLang = localStorage.getItem('nyfurionLang') || 'it';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('nyfurionLang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });
    document.documentElement.lang = lang;
}

function addLangSwitcherButton() {
    if (document.getElementById('lang-switch-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'lang-switch-btn';
    btn.innerHTML = '?';
    btn.title = 'Switch language / Cambia lingua';
    btn.style.position = 'fixed';
    btn.style.top = '16px';
    btn.style.right = '16px';
    btn.style.zIndex = 99999;
    btn.style.background = 'linear-gradient(90deg,#00eaff 0%,#1bff6a 100%)';
    btn.style.color = '#181a22';
    btn.style.border = 'none';
    btn.style.borderRadius = '50%';
    btn.style.width = '40px';
    btn.style.height = '40px';
    btn.style.fontSize = '1.5em';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 0 12px #00eaff33';
    btn.onclick = switchLanguage;
    document.body.appendChild(btn);
}

function switchLanguage() {
    const newLang = currentLang === 'it' ? 'en' : 'it';
    setLanguage(newLang);
}

document.addEventListener('DOMContentLoaded', function() {
    addLangSwitcherButton();
    setLanguage(currentLang);
});
