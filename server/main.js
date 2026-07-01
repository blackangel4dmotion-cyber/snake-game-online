const { app, BrowserWindow } = require('electron');
const path = require('path');

// Start the Express server
require('./index.js');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "Snake & Ladder LAN",
    icon: path.join(__dirname, '../client/public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove the default menu bar
  win.setMenuBarVisibility(false);

  // Load the local server
  win.loadURL('http://localhost:3001');
}

app.whenReady().then(() => {
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
