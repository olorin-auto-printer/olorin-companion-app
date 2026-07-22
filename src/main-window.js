const { BrowserWindow } = require("electron");
const path = require("path");

// The main window is informational only; the app lives in the tray, so close
// and minimize hide the window instead of destroying it.
function createMainWindow({ isQuitting }) {
  const mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    show: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

module.exports = { createMainWindow };
