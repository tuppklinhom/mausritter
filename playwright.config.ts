import { defineConfig } from "@playwright/test";

// Tests run their own dev server on a separate port, so they never reuse
// (or get stuck behind) a server someone is playing on at :5173.
const PORT = 5199;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
