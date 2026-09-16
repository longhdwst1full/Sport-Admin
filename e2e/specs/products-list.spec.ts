import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { categoryListResponse, productListResponse, productSummary } from '../fixtures/catalog';
import { mockError, mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse());
});

test.describe('CATALOG — Danh sách sản phẩm', () => {
  test('PRD-01: có dữ liệu -> hiển thị đúng dòng', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(shell.pageTitle('Sản phẩm')).toBeVisible();
    await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();
  });

  test('PRD-02: rỗng -> hiển thị trạng thái không có dữ liệu', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse([], { total: 0 }));

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(page.locator('.ant-empty-description').first()).toBeVisible();
  });

  test('PRD-03: API lỗi -> hiển thị thông báo lỗi, không trắng trang', async ({ page }) => {
    await mockError(page, '**/api/v1/admin/products?**', 500, 'Không tải được danh sách sản phẩm');

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(shell.pageTitle('Sản phẩm')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Không tải được danh sách sản phẩm');
  });

  test('PRD-04: tìm theo tên -> gửi query `name` sau debounce', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');
    await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/products') && req.url().includes('name='),
    );
    await page.getByPlaceholder('Tên sản phẩm').fill('giày');
    const url = new URL((await request).url());
    expect(url.searchParams.get('name')).toBe('giày');
    expect(url.searchParams.get('page')).toBe('1');
  });

  test('PRD-05: đổi trang -> gọi lại API với page mới', async ({ page }) => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      productSummary({ id: String(i + 1), productNo: `P-${i + 1}`, name: `Sản phẩm ${i + 1}` }),
    );
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse(rows, { total: 45 }));

    const shell = new AdminShellPage(page);
    await shell.open('/products');
    await expect(page.getByText('Sản phẩm 1', { exact: true })).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/products') && req.url().includes('page=2'),
    );
    await page.getByTitle('2', { exact: true }).click();
    await request;
  });
});
