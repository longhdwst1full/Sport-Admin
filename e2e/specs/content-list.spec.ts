import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { contentListResponse } from '../fixtures/content';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/content/posts**', contentListResponse());
});

test.describe('CONTENT — Quản lý bài viết & CMS', () => {
  test('CMS-01: Mở /content hiển thị danh sách bài viết', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/content');

    await expect(page.getByRole('heading', { name: 'Bài viết & Tin tức' })).toBeVisible();
    await expect(page.getByText('Hướng dẫn chọn giày chạy bộ')).toBeVisible();
  });

  test('CMS-02: Bảng bài viết hiển thị tiêu đề, trạng thái xuất bản', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/content');

    await expect(page.getByText('Đang xuất bản')).toBeVisible();
  });

  test('CMS-03: Thiếu quyền content.post.view -> ẩn menu Bài viết', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Bài viết')).toHaveCount(0);
  });
});
