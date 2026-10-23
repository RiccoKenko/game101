import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 150_000,
  use: {
    // iPhone 15 held sideways.
    viewport: { width: 852, height: 393 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    baseURL: 'http://localhost:5179',
    launchOptions: {
      ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [{ name: 'iphone-landscape', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npx vite --port 5179 --strictPort',
    url: 'http://localhost:5179',
    reuseExistingServer: true,
  },
});
