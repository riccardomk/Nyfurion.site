// wallet-access.js
// Modulo unico per connessione wallet (MetaMask desktop + WalletConnect mobile)
// Usa Web3Modal per offrire un'unica esperienza utente

// Carica dinamicamente le librerie se non già presenti
(function(){
    if (!window.Web3Modal || !window.WalletConnectProvider) {
        let wcScript = document.createElement('script');
        wcScript.src = 'https://unpkg.com/@walletconnect/web3-provider@1.8.0/dist/umd/index.min.js';
        document.head.appendChild(wcScript);
        let w3mScript = document.createElement('script');
        w3mScript.src = 'https://unpkg.com/web3modal@1.9.12/dist/index.js';
        document.head.appendChild(w3mScript);
        w3mScript.onload = wcScript.onload = function() {
            if (window.Web3Modal && window.WalletConnectProvider) {
                window.initWalletAccess && window.initWalletAccess();
            }
        };
    } else {
        window.initWalletAccess && window.initWalletAccess();
    }
})();

// Funzione globale per gestire la connessione
window.initWalletAccess = function(options) {
    // options: { onConnect(address, signature), buttonId, redirectUrl }
    let provider = null;
    // Rileva se mobile
    function isMobile() {
        return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop|Mobile/i.test(navigator.userAgent);
    }
    // Solo MetaMask su desktop, MetaMask o WalletConnect su mobile
    let providerOptions = {};
    if (window.ethereum && window.ethereum.isMetaMask) {
        // MetaMask disponibile ovunque
        providerOptions = {};
    } else if (isMobile()) {
        providerOptions = {
            walletconnect: {
                package: window.WalletConnectProvider.default,
                options: {
                    rpc: { 1: 'https://mainnet.infura.io/v3/8b6e7e6e6e6e4e6e8e6e6e6e6e6e6e6e' },
                    chainId: 1
                }
            }
        };
    }
    let web3Modal = new window.Web3Modal.default({
        cacheProvider: false,
        providerOptions: providerOptions
    });
    async function connectWallet() {
        try {
            // Se MetaMask disponibile, usa direttamente
            if (window.ethereum && window.ethereum.isMetaMask) {
                provider = window.ethereum;
                let accounts = await provider.request({ method: 'eth_requestAccounts' });
                const address = accounts[0];
                localStorage.setItem('nyfurionWallet', address);
                // Firma un messaggio di login
                let msg = 'Login Nyfurion - ' + new Date().toISOString();
                let signature = await provider.request({
                    method: 'personal_sign',
                    params: [msg, address]
                });
                if (options && typeof options.onConnect === 'function') {
                    options.onConnect(address, signature);
                }
                // Aggiorna bottone
                updateButton(address);
                // Redirect se richiesto
                if (options && options.redirectUrl) {
                    window.location.href = options.redirectUrl;
                }
                return address;
            } else if (isMobile()) {
                // Su mobile, se non c'è MetaMask, prova WalletConnect
                provider = await web3Modal.connect();
                let accounts;
                if (provider.request) {
                    accounts = await provider.request({ method: 'eth_accounts' });
                    if (!accounts.length) {
                        accounts = await provider.request({ method: 'eth_requestAccounts' });
                    }
                } else if (provider.enable) {
                    accounts = await provider.enable();
                }
                if (accounts && accounts[0]) {
                    const address = accounts[0];
                    localStorage.setItem('nyfurionWallet', address);
                    let msg = 'Login Nyfurion - ' + new Date().toISOString();
                    let signature;
                    if (provider.request) {
                        signature = await provider.request({
                            method: 'personal_sign',
                            params: [msg, address]
                        });
                    } else if (provider.sendAsync) {
                        signature = await new Promise((resolve, reject) => {
                            provider.sendAsync({
                                method: 'personal_sign',
                                params: [msg, address],
                                from: address
                            }, (err, result) => {
                                if (err) reject(err);
                                else resolve(result.result);
                            });
                        });
                    }
                    if (options && typeof options.onConnect === 'function') {
                        options.onConnect(address, signature);
                    }
                    updateButton(address);
                    if (options && options.redirectUrl) {
                        // WalletConnect spesso apre una nuova webview: mostra messaggio se non si è nella pagina originale
                        if (window.location.href !== options.redirectUrl) {
                            // Mostra un messaggio con pulsante per tornare al sito
                            let overlay = document.createElement('div');
                            overlay.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;';
                            overlay.innerHTML = `
                                <div style="background:#222;padding:2em 1.5em;border-radius:18px;max-width:90vw;text-align:center;">
                                    <h2>Connessione completata!</h2>
                                    <p>Per continuare, torna alla pagina principale del sito.<br>Se vedi questo messaggio, premi il pulsante qui sotto:</p>
                                    <button id="nyfurion-redirect-btn" style="margin-top:1.2em;padding:0.7em 2em;background:#1bff6a;color:#181a22;font-family:Orbitron,sans-serif;font-size:1.1em;border:none;border-radius:10px;box-shadow:0 0 12px #00eaff;cursor:pointer;">Torna al sito</button>
                                </div>
                            `;
                            document.body.appendChild(overlay);
                            document.getElementById('nyfurion-redirect-btn').onclick = function() {
                                window.location.href = options.redirectUrl;
                            };
                        } else {
                            window.location.href = options.redirectUrl;
                        }
                    }
                    return address;
                } else {
                    alert('Connessione fallita.');
                }
            } else {
                alert('Installa MetaMask per continuare.');
                window.open('https://metamask.io/download/', '_blank');
            }
        } catch (e) {
            alert('Connessione annullata o fallita.');
        }
    }
    // Bottone
    let btn = document.getElementById(options && options.buttonId ? options.buttonId : 'connect-wallet-btn');
    function updateButton(address) {
        if (btn) {
            btn.innerText = address.slice(0,6)+'...'+address.slice(-4);
            btn.disabled = true;
            btn.style.opacity = 0.7;
        }
    }
    if (!btn) {
        btn = document.createElement('button');
        btn.id = options && options.buttonId ? options.buttonId : 'connect-wallet-btn';
        btn.innerText = 'Connetti Wallet';
        btn.style = 'position:fixed;top:18px;right:18px;z-index:9999;padding:0.7em 1.5em;background:#1bff6a;color:#181a22;font-family:Orbitron,sans-serif;font-size:1.1em;border:none;border-radius:10px;box-shadow:0 0 12px #00eaff;cursor:pointer;';
        document.body.appendChild(btn);
    }
    btn.onclick = connectWallet;
    // Se già connesso
    let saved = localStorage.getItem('nyfurionWallet');
    if (saved && (!btn.innerText.includes('...'))) {
        updateButton(saved);
    }
    // Espone funzione per uso manuale
    window.connectWallet = connectWallet;
};
