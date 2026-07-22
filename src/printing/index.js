const sumatra = require("./sumatra");
const cups = require("./cups");

// Select the platform print backend. Strict equality matters: the old code
// used platform.includes("win"), which also matches "darwin".
function createBackend({ platform = process.platform, isPackaged = false, appRoot } = {}) {
  if (platform === "win32") {
    const sumatraPath = sumatra.resolveSumatraPath({ isPackaged, appRoot });
    return { print: (job) => sumatra.print({ ...job, sumatraPath }) };
  }

  return { print: (job) => cups.print(job) };
}

// Printer enumeration via Electron's webContents.getPrintersAsync(), which
// replaces the abandoned native 'printer' module. getWindow() returns
// { window, temporary }; temporary windows are destroyed after the query.
function createPrinterLister({ getWindow }) {
  return async function listPrinters() {
    const { window, temporary } = getWindow();
    try {
      return await window.webContents.getPrintersAsync();
    } finally {
      if (temporary) {
        window.destroy();
      }
    }
  };
}

module.exports = { createBackend, createPrinterLister };
