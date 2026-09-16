import type { Page } from '@playwright/test';

/** Page object của `src/features/auth/pages/login-page.tsx`. */
export class LoginPage {
  constructor(private readonly page: Page) {}

  readonly identifier = () => this.page.getByPlaceholder('email@baoansport.vn hoặc SĐT');
  readonly password = () => this.page.getByPlaceholder('••••••••');
  readonly submit = () => this.page.getByRole('button', { name: 'Đăng nhập vào hệ thống' });

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(identifier: string, password: string): Promise<void> {
    await this.identifier().fill(identifier);
    await this.password().fill(password);
    await this.submit().click();
  }
}
