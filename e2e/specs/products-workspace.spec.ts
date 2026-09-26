import { expect, test, type Page, type Route } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { PERMISSION_SETS } from '../fixtures/permissions';
import { categoryListResponse, productDetail, productSummary } from '../fixtures/catalog';
import { mockJson } from '../mocks/api-mock';
import { AdminShellPage } from '../pages/admin-shell.page';
import { ProductsPageObject } from '../pages/products.page';

const lookup = (items: unknown[], limit = 20) => ({ items, meta: { page: 1, limit, total: items.length, totalPages: 1 } });

interface Captured {
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
  publish?: Record<string, unknown>;
  archive?: Record<string, unknown>;
  remove?: Record<string, unknown>;
  stockAttempts: Array<{ key?: string; body: Record<string, unknown> }>;
}

/**
 * Backend giả có trạng thái cho một sản phẩm: tạo → đọc → sửa → xuất bản → lưu trữ.
 * `failFirstStock`: phiếu tồn đầu lỗi lần đầu để kiểm nút ghi lại.
 */
async function mockProductBackend(page: Page, { failFirstStock = false } = {}): Promise<Captured> {
  const captured: Captured = { stockAttempts: [] };
  let product: ReturnType<typeof productDetail> | undefined;
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await mockJson(page, '**/api/v1/admin/catalog/categories*', categoryListResponse());
  await mockJson(page, '**/api/v1/admin/catalog/brands/active*', lookup([{ id: '1', code: 'BAOAN', label: 'BaoAn' }]));
  await mockJson(page, '**/api/v1/admin/catalog/categories/active*', lookup([{ id: '1', code: 'GIAY', label: 'Giày' }]));
  await mockJson(page, '**/api/v1/admin/organization/branches/active*', lookup([{ id: '5', code: 'HN', label: 'Hà Nội' }], 50));
  await mockJson(page, '**/api/v1/admin/organization/warehouses/active*', lookup([{ id: '6', code: 'WH-HN', label: 'Kho Hà Nội' }], 50));
  await mockJson(page, '**/api/v1/admin/catalog/attributes', {
    items: [{
      id: '1', code: 'MAX_LOAD', name: 'Tải trọng', dataType: 'NUMBER', unit: 'kg',
      isVariantAxis: false, options: [], status: 'ACTIVE', sortOrder: 0, version: 0,
    }],
  });
  await mockJson(page, '**/api/v1/admin/inventory/balances*', { items: [], total: 0, page: 1, limit: 100 });
  await page.route('**/api/v1/admin/inventory/adjustments', async (route) => {
    const request = route.request();
    captured.stockAttempts.push({ key: request.headers()['idempotency-key'], body: request.postDataJSON() });
    if (failFirstStock && captured.stockAttempts.length === 1) {
      return json(route, { statusCode: 503, code: 'E2E_503', message: 'Kho tạm không phản hồi', details: [] }, 503);
    }
    return json(route, { id: '70', status: 'POSTED' }, 201);
  });

  await page.route('**/api/v1/admin/products**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1\/admin\/products/, '');
    const method = request.method();

    if (method === 'GET' && path === '') {
      return json(route, { items: product ? [productSummary({ ...product })] : [], meta: { page: 1, limit: 30, total: product ? 1 : 0, totalPages: 1 } });
    }
    if (method === 'POST' && path === '') {
      const body = request.postDataJSON() as { name: string };
      captured.create = body;
      const template = productDetail() as unknown as { variants: Array<Record<string, unknown>> };
      product = productDetail({
        id: '9', slug: 'ghe-tap-e2e', productNo: 'P-0009', name: body.name, status: 'DRAFT', isPublished: false,
        version: 0, media: [],
        specifications: [{ code: 'MAX_LOAD', name: 'Tải trọng', dataType: 'NUMBER', unit: 'kg', values: [{ value: 120, label: '120 kg' }] }],
        variants: [{ ...template.variants[0], id: '91', sku: 'GHE-01', name: 'Đen' }],
      });
      return json(route, product, 201);
    }
    if (!product) return json(route, { statusCode: 404, message: 'not found' }, 404);
    if (method === 'GET' && path === `/${product.slug}`) return json(route, product);
    if (method === 'GET' && path === '/9/setup-status') return json(route, { canPublish: product.status === 'DRAFT', blockingIssues: [], warnings: [] });
    if (method === 'GET' && path.startsWith('/variants/')) {
      return json(route, path.endsWith('/prices') ? { current: null, upcoming: [], history: [] } : lookup([]));
    }
    if (method === 'PATCH' && path === '/9') {
      captured.update = request.postDataJSON();
      product = { ...product, ...(captured.update as object), version: product.version + 1 } as typeof product;
      return json(route, product);
    }
    if (method === 'POST' && path === '/9/publish') {
      captured.publish = request.postDataJSON();
      product = { ...product, status: 'PUBLISHED', isPublished: true, version: product.version + 1 };
      return json(route, product);
    }
    if ((method === 'POST' && path === '/9/archive') || (method === 'DELETE' && path === '/9')) {
      if (method === 'DELETE') captured.remove = request.postDataJSON();
      else captured.archive = request.postDataJSON();
      product = { ...product, status: 'ARCHIVED', isPublished: false, version: product.version + 1 };
      return json(route, product);
    }
    return json(route, { statusCode: 501, message: `E2E: chưa mock ${method} ${path}` }, 501);
  });
  return captured;
}

