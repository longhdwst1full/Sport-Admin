import type { Page } from '@playwright/test';

/** Khung quản trị: menu bên trái + vùng nội dung. */
export class AdminShellPage {
  constructor(private readonly page: Page) {}

  readonly menu = () => this.page.getByRole('menu');
  /**
   * Mục menu có nhãn đúng bằng `label`. So khớp toàn bộ nhãn, không phải chuỗi con: "Sản phẩm" không được
   * khớp cả "Thuộc tính sản phẩm".
   */
  readonly menuItem = (label: string) =>
    this.page.locator('.ant-menu-item').filter({
      has: this.page.locator('.ant-menu-title-content', {
        hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    });
  readonly pageTitle = (title: string) => this.page.getByRole('heading', { name: title });

  async open(path = '/'): Promise<void> {
    await this.page.goto(path);
  }
}
