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

  // Copies (integer >= 1) and duplex ("long" | "short") are print-side
  // settings passed to the OS backend, not printToPDF.
  const rawCopies = parseInt(setting("_copies", "copies"), 10);
  const copies = Number.isInteger(rawCopies) && rawCopies >= 1 ? rawCopies : 1;

  const rawDuplex = String(setting("_duplex", "duplex") || "").toLowerCase();
  const duplex = rawDuplex === "long" || rawDuplex === "short" ? rawDuplex : undefined;

  return { pdfOptions, orientation, copies, duplex };
}

// ESC/POS "generate pulse" command: ESC p 0 25 250 — opens a cash drawer
// connected to a receipt printer's drawer-kick port.
const DRAWER_KICK_BYTES = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

// Orchestrates a print job: resolve the printer, render the HTML to a PDF in
// the temp dir, hand it to the platform print backend, notify, clean up.
// Jobs are serialized through a queue so concurrent requests don't race.
const RECENT_JOB_LIMIT = 20;

function createPrintPipeline({
  optionsStore,
  listPrinters,
  renderToPdf,
  backend,
  tempDir,
  notify,
  onJob,
  logger = console,
}) {
  let queue = Promise.resolve();
  const recentJobs = [];

  function recordJob(job) {
    recentJobs.unshift(job);
    if (recentJobs.length > RECENT_JOB_LIMIT) {
      recentJobs.pop();
    }
    if (onJob) {
      onJob(job);
    }
  }

  function resolveTarget(message) {
    const options = optionsStore.load();
    return listPrinters().then((installedPrinters) => {
      const { deviceName, printerKey } = resolvePrinter({
        requested: message.printer,
        options,
        installedPrinters,
      });
      return { options, deviceName, printerKey };
    });
  }

  async function runPrintJob(message) {
    const { options, deviceName, printerKey } = await resolveTarget(message);

    const { pdfOptions, orientation, copies, duplex } = buildPdfOptions({
      options,
      message,
      printerKey,
    });

    const pdfBuffer = await renderToPdf(message.content, pdfOptions);

    const pdfPath = path.join(tempDir, `olorin-print-${Date.now()}-${randomUUID()}.pdf`);
    await fs.promises.writeFile(pdfPath, pdfBuffer);

    try {
      await backend.print({ pdfPath, deviceName, orientation, copies, duplex });
    } finally {
      fs.promises.unlink(pdfPath).catch(() => {});
    }

    return { printer: deviceName };
  }

  async function runKickJob(message) {
    const { deviceName } = await resolveTarget(message);

    const filePath = path.join(tempDir, `olorin-kick-${Date.now()}-${randomUUID()}.bin`);
    await fs.promises.writeFile(filePath, DRAWER_KICK_BYTES);

    try {
      await backend.kick({ filePath, deviceName });
    } finally {
      fs.promises.unlink(filePath).catch(() => {});
    }

    return { printer: deviceName };
  }

  function enqueue(type, message, runJob, { notifySuccess }) {
    const job = queue.then(async () => {
      try {
        const result = await runJob(message);
        recordJob({ time: Date.now(), type, printer: result.printer, success: true });
        if (notifySuccess) {
          notify({ body: "Print successful" });
        }
        return result;
      } catch (error) {
        logger.error(`${type} failed:`, error);
        // Failed records keep the original message so the job can be retried
        // from the app window. Success records must not retain content —
        // it would pin up to RECENT_JOB_LIMIT slips in memory for nothing.
        recordJob({
          time: Date.now(),
          type,
          printer: message.printer,
          success: false,
          error: error.message,
          message,
        });
        notify({ body: `${type === "kick" ? "Drawer kick" : "Print"} failed: ${error.message}` });
        throw error;
      }
    });

    // Keep the queue alive after failures; callers still see the rejection.
    queue = job.catch(() => {});

    return job;
  }

  const print = (message) => enqueue("print", message, runPrintJob, { notifySuccess: true });
  const kickDrawer = (message) => enqueue("kick", message, runKickJob, { notifySuccess: false });

  // Re-dispatch a failed job identified by its record time. The retained
  // message goes back through the normal queue, producing a new record.
  function retryJob(jobTime) {
    const record = recentJobs.find((job) => job.time === jobTime && !job.success && job.message);
    if (!record) {
      return Promise.reject(new PrintError("No matching failed job to retry"));
    }
    return record.type === "kick" ? kickDrawer(record.message) : print(record.message);
  }

  return {
    print,
    kickDrawer,
    retryJob,
    getRecentJobs: () => [...recentJobs],
  };
}

module.exports = { resolvePrinter, buildPdfOptions, createPrintPipeline, DRAWER_KICK_BYTES };
