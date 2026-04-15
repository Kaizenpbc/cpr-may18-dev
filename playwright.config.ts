import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://cpr.kpbc.ca';
const isLocal = BASE_URL.includes('localhost');

export default defineConfig({
  testDir: './src/tests/e2e',
  globalSetup: './playwright.global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only spin up local dev servers when testing locally
  ...(isLocal && {
    webServer: [
      {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120000,
      },
      {
        command: 'npm run dev:server',
        url: 'http://localhost:3001/health',
        reuseExistingServer: true,
        timeout: 120000,
      },
    ],
  }),
});
