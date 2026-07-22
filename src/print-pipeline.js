const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { PrintError } = require("./errors");

// Resolve the "printer" field of a print message to an OS printer name.
//
// The current extensions send a logical printer key ("receipt_printer",
// "sticker_printer", "paper_printer", "full_sheet_printer", "label_printer")
// which the saved options map to a device name. Legacy Firefox extensions
// (v1.1) sent the resolved device name directly, so if the key lookup fails we
// fall back to matching the value against the installed printers.
function resolvePrinter({ requested, options = {}, installedPrinters = [] }) {
  if (!requested) {
    throw new PrintError("No printer specified");
  }

  const deviceFromKey = options[requested];
  if (deviceFromKey) {
    return { deviceName: deviceFromKey, printerKey: requested };
  }

  const wanted = String(requested).toLowerCase();
  const match = installedPrinters.find(
    (p) =>
      (p.name && p.name.toLowerCase() === wanted) ||
      (p.displayName && p.displayName.toLowerCase() === wanted),
  );
  if (match) {
    return { deviceName: match.name, printerKey: null };
  }

  throw new PrintError(`Unknown printer '${requested}'`);
}

function positiveNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function nonNegativeNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Build the options for webContents.printToPDF from the saved options and the
// message, plus the orientation for the OS print step. Since Electron 21,
// pageSize {width,height} and margins are in inches; stored values already
// behave as inches in production, so they pass through unconverted.
//
// Config values win over inline message values, matching the original
// "conf[key] || data.field" precedence (including its falsy semantics).
function buildPdfOptions({ options = {}, message = {}, printerKey = null }) {
  const setting = (suffix, inlineName) =>
    (printerKey && options[printerKey + suffix]) || message[inlineName];

  const pageWidth = positiveNumber(setting("_width", "pageWidth"));
  const pageHeight = positiveNumber(setting("_height", "pageHeight"));

  const pdfOptions = {
    printBackground: true,
    pageSize: pageWidth && pageHeight ? { width: pageWidth, height: pageHeight } : "A4",
  };

  const rawMargins = {
    top: setting("_margin_top", "marginTop"),
    right: setting("_margin_right", "marginRight"),
    bottom: setting("_margin_bottom", "marginBottom"),
    left: setting("_margin_left", "marginLeft"),
  };

  // Margins are applied only when all four are provided, matching the
  // original behavior (its incomplete-margins fallback of {marginType:0} has
  // been ignored by Electron since v21, so omitting margins is identical).
  if (rawMargins.top && rawMargins.right && rawMargins.bottom && rawMargins.left) {
    const margins = {
      top: nonNegativeNumber(rawMargins.top),
      right: nonNegativeNumber(rawMargins.right),
      bottom: nonNegativeNumber(rawMargins.bottom),
      left: nonNegativeNumber(rawMargins.left),
    };
    if (Object.values(margins).every((v) => v !== undefined)) {
      pdfOptions.margins = margins;
    }
  }

  const orientation = setting("_orientation", "orientation");

  return { pdfOptions, orientation };
}

// Orchestrates a print job: resolve the printer, render the HTML to a PDF in
// the temp dir, hand it to the platform print backend, notify, clean up.
// Jobs are serialized through a queue so concurrent requests don't race.
function createPrintPipeline({
  optionsStore,
  listPrinters,
  renderToPdf,
  backend,
  tempDir,
  notify,
  logger = console,
}) {
  let queue = Promise.resolve();

  async function runJob(message) {
    const options = optionsStore.load();
    const installedPrinters = await listPrinters();

    const { deviceName, printerKey } = resolvePrinter({
      requested: message.printer,
      options,
      installedPrinters,
    });

    const { pdfOptions, orientation } = buildPdfOptions({ options, message, printerKey });

    const pdfBuffer = await renderToPdf(message.content, pdfOptions);

    const pdfPath = path.join(tempDir, `olorin-print-${Date.now()}-${randomUUID()}.pdf`);
    await fs.promises.writeFile(pdfPath, pdfBuffer);

    try {
      await backend.print({ pdfPath, deviceName, orientation });
    } finally {
      fs.promises.unlink(pdfPath).catch(() => {});
    }

    return { printer: deviceName };
  }

  function print(message) {
    const job = queue.then(async () => {
      try {
        const result = await runJob(message);
        notify({ body: "Print successful" });
        return result;
      } catch (error) {
        logger.error("Print failed:", error);
        notify({ body: `Print failed: ${error.message}` });
        throw error;
      }
    });

    // Keep the queue alive after failures; callers still see the rejection.
    queue = job.catch(() => {});

    return job;
  }

  return { print };
}

module.exports = { resolvePrinter, buildPdfOptions, createPrintPipeline };
