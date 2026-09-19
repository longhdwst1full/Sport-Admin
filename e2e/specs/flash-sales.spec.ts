import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { flashSaleListResponse } from '../fixtures/flash-sales';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/promotions/flash-sales?**', flashSaleListResponse());
});

test.describe('FLASH SALES — Quản lý Flash Sale', () => {
  test('FS-01: Mở /flash-sales hiển thị danh sách chiến dịch', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/flash-sales');

    await expect(page.getByRole('heading', { name: 'Flash Sale' })).toBeVisible();
    await expect(page.getByText('FS-202609-001')).toBeVisible();
    await expect(page.getByText('Flash Sale Tháng 9')).toBeVisible();
  });

  test('FS-02: Tìm kiếm chiến dịch gửi param search', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/flash-sales');
    await expect(page.getByText('Flash Sale Tháng 9')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/promotions/flash-sales') && req.url().includes('search='),
    );
    await page.getByPlaceholder('Mã hoặc tên chiến dịch').fill('Tháng 9');
    await request;
  });

  test('FS-03: Thiếu quyền catalog.flash_sale.view -> ẩn menu Flash Sale', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Flash Sale')).toHaveCount(0);
  });
});
