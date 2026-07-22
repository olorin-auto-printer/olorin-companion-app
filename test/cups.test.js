import { describe, it, expect, vi } from "vitest";

import { buildLpArgs, print } from "../src/printing/cups";

describe("cups", () => {
  describe("buildLpArgs", () => {
    it("builds the basic argument vector", () => {
      expect(buildLpArgs({ deviceName: "EPSON_TM_T88V", pdfPath: "/tmp/job.pdf" })).toEqual([
        "-d",
        "EPSON_TM_T88V",
        "/tmp/job.pdf",
      ]);
    });

    it("adds the landscape option", () => {
      expect(
        buildLpArgs({ deviceName: "P", pdfPath: "/tmp/job.pdf", orientation: "Landscape" }),
      ).toEqual(["-d", "P", "-o", "landscape", "/tmp/job.pdf"]);
    });

    it("does not add an option for portrait (the lp default)", () => {
      expect(
        buildLpArgs({ deviceName: "P", pdfPath: "/tmp/job.pdf", orientation: "Portrait" }),
      ).toEqual(["-d", "P", "/tmp/job.pdf"]);
    });
  });

  describe("print", () => {
    it("invokes lp with the built arguments", async () => {
      const execFileImpl = vi.fn((file, args, callback) => callback(null, ""));
      await print({ pdfPath: "/tmp/job.pdf", deviceName: "P", execFileImpl });
      expect(execFileImpl).toHaveBeenCalledWith(
        "lp",
        ["-d", "P", "/tmp/job.pdf"],
        expect.any(Function),
      );
    });

    it("gives a friendly error when lp is not installed", async () => {
      const execFileImpl = vi.fn((file, args, callback) => {
        const error = new Error("spawn lp ENOENT");
        error.code = "ENOENT";
        callback(error);
      });
      await expect(print({ pdfPath: "j.pdf", deviceName: "P", execFileImpl })).rejects.toThrow(
        /install cups-client/,
      );
    });

    it("surfaces stderr from a failed print", async () => {
      const execFileImpl = vi.fn((file, args, callback) => {
        const error = new Error("Command failed");
        error.stderr = "lp: The printer or class does not exist.";
        callback(error);
      });
      await expect(
        print({ pdfPath: "j.pdf", deviceName: "P", execFileImpl }),
      ).rejects.toMatchObject({
        name: "PrintError",
        message: expect.stringMatching(/does not exist/),
      });
    });
  });
});
