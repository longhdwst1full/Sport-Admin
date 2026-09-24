import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import {
  categoryListResponse,
  productDetail,
  productListResponse,
  productSummary,
} from '../fixtures/catalog';
import { mockError, mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';
import { ProductsPageObject } from '../pages/products.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse());
});

test.describe('CATALOG — Danh sách sản phẩm', () => {
  test('PRD-01: có dữ liệu -> hiển thị đúng dòng', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(shell.pageTitle('Sản phẩm')).toBeVisible();
    await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();
  });

  test('PRD-02: rỗng -> hiển thị trạng thái không có dữ liệu', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse([], { total: 0 }));

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const empty = page.getByTestId('admin-table-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('Chưa có sản phẩm nào');
  });

  test('PRD-03: API lỗi -> hiển thị thông báo lỗi, không trắng trang', async ({ page }) => {
    await mockError(page, '**/api/v1/admin/products?**', 500, 'Không tải được danh sách sản phẩm');

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(shell.pageTitle('Sản phẩm')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Không tải được danh sách sản phẩm');
  });

  test('PRD-04: tìm theo tên -> gửi query `name` sau debounce', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');
    await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/products') && req.url().includes('name='),
    );
    await page.getByPlaceholder('Tên sản phẩm').fill('giày');
    const url = new URL((await request).url());
    expect(url.searchParams.get('name')).toBe('giày');
    expect(url.searchParams.get('page')).toBe('1');
  });

  test('PRD-05: đổi trang -> gọi lại API với page mới', async ({ page }) => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      productSummary({ id: String(i + 1), productNo: `P-${i + 1}`, name: `Sản phẩm ${i + 1}` }),
    );
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse(rows, { total: 45 }));

    const shell = new AdminShellPage(page);
    await shell.open('/products');
    await expect(page.getByText('Sản phẩm 1', { exact: true })).toBeVisible();

    const request = page.waitForRequest(
      (req) => req.url().includes('/api/v1/admin/products') && req.url().includes('page=2'),
    );
    await page.locator('.ant-pagination-item-2').click();
    await request;
  });

  test('PRD-06: sửa sản phẩm trên viewport hẹp -> nút Lưu luôn nhìn thấy', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 900 });
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());
    await mockJson(page, '**/api/v1/admin/products/giay-chay-bo-e2e', productDetail());
    await mockJson(page, '**/api/v1/admin/catalog/brands/active*', {
      items: [{ id: '1', code: 'BAOAN', label: 'BaoAn' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    await mockJson(page, '**/api/v1/admin/catalog/categories/active*', {
      items: [{ id: '1', code: 'GIAY', label: 'Giày' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const shell = new AdminShellPage(page);
    const products = new ProductsPageObject(page);
    await shell.open('/products');
    await products.openProduct('Giày chạy bộ E2E');
    await products.editProduct().click();

    const saveButton = products.saveProduct();
    await expect(saveButton).toBeVisible();
    await expect.poll(async () => {
      const box = await saveButton.boundingBox();
      return (box?.x ?? 0) + (box?.width ?? 0);
    }).toBeLessThanOrEqual(720);
  });

  test('PRD-07: tạo sản phẩm -> hiển thị đủ vận chuyển và tồn đầu theo kho', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());
    await mockJson(page, '**/api/v1/admin/catalog/brands/active*', { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    await mockJson(page, '**/api/v1/admin/catalog/categories/active*', { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    await mockJson(page, '**/api/v1/admin/organization/branches/active*', { items: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } });

    const shell = new AdminShellPage(page);
    const products = new ProductsPageObject(page);
    await shell.open('/products');
    await products.createProduct().click();

    // Form tạo sản phẩm là wizard 4 tab; vận chuyển và tồn đầu nằm ở tab "Biến thể & giá",
    // không hiển thị ngay khi mở drawer.
    await page.getByRole('tab', { name: 'Biến thể & giá' }).click();

    await expect(page.getByText('Tồn đầu theo chi nhánh / kho')).toBeVisible();
    await expect(page.getByText('Khối lượng (g)', { exact: true })).toBeVisible();
    await expect(page.getByText('Dài (mm)', { exact: true })).toBeVisible();
    await expect(page.getByText('Rộng (mm)', { exact: true })).toBeVisible();
    await expect(page.getByText('Cao (mm)', { exact: true })).toBeVisible();
    await expect(page.getByText('Chi nhánh nhập tồn đầu', { exact: true })).toBeVisible();
    await expect(page.getByText('Kho nhập tồn đầu', { exact: true })).toBeVisible();
    await expect(page.getByText('Số lượng tồn đầu', { exact: true })).toBeVisible();
    // Nút tạo cố ý chỉ xuất hiện ở tab cuối, sau bảng kiểm tra (xem ProductFormDrawer):
    // ở các tab trước, nút chính là "Tiếp tục".
    await expect(page.getByRole('button', { name: 'Tiếp tục' })).toBeVisible();
    await page.getByRole('tab', { name: 'Kiểm tra & tạo' }).click();
    await expect(page.getByRole('button', { name: 'Tạo sản phẩm' })).toBeVisible();
  });
});
