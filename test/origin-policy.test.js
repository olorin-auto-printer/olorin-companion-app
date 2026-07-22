import { describe, it, expect } from "vitest";

import { isOriginAllowed } from "../src/server";

describe("isOriginAllowed", () => {
  it("allows connections without an Origin header (local tools)", () => {
    expect(isOriginAllowed(undefined)).toBe(true);
    expect(isOriginAllowed(null)).toBe(true);
    expect(isOriginAllowed("")).toBe(true);
  });

  it("allows browser extension origins", () => {
    expect(isOriginAllowed("chrome-extension://abcdefghijklmnop")).toBe(true);
    expect(isOriginAllowed("moz-extension://12345678-1234-1234-1234-123456789012")).toBe(true);
  });

  it("allows http and https origins by default", () => {
    expect(isOriginAllowed("https://staff.library.example.org")).toBe(true);
    expect(isOriginAllowed("http://koha.local:8081")).toBe(true);
  });

  it("restricts http(s) origins when an allowlist is configured", () => {
    const allowed = ["https://staff.library.example.org"];
    expect(isOriginAllowed("https://staff.library.example.org", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.example.com", allowed)).toBe(false);
  });

  it("keeps allowing extension origins when an allowlist is configured", () => {
    const allowed = ["https://staff.library.example.org"];
    expect(isOriginAllowed("chrome-extension://abcdefghijklmnop", allowed)).toBe(true);
  });

  it("ignores an empty allowlist", () => {
    expect(isOriginAllowed("https://anywhere.example.com", [])).toBe(true);
  });

  it("rejects file and null origins", () => {
    expect(isOriginAllowed("file://")).toBe(false);
    expect(isOriginAllowed("file:///Users/someone/page.html")).toBe(false);
    expect(isOriginAllowed("null")).toBe(false);
  });

  it("rejects unknown schemes", () => {
    expect(isOriginAllowed("ftp://example.com")).toBe(false);
    expect(isOriginAllowed("data:text/html,hi")).toBe(false);
  });
});
