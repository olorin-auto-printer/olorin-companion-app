// End-to-end smoke test driver, used by .github/workflows/smoke.yml.
//
// Expects a running companion app and a printer whose output lands in a file
// (a CUPS file: queue, or Windows' "Microsoft Print to PDF" pointed at a
// file port). Drives the real WebSocket protocol: list-printer, set-options,
// printer-command — then waits for the output file to appear.
//
// Usage:
//   node scripts/smoke-test.mjs --printer "PrinterName" --output /path/to/out.pdf
//   node scripts/smoke-test.mjs --expect-unknown-printer   (protocol check only)
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import WebSocket from "ws";

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const printerName = getArg("--printer");
const outputPath = getArg("--output");
const expectUnknownPrinter = args.includes("--expect-unknown-printer");
const port = process.env.OLORIN_PORT || 9696;

function request(message, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Timed out waiting for a response to ${message.text}`));
    }, timeoutMs);
    ws.on("open", () => ws.send(JSON.stringify(message)));
    ws.on("message", (data) => {
      clearTimeout(timer);
      ws.close();
      resolve(JSON.parse(data.toString()));
    });
    ws.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// First launch of the unsigned packaged app can be slow on Windows CI
// (Defender scans the exe), so the wait is generous.
async function waitForServer(attempts = 150) {
  for (let i = 0; i < attempts; i++) {
    try {
      await request({ id: "printerList", text: "list-printer" }, { timeoutMs: 5000 });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Companion app WebSocket server never became reachable");
}

// The pattern may contain a single '*' in the basename (cups-pdf names its
// output after the spooled job, which contains a generated UUID).
function findOutputFile(pattern) {
  const dir = path.dirname(pattern);
  const base = path.basename(pattern);
  if (!base.includes("*")) {
    return fs.existsSync(pattern) && fs.statSync(pattern).size > 0 ? pattern : undefined;
  }
  if (!fs.existsSync(dir)) {
    return undefined;
  }
  const [prefix, suffix] = base.split("*");
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith(prefix) && entry.endsWith(suffix)) {
      const candidate = path.join(dir, entry);
      if (fs.statSync(candidate).size > 0) {
        return candidate;
      }
    }
  }
  return undefined;
}

async function waitForFile(pattern, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    const found = findOutputFile(pattern);
    if (found) {
      return found;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Print output never appeared at ${pattern}`);
}

const SLIP_HTML =
  "<html><body><h1>Olorin smoke test</h1>" +
  "<p>Checked out: The Fellowship of the Ring</p>" +
  "<p>Due date: 2026-08-12</p></body></html>";

console.log("Waiting for the companion app ...");
await waitForServer();
console.log("Server is up.");

const printerList = await request({ id: "printerList", text: "list-printer" });
const names = (printerList.printer || []).map((p) => p.name);
console.log("Installed printers:", names.join(", ") || "(none)");

if (expectUnknownPrinter) {
  const response = await request({
    id: "print",
    text: "printer-command",
    content: SLIP_HTML,
    printer: "smoke_test_nonexistent_printer",
  });
  console.log("printer-command response:", JSON.stringify(response));
  if (response.id !== "print" || response.success !== false || !response.error) {
    console.error("FAIL: expected a structured error response for an unknown printer");
    process.exit(1);
  }
  console.log("PASS: unknown printer produced a structured error response");
  process.exit(0);
}

if (!printerName || !outputPath) {
  console.error(
    "Usage: smoke-test.mjs --printer <name> --output <path> [--expect-unknown-printer]",
  );
  process.exit(2);
}

if (!names.includes(printerName)) {
  console.error(`FAIL: printer '${printerName}' not reported by list-printer`);
  process.exit(1);
}

const setResponse = await request({
  id: "set-options",
  text: "set-options",
  options: {
    receipt_printer: printerName,
    receipt_printer_width: "8.5",
    receipt_printer_height: "11",
  },
});
console.log("set-options response:", JSON.stringify(setResponse));
if (!setResponse.success) {
  console.error("FAIL: set-options did not succeed");
  process.exit(1);
}

const printResponse = await request(
  { id: "print", text: "printer-command", content: SLIP_HTML, printer: "receipt_printer" },
  { timeoutMs: 120000 },
);
console.log("printer-command response:", JSON.stringify(printResponse));
if (printResponse.id !== "print" || printResponse.success !== true) {
  console.error("FAIL: printer-command did not report success");
  process.exit(1);
}

console.log(`Waiting for print output at ${outputPath} ...`);
const outputFile = await waitForFile(outputPath);
const size = fs.statSync(outputFile).size;
const header = fs.readFileSync(outputFile).subarray(0, 5).toString("latin1");
console.log(`PASS: output file ${outputFile} exists (${size} bytes, starts with '${header}')`);
