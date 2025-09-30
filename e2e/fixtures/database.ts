import { test as base } from '@playwright/test';

interface DatabaseFixtures {
  cleanDatabase: void;
  testProject: { id: string; name: string };
}

export const test = base.extend<DatabaseFixtures>({
  cleanDatabase: [async ({ page: _page }, use) => {
    // Setup: Clean database state before test
    if (process.env.RESET_DB_BEFORE_TESTS === 'true') {
      // This would typically call your backend API to clean test data
      // For now, we'll rely on user-specific data isolation
      console.warn('Database cleanup not implemented - relying on user isolation');
    }

    await use();

    // Teardown: Clean up after test if needed
    // You might want to delete test projects/snippets created during the test
  }, { auto: true }],

  testProject: async ({ page }, use) => {
    // Create a test project that will be available during the test
    const projectName = `Test Project ${Date.now()}`;

    // Navigate to dashboard and create project
    await page.goto('/');

    // Use page object to create project
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(projectName);
    await modal.locator('button[type="submit"]').click();

    // Extract project ID from URL after creation
    await page.waitForURL(/\/project\/(.+)/);
    const url = page.url();
    const projectId = url.split('/project/')[1];

    const testProjectData = {
      id: projectId,
      name: projectName
    };

    await use(testProjectData);

    // Cleanup: Delete the test project
    try {
      await page.goto('/');
      const projectCard = page.locator(`[data-testid="project-card"]`, {
        hasText: projectName
      });

      if (await projectCard.isVisible()) {
        const deleteButton = projectCard.locator('[data-testid="delete-project"]');
        await deleteButton.click();
        await page.locator('button', { hasText: 'Delete' }).click();
      }
    } catch (error) {
      console.warn('Failed to cleanup test project:', error);
    }
  }
});