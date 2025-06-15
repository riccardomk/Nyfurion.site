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
            // Puoi ora usare provider con ethers.js o web3.js
            alert('Wallet connesso!');
        } catch (e) {
            alert('Connessione annullata o fallita.');
        }
    }
};
