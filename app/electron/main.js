const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Tray, Menu, clipboard } = require('electron');
const path = require('path');
const windowsController = require('./robot-control.cjs');

console.log('[MAIN] Initialized with robot-control.cjs');

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

ipcMain.handle('save-file', async (event, { filename, dataBase64 }) => {
    try {
        const downloadPath = app.getPath('downloads');
        const filePath = path.join(downloadPath, filename);

        // Ensure unique filename
        // Simple logic: if exists, prepend timestamp
        let finalPath = filePath;
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
            finalPath = path.join(downloadPath, `${Date.now()}_${filename}`);
        }

        const buffer = Buffer.from(dataBase64, 'base64');
        await require('fs').promises.writeFile(finalPath, buffer);
        console.log('[FILE] Saved to:', finalPath);

        // Notify user via tray or notification?
        if (tray) {
            tray.displayBalloon({
                title: 'Arquivo Recebido',
                content: `Salvo em Downloads: ${path.basename(finalPath)}`
            });
        }
        return { success: true, path: finalPath };
    } catch (e) {
        console.error('[FILE] Save error:', e);
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
