import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

process.env.APP_DATA_DIR ||= path.join(process.cwd(), "data", "playwright");

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } }
  ],
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_DEV_DIR: ".next-playwright", APP_DATA_DIR: process.env.APP_DATA_DIR }
  }
});
