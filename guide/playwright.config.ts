import { defineConfig } from "@playwright/test";

// Captures the screenshots used by the illustrated guide (guide/index.html).
// Run: npm run guide:shots
const PORT = 5198;

export default defineConfig({
  testDir: ".",
  testMatch: "shots.spec.ts",
  timeout: 240_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 960 },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 90_000,
    cwd: "..",
  },
});
