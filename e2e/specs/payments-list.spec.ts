import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { paymentListResponse } from '../fixtures/payments';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/payments?**', paymentListResponse());
});

test.describe('PAYMENTS — Quản lý thanh toán', () => {
  test('PAY-01: Mở /payments hiển thị danh sách thanh toán', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/payments');

    await expect(page.getByRole('heading', { name: 'Thanh toán' })).toBeVisible();
    await expect(page.getByText('PAY-20260901-001')).toBeVisible();
    await expect(page.getByText('ORD-20260901-001')).toBeVisible();
  });

  test('PAY-02: Tìm kiếm thanh toán gửi param search', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/payments');
    await expect(page.getByText('PAY-20260901-001')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/payments') && req.url().includes('search='),
    );
    await page.getByPlaceholder('Mã thanh toán, mã đơn, tên hoặc SĐT').fill('PAY-2026');
    await request;
  });

  test('PAY-03: Thiếu quyền payment.view -> ẩn menu Thanh toán', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Thanh toán')).toHaveCount(0);
  });
});
