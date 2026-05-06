/**
 * ESLint flat config for 9Trip B2C Back-End (Firebase Cloud Functions).
 * Node.js + CommonJS environment — no React/Next.js rules needed.
 */
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script", // CommonJS
      globals: {
        console: "readonly",
        process: "readonly",
        module: "writable",
        require: "readonly",
        exports: "writable",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        URL: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        Intl: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
  {
    ignores: ["node_modules/**", "eslint.config.mjs"],
  },
];
