const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const path = require("path");
const log = require("electron-log/main");
const { updateElectronApp } = require("update-electron-app");

const { version } = require("../package.json");
const { createOptionsStore } = require("./options-store");
const { createRouter } = require("./router");
const { startServer, isOriginAllowed, DEFAULT_PORT } = require("./server");
const { createPrintPipeline } = require("./print-pipeline");
const { createRenderToPdf } = require("./render-to-pdf");
const { createBackend, createPrinterLister } = require("./printing");
const { createMainWindow } = require("./main-window");
const { createTray } = require("./tray");
const { buildMenu } = require("./menu");
const { notify } = require("./notify");

// Handle Squirrel install/update/uninstall events on Windows.
if (require("electron-squirrel-startup")) {
  app.quit();
}

log.initialize();
const logger = {
  log: (...args) => log.info(...args),
  warn: (...args) => log.warn(...args),
  error: (...args) => log.error(...args),
};

// Auto-update from GitHub Releases. Windows only until macOS builds are
// signed (unsigned apps cannot use the macOS auto-updater). An updater
// problem must never take the app down — printing is the job.
if (app.isPackaged && process.platform === "win32") {
  try {
    updateElectronApp({ logger: log });
  } catch (error) {
    log.error("Auto-update setup failed:", error);
  }
}

let mainWindow;
let tray; // eslint-disable-line no-unused-vars -- keeps the Tray from being garbage collected

function toggleWindow() {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
}

// Return a window whose webContents can answer getPrintersAsync(). The main
// window normally always exists (close only hides it); the temporary fallback
// covers the unexpected case.
function getPrinterQueryWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return { window: mainWindow, temporary: false };
  }
  return { window: new BrowserWindow({ show: false }), temporary: true };
}

function testSlipHtml(printerKey) {
  return (
    "<html><body style='font-family: sans-serif'>" +
    "<h2 style='margin: 0'>Olorin test print</h2>" +
    `<p style='margin: 4px 0'>Printer: ${printerKey}</p>` +
    `<p style='margin: 4px 0'>Time: ${new Date().toLocaleString()}</p>` +
    "</body></html>"
  );
}

async function initialize() {
  if (process.platform === "win32") {
    // Must match the Squirrel shortcut's AppUserModelId or toast
    // notifications won't appear on Windows.
    app.setAppUserModelId("com.squirrel.olorin_companion.olorin_companion");
  }

  mainWindow = createMainWindow({ isQuitting: () => app.isQuitting });

  Menu.setApplicationMenu(buildMenu({ onToggleWindow: toggleWindow }));

  tray = createTray({
    iconPath: path.join(__dirname, "tray-icon.png"),
    onOpen: () => mainWindow.show(),
    onQuit: () => {
      app.isQuitting = true;
      app.quit();
    },
  });

  const optionsStore = createOptionsStore({
    appPaths: {
      home: app.getPath("home"),
      appData: app.getPath("appData"),
      userData: app.getPath("userData"),
      sessionData: app.getPath("sessionData"),
    },
    logger,
  });

  const listPrinters = createPrinterLister({ getWindow: getPrinterQueryWindow });

  const backend = createBackend({
    isPackaged: app.isPackaged,
    appRoot: path.join(__dirname, ".."),
  });

  const renderToPdf = createRenderToPdf({
    BrowserWindow,
    tempDir: app.getPath("temp"),
  });

  const pipeline = createPrintPipeline({
    optionsStore,
    listPrinters,
    renderToPdf,
    backend,
    tempDir: app.getPath("temp"),
    notify,
    onJob: (job) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("olorin:job", job);
      }
    },
    logger,
  });

  const router = createRouter({
    optionsStore,
    listPrinters,
    executePrint: (message) => pipeline.print(message),
    executeKick: (message) => pipeline.kickDrawer(message),
    version,
    logger,
  });

  let serverPort = null;

  // IPC for the app's own window (settings editor, test prints, job log).
  // Unlike the WebSocket, this surface may edit allowed_origins.
  ipcMain.handle("olorin:get-status", () => ({
    version,
    port: serverPort,
    running: serverPort !== null,
    optionsPath: optionsStore.resolvePath(),
    platform: process.platform,
  }));
  ipcMain.handle("olorin:list-printers", () => listPrinters());
  ipcMain.handle("olorin:get-options", () => optionsStore.load());
  ipcMain.handle("olorin:set-options", (event, options) => {
    if (!options || typeof options !== "object") {
      throw new Error("Options must be an object");
    }
    optionsStore.save(options);
    return { success: true };
  });
  ipcMain.handle("olorin:get-recent-jobs", () => pipeline.getRecentJobs());
  ipcMain.handle("olorin:test-print", async (event, printerKey) => {
    try {
      const result = await pipeline.print({
        content: testSlipHtml(printerKey),
        printer: printerKey,
      });
      return { success: true, printer: result.printer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("olorin:kick-drawer", async (event, printerKey) => {
    try {
      const result = await pipeline.kickDrawer({ printer: printerKey });
      return { success: true, printer: result.printer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  try {
    const server = await startServer({
      route: router.route,
      isOriginAllowed: (origin) => isOriginAllowed(origin, optionsStore.load().allowed_origins),
      logger,
    });
    serverPort = server.port;
  } catch (error) {
    dialog.showErrorBox(
      "Olorin Companion",
      `Could not start the print server: ${error.message}\n\n` +
        "Another copy of Olorin Companion may already be running.",
    );
    app.isQuitting = true;
    app.quit();
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  app.whenReady().then(initialize);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // The window is hidden rather than destroyed, so just re-show it.
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });
}

module.exports = { DEFAULT_PORT };
