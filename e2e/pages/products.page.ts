import { expect, type Locator, type Page } from '@playwright/test';

/** Selector ổn định cho workspace Tạo/Sửa Product (một drawer, cùng bộ tab). */
export class ProductsPageObject {
  constructor(private readonly page: Page) {}

  readonly createProduct = () => this.page.getByRole('button', { name: 'Thêm sản phẩm' });
  /** Thao tác của dòng nằm trong menu ba chấm: mở menu rồi chọn "Xem / sửa" → workspace chế độ Sửa. */
  readonly openProduct = async (name: string) => {
    await this.page.getByRole('button', { name: `Thao tác với sản phẩm ${name}` }).click();
    await this.page.getByRole('menuitem', { name: 'Xem / sửa' }).click();
  };

  readonly workspace = () => this.page.locator('.ant-drawer-content').last();
  /** Nội dung tab đang mở; antd giữ các tab khác trong DOM (ẩn) nên phải giới hạn phạm vi. */
  readonly activePane = () => this.workspace().locator('.ant-tabs-tabpane-active');
  readonly tab = (name: string) => this.workspace().getByRole('tab', { name, exact: true });
  readonly saveProduct = () => this.page.getByRole('button', { name: 'Lưu thay đổi' });
  readonly submitCreate = () => this.page.getByRole('button', { name: 'Tạo sản phẩm' });

  /** Ô `Form.Item` theo đúng nhãn hiển thị. */
  readonly field = (label: string): Locator =>
    this.activePane()
      .locator('.ant-form-item')
      .filter({ has: this.page.locator('.ant-form-item-label label', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) })
      .first();

  /** Chọn một option của antd Select trong ô có nhãn `label`. */
  readonly pick = async (label: string, option: string) => {
    const openDropdown = this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await this.field(label).locator('.ant-select-selector').click();
    await openDropdown.locator('.ant-select-item-option', { hasText: option }).first().click();
    // Select nhiều giá trị vẫn mở sau khi chọn; đóng hẳn để lần chọn sau không bấm nhầm dropdown cũ.
    // Không dùng Escape: phím đó đóng luôn cả Drawer.
    await this.page.locator('.ant-drawer-title').last().click();
    await expect(openDropdown).toHaveCount(0);
  };
}
