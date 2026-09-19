import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { orderListResponse, orderSummary } from '../fixtures/orders';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
});

test.describe('ORDERS — Danh sách đơn hàng', () => {
  test('ORD-01: Mở /orders có dữ liệu -> bảng hiển thị mã đơn, trạng thái, tổng tiền', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/orders?**', orderListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/orders');

    await expect(page.getByRole('heading', { name: 'Quản lý đơn hàng' })).toBeVisible();
    await expect(page.getByText('ORD-20260901-001')).toBeVisible();
    await expect(page.getByText('Nguyễn Văn A')).toBeVisible();
    await expect(page.locator('.ant-table-tbody').getByText('1.500.000')).toBeVisible();
  });

  test('ORD-02: Lọc theo tab trạng thái -> gửi query statusGroup', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/orders?**', orderListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/orders');
    await expect(page.getByText('ORD-20260901-001')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/orders') && req.url().includes('statusGroup=CONFIRMED'),
    );
    await page.getByRole('tab', { name: 'Đã xác nhận' }).click();
    await request;
  });

  test('ORD-03: Tìm kiếm theo mã đơn -> gửi query orderNo', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/orders?**', orderListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/orders');
    await expect(page.getByText('ORD-20260901-001')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/orders') && req.url().includes('orderNo=ORD-999'),
    );
    await page.getByPlaceholder('Mã đơn').fill('ORD-999');
    await request;
  });

  test('ORD-04: Thiếu quyền order.view -> không thấy menu Đơn hàng', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Đơn hàng')).toHaveCount(0);
  });

  test('ORD-05: Đổi trang -> gọi lại API với page mới', async ({ page }) => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      orderSummary({ id: String(i + 1), orderNo: `ORD-20260901-${String(i + 1).padStart(3, '0')}` }),
    );
    await mockJson(page, '**/api/v1/admin/orders?**', orderListResponse(rows, { total: 50 }));

    const shell = new AdminShellPage(page);
    await shell.open('/orders');
    await expect(page.getByText('ORD-20260901-001')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/orders') && req.url().includes('page=2'),
    );
    await page.getByTitle('2', { exact: true }).click();
    await request;
  });
});
