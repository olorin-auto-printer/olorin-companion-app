const { execFile } = require("child_process");
const { promisify } = require("util");
const { PrintError } = require("../errors");

// macOS/Linux printing via the CUPS 'lp' command.

function buildLpArgs({ deviceName, pdfPath, orientation, copies, duplex }) {
  const args = ["-d", deviceName];

  if (String(orientation || "").toLowerCase() === "landscape") {
    args.push("-o", "landscape");
  }

  if (Number.isInteger(copies) && copies > 1) {
    args.push("-n", String(copies));
  }

  if (duplex === "long") {
    args.push("-o", "sides=two-sided-long-edge");
  } else if (duplex === "short") {
    args.push("-o", "sides=two-sided-short-edge");
  }

  args.push(pdfPath);
  return args;
}

async function runLp(args, execFileImpl) {
  try {
    await promisify(execFileImpl)("lp", args);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new PrintError(
        "The 'lp' command was not found — install cups-client to enable printing",
      );
    }
    const detail = (error.stderr && error.stderr.toString().trim()) || error.message;
    throw new PrintError(`lp failed: ${detail}`);
  }
}

async function print({
  pdfPath,
  deviceName,
  orientation,
  copies,
  duplex,
  execFileImpl = execFile,
}) {
  await runLp(buildLpArgs({ deviceName, pdfPath, orientation, copies, duplex }), execFileImpl);
}

// Send a raw file (e.g. an ESC/POS drawer-kick command) straight to the
// printer, bypassing CUPS filters.
async function kick({ filePath, deviceName, execFileImpl = execFile }) {
  await runLp(["-d", deviceName, "-o", "raw", filePath], execFileImpl);
}

module.exports = { buildLpArgs, print, kick };
