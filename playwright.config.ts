import { defineConfig, devices } from "@playwright/test";
import { databaseUrl, workspaceRoot } from "./tests/e2e/runtime";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.pw\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: { baseURL: "http://127.0.0.1:3100", trace: "on-first-retry", ...devices["Desktop Chrome"] },
  webServer: {
    command: "node tests/e2e/prepare-db.mjs && bunx next dev -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { DATABASE_URL: databaseUrl, VYRA_WORKSPACE_ROOT: workspaceRoot, VYRA_TEST_DB_PATH: databaseUrl.slice(5), VYRA_TEST_WORKSPACE: workspaceRoot, VYRA_TEST_MODE: "1" },
  },
});
