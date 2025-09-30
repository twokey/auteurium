import { test as base, expect } from '@playwright/test';

import { AuthPage } from '../page-objects/AuthPage';
import { CanvasPage } from '../page-objects/CanvasPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { clearBrowserStorage, generateTestData } from '../utils/test-helpers';

interface AuthFixtures {
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  canvasPage: CanvasPage;
  authenticatedUser: { email: string; password: string };
  adminUser: { email: string; password: string };
}

export const test = base.extend<AuthFixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  canvasPage: async ({ page }, use) => {
    await use(new CanvasPage(page));
  },

  authenticatedUser: async ({ page, authPage }, use) => {
    // Create or use existing test user
    const testData = generateTestData();
    const userCredentials = {
      email: process.env.TEST_USER_EMAIL ?? testData.email,
      password: process.env.TEST_USER_PASSWORD ?? testData.password
    };

    // Clear any existing session
    await clearBrowserStorage(page);

    // Go to auth page and register/login
    await authPage.goto();

    try {
      // Try to login first (user might already exist)
      await authPage.login(userCredentials.email, userCredentials.password);
    } catch (_error) {
      // If login fails, register new user
      await authPage.register(userCredentials.email, userCredentials.password);

      // For AWS Cognito, you might need to handle email confirmation
      // This would depend on your specific setup
      if (process.env.SKIP_AUTH_SETUP !== 'true') {
        console.warn('Email confirmation may be required for new users');
      }
    }

    // Verify successful authentication
    await expect(page).toHaveURL('/');

    await use(userCredentials);

    // Cleanup: logout after test
    try {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.logout();
    } catch (_error) {
      // Ignore logout errors in cleanup
    }
  },

  adminUser: async ({ page, authPage }, use) => {
    const adminCredentials = {
      email: process.env.TEST_ADMIN_EMAIL ?? 'admin@auteurium.test',
      password: process.env.TEST_ADMIN_PASSWORD ?? 'AdminPassword123!'
    };

    await clearBrowserStorage(page);
    await authPage.goto();

    try {
      await authPage.login(adminCredentials.email, adminCredentials.password);
    } catch (error) {
      console.warn('Admin user login failed, may need manual setup');
      throw error;
    }

    await expect(page).toHaveURL('/');

    await use(adminCredentials);

    // Cleanup
    try {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.logout();
    } catch (_error) {
      // Ignore logout errors in cleanup
    }
  }
});

export { expect } from '@playwright/test';