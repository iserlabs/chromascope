import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: "visual-regression.test.ts",
  timeout: 120_000,
  workers: 1,
});
