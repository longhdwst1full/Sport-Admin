import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { branchListResponse } from '../fixtures/organization';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/organization/branches*', branchListResponse());
  await mockJson(page, '**/api/v1/admin/organization/warehouses*', { items: [], total: 0 });
});

test.describe('ORGANIZATION — Chi nhánh & kho', () => {
  test('ORG-01: Mở /organization hiển thị danh sách chi nhánh', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/organization');

    await expect(page.getByRole('heading', { name: 'Chi nhánh & kho' })).toBeVisible();
    await expect(page.getByText('Showroom Hà Nội')).toBeVisible();
    await expect(page.getByText('HN-01')).toBeVisible();
  });

  test('ORG-02: Thiếu quyền org.branch.view -> ẩn menu Chi nhánh', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Chi nhánh & kho')).toHaveCount(0);
  });
});
