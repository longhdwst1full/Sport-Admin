import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { auditLogListResponse, roleListResponse, userListResponse } from '../fixtures/access';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/iam/users**', userListResponse());
  await mockJson(page, '**/api/v1/admin/iam/roles**', roleListResponse());
  await mockJson(page, '**/api/v1/admin/iam/permissions**', { items: [], total: 0 });
  await mockJson(page, '**/api/v1/admin/audit-logs**', auditLogListResponse());
});

test.describe('IAM — Người dùng, Vai trò & Nhật ký kiểm toán', () => {
  test('IAM-01: Mở /access hiển thị danh sách người dùng', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/access');

    await expect(page.getByRole('heading', { name: 'Người dùng & phân quyền' })).toBeVisible();
    await expect(page.getByText('Nguyễn Quản Trị')).toBeVisible();
  });

  test('IAM-02: Status người dùng hiển thị qua StatusTag', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/access');

    await expect(page.getByText('Hoạt động').first()).toBeVisible();
  });

  test('IAM-03: Mở /roles hiển thị danh sách vai trò', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/roles');

    await expect(page.getByRole('heading', { name: 'Vai trò & phân quyền' })).toBeVisible();
    await expect(page.getByText('Nhân viên bán hàng')).toBeVisible();
  });

  test('IAM-04: Mở /audit hiển thị nhật ký kiểm toán', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/audit');

    await expect(page.getByRole('heading', { name: 'Nhật ký Audit Log' })).toBeVisible();
  });

  test('IAM-05: Thiếu quyền iam.user.view -> ẩn menu Người dùng & quyền', async ({ page }) => {
    await seedSession(page, { permissions: ['catalog.product.view'] });

    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(shell.menuItem('Người dùng & quyền')).toHaveCount(0);
  });
});
