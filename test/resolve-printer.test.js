import { describe, it, expect } from "vitest";

import { resolvePrinter } from "../src/print-pipeline";

describe("resolvePrinter", () => {
  const installedPrinters = [
    { name: "EPSON_TM_T88V", displayName: "EPSON TM-T88V Receipt" },
    { name: "Brother_QL_820", displayName: "Brother QL-820NWB" },
  ];

  it("resolves a logical printer key through the saved options", () => {
    const result = resolvePrinter({
      requested: "receipt_printer",
      options: { receipt_printer: "EPSON_TM_T88V" },
      installedPrinters,
    });
    expect(result).toEqual({ deviceName: "EPSON_TM_T88V", printerKey: "receipt_printer" });
  });

  it("does not validate configured device names against installed printers", () => {
    // Matches the original behavior: the configured value is trusted as-is.
    const result = resolvePrinter({
      requested: "receipt_printer",
      options: { receipt_printer: "Some Unplugged Printer" },
      installedPrinters,
    });
    expect(result.deviceName).toBe("Some Unplugged Printer");
  });

  it("falls back to matching a raw device name (legacy Firefox extension)", () => {
    const result = resolvePrinter({
      requested: "EPSON_TM_T88V",
      options: {},
      installedPrinters,
    });
    expect(result).toEqual({ deviceName: "EPSON_TM_T88V", printerKey: null });
  });

  it("matches raw device names case-insensitively", () => {
    const result = resolvePrinter({
      requested: "epson_tm_t88v",
      options: {},
      installedPrinters,
    });
    expect(result.deviceName).toBe("EPSON_TM_T88V");
  });

  it("matches against displayName and returns the canonical name", () => {
    const result = resolvePrinter({
      requested: "Brother QL-820NWB",
      options: {},
      installedPrinters,
    });
    expect(result).toEqual({ deviceName: "Brother_QL_820", printerKey: null });
  });

  it("prefers the logical key lookup over a device-name match", () => {
    const result = resolvePrinter({
      requested: "EPSON_TM_T88V",
      options: { EPSON_TM_T88V: "Brother_QL_820" },
      installedPrinters,
    });
    expect(result).toEqual({ deviceName: "Brother_QL_820", printerKey: "EPSON_TM_T88V" });
  });

  it("throws a PrintError for an unknown printer", () => {
    expect(() =>
      resolvePrinter({ requested: "nonexistent", options: {}, installedPrinters }),
    ).toThrowError(
      expect.objectContaining({ name: "PrintError", message: "Unknown printer 'nonexistent'" }),
    );
  });

  it("throws a PrintError when no printer is specified", () => {
    expect(() => resolvePrinter({ requested: undefined, options: {}, installedPrinters })).toThrow(
      /No printer specified/,
    );
  });
});