async function createProductThroughWorkspace(page: Page, products: ProductsPageObject, { openingQuantity = 0 } = {}) {
  await products.createProduct().click();
  await products.field('Tên sản phẩm').locator('input').fill('Ghế tập E2E');
  await products.pick('Danh mục', 'Giày');
  await products.pick('Danh mục chính', 'Giày');

  await products.tab('SKU, giá & tồn kho').click();
  await products.field('Tên biến thể').locator('input').fill('Đen');
  await products.field('SKU (mã hàng)').locator('input').fill('ghe-01');

  // Thông số kỹ thuật là một khối của tab Thông tin; khoanh vào khối đó vì tab còn các ô chọn khác.
  await products.tab('Thông tin').click();
  const specsSection = products
    .activePane()
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Thông số kỹ thuật', exact: true }) });
  await specsSection.getByRole('button', { name: 'Thêm thông số' }).click();
  await specsSection.locator('.ant-select').filter({ hasText: 'Chọn thuộc tính' }).click();
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', { hasText: 'Tải trọng' }).click();
  const valueInput = specsSection.locator('.ant-select-selection-search-input').nth(1);
  await valueInput.fill('120');
  await valueInput.press('Enter');

  if (openingQuantity > 0) {
    // Tồn đầu là khối Tồn kho của tab SKU, giá & tồn kho.
    await products.tab('SKU, giá & tồn kho').click();
    await products.pick('Chi nhánh nhập tồn đầu', 'Hà Nội');
    await expect(products.field('Kho nhập tồn đầu')).toContainText('WH-HN');
    await products.field('Số lượng tồn đầu').locator('input').fill(String(openingQuantity));
  }

  await products.tab('Kiểm tra xuất bản').click();
  await products.submitCreate().click();
}

// Người vận hành catalog đầy đủ: sửa, xuất bản, đặt giá sản phẩm và nhập tồn đầu.
const CATALOG_OPERATOR = [
  ...PERMISSION_SETS.superAdmin,
  'catalog.product.publish',
  'catalog.price.view',
  'catalog.price.manage',
];

test.beforeEach(async ({ page }) => {
  await seedSession(page, { permissions: CATALOG_OPERATOR });
});

