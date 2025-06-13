// walletconnect-integration.js
// Script per abilitare la connessione a MetaMask Mobile tramite WalletConnect

// Carica WalletConnect e Web3Modal dinamicamente se non già presenti
let walletConnectScript = document.createElement('script');
walletConnectScript.src = 'https://unpkg.com/@walletconnect/web3-provider@1.8.0/dist/umd/index.min.js';
document.head.appendChild(walletConnectScript);

let web3ModalScript = document.createElement('script');
web3ModalScript.src = 'https://unpkg.com/web3modal@1.9.12/dist/index.js';
document.head.appendChild(web3ModalScript);

// Attendi che gli script siano caricati
walletConnectScript.onload = web3ModalScript.onload = function() {
    if (typeof Web3Modal === 'undefined' || typeof WalletConnectProvider === 'undefined') return;

    let provider = null;
    let web3Modal = new window.Web3Modal.default({
        cacheProvider: false,
        providerOptions: {
            walletconnect: {
                package: window.WalletConnectProvider.default,
                options: {
                    rpc: {
                        1: 'https://mainnet.infura.io/v3/8b6e7e6e6e6e4e6e8e6e6e6e6e6e6e6e', // Sostituisci con la tua chiave Infura se vuoi
                    },
                    chainId: 1
                }
            }
        }
    });

    async function onConnectWallet() {
        try {
            provider = await web3Modal.connect();
            // Richiedi account
            const accounts = provider.accounts || (await provider.request({ method: 'eth_accounts' })) || (provider.selectedAddress ? [provider.selectedAddress] : []);
            const account = accounts[0];
            if (!account) {
                alert('Nessun account trovato.');
                return;
            }
            // Messaggio da firmare
            const message = 'Conferma accesso a Nyfurion Club Prime';
            // Richiesta firma
            let signature;
            try {
                signature = await provider.request({
                    method: 'personal_sign',
                    params: [message, account],
                });
            } catch (e) {
                alert('Firma annullata. Accesso non consentito.');
                return;
            }
            // Se la firma va a buon fine, redirect
            alert('Accesso confermato! Benvenuto.');
            window.location.href = 'club-prime.html'; // Cambia qui per altre sezioni
        } catch (e) {
            alert('Connessione annullata o fallita.');
        }
    }

    // Aggiungi il pulsante se non esiste già
    if (!document.getElementById('connect-wallet-btn')) {
        let btn = document.createElement('button');
        btn.id = 'connect-wallet-btn';
        btn.innerText = 'Connetti Wallet';
        btn.style = 'position:fixed;top:18px;right:18px;z-index:9999;padding:0.7em 1.5em;background:#1bff6a;color:#181a22;font-family:Orbitron,sans-serif;font-size:1.1em;border:none;border-radius:10px;box-shadow:0 0 12px #00eaff;cursor:pointer;';
        btn.onclick = onConnectWallet;
        document.body.appendChild(btn);
    }
};
