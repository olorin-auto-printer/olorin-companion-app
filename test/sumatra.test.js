import { describe, it, expect, vi } from "vitest";
import path from "node:path";

import { resolveSumatraPath, buildSumatraArgs, print } from "../src/printing/sumatra";

describe("sumatra", () => {
  describe("buildSumatraArgs", () => {
    it("builds the exact argument vector", () => {
      expect(buildSumatraArgs({ deviceName: "My Printer", pdfPath: "C:\\tmp\\job.pdf" })).toEqual([
        "-print-to",
        "My Printer",
        "-print-settings",
        "noscale",
        "-silent",
        "C:\\tmp\\job.pdf",
      ]);
    });

    it("adds landscape to the print settings", () => {
      const args = buildSumatraArgs({
        deviceName: "P",
        pdfPath: "job.pdf",
        orientation: "Landscape",
      });
      expect(args).toContain("noscale,landscape");
    });

    it("adds portrait to the print settings", () => {
      const args = buildSumatraArgs({
        deviceName: "P",
        pdfPath: "job.pdf",
        orientation: "portrait",
      });
      expect(args).toContain("noscale,portrait");
    });

    it("ignores unknown orientation values", () => {
      const args = buildSumatraArgs({
        deviceName: "P",
        pdfPath: "job.pdf",
        orientation: "Automatic",
      });
      expect(args).toContain("noscale");
      expect(args.join(",")).not.toMatch(/automatic/i);
    });

    it("adds a copies multiplier for more than one copy", () => {
      expect(buildSumatraArgs({ deviceName: "P", pdfPath: "j.pdf", copies: 2 })).toContain(
        "noscale,2x",
      );
      expect(buildSumatraArgs({ deviceName: "P", pdfPath: "j.pdf", copies: 1 })).toContain(
        "noscale",
      );
    });

    it("adds duplex print settings", () => {
      expect(buildSumatraArgs({ deviceName: "P", pdfPath: "j.pdf", duplex: "long" })).toContain(
        "noscale,duplexlong",
      );
      expect(buildSumatraArgs({ deviceName: "P", pdfPath: "j.pdf", duplex: "short" })).toContain(
        "noscale,duplexshort",
      );
    });
  });

  describe("resolveSumatraPath", () => {
    it("resolves relative to the app root in development", () => {
      expect(resolveSumatraPath({ isPackaged: false, appRoot: "/dev/olorin" })).toBe(
        path.join("/dev/olorin", "resources", "win32", "SumatraPDF.exe"),
      );
    });

    it("rewrites app.asar to app.asar.unpacked when packaged", () => {
      const resolved = resolveSumatraPath({
        isPackaged: true,
        appRoot: path.join("C:", "app", "resources", "app.asar"),
      });
      expect(resolved).toContain("app.asar.unpacked");
      expect(resolved).toContain(path.join("resources", "win32", "SumatraPDF.exe"));
    });
  });

  describe("print", () => {
    it("invokes SumatraPDF with the built arguments", async () => {
      const execFileImpl = vi.fn((file, args, callback) => callback(null, ""));
      await print({
        pdfPath: "job.pdf",
        deviceName: "P",
        sumatraPath: "/vendored/SumatraPDF.exe",
        execFileImpl,
      });
      expect(execFileImpl).toHaveBeenCalledWith(
        "/vendored/SumatraPDF.exe",
        ["-print-to", "P", "-print-settings", "noscale", "-silent", "job.pdf"],
        expect.any(Function),
      );
    });

    it("rejects with a PrintError carrying stderr on failure", async () => {
      const execFileImpl = vi.fn((file, args, callback) => {
        const error = new Error("Command failed");
        error.stderr = "printer offline";
        callback(error);
      });
      await expect(
        print({ pdfPath: "job.pdf", deviceName: "P", sumatraPath: "s.exe", execFileImpl }),
      ).rejects.toMatchObject({
        name: "PrintError",
        message: expect.stringMatching(/printer offline/),
      });
    });
  });
});
