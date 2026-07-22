const { Tray, Menu } = require("electron");

function createTray({ iconPath, onOpen, onQuit }) {
  const tray = new Tray(iconPath);

  tray.setToolTip("Olorin Companion");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open", click: onOpen },
      { label: "Quit", click: onQuit },
    ]),
  );

  tray.on("click", onOpen);

  return tray;
}

module.exports = { createTray };
