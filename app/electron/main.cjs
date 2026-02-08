const electron = require('electron');
const { app, BrowserWindow, ipcMain, desktopCapturer } = electron;
const path = require('path');
const fs = require('fs');
const windowsController = require('./robot-control.cjs');

// LOGGING SYSTEM
const logPath = path.join(app.getPath('userData'), 'logs.txt');
function log(message) {
    const time = new Date().toISOString();
    const logMessage = `[${time}] ${message}\n`;
    try {
        fs.appendFileSync(logPath, logMessage);
    } catch (e) {
        console.error("Log Error:", e);
    }
}

log("App Starting...");

// ROBOT CONTROL IPC HANDLER (Windows Native)
ipcMain.on('robot-control', async (event, data) => {
    console.log('[MAIN] 📥 Received robot-control:', data.type);
    log(`[MAIN] Received robot-control: ${data.type}`);
    try {
        // Fire and forget to avoid blocking UI
        windowsController.executeCommand(data).catch(e => log(`Robot command error: ${e.message}`));
    } catch (error) {
        log(`Robot control error: ${error.message}`);
    }
});

// UPnP - Simplificado (Pode travar startup)
// Removido da inicialização crítica

function createWindow() {
    try {
        log("Criando Janela...");
        const win = new BrowserWindow({
            width: 1000,
            height: 700,
            frame: false,
            transparent: false,
            backgroundColor: '#1a1a2e',
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        // Load React UI (built by Vite)
        const isDev = !app.isPackaged;
        if (isDev) {
            win.loadURL('http://localhost:5173');
        } else {
            win.loadFile(path.join(__dirname, '../dist/index.html'));
        }

        // Open DevTools for debugging (DISABLED FOR PRODUCTION)
        // win.webContents.openDevTools();

        log("Janela Criada!");
    } catch (e) {
        log(`Erro ao criar janela: ${e.message}`);
    }
}

// IPC: Screen Capture
ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    return sources;
});

// IPC: Window Controls
ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
});

ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
});

// IPC: Create Session Window
ipcMain.handle('create-session-window', async (event, targetId, password = '') => {
    try {
        log(`Creating session window for target: ${targetId}`);
        const sessionWin = new BrowserWindow({
            width: 1280,
            height: 720,
            frame: false,
            transparent: false,
            backgroundColor: '#000',
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        const isDev = !app.isPackaged;
        if (isDev) {
            sessionWin.loadURL(`http://localhost:5173?mode=session&target=${targetId}&password=${password || ''}`);
        } else {
            sessionWin.loadFile(path.join(__dirname, '../dist/index.html'), {
                query: { mode: 'session', target: targetId, password: password || '' }
            });
        }

        log("Session window created!");
        return { success: true };
    } catch (e) {
        log(`Error creating session window: ${e.message}`);
        return { success: false, error: e.message };
    }
});

app.whenReady().then(() => {
    log("App Ready!");
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
