/**
 * VConectY - Processo Principal (Electron)
 * Desenvolvido por: 100% Vagner Oliveira ~ FlasH
 * Copyright (c) 2026
 */
const { app, BrowserWindow, ipcMain, desktopCapturer, shell, clipboard, dialog } = require('electron');
const path = require('path');
const windowsController = require('./robot-control.cjs');

const os = require('os');
const crypto = require('crypto');
const fs = require('fs');

console.log('[MAIN] Initialized with robot-control.cjs');

// --- LICENSING SYSTEM ---
const SECRET_KEY = "VCONECTY_SECRET_MASTER_KEY_2026";
const LICENSE_FILE = path.join(app.getPath('userData'), 'vconecty.lic');

class LicenseManager {
    constructor() {
        this.status = this.loadLicense();
    }

    getHardwareId() {
        const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'unk'}`;
        return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase().substring(0, 16);
    }

    generateSerial(hwid) {
        // HMAC-SHA256 signature of HWID using Secret
        const hmac = crypto.createHmac('sha256', SECRET_KEY);
        hmac.update(hwid);
        const signature = hmac.digest('hex').toUpperCase();
        // Format: AAAA-BBBB-CCCC-DDDD
        return `${signature.substring(0, 4)}-${signature.substring(4, 8)}-${signature.substring(8, 12)}-${signature.substring(12, 16)}`;
    }

    loadLicense() {
        try {
            if (fs.existsSync(LICENSE_FILE)) {
                const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
                return data;
            }
        } catch (e) {
            console.error('[LICENSE] Error loading:', e);
        }
        // New Trial
        return {
            type: 'trial',
            startDate: Date.now(),
            activated: false
        };
    }

    saveLicense(status) {
        fs.writeFileSync(LICENSE_FILE, JSON.stringify(status));
    }

    validate() {
        if (this.status.activated) return { valid: true, type: 'pro' };

        // Trial Check (3 Days = 259200000 ms)
        const elapsed = Date.now() - this.status.startDate;
        const remaining = 259200000 - elapsed;

        if (remaining > 0) {
            return { valid: true, type: 'trial', remainingHours: Math.ceil(remaining / 3600000) };
        } else {
            return { valid: false, type: 'expired' };
        }
    }

    activate(serial) {
        const hwid = this.getHardwareId();
        const expected = this.generateSerial(hwid);
        if (serial === expected) {
            this.status.activated = true;
            this.status.type = 'pro';
            this.saveLicense(this.status);
            return true;
        }
        return false;
    }
}

const licenseMgr = new LicenseManager();

// License IPC
ipcMain.handle('license-status', () => {
    const status = licenseMgr.validate();
    return {
        ...status,
        hwid: licenseMgr.getHardwareId()
    };
});

ipcMain.handle('license-activate', (event, serial) => {
    return licenseMgr.activate(serial);
});

let tray = null;
let mainWindow = null;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    mainWindow = win;

    // Force DevTools for debugging (DISABLED FOR PRODUCTION)
    // win.webContents.openDevTools();

    // In development, load from Vite dev server
    // In production, load from built files
    const isDev = !app.isPackaged;
    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Minmize to Tray logic
    win.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            win.hide();
            if (tray) {
                tray.displayBalloon({
                    title: 'VConectY',
                    content: 'O aplicativo continua rodando em segundo plano.'
                });
            }
        }
        return false;
    });

    return win;
}

process.on('uncaughtException', (error) => {
    const { dialog } = require('electron');
    dialog.showErrorBox('Erro Crítico na Inicialização', error.stack || error.toString());
});

app.whenReady().then(() => {
    createWindow();

    // System Tray Setup
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Abrir VConectY',
            click: () => {
                if (mainWindow) mainWindow.show();
            }
        },
        {
            label: 'Sair',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('VConectY Global');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
            }
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Do not quit, keep in tray
    }
});

// IPC Handlers for Desktop Capture
ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
    return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
    }));
});

// ========== REMOTE CONTROL HANDLERS ==========

ipcMain.on('robot-control', async (event, data) => {
    console.log('[MAIN] 📥 Received robot-control:', data.type);
    try {
        windowsController.executeCommand(data).catch(e => console.error(`Robot error: ${e.message}`));
    } catch (error) {
        console.error(`Robot control error: ${error.message}`);
    }
});

// Map JavaScript key names to robotjs key names
function mapKey(key) {
    const keyMap = {
        'Enter': 'enter',
        'Backspace': 'backspace',
        'Tab': 'tab',
        'Escape': 'escape',
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'Delete': 'delete',
        'Home': 'home',
        'End': 'end',
        'PageUp': 'pageup',
        'PageDown': 'pagedown',
        ' ': 'space'
    };

    return keyMap[key] || key;
}



// ========== CLIPBOARD SYNC HANDLERS ==========

ipcMain.handle('read-clipboard', () => {
    return clipboard.readText();
});

ipcMain.handle('write-clipboard', (event, text) => {
    clipboard.writeText(text);
    return true;
});

// ========== FILE TRANSFER HANDLERS ==========

// ========== FILE TRANSFER STREAMING HANDLERS ==========
// Using a simple in-memory map for open write streams
const openFileStreams = new Map();

ipcMain.handle('file-start', async (event, { filename, size }) => {
    try {
        const downloadPath = app.getPath('downloads');
        let finalPath = path.join(downloadPath, filename);
        const fs = require('fs');

        // Ensure unique filename
        if (fs.existsSync(finalPath)) {
            finalPath = path.join(downloadPath, `${Date.now()}_${filename}`);
        }

        const stream = fs.createWriteStream(finalPath);
        const fileId = Date.now().toString(); // Simple ID

        openFileStreams.set(fileId, { stream, path: finalPath });

        console.log(`[FILE] Started stream: ${finalPath} (ID: ${fileId})`);
        return { success: true, fileId };
    } catch (e) {
        console.error('[FILE] Start error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('file-chunk', async (event, { fileId, chunkBase64 }) => {
    try {
        const fileData = openFileStreams.get(fileId);
        if (!fileData) return { success: false, error: 'File stream not found' };

        const buffer = Buffer.from(chunkBase64, 'base64');
        const canWrite = fileData.stream.write(buffer);
        return { success: true };
    } catch (e) {
        console.error('[FILE] Chunk error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('file-close', async (event, { fileId }) => {
    try {
        const fileData = openFileStreams.get(fileId);
        if (!fileData) return { success: false, error: 'File stream not found' };

        fileData.stream.end();
        openFileStreams.delete(fileId);

        console.log(`[FILE] Completed: ${fileData.path}`);

        if (tray) {
            tray.displayBalloon({
                title: 'Arquivo Recebido',
                content: `Salvo em Downloads: ${path.basename(fileData.path)}`
            });
        }
        return { success: true, path: fileData.path };
    } catch (e) {
        console.error('[FILE] Close error:', e);
        return { success: false, error: e.message };
    }
});


// ========== WINDOW MANAGEMENT ==========

ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
});

ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        // If main window, hide to tray. If session window, verify logic.
        // Usually window-close is called from TitleBar, which targets the main window.
        // For session window, we might want to actually close it.
        // Checking if it's the main window by comparing IDs or similar is best,
        // but for now, if it has the title bar (main UI), let's hide it.
        // NOTE: Our previous close handler is on 'close' event.
        // calling win.close() triggers the 'close' event handler which handles headers.
        win.close();
    }
});

ipcMain.on('create-session-window', (event, { targetId, password }) => {
    const sessionWin = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    const isDev = !app.isPackaged;
    const baseUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`;
    const url = `${baseUrl}?mode=session&target=${encodeURIComponent(targetId)}&password=${encodeURIComponent(password)}`;

    sessionWin.loadURL(url);

    if (isDev) {
        sessionWin.webContents.openDevTools();
    }

    // Session windows should close normally
    sessionWin.on('close', () => {
        // No special tray logic for session windows, just let them close
    });
});
