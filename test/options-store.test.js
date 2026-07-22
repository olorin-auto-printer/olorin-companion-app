import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createOptionsStore } from "../src/options-store";

describe("options-store", () => {
  let root;
  let appPaths;
  let originalCwd;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "olorin-options-"));
    appPaths = {
      home: path.join(root, "home"),
      appData: path.join(root, "appData"),
      userData: path.join(root, "userData"),
      sessionData: path.join(root, "sessionData"),
    };
    for (const dir of Object.values(appPaths)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  function makeStore(overrides = {}) {
    return createOptionsStore({
      envPath: undefined,
      appPaths,
      platform: "darwin",
      logger: { warn: vi.fn() },
      ...overrides,
    });
  }

  it("defaults to the userData directory when no file exists", () => {
    const store = makeStore();
    expect(store.resolvePath()).toBe(path.join(appPaths.userData, "olorin_options.json"));
  });

  it("finds an existing file in the home directory", () => {
    const homeFile = path.join(appPaths.home, "olorin_options.json");
    fs.writeFileSync(homeFile, "{}");
    const store = makeStore();
    expect(store.resolvePath()).toBe(homeFile);
  });

  it("prefers the last existing path in the search order", () => {
    const homeFile = path.join(appPaths.home, "olorin_options.json");
    const userDataFile = path.join(appPaths.userData, "olorin_options.json");
    fs.writeFileSync(homeFile, JSON.stringify({ from: "home" }));
    fs.writeFileSync(userDataFile, JSON.stringify({ from: "userData" }));
    const store = makeStore();
    expect(store.resolvePath()).toBe(userDataFile);
    expect(store.load()).toEqual({ from: "userData" });
  });

  it("finds a file relative to the current working directory", () => {
    const cwdDir = path.join(root, "cwd");
    fs.mkdirSync(cwdDir);
    fs.writeFileSync(path.join(cwdDir, "olorin_options.json"), JSON.stringify({ from: "cwd" }));
    process.chdir(cwdDir);
    const store = makeStore();
    expect(store.load()).toEqual({ from: "cwd" });
  });

  it("uses only the env path when OLORIN_CONFIG_FILE is set", () => {
    const envFile = path.join(root, "custom.json");
    const homeFile = path.join(appPaths.home, "olorin_options.json");
    fs.writeFileSync(homeFile, JSON.stringify({ from: "home" }));

    const store = makeStore({ envPath: envFile });
    // The env path wins even though it doesn't exist yet
    expect(store.resolvePath()).toBe(envFile);
    expect(store.load()).toEqual({});

    store.save({ from: "env" });
    expect(store.load()).toEqual({ from: "env" });
    expect(JSON.parse(fs.readFileSync(envFile, "utf8"))).toEqual({ from: "env" });
  });

  it("returns an empty object when no file exists", () => {
    const store = makeStore();
    expect(store.load()).toEqual({});
  });

  it("returns an empty object and warns on corrupt JSON", () => {
    const logger = { warn: vi.fn() };
    fs.writeFileSync(path.join(appPaths.userData, "olorin_options.json"), "{not json");
    const store = makeStore({ logger });
    expect(store.load()).toEqual({});
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("round-trips saved options", () => {
    const store = makeStore();
    const options = { receipt_printer: "EPSON TM-T88V", receipt_printer_width: "3.125" };
    const savedTo = store.save(options);
    expect(savedTo).toBe(path.join(appPaths.userData, "olorin_options.json"));
    expect(store.load()).toEqual(options);
  });

  it("saves back to the file it found", () => {
    const homeFile = path.join(appPaths.home, "olorin_options.json");
    fs.writeFileSync(homeFile, JSON.stringify({ from: "home" }));
    const store = makeStore();
    store.save({ updated: true });
    expect(JSON.parse(fs.readFileSync(homeFile, "utf8"))).toEqual({ updated: true });
  });
});
