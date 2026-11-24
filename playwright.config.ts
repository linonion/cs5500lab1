import { defineConfig, devices } from "@playwright/test";

const isContinuousIntegration = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 2 : 0,
  workers: isContinuousIntegration ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run seed && npm run dev",
      url: "http://127.0.0.1:3000/api/v1/health",
      reuseExistingServer: !isContinuousIntegration,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      cwd: "./client",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !isContinuousIntegration,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
