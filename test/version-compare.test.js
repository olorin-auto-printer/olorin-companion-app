import { describe, it, expect } from "vitest";

import { compareVersions } from "../src/version-compare";

describe("compareVersions", () => {
  it("orders minor above patch", () => {
    expect(compareVersions("2.1.0", "2.0.1")).toBe(1);
    expect(compareVersions("2.0.1", "2.1.0")).toBe(-1);
  });

  it("returns 0 for equal versions", () => {
    expect(compareVersions("2.1.0", "2.1.0")).toBe(0);
    expect(compareVersions("0.0.0", "0.0.0")).toBe(0);
  });

  it("compares numerically, not lexically", () => {
    expect(compareVersions("10.0.0", "9.9.9")).toBe(1);
    expect(compareVersions("2.0.10", "2.0.9")).toBe(1);
  });

  it("orders major above everything", () => {
    expect(compareVersions("3.0.0", "2.99.99")).toBe(1);
    expect(compareVersions("1.99.99", "2.0.0")).toBe(-1);
  });

  it("treats missing segments as zero", () => {
    expect(compareVersions("2.1", "2.1.0")).toBe(0);
    expect(compareVersions("2.1.1", "2.1")).toBe(1);
  });

  it("tolerates a leading v", () => {
    expect(compareVersions("v2.1.0", "2.0.1")).toBe(1);
    expect(compareVersions("2.1.0", "v2.1.0")).toBe(0);
  });
});
