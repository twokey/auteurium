import { test, expect } from '@playwright/test';

test('Debug UI structure', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Take screenshot to see current state
  await page.screenshot({ path: 'debug-ui.png', fullPage: true });

  // Log all visible elements
  const allElements = await page.locator('*:visible').allTextContents();
  console.log('Visible text content:', allElements);

  // Check for common form elements
  const inputs = await page.locator('input').count();
  const buttons = await page.locator('button').count();
  console.log(`Found ${inputs} inputs and ${buttons} buttons`);

  // Check page title and current content
  const title = await page.title();
  const bodyText = await page.textContent('body');
  console.log('Page title:', title);
  console.log('Body content:', bodyText?.substring(0, 200));
});