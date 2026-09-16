import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5199';

export default defineConfig({
  testDir: './e2e/specs',
  outputDir: './e2e/.artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    testIdAttribute: 'data-testid',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        // Mặc định chạy trên bản build (`vite preview`): gần production và không
        // cần file watcher — máy dev dễ chạm trần `fs.inotify.max_user_watches`.
        // Đặt E2E_DEV=1 để dùng dev server khi cần sửa UI và chạy lại nhanh.
        command: process.env.E2E_DEV
          ? 'vite --host 127.0.0.1 --port 5199 --strictPort --mode e2e'
          : 'vite build --mode e2e && vite preview --host 127.0.0.1 --port 5199 --strictPort',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
