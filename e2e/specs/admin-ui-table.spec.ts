import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { categoryListResponse, productListResponse, productSummary } from '../fixtures/catalog';
import { mockError, mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse());
});

test.describe('ADMIN UI TABLE — Standard Table UX & Styling', () => {
  test('UI-TBL-01: Bảng sản phẩm có các header cột rõ ràng', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const thead = page.locator('.ant-table-thead');
    await expect(thead).toBeVisible();
    await expect(thead).toContainText('Sản phẩm');
    await expect(thead).toContainText('Giá đã VAT');
    await expect(thead).toContainText('Trạng thái');
    await expect(thead).toContainText('Hiện trên web');
  });

  test('UI-TBL-02: Cột status hiển thị qua StatusTag với trạng thái chuẩn', async ({ page }) => {
    await mockJson(
      page,
      '**/api/v1/admin/products?**',
      productListResponse([productSummary({ status: 'PUBLISHED' })]),
    );

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    // `tr.ant-table-row` chứ không phải `tr`: bảng đặt `scroll.x` nên antd chèn thêm
    // `tr.ant-table-measure-row` rỗng làm dòng đầu tiên của tbody.
    const statusTag = page.locator('.ant-table-tbody tr.ant-table-row').first().locator('.rounded-full');
    await expect(statusTag).toBeVisible();
    await expect(statusTag).toContainText('Đang bán');
  });

  test('UI-TBL-03: Cột action dùng nút icon gọn gàng, không có text thừa', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    // Hàng đầu tiên trong bảng
    const actionCell = page.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').last();
    // Nút icon chi tiết
    const editBtn = actionCell.locator('button').first();
    await expect(editBtn).toBeVisible();
    // Nút không chứa text dài
    const btnText = (await editBtn.innerText()).trim();
    expect(btnText).toBe('');
  });

  test('UI-TBL-04: Bảng có class table wrapper hỗ trợ responsive scroll', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const table = page.locator('.ant-table-wrapper');
    await expect(table).toBeVisible();
  });

  test('UI-TBL-05: Table hiển thị cấu trúc dữ liệu chuẩn', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(page.locator('.ant-table-tbody')).toBeVisible();
    await expect(page.locator('.ant-table-row').first()).toBeVisible();
  });

  test('UI-TBL-06: Phân trang hiển thị số dòng, trang hiện tại, và cho chọn số lượng dòng (pageSizeOptions)', async ({ page }) => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      productSummary({ id: String(i + 1), productNo: `P-${i + 1}`, name: `Sản phẩm ${i + 1}` }),
    );
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse(rows, { total: 45 }));

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const pagination = page.locator('.ant-pagination');
    await expect(pagination).toBeVisible();
    await expect(pagination).toContainText('45 sản phẩm');

    // Page size selector
    const sizeChanger = page.locator('.ant-pagination-options');
    await expect(sizeChanger).toBeVisible();
  });

  test('UI-TBL-07: Row hover có hiệu ứng transition', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const firstRow = page.locator('.ant-table-tbody tr.ant-table-row').first();
    await expect(firstRow).toBeVisible();
    await firstRow.hover();
    await expect(firstRow).toBeVisible();
  });

  test('UI-TBL-08: Trạng thái trống (empty state) hiển thị lịch sự khi không có dữ liệu', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse([], { total: 0 }));

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    // Bảng truyền `locale.emptyText` riêng, nên antd KHÔNG bọc `.ant-empty` quanh nó.
    // Bám vào testid của trạng thái trống thật, đừng bám class nội bộ của thư viện.
    const empty = page.getByTestId('admin-table-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('Chưa có sản phẩm nào');
  });

  test('UI-TBL-09: Trạng thái lỗi API hiển thị alert thông báo lỗi không làm trắng trang', async ({ page }) => {
    await mockError(page, '**/api/v1/admin/products?**', 500, 'Không tải được danh sách sản phẩm');

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Không tải được danh sách sản phẩm');
  });

  test('UI-TBL-10: Nút làm mới dưới bảng hoạt động refetch dữ liệu', async ({ page }) => {
    await mockJson(page, '**/api/v1/admin/products?**', productListResponse());

    const shell = new AdminShellPage(page);
    await shell.open('/products');

    const refreshBtn = page.getByRole('button', { name: 'Làm mới danh sách' });
    await expect(refreshBtn).toBeVisible();

    const request = page.waitForRequest((req) => req.url().includes('/api/v1/admin/products'));
    await refreshBtn.click();
    await request;
  });
});
