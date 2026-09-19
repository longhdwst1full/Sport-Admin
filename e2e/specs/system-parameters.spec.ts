import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { systemParamListResponse } from '../fixtures/system-params';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/system/parameters?**', systemParamListResponse());
});

test.describe('SYSTEM PARAMETERS — Tham số hệ thống', () => {
  test('SYS-01: Mở /system-parameters hiển thị danh sách tham số', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/system-parameters');

    await expect(page.getByRole('heading', { name: 'Tham số hệ thống' })).toBeVisible();
    await expect(page.getByText('MAX_CART_ITEMS')).toBeVisible();
    await expect(page.getByText('Số lượng tối đa trong giỏ')).toBeVisible();
  });

  test('SYS-02: Tìm theo mã hoặc mô tả gửi param search', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/system-parameters');
    await expect(page.getByText('MAX_CART_ITEMS')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/system/parameters') && req.url().includes('search='),
    );
    await page.getByPlaceholder('Mã hoặc tên tham số').fill('CART');
    await request;
  });

  test('SYS-03: Thiếu quyền system.parameter.view -> ẩn menu Tham số hệ thống', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Tham số hệ thống')).toHaveCount(0);
  });
});
