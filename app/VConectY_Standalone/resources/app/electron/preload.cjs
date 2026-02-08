const electron = require('electron');
const { contextBridge, ipcRenderer } = electron;

contextBridge.exposeInMainWorld('electronAPI', {
    getSources: () => ipcRenderer.invoke('get-sources'),
    getPublicIp: () => ipcRenderer.invoke('get-public-ip'),
    refreshIp: () => ipcRenderer.invoke('refresh-ip'),
    requestFirewallAccess: () => ipcRenderer.invoke('request-firewall-access'),
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close'),
    on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
    send: (channel, data) => ipcRenderer.send(channel, data),
    createSessionWindow: (targetId, password) => ipcRenderer.invoke('create-session-window', targetId, password),
    robotControl: (data) => ipcRenderer.invoke('robot-control', data)
});
