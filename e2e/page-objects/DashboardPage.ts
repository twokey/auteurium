import { expect } from '@playwright/test';

import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly navigation: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly createProjectButton: Locator;
  readonly projectsGrid: Locator;
  readonly createProjectModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navigation = page.locator('nav');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('text=Logout');
    this.createProjectButton = page.locator('[data-testid="create-project-button"]');
    this.projectsGrid = page.locator('[data-testid="projects-grid"]');
    this.createProjectModal = page.locator('[data-testid="create-project-modal"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async createProject(name: string, description?: string) {
    await this.createProjectButton.click();
    await expect(this.createProjectModal).toBeVisible();

    const modalContent = this.page.locator('[data-testid="create-project-modal-content"]');

    await modalContent.locator('[data-testid="project-name-input"]').fill(name);
    
    if (description) {
      await modalContent.locator('[data-testid="project-description-input"]').fill(description);
    }

    await modalContent.locator('[data-testid="create-project-submit"]').click();
    await expect(this.createProjectModal).toBeHidden();
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

    const menuButton = projectCard.locator('[data-testid="project-card-menu-button"]');
    await menuButton.click();

    const deleteButton = projectCard.locator('[data-testid="project-card-delete"]');

    await deleteButton.click();

    // Confirm deletion in modal
    await this.page.locator('button', { hasText: 'Delete' }).click();

    // Verify project is removed
    await expect(projectCard).toBeHidden();
  }

  async editProject(currentName: string, newName: string, newDescription?: string) {
    const projectCard = this.page.locator(`[data-testid="project-card"]`, {
      hasText: currentName
    });
    const menuButton = projectCard.locator('[data-testid="project-card-menu-button"]');
    await menuButton.click();

    const editButton = projectCard.locator('[data-testid="project-card-edit"]');

    await editButton.click();

    const editModal = this.page.locator('[data-testid="edit-project-modal"]');
    const editModalContent = this.page.locator('[data-testid="edit-project-modal-content"]');
    await expect(editModal).toBeVisible();

    await editModalContent.locator('[data-testid="project-name-input"]').fill(newName);
    if (newDescription) {
      await editModalContent.locator('[data-testid="project-description-input"]').fill(newDescription);
    }

    await editModalContent.locator('[data-testid="edit-project-submit"]').click();
    await expect(editModal).toBeHidden();
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
