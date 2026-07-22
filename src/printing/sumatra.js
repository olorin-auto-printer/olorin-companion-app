const { execFile } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const { PrintError } = require("../errors");

// Windows printing via the vendored SumatraPDF binary, invoked as a separate
// process. See THIRD_PARTY_LICENSES.md for licensing.

// In a packaged app the binary lives outside the asar archive (see the
// asar.unpack setting in forge.config.js), so the app.asar path segment has to
// be rewritten to app.asar.unpacked.
function resolveSumatraPath({ isPackaged, appRoot }) {
  const sumatraPath = path.join(appRoot, "resources", "win32", "SumatraPDF.exe");
  if (isPackaged) {
    return sumatraPath.replace("app.asar", "app.asar.unpacked");
  }
  return sumatraPath;
}

function buildSumatraArgs({ deviceName, pdfPath, orientation, copies, duplex }) {
  // Without noscale Sumatra scales to fit the page, which is bad for labels.
  const settings = ["noscale"];

  const wanted = String(orientation || "").toLowerCase();
  if (wanted === "portrait" || wanted === "landscape") {
    settings.push(wanted);
  }

  if (Number.isInteger(copies) && copies > 1) {
    settings.push(`${copies}x`);
  }

  if (duplex === "long") {
    settings.push("duplexlong");
  } else if (duplex === "short") {
    settings.push("duplexshort");
  }

  return ["-print-to", deviceName, "-print-settings", settings.join(","), "-silent", pdfPath];
}

async function print({
  pdfPath,
  deviceName,
  orientation,
  copies,
  duplex,
  sumatraPath,
  execFileImpl = execFile,
}) {
  const args = buildSumatraArgs({ deviceName, pdfPath, orientation, copies, duplex });

  try {
    await promisify(execFileImpl)(sumatraPath, args);
  } catch (error) {
    const detail = (error.stderr && error.stderr.toString().trim()) || error.message;
    throw new PrintError(`SumatraPDF failed: ${detail}`);
  }
}

module.exports = { resolveSumatraPath, buildSumatraArgs, print };
