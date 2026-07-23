// Unit conversion and paper-size preset helpers for the control panel.
//
// Stored option values are ALWAYS inches — the WebSocket protocol and the
// browser extension expect inches, so millimeters exist only at the UI edge:
// convert to mm for display, convert back to inches before saving.
//
// Dual-environment module: loaded as a plain <script> by the renderer (where
// it attaches window.OlorinUnits) and required as CommonJS by the unit tests.
(function () {
  const MM_PER_INCH = 25.4;

  function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  // Inches -> millimeters, rounded to 1 decimal (mm needs no more precision).
  function inchesToMm(inches) {
    const n = parseFloat(inches);
    if (!Number.isFinite(n)) {
      return undefined;
    }
    return roundTo(n * MM_PER_INCH, 1);
  }

  // Millimeters -> inches, rounded to 3 decimals (enough that a mm value
  // round-trips: 80 mm -> 3.15 in -> 80.0 mm).
  function mmToInches(mm) {
    const n = parseFloat(mm);
    if (!Number.isFinite(n)) {
      return undefined;
    }
    return roundTo(n / MM_PER_INCH, 3);
  }

  // Stored value (inches) -> string for a number input in the active unit.
  // Blank and non-numeric values become "" so they clear the field.
  function toDisplay(storedInches, units) {
    if (storedInches === undefined || storedInches === null) {
      return "";
    }
    const n = parseFloat(storedInches);
    if (!Number.isFinite(n)) {
      return "";
    }
    return String(units === "mm" ? inchesToMm(n) : n);
  }

  // Number-input value in the active unit -> string to store (inches).
  // Inch values pass through untouched so saving never rewrites them.
  function toStored(displayValue, units) {
    if (displayValue === undefined || displayValue === null) {
      return "";
    }
    const raw = String(displayValue).trim();
    if (raw === "") {
      return "";
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) {
      return "";
    }
    return units === "mm" ? String(mmToInches(n)) : raw;
  }

  // Common paper sizes; width/height are inches (the stored unit).
  const PAPER_PRESETS = [
    { id: "receipt_80mm", label: "80mm receipt", width: 3.15, height: 11 },
    { id: "receipt_57mm", label: "57mm receipt", width: 2.24, height: 11 },
    { id: "dymo_30252", label: "DYMO 30252 address label", width: 1.13, height: 3.5 },
    { id: "dymo_30256", label: "DYMO 30256 shipping label", width: 2.31, height: 4 },
    { id: "barcode_label", label: "Barcode label", width: 2.25, height: 1.25 },
    { id: "a4", label: "A4", width: 8.27, height: 11.69 },
    { id: "letter", label: "Letter", width: 8.5, height: 11 },
  ];

  function getPreset(id) {
    return PAPER_PRESETS.find((preset) => preset.id === id);
  }

  const OlorinUnits = {
    MM_PER_INCH,
    inchesToMm,
    mmToInches,
    toDisplay,
    toStored,
    PAPER_PRESETS,
    getPreset,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = OlorinUnits;
  }
  if (typeof window !== "undefined") {
    window.OlorinUnits = OlorinUnits;
  }
})();
