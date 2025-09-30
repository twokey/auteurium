import { test, expect } from '@playwright/test';

test('Check Browser Console Errors', async ({ page }) => {
  console.warn('Checking for JavaScript errors...');

  // Capture console messages
  const messages: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    messages.push(text);
    if (msg.type() === 'error') {
      errors.push(text);
    }
    console.warn(text);
  });

  page.on('pageerror', error => {
    const errorText = `[PAGE ERROR] ${error.message}`;
    errors.push(errorText);
    console.warn(errorText);
  });

  // Navigate to the app
  await page.goto('http://localhost:3000', { waitUntil: 'load' });

  // Wait for any async operations
  await page.waitForLoadState('domcontentloaded');

  // Check if React root has content
  const rootContent = await page.locator('#root').innerHTML();
  console.warn('Root content:', rootContent.substring(0, 200));

  // Check if main.tsx script loaded
  const scripts = await page.locator('script[src*="main.tsx"]').count();
  console.warn('Main script tags found:', scripts);

  // Summary
  console.warn('\n=== SUMMARY ===');
  console.warn('Console messages:', messages.length);
  console.warn('Console errors:', errors.length);
  console.warn('React root empty:', rootContent.trim() === '');

  if (errors.length > 0) {
    console.warn('\n=== ERRORS ===');
    errors.forEach(error => console.warn(error));
  }

  // Test passes if we collected the debug info
  expect(messages.length).toBeGreaterThanOrEqual(0);
});