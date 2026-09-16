import type { Page, Route } from '@playwright/test';

/** Prefix chung của mọi endpoint Admin (khớp `src/lib/api/fetcher.ts`). */
export const ADMIN_API = '**/api/v1/admin';

export type JsonBody = Record<string, unknown> | unknown[];

export interface MockOptions {
  status?: number;
  /** Số lần trả về trước khi nhả cho handler kế tiếp. */
  times?: number;
  /** Delay (ms) để test skeleton/loading. */
  delayMs?: number;
}

/**
 * Đăng ký một stub JSON cho một glob URL.
 * Dùng cho e2e chạy không cần backend (project `mocked`).
 */
export async function mockJson(
  page: Page,
  urlGlob: string,
  body: JsonBody,
  options: MockOptions = {},
): Promise<void> {
  const { status = 200, times, delayMs } = options;
  await page.route(
    urlGlob,
    async (route: Route) => {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    },
    times ? { times } : undefined,
  );
}

/** Lỗi theo `ErrorResponseDto` của API. */
export async function mockError(
  page: Page,
  urlGlob: string,
  status: number,
  message = 'Lỗi hệ thống',
  options: Omit<MockOptions, 'status'> = {},
): Promise<void> {
  await mockJson(
    page,
    urlGlob,
    { statusCode: status, code: `E2E_${status}`, message, details: [] },
    { ...options, status },
  );
}

/** Chặn mọi request Admin chưa được stub để test không rò rỉ ra backend thật. */
export async function blockUnmockedAdminApi(page: Page): Promise<void> {
  await page.route(`${ADMIN_API}/**`, async (route) => {
    await route.fulfill({
      status: 501,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 501,
        message: `E2E: endpoint chưa được mock -> ${route.request().url()}`,
      }),
    });
  });
}
