import js from "@eslint/js";
import tseslint from "typescript-eslint";

const NODE_GLOBALS = {
  require: "readonly",
  module: "readonly",
  exports: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  console: "readonly",
  process: "readonly",
  Buffer: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  setImmediate: "readonly",
  URL: "readonly",
};

const BROWSER_GLOBALS = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  IntersectionObserver: "readonly",
  ResizeObserver: "readonly",
  MutationObserver: "readonly",
};

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Node.js scripts (build, packaging, smoke tests) — CommonJS or ESM
    files: [
      "scripts/**/*.{js,mjs,cjs}",
      "plugins/photoshop/scripts/**/*.{js,mjs,cjs}",
      "tests/e2e/**/*.{js,mjs,cjs}",
    ],
    languageOptions: {
      globals: NODE_GLOBALS,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Static-site scripts loaded directly into browser
    files: ["web/**/*.js"],
    languageOptions: {
      globals: BROWSER_GLOBALS,
      sourceType: "script",
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Vite/Playwright config files — Node ESM
    files: ["**/*.config.{js,mjs,cjs,ts}", "**/playwright.config.{ts,js}", "**/vite.config.{ts,js}"],
    languageOptions: {
      globals: NODE_GLOBALS,
      sourceType: "module",
    },
  },
  {
    files: ["plugins/photoshop/src/**/*.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        console: "readonly",
        window: "readonly",
        document: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        btoa: "readonly",
        atob: "readonly",
        CanvasRenderingContext2D: "readonly",
        Uint8Array: "readonly",
        Uint8ClampedArray: "readonly",
        Uint32Array: "readonly",
        Float32Array: "readonly",
        Float64Array: "readonly",
        // ChromascopeCore is the IIFE exported by the bundled core HTML at runtime.
        ChromascopeCore: "readonly",
      },
      sourceType: "commonjs",
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-redeclare": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    ignores: [
      "**/build/**",
      "**/build-lib/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/core/scope-bundle.js",
      "**/core/index.html",
      "**/target/**",
      "**/test-results/**",
      "**/*.test.*",
      "**/__tests__/**",
    ],
  },
];
