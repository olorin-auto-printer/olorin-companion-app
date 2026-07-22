const { BrowserWindow } = require("electron");
const path = require("path");

// The main window is informational only; the app lives in the tray, so close
// and minimize hide the window instead of destroying it.
function createMainWindow({ isQuitting }) {
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: true,
    icon: path.join(__dirname, "icon.png"),
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
