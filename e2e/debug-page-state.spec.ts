import { test, expect } from '@playwright/test';

test('Debug Current Page State', async ({ page }) => {
  console.log('🔍 Debugging current page state');

  // Navigate to app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Take screenshot of initial state
  await page.screenshot({ path: `debug-initial-state-${Date.now()}.png`, fullPage: true });

  // Log page title and URL
  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());

  // Check what forms are visible
  const forms = await page.locator('form').count();
  console.log('Number of forms:', forms);

  // Check for any text containing "Create" or "Register"
  const createAccountText = await page.locator('text=Create').count();
  const registerText = await page.locator('text=Register').count();
  console.log('Create account links/buttons:', createAccountText);
  console.log('Register text:', registerText);

  // Check for input fields
  const emailInputs = await page.locator('input[type="email"]').count();
  const passwordInputs = await page.locator('input[type="password"]').count();
  const nameInputs = await page.locator('input[id="name"]').count();
  console.log('Email inputs:', emailInputs);
  console.log('Password inputs:', passwordInputs);
  console.log('Name inputs:', nameInputs);

  // Try to find registration form
  const registerButton = page.locator('button', { hasText: 'Create account' });
  if (await registerButton.isVisible()) {
    console.log('✅ Registration form is visible');
  } else {
    console.log('❌ Registration form is NOT visible');

    // Try to find login form and switch
    const signUpLink = page.locator('text=Sign up');
    if (await signUpLink.isVisible()) {
      console.log('🔄 Found "Sign up" link, clicking...');
      await signUpLink.click();
      await page.waitForTimeout(1000);

      // Take screenshot after clicking
      await page.screenshot({ path: `debug-after-click-${Date.now()}.png`, fullPage: true });

      // Check again for registration form
      const nameInputAfter = await page.locator('input[id="name"]').count();
      const registerButtonAfter = await page.locator('button', { hasText: 'Create account' }).count();
      console.log('Name inputs after click:', nameInputAfter);
      console.log('Register buttons after click:', registerButtonAfter);
    }
  }

  // Print all text on the page for debugging
  const bodyText = await page.textContent('body');
  console.log('Page text (first 500 chars):', bodyText?.substring(0, 500));

  expect(true).toBe(true); // Always pass
});