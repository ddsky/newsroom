const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Dialog
  showErrorDialog: (title, content) => ipcRenderer.invoke('show-error-dialog', title, content),
  showMessageDialog: (options) => ipcRenderer.invoke('show-message-dialog', options),
  
  // Files
  readAssetText: (relativePath) => ipcRenderer.invoke('read-asset-text', relativePath),

  // Events
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // External
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
