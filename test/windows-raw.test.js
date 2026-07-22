import { describe, it, expect, vi } from "vitest";
import path from "node:path";

import { resolveScriptPath, kick } from "../src/printing/windows-raw";

describe("windows-raw", () => {
  it("resolves the script path in development", () => {
    expect(resolveScriptPath({ isPackaged: false, appRoot: "/dev/olorin" })).toBe(
      path.join("/dev/olorin", "resources", "win32", "raw-print.ps1"),
    );
  });

  it("rewrites app.asar to app.asar.unpacked when packaged", () => {
    const resolved = resolveScriptPath({
      isPackaged: true,
      appRoot: path.join("C:", "app", "resources", "app.asar"),
    });
    expect(resolved).toContain("app.asar.unpacked");
  });

  it("invokes powershell with the helper script and arguments", async () => {
    const execFileImpl = vi.fn((file, args, callback) => callback(null, ""));
    await kick({
      filePath: "C:\\tmp\\kick.bin",
      deviceName: "EPSON TM-T88V",
      scriptPath: "C:\\app\\raw-print.ps1",
      execFileImpl,
    });
    expect(execFileImpl).toHaveBeenCalledWith(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "C:\\app\\raw-print.ps1",
        "-PrinterName",
        "EPSON TM-T88V",
        "-FilePath",
        "C:\\tmp\\kick.bin",
      ],
      expect.any(Function),
    );
  });

  it("rejects with a PrintError carrying stderr on failure", async () => {
    const execFileImpl = vi.fn((file, args, callback) => {
      const error = new Error("Command failed");
      error.stderr = "OpenPrinter failed for 'X' (error 1801)";
      callback(error);
    });
    await expect(
      kick({ filePath: "k.bin", deviceName: "X", scriptPath: "s.ps1", execFileImpl }),
    ).rejects.toMatchObject({
      name: "PrintError",
      message: expect.stringMatching(/OpenPrinter failed/),
    });
  });
});
