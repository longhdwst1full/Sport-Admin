import type { Page } from '@playwright/test';

/** Chỉ giữ selector của hành trình Khách hàng tại một nơi. */
export class CustomersPageObject {
  constructor(private readonly page: Page) {}

  readonly title = () => this.page.getByRole('heading', { name: 'Quản lý khách hàng' });
  readonly createButton = () => this.page.getByRole('button', { name: 'Thêm khách hàng' });
  readonly form = () => this.page.getByRole('dialog', { name: 'Thêm khách hàng' });
  readonly nameInput = () => this.page.getByPlaceholder('Nguyễn Minh Anh');
  readonly emailInput = () => this.page.getByPlaceholder('minh.anh@example.com');
  readonly searchName = () => this.page.getByPlaceholder('Tên khách');

  async open(): Promise<void> {
    await this.page.goto('/customers');
  }
}
