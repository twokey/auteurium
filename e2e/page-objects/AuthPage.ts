import { Page, Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly loginForm: Locator;
  readonly registerForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly switchToRegisterLink: Locator;
  readonly switchToLoginLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginForm = page.locator('[data-testid="login-form"]');
    this.registerForm = page.locator('[data-testid="register-form"]');
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').last();
    this.loginButton = page.locator('button[type="submit"]', { hasText: 'Sign In' });
    this.registerButton = page.locator('button[type="submit"]', { hasText: 'Sign Up' });
    this.switchToRegisterLink = page.locator('text=Sign up');
    this.switchToLoginLink = page.locator('text=Sign in');
    this.forgotPasswordLink = page.locator('text=Forgot password');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(email: string, password: string) {
    await expect(this.loginForm).toBeVisible();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async register(email: string, password: string, confirmPassword?: string) {
    if (await this.loginForm.isVisible()) {
      await this.switchToRegisterLink.click();
    }

    await expect(this.registerForm).toBeVisible();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (confirmPassword) {
      await this.confirmPasswordInput.fill(confirmPassword);
    } else {
      await this.confirmPasswordInput.fill(password);
    }

    await this.registerButton.click();
  }

  async switchToRegister() {
    await this.switchToRegisterLink.click();
    await expect(this.registerForm).toBeVisible();
  }

  async switchToLogin() {
    await this.switchToLoginLink.click();
    await expect(this.loginForm).toBeVisible();
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async expectSuccessfulLogin() {
    await this.page.waitForURL('/');
    await expect(this.page.locator('text=Dashboard')).toBeVisible();
  }
}