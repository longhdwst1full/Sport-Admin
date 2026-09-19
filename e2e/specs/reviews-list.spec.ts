import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { reviewListResponse } from '../fixtures/reviews';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/reviews**', reviewListResponse());
});

test.describe('REVIEWS — Quản lý đánh giá sản phẩm', () => {
  test('REV-01: Mở /reviews hiển thị danh sách đánh giá', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/reviews');

    await expect(page.getByRole('heading', { name: 'Đánh giá & Nhận xét' })).toBeVisible();
    await expect(page.getByText('Nguyễn Văn B')).toBeVisible();
    await expect(page.getByText('Giày êm, vừa vặn, giao hàng nhanh.')).toBeVisible();
  });

  test('REV-02: Rating hiển thị dạng sao và trạng thái hiển thị', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/reviews');

    await expect(page.locator('.ant-rate')).toBeVisible();
    await expect(page.locator('.ant-table-tbody').getByText('Đang hiển thị')).toBeVisible();
  });

  test('REV-03: Thiếu quyền catalog.review.view -> ẩn menu Đánh giá', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Đánh giá')).toHaveCount(0);
  });
});
