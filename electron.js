import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Notification,
  Tray,
  Menu
} from "electron";

import path from "node:path";
import { fileURLToPath } from "node:url";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = !app.isPackaged;

if (process.platform === "win32") {
  app.setAppUserModelId("live.salonflow.app");
}

let mainWindow;
let tray;
let isQuitting = false;
let updaterInitialized = false;

/**
 * Creates the main SalonFlow application window.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    show: false,
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDevelopment) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch((error) => {
      console.error("Unable to open external URL:", error);
    });

    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Brings the SalonFlow window to the front.
 */
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

/**
 * Configures automatic updates through GitHub Releases.
 *
 * This runs only in the packaged production application.
 */
function setupAutoUpdater() {
  if (updaterInitialized) {
    return;
  }

  updaterInitialized = true;

  if (!app.isPackaged) {
    console.log("Auto-updater skipped in development mode.");
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for SalonFlow updates...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`SalonFlow update available: ${info.version}`);
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log(`SalonFlow is up to date. Current version: ${info.version}`);
  });

  autoUpdater.on("download-progress", (progress) => {
    const percentage = Math.round(progress.percent || 0);
    console.log(`SalonFlow update download progress: ${percentage}%`);
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`SalonFlow ${info.version} is ready to install.`);

    if (!Notification.isSupported()) {
      return;
    }

    const updateNotification = new Notification({
      title: "SalonFlow update ready",
      body: `Version ${info.version} has been downloaded. It will install when SalonFlow closes.`,
      silent: false
    });

    updateNotification.on("click", () => {
      showMainWindow();
    });

    updateNotification.show();
  });

  autoUpdater.on("error", (error) => {
    console.error("SalonFlow auto-update error:", error);
  });

  // Give the application time to finish opening before checking.
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error("Unable to check for SalonFlow updates:", error);
    });
  }, 5000);
}

/**
 * Receives notification requests from the renderer process.
 */
ipcMain.on("show-notification", (_event, notificationData) => {
  if (!Notification.isSupported()) {
    console.log("System notifications are not supported.");
    return;
  }

  const title = notificationData?.title || "SalonFlow";
  const body =
    notificationData?.body || "You have a new SalonFlow notification.";

  const notification = new Notification({
    title,
    body,
    silent: false
  });

  notification.on("click", () => {
    showMainWindow();
  });

  notification.show();
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  /*
   * Development-only notification test.
   * This will not appear in the installed production application.
   */
  if (isDevelopment && Notification.isSupported()) {
    setTimeout(() => {
      const testNotification = new Notification({
        title: "SalonFlow",
        body: "Desktop notifications are working."
      });

      testNotification.on("show", () => {
        console.log("Notification displayed successfully.");
      });

      testNotification.on("failed", (_event, error) => {
        console.error("Notification failed:", error);
      });

      testNotification.show();
    }, 3000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showMainWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});