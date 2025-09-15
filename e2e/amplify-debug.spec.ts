import { test, expect } from '@playwright/test';

test('Debug Amplify Configuration', async ({ page }) => {
  console.log('Testing Amplify configuration...');

  // Navigate to the app
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait a bit for app to load
  await page.waitForTimeout(3000);

  // Check what's available in the browser context
  const debugInfo = await page.evaluate(() => {
    const info: any = {
      windowKeys: Object.keys(window).filter(key => key.toLowerCase().includes('amplify')),
      hasAmplify: typeof (window as any).Amplify !== 'undefined',
      nodeEnv: typeof process !== 'undefined' ? process.env : 'undefined',
      locationHref: window.location.href,
      consoleErrors: [],
      documentBody: document.body.innerHTML.substring(0, 500)
    };

    // Check if Amplify is in global scope
    try {
      info.amplifyConfig = (window as any).Amplify ? 'configured' : 'not found';
    } catch (e) {
      info.amplifyConfig = 'error: ' + e;
    }

    // Check console errors
    const originalError = console.error;
    console.error = function(...args) {
      info.consoleErrors.push(args.join(' '));
      originalError.apply(console, args);
    };

    return info;
  });

  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

  // Check if we can access environment variables
  const envCheck = await page.evaluate(() => {
    return {
      userPoolId: import.meta.env?.VITE_USER_POOL_ID || 'not found',
      graphqlEndpoint: import.meta.env?.VITE_GRAPHQL_ENDPOINT || 'not found',
      hasImportMeta: typeof import.meta !== 'undefined'
    };
  });

  console.log('Environment check:', envCheck);

  // Try to access Amplify through modules
  const moduleCheck = await page.evaluate(async () => {
    try {
      // Try to access modules that should be available
      const result: any = {};

      // Check if we can access the configured Amplify
      if (typeof window !== 'undefined') {
        result.windowAmplify = typeof (window as any).Amplify;
      }

      return {
        success: true,
        result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('Module check:', moduleCheck);

  // Basic assertion - page should load
  expect(debugInfo.locationHref).toContain('localhost:3000');
});