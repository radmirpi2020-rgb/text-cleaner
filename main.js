'use strict';

const { app, BrowserWindow, session } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'clipboard-read' || permission === 'clipboard-sanitized-write');
  });

  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 480,
    minHeight: 560,
    autoHideMenuBar: true,
    backgroundColor: '#f4f5fa',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile('index.html');
});

app.on('window-all-closed', () => {
  app.quit();
});