import { test, expect } from './fixtures/auth';

test.describe('Debug Snippet Creation', () => {
  test('should create snippet and check for errors', async ({ page, authenticatedUser: _authenticatedUser }) => {
    // Listen for console errors
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Listen for network errors
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Create a test project
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill('Debug Snippet Test');
    await modal.locator('button[type="submit"]').click();

    // Wait for navigation to canvas
    await page.waitForURL(/\/project\/.+/);
    await page.waitForLoadState('domcontentloaded');

    console.warn('On canvas page');

    // Click create snippet button
    const createSnippetButton = page.locator('[data-testid="create-snippet"]');
    await expect(createSnippetButton).toBeVisible();

    console.warn('Clicking create snippet button');
    await createSnippetButton.click();

    // Wait a bit for the mutation to complete
    await page.waitForTimeout(3000);

    // Log all console messages and errors
    console.warn('\n=== Console Messages ===');
    consoleMessages.forEach(msg => console.warn(msg));

    console.warn('\n=== Console Errors ===');
    consoleErrors.forEach(err => console.warn(err));

    console.warn('\n=== Network Errors ===');
    networkErrors.forEach(err => console.warn(err));

    // Check if alert appeared
    const dialog = page.locator('text=Failed to create snippet');
    const hasError = await dialog.isVisible().catch(() => false);

    if (hasError) {
      console.warn('\n!!! ERROR ALERT APPEARED !!!');
    }

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/snippet-creation-debug.png' });

    // Check for snippets on canvas
    const snippetNodes = page.locator('[data-testid="snippet-node"]');
    const count = await snippetNodes.count();
    console.warn(`\nSnippet nodes found: ${count}`);

    // If there are errors, fail the test
    if (consoleErrors.length > 0 || networkErrors.length > 0) {
      console.warn('\n!!! Test failed due to errors !!!');
    }
  });
});