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
];
