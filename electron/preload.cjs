const { contextBridge, ipcRenderer } = require('electron');

function bindRendererEvent(channel, callback) {
  const listener = (_, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  onUpdateAvailable: (callback) => bindRendererEvent('electron-update-available', callback),
  onUpdateNotAvailable: (callback) => bindRendererEvent('electron-update-not-available', callback),
  onUpdateDownloaded: (callback) => bindRendererEvent('electron-update-downloaded', callback),
  onUpdateError: (callback) => bindRendererEvent('electron-update-error', callback),
  checkForUpdates: () => ipcRenderer.invoke('electron-check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('electron-quit-and-install'),
  showNotification: (payload) => ipcRenderer.invoke('electron-show-notification', payload),
  getRememberedLogin: () => ipcRenderer.invoke('electron-get-remembered-login'),
  saveRememberedLogin: (payload) => ipcRenderer.invoke('electron-save-remembered-login', payload),
  clearRememberedLogin: () => ipcRenderer.invoke('electron-clear-remembered-login'),
});
