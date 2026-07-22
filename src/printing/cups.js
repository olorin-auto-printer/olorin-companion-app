const { execFile } = require("child_process");
const { promisify } = require("util");
const { PrintError } = require("../errors");

// macOS/Linux printing via the CUPS 'lp' command.

function buildLpArgs({ deviceName, pdfPath, orientation }) {
  const args = ["-d", deviceName];

  if (String(orientation || "").toLowerCase() === "landscape") {
    args.push("-o", "landscape");
  }

  args.push(pdfPath);
  return args;
}

async function print({ pdfPath, deviceName, orientation, execFileImpl = execFile }) {
  const args = buildLpArgs({ deviceName, pdfPath, orientation });

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

module.exports = { buildLpArgs, print };
