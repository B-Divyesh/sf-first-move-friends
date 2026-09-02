import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: [
    {
      command: 'VITE_ROOM_API_URL=http://127.0.0.1:4174 npm run build && npm run preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false
    },
    {
      command: 'DATA_DIR=.test-data PORT=4174 node realtime/server.mjs',
      url: 'http://127.0.0.1:4174/health',
      reuseExistingServer: false
    }
  ]
});
