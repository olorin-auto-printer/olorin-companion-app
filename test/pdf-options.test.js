import { describe, it, expect } from "vitest";

import { buildPdfOptions } from "../src/print-pipeline";

describe("buildPdfOptions", () => {
  it("defaults to A4 when no dimensions are available", () => {
    const { pdfOptions } = buildPdfOptions({ options: {}, message: {}, printerKey: null });
    expect(pdfOptions.pageSize).toBe("A4");
    expect(pdfOptions.printBackground).toBe(true);
  });

  it("uses configured dimensions for a logical printer key", () => {
    const { pdfOptions } = buildPdfOptions({
      options: { receipt_printer_width: "3.125", receipt_printer_height: "8" },
      message: {},
      printerKey: "receipt_printer",
    });
    expect(pdfOptions.pageSize).toEqual({ width: 3.125, height: 8 });
  });

  it("uses inline message dimensions when there is no config value", () => {
    const { pdfOptions } = buildPdfOptions({
      options: {},
      message: { pageWidth: "4", pageHeight: "6" },
      printerKey: "receipt_printer",
    });
    expect(pdfOptions.pageSize).toEqual({ width: 4, height: 6 });
  });

  it("prefers config values over inline message values", () => {
    const { pdfOptions, orientation } = buildPdfOptions({
      options: {
        receipt_printer_width: "3",
        receipt_printer_height: "5",
        receipt_printer_orientation: "Portrait",
      },
      message: { pageWidth: "8.5", pageHeight: "11", orientation: "Landscape" },
      printerKey: "receipt_printer",
    });
    expect(pdfOptions.pageSize).toEqual({ width: 3, height: 5 });
    expect(orientation).toBe("Portrait");
  });

  it("ignores config entirely when there is no printer key (legacy messages)", () => {
    const { pdfOptions } = buildPdfOptions({
      options: { receipt_printer_width: "3", receipt_printer_height: "5" },
      message: { pageWidth: "8.5", pageHeight: "11" },
      printerKey: null,
    });
    expect(pdfOptions.pageSize).toEqual({ width: 8.5, height: 11 });
  });

  it("falls back to A4 for zero or non-numeric dimensions", () => {
    for (const [width, height] of [
      ["0", "11"],
      ["8.5", "0"],
      ["abc", "11"],
      ["-1", "11"],
    ]) {
      const { pdfOptions } = buildPdfOptions({
        options: {},
        message: { pageWidth: width, pageHeight: height },
        printerKey: null,
      });
      expect(pdfOptions.pageSize).toBe("A4");
    }
  });

  it("applies all four margins with each side mapped correctly", () => {
    const { pdfOptions } = buildPdfOptions({
      options: {},
      message: { marginTop: "0.1", marginRight: "0.2", marginBottom: "0.3", marginLeft: "0.4" },
      printerKey: null,
    });
    // Regression test: the original code set the right margin from the
    // bottom value.
    expect(pdfOptions.margins).toEqual({ top: 0.1, right: 0.2, bottom: 0.3, left: 0.4 });
  });

  it("omits margins when any side is missing", () => {
    const { pdfOptions } = buildPdfOptions({
      options: {},
      message: { marginTop: "0.1", marginRight: "0.2", marginBottom: "0.3" },
      printerKey: null,
    });
    expect(pdfOptions.margins).toBeUndefined();
  });

  it("omits margins when the legacy Firefox defaults of numeric 0 are sent", () => {
    // The old Firefox extension sent 0 for unset margins; 0 is falsy, so the
    // original code skipped margins — preserve that.
    const { pdfOptions } = buildPdfOptions({
      options: {},
      message: { marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 },
      printerKey: null,
    });
    expect(pdfOptions.margins).toBeUndefined();
  });

  it("applies explicit string zero margins from the options form", () => {
    const { pdfOptions } = buildPdfOptions({
      options: {
        receipt_printer_margin_top: "0",
        receipt_printer_margin_right: "0",
        receipt_printer_margin_bottom: "0",
        receipt_printer_margin_left: "0",
      },
      message: {},
      printerKey: "receipt_printer",
    });
    expect(pdfOptions.margins).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("omits margins when a value is non-numeric", () => {
    const { pdfOptions } = buildPdfOptions({
      options: {},
      message: { marginTop: "a", marginRight: "0.2", marginBottom: "0.3", marginLeft: "0.4" },
      printerKey: null,
    });
    expect(pdfOptions.margins).toBeUndefined();
  });

  it("passes the orientation through", () => {
    const { orientation } = buildPdfOptions({
      options: {},
      message: { orientation: "Landscape" },
      printerKey: null,
    });
    expect(orientation).toBe("Landscape");
  });
});
