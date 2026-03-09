const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev =
  !app.isPackaged &&
  (process.env.NODE_ENV !== 'production' || process.env.ELECTRON_DEV);

let mainWindow = null;
let localServer = null;
let localServerUrl = null;
const LOCAL_APP_HOST = 'localhost';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function resolveDistFilePath(requestUrl) {
  const distDir = path.join(__dirname, '../dist');
  const indexPath = path.join(distDir, 'index.html');
  const parsedUrl = new URL(requestUrl, `http://${LOCAL_APP_HOST}`);
  const normalizedPath = decodeURIComponent(parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname);
  const relativePath = normalizedPath.replace(/^\/+/, '');
  const candidatePath = path.normalize(path.join(distDir, relativePath));

  if (!candidatePath.startsWith(distDir)) {
    return indexPath;
  }

  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return candidatePath;
  }

  return indexPath;
}

function startLocalServer() {
  if (isDev) {
    return Promise.resolve('http://localhost:5173');
  }

  if (localServerUrl) {
    return Promise.resolve(localServerUrl);
  }

  const indexPath = path.join(__dirname, '../dist/index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('Build do frontend não encontrado em dist/index.html.');
  }

  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      try {
        const filePath = resolveDistFilePath(req.url || '/');
        const extension = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[extension] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
    });

    localServer.once('error', reject);
    localServer.listen(0, LOCAL_APP_HOST, () => {
      const address = localServer.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Não foi possível iniciar o servidor local do aplicativo.'));
        return;
      }
      localServerUrl = `http://${LOCAL_APP_HOST}:${address.port}`;
      resolve(localServerUrl);
    });
  });
}

async function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/assets/logo.png')
    : path.join(__dirname, '../dist/assets/logo.png');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'FlowBudget  Smart Financial Control',
  });

  const appUrl = await startLocalServer();
  await mainWindow.loadURL(appUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  if (isDev) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('electron-update-available', info.version);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('electron-update-downloaded', info.version);
    }
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('electron-update-error', err.message);
    }
  });

  ipcMain.handle('electron-quit-and-install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 1000 * 60 * 60 * 4);
}

app.whenReady().then(async () => {
  await createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (localServer) {
    localServer.close();
    localServer = null;
    localServerUrl = null;
  }
});
