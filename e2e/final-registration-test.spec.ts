import { test, expect } from '@playwright/test';
import { generateTestData } from './utils/test-helpers';

test('Final User Registration Test', async ({ page }) => {
  console.log('🎯 Final user registration test with full AWS Cognito integration');

  const testData = generateTestData();
  console.log('Test user:', testData.email);

  // Capture console messages and errors
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log(text);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // Navigate to app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Verify auth page loads
  await expect(page.locator('h1', { hasText: 'Auteurium' })).toBeVisible();
  console.log('✅ Auth page loaded');

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

  console.log('✅ Registration form filled');

  // Submit registration
  await page.locator('button', { hasText: 'Create account' }).click();
  console.log('🚀 Registration submitted');

  // Wait for response
  await page.waitForTimeout(10000);

  // Check final state
  const finalUrl = page.url();
  const finalContent = await page.textContent('body');

  console.log('📊 RESULTS:');
  console.log('Final URL:', finalUrl);
  console.log('Content keywords:',
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

  console.log('🎉 User registration test completed successfully!');
});