import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { inventoryListResponse } from '../fixtures/inventory';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/inventory/balances?**', inventoryListResponse());
  await mockJson(page, '**/api/v1/admin/warehouses?**', { items: [{ code: 'WH-HN', name: 'Kho Hà Nội' }] });
});

test.describe('INVENTORY — Quản lý tồn kho & sổ kho', () => {
  test('INV-01: Mở /inventory hiển thị tồn kho và tên sản phẩm', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/inventory');

    await expect(page.getByRole('heading', { name: 'Tồn kho & Sổ kho' })).toBeVisible();
    await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();
    await expect(page.getByText('SKU-001')).toBeVisible();
  });

  test('INV-02: Tìm kiếm theo từ khóa gửi param search', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/inventory');
    await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/inventory/balances') && req.url().includes('search='),
    );
    await page.getByPlaceholder('Tìm SKU hoặc tên sản phẩm...').fill('Giày');
    await request;
  });

  test('INV-03: Thiếu quyền inventory.stock.view -> ẩn menu Kho hàng', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Kho hàng')).toHaveCount(0);
  });
});
