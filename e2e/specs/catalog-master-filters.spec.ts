import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { categoryListResponse, productListResponse, productSummary } from '../fixtures/catalog';
import { blockUnmockedAdminApi, mockJson } from '../mocks/api-mock';

const masterRows = Array.from({ length: 65 }, (_, index) => ({
  id: String(index + 1), code: `CAT-${index + 1}`, name: `Danh mục ${String(index + 1).padStart(2, '0')}`,
  slug: `danh-muc-${index + 1}`, path: `/danh-muc-${index + 1}`, depth: 0, sortOrder: index,
  status: index % 3 === 0 ? 'INACTIVE' : 'ACTIVE', version: 1,
}));

test.beforeEach(async ({ page }) => {
  await blockUnmockedAdminApi(page);
  await seedSession(page, { permissions: [
    'catalog.category.view', 'catalog.category.manage', 'catalog.brand.view', 'catalog.brand.manage',
    'catalog.product.view', 'catalog.product.manage',
  ] });
  await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse(masterRows));
  await mockJson(page, '**/api/v1/admin/catalog/brands*', { items: masterRows, total: masterRows.length });
});

for (const path of ['/categories', '/brands']) {
  test(`${path}: page-size selection persists across reload and status resets page`, async ({ page }) => {
    await page.goto(path);
    const rows = page.locator('tbody > tr.ant-table-row');
    await expect(rows).toHaveCount(30);
    await page.locator('.ant-pagination-options-size-changer .ant-select-selector').click();
    await page.locator('.ant-select-item-option[title^="50"]').click();
    await expect(rows).toHaveCount(50);
    await expect(page).toHaveURL(/pageSize=50/);
    await page.reload();
    await expect(rows).toHaveCount(50);
    await page.locator('.ant-pagination-item-2').click();
    await expect(rows).toHaveCount(15);
    await page.getByRole('combobox', { name: 'Lọc trạng thái', exact: true }).click();
    await page.locator('.ant-select-item-option[title="Đã ngừng"]').click();
    await expect(page).toHaveURL(/status=INACTIVE/);
    await expect(page).not.toHaveURL(/[?&]page=2/);
    await expect(rows).toHaveCount(22);
    await expect(page.locator('.ant-pagination-options-size-changer')).toBeVisible();
    await page.getByPlaceholder('Tìm theo mã, tên hoặc slug...').fill('Danh mục 01');
    await expect(rows).toHaveCount(1);
    const edit = page.getByRole('button', { name: /^Sửa (danh mục|thương hiệu) Danh mục 01$/ });
    await edit.hover();
    await expect(page.locator('.ant-tooltip')).toHaveCount(0);
    await page.getByRole('button', { name: /^Xoá (danh mục|thương hiệu) Danh mục 01$/ }).click();
    await expect(page.locator('.ant-popconfirm')).toBeVisible();
    await expect(page.locator('.ant-tooltip')).toHaveCount(0);
  });
}

test('products: status filter reaches server, resets page and retains name/category', async ({ page }) => {
  await page.route('**/api/v1/admin/products?**', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const status = params.get('status') ?? 'PUBLISHED';
    await route.fulfill({ json: productListResponse([productSummary({ status })], {
      page: Number(params.get('page') ?? 1), total: 100,
    }) });
  });
  await page.goto('/products?page=3&name=giay&category=danh-muc-1');
  await expect(page.getByText('Giày chạy bộ E2E')).toBeVisible();
  await expect(page.locator('.dctd-metric-card')).toHaveCount(0);
  await expect(page.locator('.ant-pagination')).toBeVisible();
  await page.getByRole('combobox', { name: 'Lọc trạng thái sản phẩm' }).click();
  const requested = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/v1/admin/products' && url.searchParams.get('status') === 'ARCHIVED';
  });
  await page.locator('.ant-select-item-option[title="Lưu trữ"]').click();
  const params = new URL((await requested).url()).searchParams;
  expect(params.get('page')).toBe('1');
  expect(params.get('name')).toBe('giay');
  expect(params.get('category')).toBe('danh-muc-1');
  await expect(page).toHaveURL(/status=ARCHIVED/);
});
