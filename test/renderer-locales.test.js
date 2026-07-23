import { describe, it, expect } from "vitest";

import { RENDERER_LOCALES, pickLocale } from "../src/renderer-locales";

describe("renderer locales", () => {
  const enKeys = Object.keys(RENDERER_LOCALES.en).sort();

  it("fr covers exactly the en key set", () => {
    expect(Object.keys(RENDERER_LOCALES.fr).sort()).toEqual(enKeys);
  });

  it("es covers exactly the en key set", () => {
    expect(Object.keys(RENDERER_LOCALES.es).sort()).toEqual(enKeys);
  });

  it("has a non-empty string for every key in every locale", () => {
    for (const table of Object.values(RENDERER_LOCALES)) {
      for (const [key, value] of Object.entries(table)) {
        expect(typeof value, key).toBe("string");
        expect(value.length, key).toBeGreaterThan(0);
      }
    }
  });

  it("keeps substitution placeholders consistent across locales", () => {
    const placeholders = (s) => (s.match(/\{[a-z]+\}/gi) || []).sort();
    for (const key of enKeys) {
      const expected = placeholders(RENDERER_LOCALES.en[key]);
      expect(placeholders(RENDERER_LOCALES.fr[key]), key).toEqual(expected);
      expect(placeholders(RENDERER_LOCALES.es[key]), key).toEqual(expected);
    }
  });
});

describe("pickLocale", () => {
  it("maps language prefixes to a supported locale", () => {
    expect(pickLocale("fr")).toBe("fr");
    expect(pickLocale("fr-FR")).toBe("fr");
    expect(pickLocale("fr_CA")).toBe("fr");
    expect(pickLocale("es-419")).toBe("es");
    expect(pickLocale("en-US")).toBe("en");
  });

  it("defaults to en for unknown or missing locales", () => {
    expect(pickLocale("de-DE")).toBe("en");
    expect(pickLocale("")).toBe("en");
    expect(pickLocale(undefined)).toBe("en");
  });
});
