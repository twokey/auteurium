import { Page, Locator, expect } from '@playwright/test';

export class CanvasPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly toolbar: Locator;
  readonly createSnippetButton: Locator;
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;
  readonly zoomResetButton: Locator;
  readonly snippetModal: Locator;
  readonly snippetTitleInput: Locator;
  readonly snippetContentInput: Locator;
  readonly saveSnippetButton: Locator;
  readonly cancelSnippetButton: Locator;
  readonly infoPanel: Locator;
  readonly backToDashboardButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('[data-testid="react-flow-canvas"]');
    this.toolbar = page.locator('[data-testid="canvas-toolbar"]');
    this.createSnippetButton = page.locator('[data-testid="create-snippet"]');
    this.zoomInButton = page.locator('[data-testid="zoom-in"]');
    this.zoomOutButton = page.locator('[data-testid="zoom-out"]');
    this.zoomResetButton = page.locator('[data-testid="zoom-reset"]');
    this.snippetModal = page.locator('[data-testid="snippet-modal"]');
    this.snippetTitleInput = page.locator('input[name="title"]');
    this.snippetContentInput = page.locator('textarea[name="content"]');
    this.saveSnippetButton = page.locator('button[type="submit"]', { hasText: 'Save' });
    this.cancelSnippetButton = page.locator('button', { hasText: 'Cancel' });
    this.infoPanel = page.locator('[data-testid="info-panel"]');
    this.backToDashboardButton = page.locator('text=Back to Dashboard');
  }

  async goto(projectId: string) {
    await this.page.goto(`/project/${projectId}`);
  }

  async createSnippet(title: string, content: string, x?: number, y?: number) {
    await this.createSnippetButton.click();
    await expect(this.snippetModal).toBeVisible();

    await this.snippetTitleInput.fill(title);
    await this.snippetContentInput.fill(content);
    await this.saveSnippetButton.click();

    await expect(this.snippetModal).not.toBeVisible();

    // If position specified, drag snippet to that position
    if (x !== undefined && y !== undefined) {
      const snippet = this.getSnippetByTitle(title);
      await snippet.dragTo(this.canvas, { targetPosition: { x, y } });
    }
  }

  async editSnippet(currentTitle: string, newTitle: string, newContent: string) {
    const snippet = this.getSnippetByTitle(currentTitle);
    await snippet.dblclick();

    await expect(this.snippetModal).toBeVisible();
    await this.snippetTitleInput.fill(newTitle);
    await this.snippetContentInput.fill(newContent);
    await this.saveSnippetButton.click();

    await expect(this.snippetModal).not.toBeVisible();
  }

  async deleteSnippet(title: string) {
    const snippet = this.getSnippetByTitle(title);
    await snippet.click({ button: 'right' });

    const contextMenu = this.page.locator('[data-testid="context-menu"]');
    const deleteOption = contextMenu.locator('text=Delete');
    await deleteOption.click();

    // Confirm deletion
    await this.page.locator('button', { hasText: 'Delete' }).click();

    // Verify snippet is removed
    await expect(snippet).not.toBeVisible();
  }

  async connectSnippets(sourceTitle: string, targetTitle: string, connectionLabel?: string) {
    const sourceSnippet = this.getSnippetByTitle(sourceTitle);
    await sourceSnippet.click({ button: 'right' });

    const contextMenu = this.page.locator('[data-testid="context-menu"]');
    await contextMenu.locator('text=Connect to').click();

    const connectionModal = this.page.locator('[data-testid="connection-modal"]');
    await expect(connectionModal).toBeVisible();

    // Enter target snippet ID or select from dropdown
    const targetInput = this.page.locator('input[name="targetSnippet"]');
    await targetInput.fill(targetTitle);

    if (connectionLabel) {
      const labelInput = this.page.locator('input[name="connectionLabel"]');
      await labelInput.fill(connectionLabel);
    }

    await this.page.locator('button', { hasText: 'Create Connection' }).click();
    await expect(connectionModal).not.toBeVisible();
  }

  async zoomIn() {
    await this.zoomInButton.click();
  }

  async zoomOut() {
    await this.zoomOutButton.click();
  }

  async resetZoom() {
    await this.zoomResetButton.click();
  }

  async panCanvas(deltaX: number, deltaY: number) {
    const canvasCenter = await this.canvas.boundingBox();
    if (canvasCenter) {
      const centerX = canvasCenter.x + canvasCenter.width / 2;
      const centerY = canvasCenter.y + canvasCenter.height / 2;

      await this.page.mouse.move(centerX, centerY);
      await this.page.mouse.down();
      await this.page.mouse.move(centerX + deltaX, centerY + deltaY);
      await this.page.mouse.up();
    }
  }

  getSnippetByTitle(title: string): Locator {
    return this.page.locator(`[data-testid="snippet-node"]`, { hasText: title });
  }

  getSnippetById(id: string): Locator {
    return this.page.locator(`[data-testid="snippet-${id}"]`);
  }

  async expectSnippetExists(title: string) {
    await expect(this.getSnippetByTitle(title)).toBeVisible();
  }

  async expectSnippetCount(count: number) {
    await expect(this.page.locator('[data-testid="snippet-node"]')).toHaveCount(count);
  }

  async expectConnectionExists(sourceTitle: string, targetTitle: string) {
    const connection = this.page.locator('[data-testid="connection-edge"]')
      .filter({ has: this.page.locator(`[data-source="${sourceTitle}"][data-target="${targetTitle}"]`) });
    await expect(connection).toBeVisible();
  }

  async backToDashboard() {
    await this.backToDashboardButton.click();
    await this.page.waitForURL('/');
  }
}