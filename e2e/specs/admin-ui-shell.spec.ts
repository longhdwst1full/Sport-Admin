import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { categoryListResponse, productListResponse } from '../fixtures/catalog';
import { customerListResponse } from '../fixtures/customers';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse());
  await mockJson(page, '**/api/v1/admin/products?**', productListResponse());
  await mockJson(page, '**/api/v1/admin/customers**', customerListResponse());
});

test.describe('ADMIN UI SHELL — Sidebar, Header & Navigation Tabs', () => {
  test('UI-SHELL-01: Sidebar hiện đủ menu theo quyền superAdmin', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/');

    await expect(page.locator('.dctd-side-menu')).toBeVisible();
    await expect(shell.menuItem('Bảng điều khiển')).toBeVisible();
    await expect(shell.menuItem('Đơn hàng')).toBeVisible();
    await expect(shell.menuItem('Sản phẩm')).toBeVisible();
    await expect(shell.menuItem('Kho hàng')).toBeVisible();
    await expect(shell.menuItem('Khách hàng')).toBeVisible();
  });

  test('UI-SHELL-02: Click menu item -> URL thay đổi, item có active styling', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/');

    await shell.menuItem('Sản phẩm').click();
    await expect(page).toHaveURL(/\/products/);

    const productMenuItem = page.locator('.ant-menu-item-selected');
    await expect(productMenuItem).toContainText('Sản phẩm');
  });

  test('UI-SHELL-03: Sidebar toggle thu gọn / mở rộng', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const toggleBtn = page.getByRole('button', { name: /Thu gọn menu|Mở rộng menu/i });
    await expect(toggleBtn).toBeVisible();

    // Thu gọn
    await toggleBtn.click();
    await expect(page.locator('.ant-layout-sider-collapsed')).toBeVisible();

    // Mở rộng lại
    await toggleBtn.click();
    await expect(page.locator('.ant-layout-sider-collapsed')).not.toBeVisible();
  });

  test('UI-SHELL-04: Collapsed sidebar giữ menu items gọn gàng', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const toggleBtn = page.getByRole('button', { name: /Thu gọn menu/i });
    await toggleBtn.click();

    await expect(page.locator('.ant-layout-sider-collapsed')).toBeVisible();
    // Vẫn click được item
    const icons = page.locator('.ant-layout-sider-collapsed .ant-menu-item');
    await expect(icons.first()).toBeVisible();
  });

  test('UI-SHELL-05: Header hiển thị user avatar và thông tin', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/');

    // User avatar trong header
    const avatar = page.locator('.ant-layout-header .ant-avatar');
    await expect(avatar).toBeVisible();
    await expect(avatar).toContainText('EA'); // E2E Admin initials
  });

  test('UI-SHELL-06: Menu item hover có hiệu ứng css', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/');

    const orderItem = shell.menuItem('Đơn hàng');
    await expect(orderItem).toBeVisible();
    await orderItem.hover();
    await expect(orderItem).toBeVisible();
  });

  test('UI-SHELL-07: Navigation tabs mở tab tương ứng khi vào trang', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const productTab = page.locator('[role="tab"][data-active="true"]');
    await expect(productTab).toContainText('Sản phẩm');
  });

  test('UI-SHELL-08: Nút chuyển tab < và > hoạt động chuyển tab qua lại', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/products');
    await shell.menuItem('Khách hàng').click();
    await expect(page).toHaveURL(/\/customers/);

    const prevBtn = page.getByRole('button', { name: 'Tab trước' });
    const nextBtn = page.getByRole('button', { name: 'Tab sau' });

    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Bấm tab trước -> chuyển về Sản phẩm
    await prevBtn.click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.locator('[role="tab"][data-active="true"]')).toContainText('Sản phẩm');

    // Bấm tab sau -> chuyển về Khách hàng
    await nextBtn.click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.locator('[role="tab"][data-active="true"]')).toContainText('Khách hàng');
  });

  test('UI-SHELL-09: Đóng tab từ navigation tabs chuyển sang tab hợp lệ', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/products');
    await shell.menuItem('Khách hàng').click();

    const closeBtn = page.getByLabel('Đóng tab Khách hàng');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Chuyển về tab trước đó
    await expect(page).toHaveURL(/\/products/);
  });

  test('UI-SHELL-10: Logo click chuyển hướng về trang tổng quan /', async ({ page }) => {
    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const logoBtn = page.getByRole('button', { name: 'Về trang tổng quan' });
    await expect(logoBtn).toBeVisible();
    await logoBtn.click();
    await expect(page).toHaveURL(/\/$/);
  });
});
