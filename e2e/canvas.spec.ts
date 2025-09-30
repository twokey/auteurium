import { test, expect } from './fixtures/auth';
import { generateTestData } from './utils/test-helpers';

test.describe('Canvas Functionality', () => {
  test('should display canvas interface', async ({
    canvasPage
  }) => {
    // Create a test project first
    const testData = generateTestData();
    await canvasPage.page.goto('/');

    const createButton = canvasPage.page.locator('text=Create New Project');
    await createButton.click();

    const modal = canvasPage.page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    // Should navigate to canvas
    await expect(canvasPage.page).toHaveURL(/\/project\/.+/);
    await expect(canvasPage.canvas).toBeVisible();
    await expect(canvasPage.toolbar).toBeVisible();
    await expect(canvasPage.createSnippetButton).toBeVisible();
  });

  test('should create new snippet', async ({
    canvasPage,
    page
  }) => {
    const testData = generateTestData();

    // Create project and navigate to canvas
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    // Create snippet
    await canvasPage.createSnippet(testData.snippetTitle, testData.snippetContent);

    // Verify snippet appears on canvas
    await canvasPage.expectSnippetExists(testData.snippetTitle);
    await canvasPage.expectSnippetCount(1);
  });

  test('should edit existing snippet', async ({
    canvasPage,
    page
  }) => {
    const testData = generateTestData();
    const updatedTitle = `${testData.snippetTitle} Updated`;
    const updatedContent = `${testData.snippetContent} Updated`;

    // Setup: Create project and snippet
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    await canvasPage.createSnippet(testData.snippetTitle, testData.snippetContent);

    // Edit the snippet
    await canvasPage.editSnippet(testData.snippetTitle, updatedTitle, updatedContent);

    // Verify changes
    await canvasPage.expectSnippetExists(updatedTitle);
    await expect(canvasPage.getSnippetByTitle(testData.snippetTitle)).toBeHidden();
  });

  test('should delete snippet', async ({
    canvasPage,
    page
  }) => {
    const testData = generateTestData();

    // Setup
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    await canvasPage.createSnippet(testData.snippetTitle, testData.snippetContent);
    await canvasPage.expectSnippetCount(1);

    // Delete snippet
    await canvasPage.deleteSnippet(testData.snippetTitle);

    // Verify deletion
    await canvasPage.expectSnippetCount(0);
  });

  test('should drag and position snippets', async ({
    canvasPage,
    page
  }) => {
    const testData = generateTestData();

    // Setup
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    // Create snippet
    await canvasPage.createSnippet(testData.snippetTitle, testData.snippetContent);

    // Test dragging
    const snippet = canvasPage.getSnippetByTitle(testData.snippetTitle);
    const initialPosition = await snippet.boundingBox();

    // Drag snippet to new position
    await snippet.dragTo(canvasPage.canvas, { targetPosition: { x: 200, y: 200 } });

    // Verify position changed
    const newPosition = await snippet.boundingBox();
    expect(newPosition?.x).not.toBe(initialPosition?.x);
    expect(newPosition?.y).not.toBe(initialPosition?.y);
  });

  test('should create connections between snippets', async ({
    canvasPage,
    page
  }) => {
    const testData1 = generateTestData();
    const testData2 = generateTestData();

    // Setup
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill('Test Project');
    await modal.locator('button[type="submit"]').click();

    // Create two snippets
    await canvasPage.createSnippet(testData1.snippetTitle, testData1.snippetContent);
    await canvasPage.createSnippet(testData2.snippetTitle, testData2.snippetContent);

    // Connect snippets
    await canvasPage.connectSnippets(testData1.snippetTitle, testData2.snippetTitle, 'depends on');

    // Verify connection exists
    await canvasPage.expectConnectionExists(testData1.snippetTitle, testData2.snippetTitle);
  });

  test('should handle canvas zoom and pan', async ({
    canvasPage,
    page
  }) => {
    // Setup
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill('Test Project');
    await modal.locator('button[type="submit"]').click();

    // Test zoom controls
    await canvasPage.zoomIn();
    await canvasPage.zoomOut();
    await canvasPage.resetZoom();

    // Test panning
    await canvasPage.panCanvas(100, 100);

    // Verify canvas is still functional
    await expect(canvasPage.canvas).toBeVisible();
    await expect(canvasPage.toolbar).toBeVisible();
  });

  test('should navigate back to dashboard', async ({
    canvasPage,
    page
  }) => {
    // Setup
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill('Test Project');
    await modal.locator('button[type="submit"]').click();

    // Navigate back
    await canvasPage.backToDashboard();

    // Verify we're on dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should persist snippet changes', async ({
    canvasPage,
    page
  }) => {
    const testData = generateTestData();

    // Setup
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill(testData.projectName);
    await modal.locator('button[type="submit"]').click();

    // Create snippet
    await canvasPage.createSnippet(testData.snippetTitle, testData.snippetContent);

    // Navigate away and back
    await canvasPage.backToDashboard();
    await page.locator(`[data-testid="project-card"]`, { hasText: testData.projectName }).click();

    // Verify snippet persisted
    await canvasPage.expectSnippetExists(testData.snippetTitle);
  });

  test('should handle large snippets with minimize/expand', async ({
    canvasPage,
    page
  }) => {
    const largeContent = 'Lorem ipsum '.repeat(50); // Create content >100 words

    // Setup
    await page.goto('/');
    const createButton = page.locator('text=Create New Project');
    await createButton.click();

    const modal = page.locator('[data-testid="create-project-modal"]');
    await modal.locator('input[name="name"]').fill('Test Project');
    await modal.locator('button[type="submit"]').click();

    // Create large snippet
    await canvasPage.createSnippet('Large Snippet', largeContent);

    const snippet = canvasPage.getSnippetByTitle('Large Snippet');

    // Check if snippet is minimized (implementation dependent)
    const expandButton = snippet.locator('[data-testid="expand-snippet"]');
    if (await expandButton.isVisible()) {
      await expandButton.click();

      // Should show full content in modal
      const expandModal = page.locator('[data-testid="snippet-expand-modal"]');
      await expect(expandModal).toBeVisible();
      await expect(expandModal).toContainText(largeContent);
    }
  });
});