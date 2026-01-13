console.log('Electron process version:', process.versions.electron);
console.log('Electron export keys:', Object.keys(require('electron')));
const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load valid hashes
const VALID_HASHES_PATH = path.join(__dirname, 'valid_hashes.json');
let validHashes = [];
try {
    if (fs.existsSync(VALID_HASHES_PATH)) {
        validHashes = JSON.parse(fs.readFileSync(VALID_HASHES_PATH, 'utf8'));
    } else {
        console.error('valid_hashes.json not found!');
    }
} catch (e) {
    console.error('Error loading valid hashes:', e);
}

// User data file to store activation status
let USER_DATA_FILE;

function getUserDataPath() {
    if (!USER_DATA_FILE) {
        USER_DATA_FILE = path.join(app.getPath('userData'), 'activation.json');
    }
    return USER_DATA_FILE;
}

// Check if app is activated
function isActivated() {
    try {
        const filePath = getUserDataPath();
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return data.activated === true;
        }
    } catch (e) {
        console.error('Error reading activation status:', e);
    }
    return false;
}

function saveActivation(codeHash) {
    try {
        const filePath = getUserDataPath();
        fs.writeFileSync(filePath, JSON.stringify({
            activated: true,
            activationDate: new Date().toISOString(),
            codeHash: codeHash
        }));
        return true;
    } catch (e) {
        console.error('Error saving activation status:', e);
        return false;
    }
}

function createActivationWindow() {
    activationWindow = new BrowserWindow({
        width: 400,
        height: 300,
        resizable: false,
        title: "Activation",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    activationWindow.loadFile('activation.html');
    activationWindow.on('closed', () => {
        activationWindow = null;
    });
}

function createMainWindow() {
    // Get display dimensions to position the widget initially
    const { width } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 220,
        height: 40,
        x: width - 240, // Initial position: Top Right
        y: 50,
        frame: false,       // Frameless
        transparent: true,  // Transparent background
        alwaysOnTop: true,  // Floats on top
        resizable: false,
        skipTaskbar: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Helpful for avoiding some CORS issues in local widgets
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC handler for activation attempt
ipcMain.on('try-activate', (event, code) => {
    // Normalize code: uppercase and trim
    const normalizedCode = (code || '').trim().toUpperCase();

    // Hash the input code
    const hash = crypto.createHash('sha256').update(normalizedCode).digest('hex');

    if (validHashes.includes(hash)) {
        // Valid code
        if (saveActivation(hash)) {
            // Close activation window and open main window
            if (activationWindow) {
                activationWindow.close();
            }
            createMainWindow();
        } else {
            event.reply('activation-failed', 'Error saving activation status (write permission?).');
        }
    } else {
        event.reply('activation-failed', 'Invalid activation code.');
    }
});

// Resizing for settings
ipcMain.on('resize-window', (event, { width, height }) => {
    if (mainWindow) {
        mainWindow.setSize(width, height);
    }
});

app.whenReady().then(() => {
    if (isActivated()) {
        createMainWindow();
    } else {
        createActivationWindow();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            if (isActivated()) {
                createMainWindow();
            } else {
                createActivationWindow();
            }
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
