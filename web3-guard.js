let web3;
let provider;
let isWalletConnected = false;

function showOverlay() {
    if (!isWalletConnected) {
        const overlay = document.getElementById('wallet-block-overlay');
        if (overlay) overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideOverlay() {
    const overlay = document.getElementById('wallet-block-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

async function connectWallet() {
    // Prova MetaMask
    if (window.ethereum) {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            isWalletConnected = true;
            hideOverlay();
        } catch (e) {
            alert('Connessione wallet fallita o rifiutata.');
        }
    } else {
        // Prova WalletConnect
        provider = new window.WalletConnectProvider.default({
            rpc: {
                1: "https://mainnet.infura.io/v3/",
                56: "https://bsc-dataseed.binance.org/"
            }
        });
        try {
            await provider.enable();
            web3 = new Web3(provider);
            isWalletConnected = true;
            hideOverlay();
        } catch (e) {
            alert('Connessione wallet fallita o rifiutata.');
        }
    }
}

function isMetaMaskConnected() {
    // Controlla se MetaMask è installato e almeno un account è connesso
    return window.ethereum && Array.isArray(window.ethereum.selectedAddress ? [window.ethereum.selectedAddress] : window.ethereum._state?.accounts) &&
        (
            (window.ethereum.selectedAddress && window.ethereum.selectedAddress !== "") ||
            (window.ethereum._state?.accounts && window.ethereum._state.accounts.length > 0)
        );
}

function isWalletConnectConnected() {
    // Controlla se WalletConnect ha almeno un account connesso
    return provider && Array.isArray(provider.accounts) && provider.accounts.length > 0;
}

function checkWalletConnection() {
    if (isMetaMaskConnected() || isWalletConnectConnected()) {
        if (!isWalletConnected) {
            isWalletConnected = true;
            hideOverlay();
        }
    } else {
        if (!isWalletConnected) {
            showOverlay();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Overlay sempre visibile finché non connesso
    // Mostra overlay solo se wallet non collegato
    checkWalletConnection();
    document.getElementById('connect-wallet-btn').onclick = connectWallet;
    setInterval(() => {
        // Non mostrare più l'overlay se già collegato
        if (!isWalletConnected) checkWalletConnection();
    }, 2000);
});
