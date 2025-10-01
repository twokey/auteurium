import { expect } from '@playwright/test';

import { CredentialManager } from './credential-manager';

import type { Page } from '@playwright/test';


/**
 * Wait for the application to be fully loaded
 */
export async function waitForAppLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toBeVisible();
}

/**
 * Wait for React to finish rendering
 */
export async function waitForReactRender(page: Page) {
  await page.waitForFunction(() => {
    return window.document.readyState === 'complete';
  });
}

/**
 * Clear all browser storage (localStorage, sessionStorage, etc.)
 */
export async function clearBrowserStorage(page: Page) {
  try {
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    });
  } catch (_error) {
    // Ignore localStorage errors on initial page load
    console.warn('Could not clear storage');
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

/**
 * Mock GraphQL responses for testing
 */
export async function mockGraphQLResponse(page: Page, operation: string, response: unknown) {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as { operationName?: string } | null;

    if (body?.operationName === operation) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: response })
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Wait for GraphQL operation to complete
 */
export async function waitForGraphQLOperation(page: Page, operationName: string) {
  await page.waitForResponse(response => {
    const body = response.request().postDataJSON() as { operationName?: string } | null;
    return response.url().includes('/graphql') && body?.operationName === operationName;
  });
}

/**
 * Fill form field with validation
 */
export async function fillAndValidate(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  await expect(field).toBeVisible();
  await field.fill(value);
  await expect(field).toHaveValue(value);
}

/**
 * Click button and wait for navigation or action
 */
export async function clickAndWait(page: Page, selector: string, waitForNavigation = false) {
  if (waitForNavigation) {
    await Promise.all([
      page.waitForNavigation(),
      page.click(selector)
    ]);
  } else {
    await page.click(selector);
  }
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}@auteurium.test`,
    password: 'TestPassword123!',
    projectName: `Test Project ${timestamp}`,
    snippetTitle: `Test Snippet ${timestamp}`,
    snippetContent: 'This is test content for the snippet'
  };
}

export const getReusableCredentials = () => {
  // First try to get confirmed credentials
  const confirmedCreds = CredentialManager.getConfirmedCredentials()
  if (confirmedCreds.length > 0) {
    const cred = confirmedCreds[0]
    console.warn(`♻️ Reusing confirmed credential: ${cred.email}`)
    return {
      email: cred.email,
      password: cred.password,
      name: cred.name,
      isReused: true,
      status: 'confirmed' as const
    }
  }

  // If no confirmed, try registered (may need confirmation)
  const registeredCreds = CredentialManager.getRegisteredCredentials()
  if (registeredCreds.length > 0) {
    const cred = registeredCreds[0]
    console.warn(`♻️ Reusing registered credential (may need confirmation): ${cred.email}`)
    return {
      email: cred.email,
      password: cred.password,
      name: cred.name,
      isReused: true,
      status: 'registered' as const
    }
  }

  // Generate new credentials
  const newCreds = generateTestData()
  console.warn(`🆕 Generated new test credentials: ${newCreds.email}`)
  return {
    email: newCreds.email,
    password: newCreds.password,
    name: 'Test User',
    isReused: false,
    status: 'new' as const
  }
}

export const saveTestCredential = (
  email: string,
  password: string,
  name: string,
  status: 'registered' | 'confirmed' | 'failed',
  notes?: string
) => {
  CredentialManager.saveCredential({
    email,
    password,
    name,
    status,
    notes
  })
}

export const updateCredentialStatus = (
  email: string,
  status: 'registered' | 'confirmed' | 'failed',
  notes?: string
) => {
  CredentialManager.updateCredentialStatus(email, status, notes)
}