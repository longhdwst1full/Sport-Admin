import { expect, test } from '@playwright/test';
import { seedSession } from '../fixtures/auth';
import { customerListResponse, customerSummary } from '../fixtures/customers';
import { mockJson } from '../mocks/api-mock';
import { CustomersPageObject } from '../pages/customers.page';

test.describe('CUSTOMERS — Danh sách và tạo hồ sơ', () => {
  test('CUS-01: tìm theo tên gửi điều kiện lên API và giữ bảng có dữ liệu', async ({ page }) => {
    await seedSession(page, { permissions: ['customer.view', 'customer.manage'] });
    await mockJson(page, '**/api/v1/admin/customers?**', customerListResponse());

    const customers = new CustomersPageObject(page);
    await customers.open();
    await expect(customers.title()).toBeVisible();
    await expect(page.getByText('KH-000101')).toBeVisible();

    const request = page.waitForRequest((req) =>
      req.url().includes('/api/v1/admin/customers?') && req.url().includes('name='),
    );
    await customers.searchName().fill('Minh Anh');
    const url = new URL((await request).url());
    expect(url.searchParams.get('name')).toBe('Minh Anh');
    expect(url.searchParams.get('page')).toBe('1');
  });

  test('CUS-02: thiếu cả email và SĐT thì không gửi yêu cầu tạo', async ({ page }) => {
    await seedSession(page, { permissions: ['customer.view', 'customer.manage'] });
    await mockJson(page, '**/api/v1/admin/customers?**', customerListResponse([]));
    let createCalls = 0;
    await page.route('**/api/v1/admin/customers', async (route) => {
      createCalls += 1;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    const customers = new CustomersPageObject(page);
    await customers.open();
    await customers.createButton().click();
    await customers.nameInput().fill('Khách thử nghiệm');
    await customers.form().getByRole('button', { name: 'Lưu' }).click();

    await expect(customers.form().getByText('Nhập số điện thoại hoặc email')).toBeVisible();
    expect(createCalls).toBe(0);
  });

  test('CUS-03: tạo thành công gửi đúng DTO và làm mới danh sách', async ({ page }) => {
    await seedSession(page, { permissions: ['customer.view', 'customer.manage'] });
    const rows = [] as ReturnType<typeof customerSummary>[];
    await page.route('**/api/v1/admin/customers?**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(customerListResponse(rows)),
      });
    });
    await page.route('**/api/v1/admin/customers', async (route) => {
      const payload = route.request().postDataJSON() as { name: string; email: string };
      rows.push(customerSummary({ name: payload.name, email: payload.email }));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(rows[0]),
      });
    });

    const customers = new CustomersPageObject(page);
    await customers.open();
    await customers.createButton().click();
    await customers.nameInput().fill('Khách thử nghiệm');
    await customers.emailInput().fill('test@example.com');
    const request = page.waitForRequest((req) =>
      req.method() === 'POST' && new URL(req.url()).pathname === '/api/v1/admin/customers',
    );
    await customers.form().getByRole('button', { name: 'Lưu' }).click();
    expect((await request).postDataJSON()).toMatchObject({
      name: 'Khách thử nghiệm',
      email: 'test@example.com',
      marketingConsent: false,
    });
    await expect(customers.form()).not.toBeVisible();
    await expect(page.getByText('KH-000101')).toBeVisible();
  });

  test('CUS-04: thiếu quyền quản lý thì không thấy nút tạo', async ({ page }) => {
    await seedSession(page, { permissions: ['customer.view'] });
    await mockJson(page, '**/api/v1/admin/customers?**', customerListResponse());

    const customers = new CustomersPageObject(page);
    await customers.open();
    await expect(customers.title()).toBeVisible();
    await expect(page.getByText('KH-000101')).toBeVisible();
    await expect(customers.createButton()).toHaveCount(0);
  });
});
