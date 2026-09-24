import type { Page } from '@playwright/test';

/** Selector ổn định cho hành trình tạo/sửa Product. */
export class ProductsPageObject {
  constructor(private readonly page: Page) {}

  readonly createProduct = () => this.page.getByRole('button', { name: 'Thêm sản phẩm' });
  /** Thao tác của dòng nằm trong menu ba chấm: mở menu rồi chọn "Xem / sửa". */
  readonly openProduct = async (name: string) => {
    await this.page.getByRole('button', { name: `Thao tác với sản phẩm ${name}` }).click();
    await this.page.getByRole('menuitem', { name: 'Xem / sửa' }).click();
  };

  readonly editProduct = () => this.page.getByRole('button', { name: 'Sửa thông tin' });
  readonly saveProduct = () => this.page.getByRole('button', { name: 'Lưu thay đổi' });
}
