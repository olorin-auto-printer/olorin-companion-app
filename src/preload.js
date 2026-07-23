const { contextBridge, ipcRenderer } = require("electron");

// Typed bridge for the app's own window. The renderer runs sandboxed with
// context isolation; this is its only capability surface.
contextBridge.exposeInMainWorld("olorin", {
  getStatus: () => ipcRenderer.invoke("olorin:get-status"),
  listPrinters: () => ipcRenderer.invoke("olorin:list-printers"),
  getOptions: () => ipcRenderer.invoke("olorin:get-options"),
  setOptions: (options) => ipcRenderer.invoke("olorin:set-options", options),
  getRecentJobs: () => ipcRenderer.invoke("olorin:get-recent-jobs"),
  testPrint: (printerKey) => ipcRenderer.invoke("olorin:test-print", printerKey),
  kickDrawer: (printerKey) => ipcRenderer.invoke("olorin:kick-drawer", printerKey),
  openReleasePage: (url) => ipcRenderer.invoke("olorin:open-release", url),
  onJob: (callback) => {
    ipcRenderer.on("olorin:job", (event, job) => callback(job));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("olorin:update-available", (event, info) => callback(info));
  },
});
