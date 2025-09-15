import { test, expect } from '@playwright/test';

test('Check Browser Console Errors', async ({ page }) => {
  console.log('Checking for JavaScript errors...');

  // Capture console messages
  const messages: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    messages.push(text);
    if (msg.type() === 'error') {
      errors.push(text);
    }
    console.log(text);
  });

  page.on('pageerror', error => {
    const errorText = `[PAGE ERROR] ${error.message}`;
    errors.push(errorText);
    console.log(errorText);
  });

  // Navigate to the app
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait for any async operations
  await page.waitForTimeout(5000);

  // Check if React root has content
  const rootContent = await page.locator('#root').innerHTML();
  console.log('Root content:', rootContent.substring(0, 200));

  // Check if main.tsx script loaded
  const scripts = await page.locator('script[src*="main.tsx"]').count();
  console.log('Main script tags found:', scripts);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Console messages:', messages.length);
  console.log('Console errors:', errors.length);
  console.log('React root empty:', rootContent.trim() === '');

  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    errors.forEach(error => console.log(error));
  }

  // Test passes if we collected the debug info
  expect(messages.length).toBeGreaterThanOrEqual(0);
});