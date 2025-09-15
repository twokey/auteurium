import { test, expect } from './fixtures/auth';
import { generateTestData } from './utils/test-helpers';

test.describe('Dashboard', () => {
  test.use({ storageState: 'auth.json' }); // Persist auth state between tests

  test('should display dashboard for authenticated user', async ({
    authenticatedUser,
    dashboardPage
  }) => {
    await dashboardPage.goto();

    await expect(dashboardPage.navigation).toBeVisible();
    await expect(dashboardPage.createProjectButton).toBeVisible();
    await expect(dashboardPage.projectsGrid).toBeVisible();
  });

  test('should create new project', async ({
    authenticatedUser,
    dashboardPage
  }) => {
    const testData = generateTestData();

    await dashboardPage.goto();

    // Get initial project count
    const initialProjects = await dashboardPage.page.locator('[data-testid="project-card"]').count();

    // Create new project
    await dashboardPage.createProject(testData.projectName, 'Test project description');

    // Verify project was created
    await dashboardPage.expectProjectExists(testData.projectName);
    await dashboardPage.expectProjectCount(initialProjects + 1);

    // Cleanup
    await dashboardPage.deleteProject(testData.projectName);
  });

  test('should edit existing project', async ({
    authenticatedUser,
    dashboardPage
  }) => {
    const testData = generateTestData();
    const updatedName = `${testData.projectName} Updated`;

    await dashboardPage.goto();

    // Create a project to edit
    await dashboardPage.createProject(testData.projectName);
    await dashboardPage.expectProjectExists(testData.projectName);

    // Edit the project
    await dashboardPage.editProject(
      testData.projectName,
      updatedName,
      'Updated description'
    );

    // Verify the changes
    await dashboardPage.expectProjectExists(updatedName);
    await expect(
      dashboardPage.page.locator(`[data-testid="project-card"]`, { hasText: testData.projectName })
    ).not.toBeVisible();

    // Cleanup
    await dashboardPage.deleteProject(updatedName);
  });

  test('should delete project', async ({
    authenticatedUser,
    dashboardPage
  }) => {
    const testData = generateTestData();

    await dashboardPage.goto();

    // Get initial project count
    const initialProjects = await dashboardPage.page.locator('[data-testid="project-card"]').count();

    // Create a project to delete
    await dashboardPage.createProject(testData.projectName);
    await dashboardPage.expectProjectCount(initialProjects + 1);

    // Delete the project
    await dashboardPage.deleteProject(testData.projectName);

    // Verify project was deleted
    await dashboardPage.expectProjectCount(initialProjects);
    await expect(
      dashboardPage.page.locator(`[data-testid="project-card"]`, { hasText: testData.projectName })
    ).not.toBeVisible();
  });

  test('should open project canvas', async ({
    authenticatedUser,
    dashboardPage,
    page
  }) => {
    const testData = generateTestData();

    await dashboardPage.goto();

    // Create a project
    await dashboardPage.createProject(testData.projectName);

    // Open the project
    await dashboardPage.openProject(testData.projectName);

    // Should navigate to canvas page
    await expect(page).toHaveURL(/\/project\/.+/);
    await expect(page.locator('[data-testid="react-flow-canvas"]')).toBeVisible();

    // Navigate back and cleanup
    await page.goto('/');
    await dashboardPage.deleteProject(testData.projectName);
  });

  test('should handle empty project state', async ({
    authenticatedUser,
    dashboardPage
  }) => {
    await dashboardPage.goto();

    // If no projects exist, should show empty state
    const projectCount = await dashboardPage.page.locator('[data-testid="project-card"]').count();

    if (projectCount === 0) {
      await expect(
        dashboardPage.page.locator('text=No projects yet')
      ).toBeVisible();
    }
  });

  test('should search/filter projects', async ({
    authenticatedUser,
    dashboardPage,
    page
  }) => {
    const testData1 = generateTestData();
    const testData2 = generateTestData();

    await dashboardPage.goto();

    // Create multiple projects
    await dashboardPage.createProject(testData1.projectName);
    await dashboardPage.createProject(testData2.projectName);

    // If search/filter functionality exists, test it
    const searchInput = page.locator('[data-testid="project-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testData1.projectName);

      await dashboardPage.expectProjectExists(testData1.projectName);
      await expect(
        page.locator(`[data-testid="project-card"]`, { hasText: testData2.projectName })
      ).not.toBeVisible();

      // Clear search
      await searchInput.clear();
      await dashboardPage.expectProjectExists(testData1.projectName);
      await dashboardPage.expectProjectExists(testData2.projectName);
    }

    // Cleanup
    await dashboardPage.deleteProject(testData1.projectName);
    await dashboardPage.deleteProject(testData2.projectName);
  });

  test('should display project metadata', async ({
    authenticatedUser,
    dashboardPage
  }) => {
    const testData = generateTestData();

    await dashboardPage.goto();

    // Create project with description
    await dashboardPage.createProject(testData.projectName, 'Test project description');

    const projectCard = dashboardPage.page.locator(`[data-testid="project-card"]`, {
      hasText: testData.projectName
    });

    // Check if description is visible
    await expect(projectCard.locator('text=Test project description')).toBeVisible();

    // Check if creation date is visible (if implemented)
    const dateElement = projectCard.locator('[data-testid="project-date"]');
    if (await dateElement.isVisible()) {
      await expect(dateElement).toContainText(new Date().getFullYear().toString());
    }

    // Cleanup
    await dashboardPage.deleteProject(testData.projectName);
  });
});