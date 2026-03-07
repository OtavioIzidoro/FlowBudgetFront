const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('electron-update-available', (_, version) => callback(version));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('electron-update-downloaded', (_, version) => callback(version));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('electron-update-error', (_, message) => callback(message));
  },
  quitAndInstall: () => ipcRenderer.invoke('electron-quit-and-install'),
});
