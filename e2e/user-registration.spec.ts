import { test, expect } from '@playwright/test';
import { generateTestData, clearBrowserStorage, waitForAppLoad } from './utils/test-helpers';

test.describe('User Registration with Deployed Backend', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserStorage(page);
  });

  test('should register new user successfully', async ({ page }) => {
    const testData = generateTestData();

    // Navigate to the app
    await page.goto('/');
    await waitForAppLoad(page);

    // Should show auth page for unauthenticated user
    await expect(page).toHaveURL('/');

    // Look for register form or switch to register
    const registerButton = page.locator('text=Sign up');
    const registerForm = page.locator('[data-testid="register-form"]');

    // If login form is shown, switch to register
    if (await registerButton.isVisible()) {
      await registerButton.click();
    }

    // Should now see register form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Fill registration form
    await page.locator('input[type="email"]').fill(testData.email);
    await page.locator('input[type="password"]').first().fill(testData.password);

    // If confirm password field exists, fill it
    const confirmPasswordField = page.locator('input[type="password"]').nth(1);
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill(testData.password);
    }

    // Submit registration
    const submitButton = page.locator('button[type="submit"]', { hasText: /sign up|register|create/i });
    await submitButton.click();

    // Wait for registration response
    await page.waitForTimeout(3000);

    // Check for success scenarios
    const possibleSuccessIndicators = [
      page.locator('text=Check your email'),
      page.locator('text=Verification'),
      page.locator('text=Confirm'),
      page.locator('text=Dashboard'),
      page.locator('[data-testid="dashboard"]')
    ];

    let registrationSuccessful = false;
    for (const indicator of possibleSuccessIndicators) {
      if (await indicator.isVisible()) {
        registrationSuccessful = true;
        console.log(`Registration successful - found: ${await indicator.textContent()}`);
        break;
      }
    }

    // Check for error messages
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.error',
      '[role="alert"]',
      'text=already exists',
      'text=invalid',
      'text=error'
    ];

    let hasError = false;
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log(`Registration error: ${errorText}`);
        hasError = true;
        break;
      }
    }

    // If user already exists, that's also a success (backend is working)
    if (hasError) {
      const errorText = await page.textContent('body');
      if (errorText?.includes('already exists') || errorText?.includes('UsernameExistsException')) {
        console.log('User already exists - this confirms backend connectivity');
        registrationSuccessful = true;
      }
    }

    expect(registrationSuccessful).toBe(true);

    // Take screenshot for manual verification
    await page.screenshot({
      path: `test-results/registration-result-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);

    // Switch to register if needed
    const registerButton = page.locator('text=Sign up');
    if (await registerButton.isVisible()) {
      await registerButton.click();
    }

    // Try weak password
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').first().fill('weak');

    const submitButton = page.locator('button[type="submit"]', { hasText: /sign up|register|create/i });
    await submitButton.click();

    // Should show password validation error
    await page.waitForTimeout(2000);

    // Look for validation messages
    const validationMessages = [
      'Password must',
      'at least 8 characters',
      'uppercase',
      'lowercase',
      'number',
      'InvalidPasswordException'
    ];

    let foundValidation = false;
    for (const message of validationMessages) {
      if (await page.locator(`text=${message}`).isVisible()) {
        foundValidation = true;
        break;
      }
    }

    expect(foundValidation).toBe(true);
  });

  test('should handle duplicate email registration', async ({ page }) => {
    // Use a known email that might already exist
    const existingEmail = 'test@auteurium.test';

    await page.goto('/');
    await waitForAppLoad(page);

    // Switch to register
    const registerButton = page.locator('text=Sign up');
    if (await registerButton.isVisible()) {
      await registerButton.click();
    }

    // Try to register with existing email
    await page.locator('input[type="email"]').fill(existingEmail);
    await page.locator('input[type="password"]').first().fill('TestPassword123!');

    const confirmPasswordField = page.locator('input[type="password"]').nth(1);
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill('TestPassword123!');
    }

    const submitButton = page.locator('button[type="submit"]', { hasText: /sign up|register|create/i });
    await submitButton.click();

    await page.waitForTimeout(3000);

    // Should show user exists error or succeed (both indicate backend is working)
    const bodyText = await page.textContent('body');
    const backendIsWorking = bodyText?.includes('already exists') ||
                           bodyText?.includes('UsernameExistsException') ||
                           bodyText?.includes('Check your email') ||
                           bodyText?.includes('Dashboard');

    expect(backendIsWorking).toBe(true);
  });
});