const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Screen Capture
    getSources: () => ipcRenderer.invoke('get-sources'),

    // Remote Control (receives commands via Data Channel and executes locally)
    robotControl: (command) => ipcRenderer.send('robot-control', command),

    // Window Management
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close'),
    createSessionWindow: (targetId, password) => ipcRenderer.send('create-session-window', { targetId, password }),

    // Generic IPC
    on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
    send: (channel, data) => ipcRenderer.send(channel, data)
});
