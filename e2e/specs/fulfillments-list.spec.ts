import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { fulfillmentListResponse } from '../fixtures/fulfillments';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/fulfillments?**', fulfillmentListResponse());
});

test.describe('FULFILLMENTS — Quản lý giao vận', () => {
  test('FUL-01: Mở /fulfillments hiển thị danh sách giao vận', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/fulfillments');

    await expect(page.getByRole('heading', { name: 'Giao vận' })).toBeVisible();
    await expect(page.getByText('FUL-20260901-001')).toBeVisible();
    await expect(page.getByText('Kho Hà Nội')).toBeVisible();
  });

  test('FUL-02: Thiếu quyền fulfillment.view -> ẩn menu Giao vận', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Giao vận')).toHaveCount(0);
  });
});
