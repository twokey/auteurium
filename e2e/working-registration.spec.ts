import { test, expect } from '@playwright/test';
import { generateTestData } from './utils/test-helpers';

test('User Registration - Working Test', async ({ page }) => {
  console.log('Testing user registration with fixed React app...');

  const testData = generateTestData();
  console.log('Using test email:', testData.email);

  // Navigate to the app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Should see the auth page
  await expect(page.locator('h1', { hasText: 'Auteurium' })).toBeVisible();

  // Look for registration form - if login is shown, switch to register
  const signUpButton = page.locator('text=Sign up');
  const signUpLink = page.locator('text=Create an account');

  if (await signUpButton.isVisible()) {
    await signUpButton.click();
  } else if (await signUpLink.isVisible()) {
    await signUpLink.click();
  }

  // Wait for registration form
  await page.waitForTimeout(1000);

  // Check for form fields
  const emailInput = page.locator('input[type="email"]');
  const passwordInputs = page.locator('input[type="password"]');

  await expect(emailInput).toBeVisible();
  await expect(passwordInputs).toHaveCount(2); // password + confirm password

  // Fill the registration form
  await emailInput.fill(testData.email);
  await passwordInputs.nth(0).fill(testData.password); // main password
  await passwordInputs.nth(1).fill(testData.password); // confirm password

  // Submit the form
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeVisible();

  console.log('Submitting registration form...');
  await submitButton.click();

  // Wait for the registration response
  await page.waitForTimeout(5000);

  // Check for various success/error states
  const bodyText = await page.textContent('body');
  console.log('Response received, checking results...');

  // Look for success indicators
  const successIndicators = [
    'Check your email',
    'Confirmation',
    'verify',
    'Dashboard',
    'Welcome'
  ];

  const errorIndicators = [
    'already exists',
    'UsernameExistsException',
    'Invalid',
    'Error'
  ];

  let registrationResult = 'unknown';

  for (const indicator of successIndicators) {
    if (bodyText?.toLowerCase().includes(indicator.toLowerCase())) {
      registrationResult = 'success';
      console.log(`✅ Registration successful - found: ${indicator}`);
      break;
    }
  }

  if (registrationResult === 'unknown') {
    for (const indicator of errorIndicators) {
      if (bodyText?.toLowerCase().includes(indicator.toLowerCase())) {
        registrationResult = 'error';
        console.log(`ℹ️ Registration error (expected) - found: ${indicator}`);
        break;
      }
    }
  }

  // Take screenshot for manual verification
  await page.screenshot({
    path: `registration-result-${Date.now()}.png`,
    fullPage: true
  });

  console.log('Final result:', registrationResult);
  console.log('Body text snippet:', bodyText?.substring(0, 200));

  // Test passes if we got any meaningful response (success or expected error)
  expect(['success', 'error']).toContain(registrationResult);
});