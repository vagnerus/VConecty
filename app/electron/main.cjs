const electron = require('electron');
const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = electron;
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const fs = require('fs');

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

// Inicializa o Servidor de Sinalização Embutido
let io;
let server;
let publicIpAddress = 'Buscando...';

async function startEmbeddedServer() {
    try {
        log("Iniciando Servidor Embutido...");
        const expressApp = express();
        expressApp.use(cors());
        server = http.createServer(expressApp);
        io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', (socket) => {
            socket.on('join-host', (room) => {
                socket.join(room);
                log(`Socket ${socket.id} entrou na sala ${room}`);
            });
            socket.on('offer', (data) => socket.to(data.target).emit('offer', data));
            socket.on('answer', (data) => socket.to(data.target).emit('answer', data));
            socket.on('ice-candidate', (data) => socket.to(data.target).emit('ice-candidate', data));
            socket.on('host-init', (data) => {
                log(`Host registrado: ${data.publicKey ? '(com chave)' : ''}`);
            });
            socket.on('client-connect', (data) => {
                io.emit('incoming-connection', data);
            });
        });

        server.on('error', (e) => {
            log(`Erro no Servidor: ${e.message}`);
            if (e.code === 'EADDRINUSE') {
                dialog.showErrorBox(
                    'Erro de Porta',
                    'A porta 3000 já está em uso. Feche outros processos do VConectY.'
                );
                app.quit();
            }
        });

        server.listen(3000, '0.0.0.0', () => {
            log('Servidor rodando na porta 3000');
        });

        // Função Local IP
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    publicIpAddress = net.address;
                    log(`IP Local Definido: ${publicIpAddress}`);
                    return;
                }
            }
        }
        publicIpAddress = '127.0.0.1';

    } catch (err) {
        log(`CRITICAL SERVER ERROR: ${err.message}`);
    }
}

// Firewall
const sudo = require('sudo-prompt');
ipcMain.handle('request-firewall-access', async () => {
    return new Promise((resolve) => {
        const command = `netsh advfirewall firewall add rule name="VConectY Port 3000" dir=in action=allow protocol=TCP localport=3000`;
        sudo.exec(command, { name: 'VConectY' }, (error) => {
            resolve(!error);
        });
    });
});

// UPnP - Simplificado (Pode travar startup)
// Removido da inicialização crítica

function createWindow() {
    try {
        log("Criando Janela...");
        const win = new BrowserWindow({
            width: 1000,
            height: 700,
            frame: false, // Voltando ao design sem bordas
            transparent: false, // Mantendo opaco para garantir visibilidade
            backgroundColor: '#1E1E2E',
            show: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false
            }
        });

        win.once('ready-to-show', () => {
            log("Janela pronta para mostrar");
            win.show();
        });

        const isDev = !app.isPackaged;
        if (isDev) {
            win.loadURL('http://localhost:5173');
        } else {
            const indexPath = path.join(__dirname, '../dist/index.html');
            log(`Carregando arquivo: ${indexPath}`);
            win.loadFile(indexPath).catch(e => log(`Erro ao carregar URL: ${e.message}`));
        }
    } catch (e) {
        log(`Erro ao criar janela: ${e.message}`);
    }
}

// Desabilita Aceleração de Hardware
app.disableHardwareAcceleration();

app.whenReady().then(() => {
    log("App Ready");
    startEmbeddedServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-sources', async () => {
    // Retorna TODAS as fontes de tela disponíveis sem filtro
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources.map(source => ({
        id: source.id,
        name: source.name,
        // thumbnail: source.thumbnail.toDataURL() // Opcional: só se precisar de preview
    }));
});

ipcMain.handle('get-public-ip', () => publicIpAddress);
ipcMain.handle('refresh-ip', async () => { return publicIpAddress; }); // Simplificado para teste

// Window Controls
ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
});

ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
});

// Multi-Window Session
ipcMain.handle('create-session-window', (event, targetId) => {
    const sessionWin = new BrowserWindow({
        width: 1280,
        height: 720,
        title: `Sessão Remota - ${targetId}`,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    const isDev = !app.isPackaged;
    const loadUrl = isDev
        ? `http://localhost:5173?mode=session&target=${targetId}`
        : `file://${path.join(__dirname, '../dist/index.html')}?mode=session&target=${targetId}`;

    sessionWin.loadURL(loadUrl);
});
