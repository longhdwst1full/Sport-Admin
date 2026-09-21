import type { Page } from '@playwright/test';

/** Selector ổn định cho hành trình tạo/sửa Product. */
export class ProductsPageObject {
  constructor(private readonly page: Page) {}

  readonly createProduct = () => this.page.getByRole('button', { name: 'Thêm sản phẩm' });
  readonly openProduct = (name: string) =>
    this.page.getByRole('button', { name: `Xem sản phẩm ${name}` });

  readonly editProduct = () => this.page.getByRole('button', { name: 'Sửa thông tin' });
  readonly saveProduct = () => this.page.getByRole('button', { name: 'Lưu thay đổi' });
}
