import { test, expect } from '@playwright/test';

import { CredentialManager } from './utils/credential-manager';
import { getReusableCredentials, saveTestCredential, updateCredentialStatus } from './utils/test-helpers';

test('Registration Debug Test with Credential Management', async ({ page }) => {
  console.warn('🎯 Starting registration debug test with enhanced logging and credential management');

  // Print existing credential summary
  CredentialManager.printCredentialSummary();

  // Get or create credentials
  const testData = getReusableCredentials();
  console.warn(`📧 Using email: ${testData.email}, reused: ${testData.isReused}`);

  // Capture console messages and errors
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.warn(`🖥️ Browser: ${text}`);
  });

  page.on('pageerror', error => {
    console.warn(`💥 Page Error: ${error.message}`);
  });

  // Navigate to app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');

  // Verify auth page loads
  await expect(page.locator('h1', { hasText: 'Auteurium' })).toBeVisible();
  console.warn('✅ Auth page loaded successfully');

  // Switch to registration if needed (start with login by default)
  const signUpLink = page.locator('text=Sign up');
  if (await signUpLink.isVisible()) {
    await signUpLink.click();
    await page.waitForLoadState('domcontentloaded');
    console.warn('🔄 Switched to registration form');
  } else {
    console.warn('❌ Sign up link not found');
    await page.screenshot({ path: `no-signup-link-${Date.now()}.png`, fullPage: true });
  }

  // Fill registration form
  await page.locator('input[id="name"]').fill(testData.name);
  await page.locator('input[id="email"]').fill(testData.email);
  await page.locator('input[id="password"]').fill(testData.password);
  await page.locator('input[id="confirmPassword"]').fill(testData.password);

  console.warn('📝 Registration form filled');

  // Submit registration
  await page.locator('button[type="submit"]', { hasText: 'Create account' }).click();
  console.warn('🚀 Registration form submitted');

  // Wait for response and capture everything
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {
    console.warn('Timeout waiting for network idle');
  });

  // Check for different possible outcomes
  const currentUrl = page.url();
  const bodyText = await page.textContent('body');

  console.warn('\n📊 REGISTRATION RESULTS:');
  console.warn('Current URL:', currentUrl);

  // Check for confirmation page
  const hasConfirmationText = bodyText?.toLowerCase().includes('confirm') ||
                              bodyText?.toLowerCase().includes('check your email') ||
                              bodyText?.toLowerCase().includes('verification');

  // Check for error messages
  const hasErrorText = bodyText?.toLowerCase().includes('error') ||
                       bodyText?.toLowerCase().includes('failed') ||
                       bodyText?.toLowerCase().includes('already exists');

  // Check for success/dashboard
  const hasSuccessText = bodyText?.toLowerCase().includes('dashboard') ||
                         bodyText?.toLowerCase().includes('welcome');

  if (hasConfirmationText) {
    console.warn('✅ Registration successful - Email confirmation required');
    if (!testData.isReused) {
      saveTestCredential(testData.email, testData.password, testData.name, 'registered', 'Awaiting email confirmation');
    } else if (testData.status === 'new') {
      updateCredentialStatus(testData.email, 'registered', 'Awaiting email confirmation');
    }

    // Check if there's a confirmation code input field
    const codeInput = page.locator('input[id="code"]');
    if (await codeInput.isVisible()) {
      console.warn('🔐 Confirmation code input is visible');
      console.warn('⚠️ Manual step required: Check email for confirmation code and enter it');
    }

  } else if (hasErrorText) {
    console.warn('❌ Registration failed with error');
    if (!testData.isReused) {
      saveTestCredential(testData.email, testData.password, testData.name, 'failed', 'Registration error: ' + bodyText?.substring(0, 200));
    } else {
      updateCredentialStatus(testData.email, 'failed', 'Registration error: ' + bodyText?.substring(0, 200));
    }

  } else if (hasSuccessText) {
    console.warn('🎉 Registration completed successfully - User logged in');
    if (!testData.isReused) {
      saveTestCredential(testData.email, testData.password, testData.name, 'confirmed', 'Registration completed without email verification');
    } else {
      updateCredentialStatus(testData.email, 'confirmed', 'Registration completed without email verification');
    }

  } else {
    console.warn('❓ Unclear registration state');
    console.warn('Body text snippet:', bodyText?.substring(0, 300));
  }

  // Print console messages for debugging
  console.warn('\n📋 CONSOLE MESSAGES:');
  consoleMessages.slice(-10).forEach(msg => console.warn(`  ${msg}`));

  // Take screenshot for manual verification
  await page.screenshot({ path: `registration-debug-${Date.now()}.png`, fullPage: true });

  // Print updated credential summary
  console.warn('\n📊 UPDATED CREDENTIAL SUMMARY:');
  CredentialManager.printCredentialSummary();

  // Test passes if we got a meaningful response
  expect(bodyText).toBeDefined();
  expect(currentUrl).toContain('localhost:3000');

  console.warn('✅ Registration debug test completed');
});