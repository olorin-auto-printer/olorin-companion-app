import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import WebSocket from "ws";

import { startServer, isOriginAllowed } from "../src/server";
import { createRouter } from "../src/router";
import { createPrintPipeline } from "../src/print-pipeline";

// End-to-end contract test: a real ws server and client, with the real router
// and print pipeline wired to fakes for everything Electron-specific.
describe("server integration", () => {
  let server;
  let savedOptions;
  let printedJobs;
  let renderedCalls;
  let notifications;

  beforeEach(async () => {
    savedOptions = { receipt_printer: "Fake Receipt Printer" };
    printedJobs = [];
    renderedCalls = [];
    notifications = [];

    const optionsStore = {
      load: () => savedOptions,
      save: (options) => {
        savedOptions = options;
      },
    };

    const listPrinters = vi.fn().mockResolvedValue([
      { name: "Fake Receipt Printer", displayName: "Fake Receipt Printer (Front Desk)" },
      { name: "Fake_Label_Printer", displayName: "Fake Label Printer" },
    ]);

    const pipeline = createPrintPipeline({
      optionsStore,
      listPrinters,
      renderToPdf: async (html, pdfOptions) => {
        renderedCalls.push({ html, pdfOptions });
        return Buffer.from("%PDF-fake");
      },
      backend: {
        print: async (job) => {
          printedJobs.push(job);
        },
      },
      tempDir: os.tmpdir(),
      notify: (n) => notifications.push(n),
      logger: { error: () => {} },
    });

    const router = createRouter({
      optionsStore,
      listPrinters,
      executePrint: (message) => pipeline.print(message),
      logger: { error: () => {} },
    });

    server = await startServer({
      port: 0,
      route: router.route,
      isOriginAllowed: (origin) => isOriginAllowed(origin, savedOptions.allowed_origins),
      logger: { log: () => {}, error: () => {} },
    });
  });

  afterEach(async () => {
    await server.close();
  });

  function request(message, { origin } = {}) {
    return new Promise((resolve, reject) => {
      const headers = origin ? { Origin: origin } : {};
      const ws = new WebSocket(`ws://127.0.0.1:${server.port}`, { headers });
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error("Timed out waiting for a response"));
      }, 5000);
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

  it("binds to the loopback interface only", () => {
    expect(server.wss.address().address).toBe("127.0.0.1");
  });

  it("answers list-printer with the printer list", async () => {
    const response = await request({ id: "printerList", text: "list-printer" });
    expect(response.id).toBe("printerList");
    expect(response.printer.map((p) => p.name)).toEqual([
      "Fake Receipt Printer",
      "Fake_Label_Printer",
    ]);
  });

  it("prints a current-model message (logical key, no inline dimensions)", async () => {
    savedOptions = {
      receipt_printer: "Fake Receipt Printer",
      receipt_printer_width: "3.125",
      receipt_printer_height: "8",
      receipt_printer_orientation: "Portrait",
    };
    const response = await request({
      id: "print",
      text: "printer-command",
      content: "<h1>Receipt</h1>",
      printer: "receipt_printer",
    });

    expect(response).toEqual({ id: "print", success: true, printer: "Fake Receipt Printer" });
    expect(renderedCalls[0].html).toBe("<h1>Receipt</h1>");
    expect(renderedCalls[0].pdfOptions.pageSize).toEqual({ width: 3.125, height: 8 });
    expect(printedJobs[0].deviceName).toBe("Fake Receipt Printer");
    expect(printedJobs[0].orientation).toBe("Portrait");
    expect(printedJobs[0].pdfPath).toContain("olorin-print-");
    expect(notifications[0].body).toMatch(/success/i);
  });

  it("prints a legacy Firefox message (device name plus inline dimensions)", async () => {
    const response = await request({
      id: "print",
      text: "printer-command",
      content: "<p>slip</p>",
      printer: "Fake_Label_Printer",
      pageWidth: "2.25",
      pageHeight: "1.25",
      marginTop: 0,
      marginRight: 0,
      marginLeft: 0,
      marginBottom: 0,
      orientation: "Landscape",
    });

    expect(response).toEqual({ id: "print", success: true, printer: "Fake_Label_Printer" });
    expect(renderedCalls[0].pdfOptions.pageSize).toEqual({ width: 2.25, height: 1.25 });
    expect(renderedCalls[0].pdfOptions.margins).toBeUndefined();
    expect(printedJobs[0].orientation).toBe("Landscape");
  });

  it("responds with an error for an unknown printer", async () => {
    const response = await request({
      id: "print",
      text: "printer-command",
      content: "<p>x</p>",
      printer: "no_such_printer",
    });
    expect(response.id).toBe("print");
    expect(response.success).toBe(false);
    expect(response.error).toMatch(/Unknown printer/);
    expect(printedJobs).toHaveLength(0);
    expect(notifications[0].body).toMatch(/failed/i);
  });

  it("round-trips options through set-options and get-options", async () => {
    const options = { receipt_printer: "Fake Receipt Printer", receipt_printer_width: "3" };
    const setResponse = await request({ id: "set-options", text: "set-options", options });
    expect(setResponse.success).toBe(true);

    const getResponse = await request({ id: "get-options", text: "get-options" });
    // Raw, unwrapped object — the options page depends on this shape.
    expect(getResponse).toEqual(options);
  });

  it("responds with an error to malformed JSON", async () => {
    const response = await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${server.port}`);
      ws.on("open", () => ws.send("{not json"));
      ws.on("message", (data) => {
        ws.close();
        resolve(JSON.parse(data.toString()));
      });
      ws.on("error", reject);
    });
    expect(response).toEqual({ success: false, error: "Invalid JSON message" });
  });

  it("accepts connections from extension and https origins", async () => {
    const fromExtension = await request(
      { id: "printerList", text: "list-printer" },
      { origin: "chrome-extension://abcdefg" },
    );
    expect(fromExtension.id).toBe("printerList");

    const fromPage = await request(
      { id: "printerList", text: "list-printer" },
      { origin: "https://staff.library.example.org" },
    );
    expect(fromPage.id).toBe("printerList");
  });

  it("rejects connections from disallowed origins", async () => {
    await expect(
      request({ id: "printerList", text: "list-printer" }, { origin: "file://" }),
    ).rejects.toThrow(/403/);
  });

  it("enforces the allowed_origins allowlist for page origins", async () => {
    savedOptions = {
      ...savedOptions,
      allowed_origins: ["https://staff.library.example.org"],
    };

    const allowed = await request(
      { id: "printerList", text: "list-printer" },
      { origin: "https://staff.library.example.org" },
    );
    expect(allowed.id).toBe("printerList");

    await expect(
      request({ id: "printerList", text: "list-printer" }, { origin: "https://evil.example.com" }),
    ).rejects.toThrow(/403/);
  });
});
