import { describe, it, expect } from "vitest";

import {
  MM_PER_INCH,
  inchesToMm,
  mmToInches,
  toDisplay,
  toStored,
  PAPER_PRESETS,
  getPreset,
} from "../src/units";

describe("unit conversion", () => {
  it("converts inches to millimeters rounded to 1 decimal", () => {
    expect(inchesToMm(1)).toBe(25.4);
    expect(inchesToMm(3.15)).toBe(80.0); // 80.01 exactly, rounds to 80
    expect(inchesToMm("2.25")).toBe(57.2); // 57.15 rounds up
    expect(inchesToMm(0)).toBe(0);
  });

  it("converts millimeters to inches rounded to 3 decimals", () => {
    expect(mmToInches(25.4)).toBe(1);
    expect(mmToInches(80)).toBe(3.15);
    expect(mmToInches("10")).toBe(0.394);
    expect(mmToInches(0)).toBe(0);
  });

  it("returns undefined for non-numeric conversion input", () => {
    expect(inchesToMm("abc")).toBeUndefined();
    expect(inchesToMm("")).toBeUndefined();
    expect(mmToInches(undefined)).toBeUndefined();
  });

  it("round-trips inches through millimeters and back", () => {
    // Values that land on a clean tenth of a millimeter survive exactly.
    for (const inches of [1, 2.24, 3.15, 8.5, 11]) {
      expect(mmToInches(inchesToMm(inches))).toBe(inches);
    }
    // Others can move by at most half of the 0.1 mm display precision.
    for (const inches of [2.25, 8.27, 11.69]) {
      expect(mmToInches(inchesToMm(inches))).toBeCloseTo(inches, 2);
    }
  });

  it("round-trips millimeters through inches and back", () => {
    for (const mm of [10, 25.4, 57, 80, 210]) {
      expect(inchesToMm(mmToInches(mm))).toBe(mm);
    }
  });

  it("exposes the conversion factor", () => {
    expect(MM_PER_INCH).toBe(25.4);
  });
});

describe("toDisplay", () => {
  it("passes inch values through in inch mode", () => {
    expect(toDisplay("3.15", "in")).toBe("3.15");
    expect(toDisplay(11, "in")).toBe("11");
  });

  it("converts stored inches to millimeters in mm mode", () => {
    expect(toDisplay("3.15", "mm")).toBe("80");
    expect(toDisplay("1", "mm")).toBe("25.4");
  });

  it("maps blank and invalid values to the empty string", () => {
    expect(toDisplay("", "in")).toBe("");
    expect(toDisplay(undefined, "mm")).toBe("");
    expect(toDisplay(null, "in")).toBe("");
    expect(toDisplay("junk", "mm")).toBe("");
  });
});

describe("toStored", () => {
  it("keeps inch input untouched in inch mode", () => {
    expect(toStored("3.15", "in")).toBe("3.15");
    expect(toStored("3.150", "in")).toBe("3.150");
  });

  it("converts mm input to inches with 3 decimals", () => {
    expect(toStored("80", "mm")).toBe("3.15");
    expect(toStored("57", "mm")).toBe("2.244");
    expect(toStored("25.4", "mm")).toBe("1");
  });

  it("maps blank and invalid values to the empty string", () => {
    expect(toStored("", "mm")).toBe("");
    expect(toStored("  ", "in")).toBe("");
    expect(toStored(undefined, "in")).toBe("");
    expect(toStored("junk", "mm")).toBe("");
  });
});

describe("paper presets", () => {
  it("looks up a preset by id", () => {
    expect(getPreset("receipt_80mm")).toMatchObject({ width: 3.15, height: 11 });
    expect(getPreset("dymo_30252")).toMatchObject({ width: 1.13, height: 3.5 });
    expect(getPreset("letter")).toMatchObject({ width: 8.5, height: 11 });
  });

  it("returns undefined for an unknown id", () => {
    expect(getPreset("no_such_preset")).toBeUndefined();
    expect(getPreset("")).toBeUndefined();
  });

  it("defines every preset in inches with an id and a label", () => {
    expect(PAPER_PRESETS).toHaveLength(7);
    for (const preset of PAPER_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
      // Sanity: nothing wider than a full sheet — these are inches, not mm.
      expect(preset.width).toBeLessThanOrEqual(8.5);
    }
  });
});
