import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import {
  contentListResponse,
  facebookSummary,
  socialPostDetail,
  socialPostSummary,
} from '../fixtures/content';
import { PERMISSION_SETS } from '../fixtures/permissions';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

// `**` khớp cả chi tiết `/posts/:id`; test cần chi tiết thì đăng ký route riêng sau (route sau thắng).
const SOCIAL_LIST = '**/api/v1/admin/content/social/posts**';

const socialList = () =>
  contentListResponse([
    socialPostSummary(),
    socialPostSummary({
      id: '2',
      postType: 'SOCIAL',
      title: 'Flash sale cuối tuần',
      isPublished: false,
      facebook: facebookSummary({ status: 'FAILED', lastError: 'GRAPH_190: token hết hạn' }),
    }),
  ]);

test.beforeEach(async ({ page }) => {
  await seedSession(page, {
    permissions: [...PERMISSION_SETS.superAdmin, 'cms.content.manage', 'social.post.manage', 'social.post.publish'],
  });
  await mockJson(page, SOCIAL_LIST, socialList());
});

test.describe('CONTENT — Quản lý bài viết & CMS', () => {
  test('CMS-01: Mở /content hiển thị danh sách bài viết', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/content');

    await expect(page.getByRole('heading', { name: 'Bài viết & Tin tức' })).toBeVisible();
    await expect(page.getByText('Hướng dẫn chọn giày chạy bộ')).toBeVisible();
  });

  test('CMS-02: Bảng hiển thị trạng thái website và trạng thái Facebook', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/content');

    await expect(page.getByText('Đang xuất bản')).toBeVisible();
    await expect(page.getByText('Lỗi', { exact: true })).toBeVisible();
    await expect(page.getByText('Không đăng web')).toBeVisible();
  });

  test('CMS-03: Thiếu quyền cms.content.view -> ẩn menu Bài viết', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Bài viết')).toHaveCount(0);
  });

  test('CMS-04: Tab Facebook gửi channel=FACEBOOK và giữ trên URL', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/content');

    const request = page.waitForRequest((req) => req.url().includes('/content/social/posts') && req.url().includes('channel=FACEBOOK'));
    await page.getByRole('tab', { name: 'Facebook' }).click();
    await request;
    await expect(page).toHaveURL(/tab=facebook/);
  });

  test('CMS-05: Người gửi duyệt tự đăng được (duyệt là đăng, không maker-checker)', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/content/social/posts/2', socialPostDetail());
    const shell = new AdminShellPage(page);
    await shell.open('/content');

    await page.getByRole('button', { name: 'Flash sale cuối tuần', exact: true }).click();
    await expect(page.getByRole('button', { name: /Đăng ngay \/ Hẹn giờ/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /Từ chối/ })).toBeEnabled();
  });

  test('CMS-05b: Bản nháp hiện Đăng ngay / Hẹn giờ cho người có quyền đăng, không cần Gửi duyệt', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/content/social/posts/2', socialPostDetail({}, { status: 'DRAFT' }));
    const shell = new AdminShellPage(page);
    await shell.open('/content');

    await page.getByRole('button', { name: 'Flash sale cuối tuần', exact: true }).click();
    await expect(page.getByRole('button', { name: /Đăng ngay \/ Hẹn giờ/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /Gửi duyệt/ })).toHaveCount(0);
  });

  test('CMS-06: Đăng khi chưa cấu hình Facebook -> gợi ý Tham số hệ thống', async ({ page }) => {
    await mockJson(
      page,
      '**/api/v1/admin/content/social/posts/2',
      socialPostDetail({}, { submittedBy: { id: '5', displayName: 'Biên tập viên' } }),
    );
    await mockJson(
      page,
      '**/api/v1/admin/content/social/posts/2/facebook/approve',
      { statusCode: 503, code: 'SOCIAL_FACEBOOK_NOT_CONFIGURED', message: 'not configured' },
      { status: 503 },
    );
    const shell = new AdminShellPage(page);
    await shell.open('/content');

    await page.getByRole('button', { name: 'Flash sale cuối tuần', exact: true }).click();
    const approve = page.waitForRequest(
      (req) => req.url().endsWith('/facebook/approve') && Boolean(req.headers()['idempotency-key']),
    );
    await page.getByRole('button', { name: /Đăng ngay \/ Hẹn giờ/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Đăng', exact: true }).click();
    await approve;
    await expect(page.getByText('Chưa cấu hình Facebook Page')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tham số hệ thống' })).toBeVisible();
  });
});
