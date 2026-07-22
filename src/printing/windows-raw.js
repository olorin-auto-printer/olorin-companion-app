const { execFile } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const { PrintError } = require("../errors");

// Raw (driverless) printing on Windows via the bundled PowerShell winspool
// helper. Used for ESC/POS commands such as the cash-drawer kick.

function resolveScriptPath({ isPackaged, appRoot }) {
  const scriptPath = path.join(appRoot, "resources", "win32", "raw-print.ps1");
  if (isPackaged) {
    return scriptPath.replace("app.asar", "app.asar.unpacked");
  }
  return scriptPath;
}

async function kick({ filePath, deviceName, scriptPath, execFileImpl = execFile }) {
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-PrinterName",
    deviceName,
    "-FilePath",
    filePath,
  ];

  try {
    await promisify(execFileImpl)("powershell.exe", args);
  } catch (error) {
    const detail = (error.stderr && error.stderr.toString().trim()) || error.message;
    throw new PrintError(`Raw print failed: ${detail}`);
  }
}

module.exports = { resolveScriptPath, kick };
