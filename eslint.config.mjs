import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/", "out/", "dist/", "resources/"],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.mjs", "test/**/*.js"],
    languageOptions: {
      sourceType: "module",
    },
  },
  {
    // renderer.js is a browser script; units.js is dual-environment (browser
    // <script> and CommonJS for tests) so it needs both global sets.
    files: ["src/renderer.js", "src/units.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
