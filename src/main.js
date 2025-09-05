const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;
let settingsPath;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false
  });

  // Load the app
  mainWindow.loadFile('src/index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('open-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize settings path
function initializeSettings() {
  const userDataPath = app.getPath('userData');
  settingsPath = path.join(userDataPath, 'settings.json');
  
  // Create default settings if file doesn't exist
  if (!fs.existsSync(settingsPath)) {
    const defaultSettings = {
      apiKey: '',
      savedSearches: [],
      folders: [],
      savedNews: {},
      preferences: {
        defaultCountry: 'us',
        defaultLanguage: 'en',
        theme: 'light'
      }
    };
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
  }
}

// IPC handlers
ipcMain.handle('get-settings', () => {
  try {
    const settings = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(settings);
  } catch (error) {
    console.error('Error reading settings:', error);
    return null;
  }
});

ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
});

ipcMain.handle('show-error-dialog', (event, title, content) => {
  dialog.showErrorBox(title, content);
});

ipcMain.handle('show-message-dialog', (event, options) => {
  return dialog.showMessageBox(mainWindow, options);
});

// Read asset text (secure, limited to assets folder)
ipcMain.handle('read-asset-text', (event, relativePath) => {
  try {
    const base = path.join(__dirname, '..', 'assets');
    const fullPath = path.join(base, relativePath || '');
    // Ensure the path stays within assets directory
    const normalized = path.normalize(fullPath);
    if (!normalized.startsWith(base)) {
      throw new Error('Invalid path');
    }
    return fs.readFileSync(normalized, 'utf8');
  } catch (err) {
    console.error('Error reading asset text:', err);
    return '';
  }
});

// Open external links in default browser
ipcMain.handle('open-external', (event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    return shell.openExternal(url);
  }
  return false;
});

// App event handlers
app.whenReady().then(() => {
  initializeSettings();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});
