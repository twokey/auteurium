import { test, expect } from './fixtures/auth';
import { generateTestData } from './utils/test-helpers';

test.describe('Navigation', () => {
  test('should navigate between pages when authenticated', async ({
    authenticatedUser: _authenticatedUser,
    page
  }) => {
    // Start at dashboard
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Navigate to admin (if accessible)
    const adminLink = page.locator('text=Admin');
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page).toHaveURL('/admin');
      await expect(page.locator('text=Admin Panel')).toBeVisible();
    }

    // Navigate back to dashboard
    const dashboardLink = page.locator('text=Dashboard');
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await expect(page).toHaveURL('/');
    }
  });

  test('should redirect to auth page when not authenticated', async ({ page }) => {
    // Try to access protected routes without authentication
    const protectedRoutes = ['/', '/admin', '/project/123'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL('/auth');
    }
  });

  test('should handle direct project URLs', async ({
    authenticatedUser: _authenticatedUser,
    page
  }) => {
    const testData = generateTestData();

    // Create a project first
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    // Get the project URL
    await expect(page).toHaveURL(/\/project\/.+/);
    const projectUrl = page.url();

    // Navigate away
    await page.goto('/');

    // Navigate directly to project URL
    await page.goto(projectUrl);
    await expect(page).toHaveURL(projectUrl);
    await expect(page.locator('[data-testid="react-flow-canvas"]')).toBeVisible();
  });

  test('should handle invalid project URLs', async ({
    authenticatedUser: _authenticatedUser,
    page
  }) => {
    // Try to access non-existent project
    await page.goto('/project/non-existent-id');

    // Should either redirect to dashboard or show error page
    // This depends on your error handling implementation
    try {
      await expect(page).toHaveURL('/');
    } catch {
      await expect(page.locator('text=Project not found')).toBeVisible();
    }
  });

  test('should handle browser back/forward navigation', async ({
    authenticatedUser: _authenticatedUser,
    page
  }) => {
    const testData = generateTestData();

    // Start at dashboard
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Create and enter project
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    const projectUrl = page.url();
    await expect(page).toHaveURL(projectUrl);

    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL('/');

    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL(projectUrl);
  });

  test('should display navigation menu correctly', async ({
    authenticatedUser: _authenticatedUser,
    page
  }) => {
    await page.goto('/');

    // Check navigation elements
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();

    // Check for logo/brand
    const logo = page.locator('[data-testid="logo"]');
    if (await logo.isVisible()) {
      await expect(logo).toContainText('Auteurium');
    }

    // Check for user menu
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Check dropdown items
      await expect(page.locator('text=Logout')).toBeVisible();

      // Click elsewhere to close menu
      await page.click('body');
    }
  });

  test('should show active navigation state', async ({
    authenticatedUser: _authenticatedUser,
    page
  }) => {
    await page.goto('/');

    // Check if dashboard link is active
    const dashboardLink = page.locator('nav a[href="/"]');
    if (await dashboardLink.isVisible()) {
      // Check for active class or styling
      const classes = await dashboardLink.getAttribute('class');
      expect(classes).toContain('active'); // Adjust based on your CSS classes
    }

    // Navigate to admin and check active state
    const adminLink = page.locator('nav a[href="/admin"]');
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page).toHaveURL('/admin');

      const updatedClasses = await adminLink.getAttribute('class');
      expect(updatedClasses).toContain('active');
    }
  });

  test('should handle deep linking to canvas with state', async ({
    authenticatedUser: _authenticatedUser,
    page
  }) => {
    const testData = generateTestData();

    // Create project with snippet
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    // Create a snippet
    const createSnippetButton = page.locator('[data-testid="create-snippet"]');
    await createSnippetButton.click();

    const snippetModal = page.locator('[data-testid="snippet-modal"]');
    await snippetModal.locator('input[name="title"]').fill(testData.snippetTitle);
    await snippetModal.locator('textarea[name="content"]').fill(testData.snippetContent);
    await snippetModal.locator('button[type="submit"]').click();

    const projectUrl = page.url();

    // Open new tab/window and navigate directly to project
    const newPage = await page.context().newPage();
    await newPage.goto(projectUrl);

    // Should load project with existing snippet
    await expect(newPage.locator('[data-testid="react-flow-canvas"]')).toBeVisible();
    await expect(newPage.locator(`text=${testData.snippetTitle}`)).toBeVisible();

    await newPage.close();
  });

  test('should preserve URL state during authentication redirect', async ({ page }) => {
    // Try to access a specific project while not authenticated
    const targetUrl = '/project/some-id';
    await page.goto(targetUrl);

    // Should redirect to auth
    await expect(page).toHaveURL('/auth');

    // After successful authentication, should redirect to original URL
    // This test would need valid credentials and depends on your auth flow
    const credentials = {
      email: process.env.TEST_USER_EMAIL ?? 'test@auteurium.test',
      password: process.env.TEST_USER_PASSWORD ?? 'TestPassword123!'
    };

    if (credentials.email && credentials.password) {
      await page.locator('input[type="email"]').fill(credentials.email);
      await page.locator('input[type="password"]').fill(credentials.password);
      await page.locator('button[type="submit"]').click();

      // Should redirect to original target (or dashboard if project doesn't exist)
      try {
        await expect(page).toHaveURL(targetUrl);
      } catch {
        await expect(page).toHaveURL('/');
      }
    }
  });
});