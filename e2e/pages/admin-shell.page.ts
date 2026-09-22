import type { Page } from '@playwright/test';

/** Khung quản trị: menu bên trái + vùng nội dung. */
export class AdminShellPage {
  constructor(private readonly page: Page) {}

  readonly menu = () => this.page.getByRole('menu');
  readonly menuItem = (label: string) => this.page.locator('.ant-menu-item').filter({ hasText: label });
  readonly pageTitle = (title: string) => this.page.getByRole('heading', { name: title });

  async open(path = '/'): Promise<void> {
    await this.page.goto(path);
  }
}
