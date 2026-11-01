import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { contentListResponse } from '../fixtures/content';
import { blockUnmockedAdminApi, mockJson } from '../mocks/api-mock';

const account = {
  configured: true,
  connected: true,
  pageId: '123456',
  accountName: 'Sport Demo Page',
  pageUrl: 'https://www.facebook.com/123456',
  scopes: ['pages_manage_posts', 'pages_read_engagement'],
  permissionsVerified: true,
  reconnectRequired: false,
  message: 'Đã xác minh Facebook Page.',
  checkedAt: '2026-11-01T08:00:00.000Z',
};

test.beforeEach(async ({ page }) => {
  await blockUnmockedAdminApi(page);
  await seedSession(page, { permissions: ['cms.content.view', 'social.post.manage', 'system.parameter.view'] });
  await mockJson(page, '**/api/v1/admin/content/social/posts**', contentListResponse([]));
});

test('Facebook account shows verified Page and granted permissions', async ({ page }) => {
  await mockJson(page, '**/api/v1/admin/content/social/facebook/account', account);
  await page.goto('/content?tab=social');
  const card = page.locator('.ant-card').filter({ hasText: 'Tài khoản Facebook' });
  await expect(card.getByText('Sport Demo Page', { exact: true })).toBeVisible();
  await expect(card.getByText('Đã xác minh Page', { exact: true })).toBeVisible();
  await expect(card.getByText(/pages_manage_posts, pages_read_engagement/)).toBeVisible();
  await expect(card.getByRole('link', { name: 'Xem Page' })).toHaveAttribute('href', account.pageUrl);
});

test('Facebook account distinguishes unknown permissions from a disconnected Page', async ({ page }) => {
  await mockJson(page, '**/api/v1/admin/content/social/facebook/account', {
    ...account, scopes: [], permissionsVerified: false,
  });
  await page.goto('/content?tab=social');
  const card = page.locator('.ant-card').filter({ hasText: 'Tài khoản Facebook' });
  await expect(card.getByText('Đã xác minh Page', { exact: true })).toBeVisible();
  await expect(card.getByText(/Chưa xác minh được quyền/)).toBeVisible();
});

test('Facebook account tells the administrator when the token needs updating', async ({ page }) => {
  await mockJson(page, '**/api/v1/admin/content/social/facebook/account', {
    ...account, connected: false, reconnectRequired: true, accountName: null, pageUrl: null,
    message: 'Token Facebook không hợp lệ hoặc đã hết hạn. Cần cập nhật token.',
  });
  await page.goto('/content?tab=social');
  const card = page.locator('.ant-card').filter({ hasText: 'Tài khoản Facebook' });
  await expect(card.getByText('Cần cập nhật token', { exact: true })).toBeVisible();
  await expect(card.getByText(/Token Facebook không hợp lệ/)).toBeVisible();
});
