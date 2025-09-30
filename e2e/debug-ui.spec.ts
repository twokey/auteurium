import { test } from '@playwright/test';

test('Debug UI structure', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');

  // Take screenshot to see current state
  await page.screenshot({ path: 'debug-ui.png', fullPage: true });

  // Log all visible elements
  const allElements = await page.locator('*:visible').allTextContents();
  console.warn('Visible text content:', allElements);

  // Check for common form elements
  const inputs = await page.locator('input').count();
  const buttons = await page.locator('button').count();
  console.warn(`Found ${inputs} inputs and ${buttons} buttons`);

  // Check page title and current content
  const title = await page.title();
  const bodyText = await page.textContent('body');
  console.warn('Page title:', title);
  console.warn('Body content:', bodyText?.substring(0, 200));
});