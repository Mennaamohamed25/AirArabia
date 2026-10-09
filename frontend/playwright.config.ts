import { defineConfig, devices } from '@playwright/test'

const API = 'http://localhost:5081'
const WEB = 'http://localhost:5174'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // One shared database: flows run in order.
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB,
    geolocation: { latitude: 30.0444, longitude: 31.2357 },
    permissions: ['geolocation'],
    locale: 'en-US',
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `dotnet run --no-launch-profile --urls ${API}`,
      cwd: '../backend/RideTracker.Api',
      url: `${API}/api/health`,
      env: { ASPNETCORE_ENVIRONMENT: 'E2E' },
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev:e2e',
      url: WEB,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
})
