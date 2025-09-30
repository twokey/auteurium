import { test, expect } from '@playwright/test';

test('Debug Current Page State', async ({ page }) => {
  console.warn('🔍 Debugging current page state');

  // Navigate to app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');

  // Take screenshot of initial state
  await page.screenshot({ path: `debug-initial-state-${Date.now()}.png`, fullPage: true });

  // Log page title and URL
  console.warn('Page title:', await page.title());
  console.warn('Page URL:', page.url());

  // Check what forms are visible
  const forms = await page.locator('form').count();
  console.warn('Number of forms:', forms);

  // Check for any text containing "Create" or "Register"
  const createAccountText = await page.locator('text=Create').count();
  const registerText = await page.locator('text=Register').count();
  console.warn('Create account links/buttons:', createAccountText);
  console.warn('Register text:', registerText);

  // Check for input fields
  const emailInputs = await page.locator('input[type="email"]').count();
  const passwordInputs = await page.locator('input[type="password"]').count();
  const nameInputs = await page.locator('input[id="name"]').count();
  console.warn('Email inputs:', emailInputs);
  console.warn('Password inputs:', passwordInputs);
  console.warn('Name inputs:', nameInputs);

  // Try to find registration form
  const registerButton = page.locator('button', { hasText: 'Create account' });
  if (await registerButton.isVisible()) {
    console.warn('✅ Registration form is visible');
  } else {
    console.warn('❌ Registration form is NOT visible');

    // Try to find login form and switch
    const signUpLink = page.locator('text=Sign up');
    if (await signUpLink.isVisible()) {
      console.warn('🔄 Found "Sign up" link, clicking...');
      await signUpLink.click();
      await page.waitForTimeout(1000);

      // Take screenshot after clicking
      await page.screenshot({ path: `debug-after-click-${Date.now()}.png`, fullPage: true });

      // Check again for registration form
      const nameInputAfter = await page.locator('input[id="name"]').count();
      const registerButtonAfter = await page.locator('button', { hasText: 'Create account' }).count();
      console.warn('Name inputs after click:', nameInputAfter);
      console.warn('Register buttons after click:', registerButtonAfter);
    }
  }

  // Print all text on the page for debugging
  const bodyText = await page.textContent('body');
  console.warn('Page text (first 500 chars):', bodyText?.substring(0, 500));

  expect(true).toBe(true); // Always pass
});