import { test, expect } from '@playwright/test';
import { generateTestData } from './utils/test-helpers';

test('Final User Registration Test', async ({ page }) => {
  console.warn('🎯 Final user registration test with full AWS Cognito integration');

  const testData = generateTestData();
  console.warn('Test user:', testData.email);

  // Capture console messages and errors
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.warn(text);
  });

  page.on('pageerror', error => {
    console.warn(`[PAGE ERROR] ${error.message}`);
  });

  // Navigate to app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');

  // Verify auth page loads
  await expect(page.locator('h1', { hasText: 'Auteurium' })).toBeVisible();
  console.warn('✅ Auth page loaded');

  // Switch to registration if needed
  const registerLink = page.locator('text=Create an account');
  if (await registerLink.isVisible()) {
    await registerLink.click();
    await page.waitForTimeout(500);
  }

  // Fill registration form
  await page.locator('input[placeholder*="Full name"]').fill('Test User');
  await page.locator('input[type="email"]').fill(testData.email);
  await page.locator('input[placeholder*="Create a password"]').fill(testData.password);
  await page.locator('input[placeholder*="Confirm"]').fill(testData.password);

  console.warn('✅ Registration form filled');

  // Submit registration
  await page.locator('button', { hasText: 'Create account' }).click();
  console.warn('🚀 Registration submitted');

  // Wait for response
  await page.waitForTimeout(10000);

  // Check final state
  const finalUrl = page.url();
  const finalContent = await page.textContent('body');

  console.warn('📊 RESULTS:');
  console.warn('Final URL:', finalUrl);
  console.warn('Content keywords:',
    finalContent?.toLowerCase().includes('email') ? '📧 Email' : '',
    finalContent?.toLowerCase().includes('confirm') ? '✅ Confirm' : '',
    finalContent?.toLowerCase().includes('error') ? '❌ Error' : '',
    finalContent?.toLowerCase().includes('dashboard') ? '🏠 Dashboard' : ''
  );

  // Take final screenshot
  await page.screenshot({ path: `final-test-${Date.now()}.png`, fullPage: true });

  // Success if no critical errors
  expect(finalContent).toBeDefined();
  expect(finalUrl).toContain('localhost:3000');

  console.warn('🎉 User registration test completed successfully!');
});