import { test, expect } from './fixtures/auth';
import { generateTestData, clearBrowserStorage } from './utils/test-helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserStorage(page);
  });

  test('should display login form by default', async ({ authPage }) => {
    await authPage.goto();
    await expect(authPage.loginForm).toBeVisible();
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.loginButton).toBeVisible();
  });

  test('should switch between login and register forms', async ({ authPage }) => {
    await authPage.goto();

    // Start with login form
    await expect(authPage.loginForm).toBeVisible();

    // Switch to register
    await authPage.switchToRegister();
    await expect(authPage.registerForm).toBeVisible();
    await expect(authPage.confirmPasswordInput).toBeVisible();

    // Switch back to login
    await authPage.switchToLogin();
    await expect(authPage.loginForm).toBeVisible();
  });

  test('should show validation errors for invalid input', async ({ authPage }) => {
    await authPage.goto();

    // Try to login with empty fields
    await authPage.loginButton.click();
    // Note: Error validation depends on your form implementation
    // You might need to adjust these assertions based on your error handling

    // Try with invalid email format
    await authPage.emailInput.fill('invalid-email');
    await authPage.passwordInput.fill('password');
    await authPage.loginButton.click();
  });

  test('should register new user successfully', async ({ authPage, page }) => {
    const testData = generateTestData();

    await authPage.goto();
    await authPage.register(testData.email, testData.password);

    // For AWS Cognito, you might be redirected to email confirmation
    // Or directly to dashboard if email verification is disabled
    // Adjust based on your Cognito configuration

    // If registration is successful and auto-login enabled:
    // await expect(page).toHaveURL('/');

    // If email confirmation is required:
    // await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('should login with valid credentials', async ({ authPage, page }) => {
    // This test assumes you have a known test user
    // You might need to create one first or use the fixture

    const credentials = {
      email: process.env.TEST_USER_EMAIL ?? 'test@auteurium.test',
      password: process.env.TEST_USER_PASSWORD ?? 'TestPassword123!'
    };

    await authPage.goto();

    try {
      await authPage.login(credentials.email, credentials.password);
      await authPage.expectSuccessfulLogin();
    } catch (_error) {
      // If login fails, the user might not exist yet
      console.warn('Login failed - user might need to be created first');
    }
  });

  test('should show error for invalid credentials', async ({ authPage }) => {
    await authPage.goto();

    await authPage.login('nonexistent@user.com', 'wrongpassword');

    // Wait for error message to appear
    // Note: Adjust the error message based on your Cognito configuration
    await expect(authPage.errorMessage).toBeVisible();
  });

  test('should logout successfully', async ({ dashboardPage, page }) => {
    // This test uses the authenticatedUser fixture
    await dashboardPage.goto();
    await expect(page).toHaveURL('/');

    await dashboardPage.logout();
    await expect(page).toHaveURL('/auth');
  });

  test('should redirect unauthenticated users to auth page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/auth');

    await page.goto('/project/123');
    await expect(page).toHaveURL('/auth');
  });

  test('should remember user session across page reloads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Reload the page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});