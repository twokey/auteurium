import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly navigation: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly createProjectButton: Locator;
  readonly projectsGrid: Locator;
  readonly createProjectModal: Locator;
  readonly projectNameInput: Locator;
  readonly projectDescriptionInput: Locator;
  readonly saveProjectButton: Locator;
  readonly cancelProjectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navigation = page.locator('nav');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('text=Logout');
    this.createProjectButton = page.locator('text=Create New Project');
    this.projectsGrid = page.locator('[data-testid="projects-grid"]');
    this.createProjectModal = page.locator('[data-testid="create-project-modal"]');
    this.projectNameInput = page.locator('input[name="name"]');
    this.projectDescriptionInput = page.locator('textarea[name="description"]');
    this.saveProjectButton = page.locator('button[type="submit"]', { hasText: 'Create' });
    this.cancelProjectButton = page.locator('button', { hasText: 'Cancel' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async createProject(name: string, description?: string) {
    await this.createProjectButton.click();
    await expect(this.createProjectModal).toBeVisible();

    await this.projectNameInput.fill(name);
    if (description) {
      await this.projectDescriptionInput.fill(description);
    }

    await this.saveProjectButton.click();
    await expect(this.createProjectModal).not.toBeVisible();
  }

  async openProject(projectName: string) {
    const projectCard = this.page.locator(`[data-testid="project-card"]`, {
      hasText: projectName
    });
    await expect(projectCard).toBeVisible();
    await projectCard.click();
  }

  async deleteProject(projectName: string) {
    const projectCard = this.page.locator(`[data-testid="project-card"]`, {
      hasText: projectName
    });
    const deleteButton = projectCard.locator('[data-testid="delete-project"]');

    await deleteButton.click();

    // Confirm deletion in modal
    await this.page.locator('button', { hasText: 'Delete' }).click();

    // Verify project is removed
    await expect(projectCard).not.toBeVisible();
  }

  async editProject(currentName: string, newName: string, newDescription?: string) {
    const projectCard = this.page.locator(`[data-testid="project-card"]`, {
      hasText: currentName
    });
    const editButton = projectCard.locator('[data-testid="edit-project"]');

    await editButton.click();

    const editModal = this.page.locator('[data-testid="edit-project-modal"]');
    await expect(editModal).toBeVisible();

    await this.projectNameInput.fill(newName);
    if (newDescription) {
      await this.projectDescriptionInput.fill(newDescription);
    }

    await this.saveProjectButton.click();
    await expect(editModal).not.toBeVisible();
  }

  async expectProjectExists(projectName: string) {
    const projectCard = this.page.locator(`[data-testid="project-card"]`, {
      hasText: projectName
    });
    await expect(projectCard).toBeVisible();
  }

  async expectProjectCount(count: number) {
    await expect(this.page.locator('[data-testid="project-card"]')).toHaveCount(count);
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.page.waitForURL('/auth');
  }
}