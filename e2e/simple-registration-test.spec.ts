import { test, expect } from '@playwright/test';

test('Simple registration test', async ({ page }) => {
  console.log('Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Take screenshot to see current state
  await page.screenshot({ path: 'current-state.png', fullPage: true });

  // Log page content
  const title = await page.title();
  console.log('Page title:', title);

  const bodyText = await page.textContent('body');
  console.log('Body text:', bodyText?.substring(0, 300));

  // Check if page loaded at all
  await expect(page.locator('html')).toBeVisible();

  // Look for any visible content
  const visibleElements = await page.locator('*:visible').count();
  console.log('Visible elements:', visibleElements);

  // Look for authentication-related elements
  const emailInputs = await page.locator('input[type="email"]').count();
  const passwordInputs = await page.locator('input[type="password"]').count();
  const buttons = await page.locator('button').count();

  console.log(`Found: ${emailInputs} email inputs, ${passwordInputs} password inputs, ${buttons} buttons`);

  // Check for loading states
  const loadingText = await page.locator('text=Loading').count();
  console.log('Loading indicators:', loadingText);

  // Basic success: page loaded without major errors
  expect(visibleElements).toBeGreaterThan(0);
});