test.describe('CATALOG — Workspace sản phẩm', () => {
  test('PRD-10: tạo → sửa → xuất bản → lưu trữ trong cùng một workspace', async ({ page }) => {
    const captured = await mockProductBackend(page);
    const shell = new AdminShellPage(page);
    const products = new ProductsPageObject(page);
    await shell.open('/products');

    await createProductThroughWorkspace(page, products);

    // Tạo: SKU viết hoa và thông số đi cùng lệnh tạo (một transaction).
    await expect.poll(() => captured.create).toBeTruthy();
    expect(captured.create).toMatchObject({
      name: 'Ghế tập E2E',
      categoryIds: ['1'],
      primaryCategoryId: '1',
      variants: [expect.objectContaining({ name: 'Đen', sku: 'GHE-01' })],
      specifications: [{ code: 'MAX_LOAD', values: [120] }],
    });

    // Tạo xong, cùng workspace chuyển sang chế độ Sửa với đúng ba tab như lúc tạo.
    await expect(products.saveProduct()).toBeVisible();
    for (const tab of ['Thông tin', 'SKU, giá & tồn kho', 'Kiểm tra xuất bản']) {
      await expect(products.tab(tab)).toBeVisible();
    }
    await expect(products.workspace().getByRole('tab')).toHaveCount(3);
    await expect(products.tab('Combo')).toHaveCount(0);

    // Sửa: không đụng thông số thì không gửi lại `specifications`.
    await products.tab('Thông tin').click();
    await products.field('Tên sản phẩm').locator('input').fill('Ghế tập E2E Pro');
    await products.saveProduct().click();
    await expect.poll(() => captured.update).toBeTruthy();
    expect(captured.update).toMatchObject({ name: 'Ghế tập E2E Pro', expectedVersion: 0 });
    expect(captured.update).not.toHaveProperty('specifications');

    // SKU thật (lưu ngay) nằm ở tab SKU, giá & tồn kho, không còn drawer thứ hai.
    await products.tab('SKU, giá & tồn kho').click();
    await expect(products.activePane().getByRole('cell', { name: 'GHE-01' }).first()).toBeVisible();
    await expect(page.locator('.ant-drawer-content')).toHaveCount(1);

    await products.workspace().locator('.ant-drawer-header').getByRole('button', { name: 'Xuất bản', exact: true }).click();
    await page.locator('.ant-modal-confirm').getByRole('button', { name: 'Xuất bản' }).click();
    await expect.poll(() => captured.publish).toEqual({ expectedVersion: 1 });
    await expect(products.workspace().getByText('PUBLISHED')).toBeVisible();

    await products.workspace().locator('.ant-drawer-header').getByRole('button', { name: 'Lưu trữ', exact: true }).click();
    await page.locator('.ant-modal-confirm').getByRole('button', { name: 'Lưu trữ' }).click();
    await expect.poll(() => captured.archive).toEqual({ expectedVersion: 2 });
    await expect(products.workspace().getByText('ARCHIVED')).toBeVisible();
    await expect(products.saveProduct()).toBeDisabled();
  });

  test('PRD-11: tồn đầu lỗi sau khi tạo → ghi lại bằng đúng Idempotency-Key cũ', async ({ page }) => {
    const captured = await mockProductBackend(page, { failFirstStock: true });
    const shell = new AdminShellPage(page);
    const products = new ProductsPageObject(page);
    await shell.open('/products');

    await createProductThroughWorkspace(page, products, { openingQuantity: 5 });

    await expect(page.getByText('Sản phẩm đã tạo nhưng chưa ghi được tồn đầu')).toBeVisible();
    await expect(products.tab('SKU, giá & tồn kho')).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: 'Thử ghi tồn đầu lại' }).click();

    await expect.poll(() => captured.stockAttempts.length).toBe(2);
    const [first, retry] = captured.stockAttempts;
    expect(retry.key).toBe(first.key);
    expect(retry.body).toEqual(first.body);
    expect(retry.body).toMatchObject({ warehouseCode: 'WH-HN', items: [{ sku: 'GHE-01', quantityDelta: 5 }] });
    await expect(page.getByText('Sản phẩm đã tạo nhưng chưa ghi được tồn đầu')).toHaveCount(0);
  });

  test('PRD-12: xoá ở danh sách → lưu trữ logic với expectedVersion', async ({ page }) => {
    const captured = await mockProductBackend(page);
    const shell = new AdminShellPage(page);
    const products = new ProductsPageObject(page);
    await shell.open('/products');
    await createProductThroughWorkspace(page, products);
    await expect(products.saveProduct()).toBeVisible();
    await products.workspace().locator('.ant-drawer-footer').getByRole('button', { name: 'Đóng' }).click();

    await page.getByRole('button', { name: 'Thao tác với sản phẩm Ghế tập E2E' }).click();
    await page.getByRole('menuitem', { name: 'Lưu trữ' }).click();
    await page.locator('.ant-modal-confirm').getByRole('button', { name: 'Xoá' }).click();
    await expect.poll(() => captured.remove).toEqual({ expectedVersion: 0 });
  });
});
