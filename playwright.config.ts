import { defineConfig } from "@playwright/test";

const port = 4319;

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: `http://127.0.0.1:${port}/` },
  webServer: {
    command: `npx vite preview --port ${port} --strictPort --host 127.0.0.1`,
    port,
    reuseExistingServer: false,
  },
});
