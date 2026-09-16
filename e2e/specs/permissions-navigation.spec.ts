import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { PERMISSION_SETS } from '../fixtures/permissions';
import { categoryListResponse, productListResponse } from '../fixtures/catalog';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.describe('RBAC — Menu và route theo quyền', () => {
  test('RBAC-01: chỉ có catalog.product.view -> thấy Sản phẩm, không thấy Đơn hàng', async ({
    page,
  }) => {
    await seedSession(page, { permissions: PERMISSION_SETS.catalogViewer });
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());
    await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(shell.pageTitle('Sản phẩm')).toBeVisible();
    await expect(shell.menuItem('Đơn hàng')).toHaveCount(0);
  });

  test('RBAC-02: vào route không có quyền -> không render nội dung trang đó', async ({ page }) => {
    await seedSession(page, { permissions: PERMISSION_SETS.catalogViewer });

    const shell = new AdminShellPage(page);
    await shell.open('/roles');

    await expect(shell.pageTitle('Vai trò')).toHaveCount(0);
  });

  test('RBAC-03: nút hành động bị ẩn khi thiếu quyền manage', async ({ page }) => {
    await seedSession(page, { permissions: PERMISSION_SETS.catalogViewer });
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());
    await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(shell.pageTitle('Sản phẩm')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thêm sản phẩm' })).toHaveCount(0);
  });
});
