import { defineConfig, devices } from '@playwright/test';

/**
 * M10 end-to-end + cross-device matrix.
 *
 * The suite runs against a real production build in DEMO mode (`NEXT_PUBLIC_MAP_DEMO=true`)
 * so every flow is exercised with no backend, Mapbox token, or Clerk keys — the same offline
 * demo surface the whole app was built against. The webServer builds and starts itself, so
 * `npx playwright test` is fully self-contained.
 *
 * Cross-device matrix: Desktop Chrome + Pixel 5 (Android) + iPhone 13 (iOS Safari engine).
 */
const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

const demoEnv = {
  NEXT_PUBLIC_MAP_DEMO: 'true',
  NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1',
  NEXT_PUBLIC_SOCKET_URL: 'http://localhost:8080',
  PORT: String(PORT),
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    // Dark is the app's default theme (tokens §2.7); audit it too for contrast.
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
    { name: 'mobile-android', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-ios', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: baseURL,
    env: demoEnv,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
