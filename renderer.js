const { ipcRenderer } = require('electron');

const API_URL = 'https://api.gateio.ws/api/v4/spot/tickers';

// DOM Elements
const singlePairContainer = document.getElementById('single-pair-container');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsList = document.getElementById('settings-list');
const newCoinInput = document.getElementById('new-coin-input');
const addCoinBtn = document.getElementById('add-coin-btn');

// State
let pairs = [];
let prices = {}; // Store prices: { 'BTC_USDT': 95000, ... }
let currentIndex = 0;
let cycleInterval;

// --- Initialization ---
function init() {
    loadSettings();
    fetchPrices(); // Initial fetch

    // Start cycling
    showNextPair();
    // Clear any existing interval if we re-init
    if (cycleInterval) clearInterval(cycleInterval);
    cycleInterval = setInterval(showNextPair, 3000); // Cycle every 3 seconds

    // Fetch prices every 5s
    setInterval(fetchPrices, 5000);

    // Event Listeners
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    addCoinBtn.addEventListener('click', addNewCoin);
    newCoinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNewCoin();
    });
}

function loadSettings() {
    const saved = localStorage.getItem('crypto_pairs');
    if (saved) {
        pairs = JSON.parse(saved);
    } else {
        pairs = ['BTC_USDT', 'ETH_USDT', 'LTC_USDT', 'DOGE_USDT'];
        saveSettings();
    }
}

function saveSettings() {
    localStorage.setItem('crypto_pairs', JSON.stringify(pairs));
    // Reset cycle
    currentIndex = 0;
    showNextPair();
}

// --- UI Rendering ---

function showNextPair() {
    if (!singlePairContainer) return;

    if (pairs.length === 0) {
        singlePairContainer.innerHTML = '<span class="loading-text">No coins</span>';
        return;
    }

    const pair = pairs[currentIndex];
    const symbol = pair.split('_')[0];
    const price = prices[pair];

    // Format price
    let priceDisplay = '---';
    if (price !== undefined) {
        priceDisplay = `$${price < 1 ? price : parseFloat(price).toFixed(2)}`;
    }

    // Use a fade-in animation by re-creating the specific element or adding a class
    // We replace innerHTML to trigger the CSS animation on the new .pair-item
    singlePairContainer.innerHTML = `
        <div class="pair-item">
            <span class="ticker-symbol">${symbol}</span>
            <span class="ticker-price">${priceDisplay}</span>
        </div>
    `;

    // Advance index
    currentIndex = (currentIndex + 1) % pairs.length;
}

function renderSettingsList() {
    settingsList.innerHTML = '';
    pairs.forEach(pair => {
        const symbol = pair.split('_')[0];
        const item = document.createElement('div');
        item.className = 'setting-item';
        item.innerHTML = `
            <span>${symbol}</span>
            <span class="remove-btn" onclick="removeCoin('${pair}')">✕</span>
        `;
        settingsList.appendChild(item);
    });
}

// --- Settings Logic ---

function openSettings() {
    renderSettingsList();
    ipcRenderer.send('resize-window', { width: 400, height: 300 });
    settingsModal.style.display = 'flex';
}

function closeSettings() {
    settingsModal.style.display = 'none';
    ipcRenderer.send('resize-window', { width: 220, height: 40 });
}

function addNewCoin() {
    const symbol = newCoinInput.value.trim().toUpperCase();
    if (!symbol) return;

    const pair = symbol.includes('_') ? symbol : `${symbol}_USDT`;

    if (!pairs.includes(pair)) {
        pairs.push(pair);
        saveSettings();
        renderSettingsList();
        newCoinInput.value = '';
        fetchPrices(); // Fetch immediately for new coin
    }
}

window.removeCoin = function (pair) {
    pairs = pairs.filter(p => p !== pair);
    if (pairs.length === 0) currentIndex = 0; // Reset index safety
    saveSettings();
    renderSettingsList();
};

// --- Data Fetching ---

async function fetchPrices() {
    if (pairs.length === 0) return;

    try {
        const responses = await Promise.all(pairs.map(pair =>
            fetch(`${API_URL}?currency_pair=${pair}`).then(res => res.json())
        ));

        responses.forEach(data => {
            if (data && data[0]) {
                prices[data[0].currency_pair] = data[0].last;
            }
        });
    } catch (error) {
        console.error('Error fetching prices from Gate.io:', error);
    }
}

// We don't need updatePrice anymore because showNextPair handles rendering 
// BUT we might want to update the CURRENTLY displayed price if it changes while visible?
// For simplicity, we just rely on the cycle (every 3s) or the fetch interval (every 5s) 
// to eventually update it. Given the cycle is fast (3s), it will likely update on next show.
// If we want real-time updates while it's showing, we can check if the currently displayed pair matches the updated one.
// Let's keep it simple for now.

// Start
init();
