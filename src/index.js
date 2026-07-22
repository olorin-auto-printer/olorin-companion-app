const { app, BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");

const { createOptionsStore } = require("./options-store");
const { createRouter } = require("./router");
const { startServer, isOriginAllowed } = require("./server");
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
  });

  const router = createRouter({
    optionsStore,
    listPrinters,
    executePrint: (message) => pipeline.print(message),
  });

  try {
    await startServer({
      route: router.route,
      isOriginAllowed: (origin) => isOriginAllowed(origin, optionsStore.load().allowed_origins),
    });
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
