import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { currentUserBody, tokenPairBody } from '../fixtures/auth';
import { mockError, mockJson } from '../mocks/api-mock';

test.describe('AUTH — Đăng nhập', () => {
  test('AUTH-01: sai định dạng -> hiển thị lỗi validate, không gọi API', async ({ page }) => {
    let loginCalls = 0;
    await page.route('**/api/v1/admin/auth/login', async (route) => {
      loginCalls += 1;
      await route.fulfill({ status: 200, body: '{}' });
    });

    const login = new LoginPage(page);
    await login.goto();
    await login.login('admin@baoansport.vn', '123');

    await expect(page.getByText('Mật khẩu tối thiểu 8 ký tự')).toBeVisible();
    expect(loginCalls).toBe(0);
  });

  test('AUTH-02: sai thông tin -> thông báo lỗi từ API, vẫn ở trang login', async ({ page }) => {
    // Fetcher xoay token đúng một lần khi gặp 401; stub luôn refresh để lỗi
    // đăng nhập nổi lên nguyên văn thay vì biến thành lỗi mạng.
    await mockError(page, '**/api/v1/admin/auth/refresh', 401, 'Phiên hết hạn');
    await mockError(page, '**/api/v1/admin/auth/login', 401, 'Sai tài khoản hoặc mật khẩu');

    const login = new LoginPage(page);
    await login.goto();
    await login.login('admin@baoansport.vn', 'wrong-password');

    await expect(page.getByText('Sai tài khoản hoặc mật khẩu')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('AUTH-03: đăng nhập thành công -> vào bảng điều khiển', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/auth/login', tokenPairBody());
    await mockJson(page, '**/api/v1/admin/auth/me', currentUserBody());
    await mockJson(page, '**/api/v1/admin/reports/**', {});

    const login = new LoginPage(page);
    await login.goto();
    await login.login('admin@baoansport.vn', 'Password@123');

    await expect(page).not.toHaveURL(/\/login$/);
  });

  test('AUTH-04: mustChangePassword -> ép đổi mật khẩu', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/auth/login', tokenPairBody(true));
    await mockJson(page, '**/api/v1/admin/auth/me', currentUserBody({ mustChangePassword: true }));

    const login = new LoginPage(page);
    await login.goto();
    await login.login('admin@baoansport.vn', 'Password@123');

    await expect(page).toHaveURL(/\/change-password$/);
  });

  test('AUTH-05: chưa đăng nhập -> mọi route quản trị chuyển về /login', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveURL(/\/login$/);
  });
});
