const { Menu } = require("electron");

// The Toggle Window accelerator replaces electron-localshortcut, which only
// ever fired while the window was focused anyway — a menu accelerator has the
// same effective scope with no extra dependency.
function buildMenu({ onToggleWindow }) {
  const template = [
    {
      label: "Window",
      submenu: [
        {
          label: "Toggle Window",
          accelerator: "CommandOrControl+Shift+M",
          click: onToggleWindow,
        },
        { type: "separator" },
        { role: "minimize" },
        { role: "close" },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
