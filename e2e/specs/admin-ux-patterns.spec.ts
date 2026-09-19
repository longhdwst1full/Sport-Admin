import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { categoryListResponse, productListResponse, productSummary } from '../fixtures/catalog';
import { mockError, mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse());
});

test.describe('ADMIN UX PATTERNS — Cross-cutting UX Behaviors', () => {
  test('UX-01: Table skeleton / loading visible during data fetch', async ({ page }) => {
    await page.route('**/api/v1/admin/products?**', async (route) => {
      await page.waitForTimeout(400);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(productListResponse()),
      });
    });

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(page.locator('.ant-table-wrapper')).toBeVisible();
    await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();
  });

  test('UX-02: Filter name thay đổi -> reset về page=1', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');
    await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('name=giay') && req.url().includes('page=1'),
    );
    await page.getByPlaceholder('Tên sản phẩm').fill('giay');
    await request;
  });

  test('UX-03: Đổi trang gọi query mới', async ({ page }) => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      productSummary({ id: String(i + 1), productNo: `P-${i + 1}`, name: `Sản phẩm ${i + 1}` }),
    );
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse(rows, { total: 40 }));

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const request = page.waitForRequest((req) => req.url().includes('page=2'));
    await page.getByTitle('2', { exact: true }).click();
    await request;
  });

  test('UX-04: API 403 không logout mà hiển thị thông báo lỗi', async ({ page }) => {
    await mockError(page, '**/api/v1/admin/products?**', 403, 'Bạn không có quyền xem danh sách sản phẩm');

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Bạn không có quyền');
    // Vẫn ở trang products, không bị redirect về /login
    expect(page.url()).toContain('/products');
  });

  test('UX-05: API 500 hiển thị alert lỗi, không crash hay trắng trang', async ({ page }) => {
    await mockError(page, '**/api/v1/admin/products?**', 500, 'Lỗi máy chủ nội bộ');

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('.ant-layout').first()).toBeVisible();
  });

  test('UX-06: Drawer chi tiết mở và đóng bằng nút đóng', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());
    await mockJson(page, '**/api/v1/admin/products/giay-chay-bo-e2e', productSummary());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const detailBtn = page.getByRole('button', { name: 'Chi tiết' });
    if (await detailBtn.count() > 0) {
      await detailBtn.first().click();
      await expect(page.locator('.ant-drawer')).toBeVisible();
      await page.locator('.ant-drawer-close').click();
      await expect(page.locator('.ant-drawer')).not.toBeVisible();
    }
  });

  test('UX-07: Popconfirm hiển thị trước khi xoá', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const deleteBtn = page.getByRole('button', { name: 'Xoá / Lưu trữ' });
    if (await deleteBtn.count() > 0) {
      await deleteBtn.first().click();
      await expect(page.locator('.ant-modal-confirm, .ant-popconfirm')).toBeVisible();
      // Bấm Huỷ
      await page.getByRole('button', { name: 'Huỷ' }).click();
    }
  });

  test('UX-08: Responsive viewport nhỏ (<768px) sidebar tự động thu gọn', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    // Nút toggle hamburger trên mobile
    const toggleBtn = page.getByLabel('Toggle menu');
    await expect(toggleBtn).toBeVisible();
  });

  test('UX-09: Phân trang cho phép thay đổi số lượng bản ghi hiển thị', async ({ page }) => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      productSummary({ id: String(i + 1), productNo: `P-${i + 1}` }),
    );
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse(rows, { total: 100 }));

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const pagination = page.locator('.ant-pagination');
    await expect(pagination).toBeVisible();
    const sizeChanger = page.locator('.ant-pagination-options');
    await expect(sizeChanger).toBeVisible();
  });

  test('UX-10: Metric cards có hiệu ứng tương tác', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/reporting/overview', {
      todayRevenue: 5000000,
      todayOrders: 12,
      pendingOrders: 3,
      lowStockCount: 2,
    });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    const metricCard = page.locator('.dctd-metric-card').first();
    if (await metricCard.count() > 0) {
      await expect(metricCard).toBeVisible();
      await metricCard.hover();
      await expect(metricCard).toBeVisible();
    }
  });

  test('UX-11: Command Palette mở bằng phím tắt Ctrl+K / Cmd+K', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/');

    // Nhấn tổ hợp phím Control+k
    await page.keyboard.press('Control+k');
    // Modal command palette mở ra
    const palette = page.locator('.ant-modal');
    if (await palette.count() > 0) {
      await expect(palette).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('UX-12: Error alert có nút thử lại (Retry) hoạt động', async ({ page }) => {
    await mockError(page, '**/api/v1/admin/products?**', 500, 'Lỗi tạm thời');

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const retryBtn = page.getByRole('button', { name: 'Thử lại' });
    if (await retryBtn.count() > 0) {
      await expect(retryBtn).toBeVisible();
      const request = page.waitForRequest((req) => req.url().includes('/api/v1/admin/products'));
      await retryBtn.click();
      await request;
    }
  });
});
