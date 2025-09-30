import { test, expect } from '@playwright/test';

interface AmplifyDebugInfo {
  windowKeys: string[];
  hasAmplify: boolean;
  nodeEnv: string;
  locationHref: string;
  consoleErrors: string[];
  documentBody: string;
  amplifyConfig: string;
}

test('Debug Amplify Configuration', async ({ page }) => {
  console.warn('Testing Amplify configuration...');

  // Navigate to the app
  await page.goto('http://localhost:3000', { waitUntil: 'load' });

  // Wait a bit for app to load
  await page.waitForLoadState('domcontentloaded');

  // Check what's available in the browser context
  const debugInfo = await page.evaluate((): AmplifyDebugInfo => {
    interface WindowWithAmplify extends Window {
      Amplify?: unknown;
    }

    const info: AmplifyDebugInfo = {
      windowKeys: Object.keys(window).filter(key => key.toLowerCase().includes('amplify')),
      hasAmplify: typeof (window as WindowWithAmplify).Amplify !== 'undefined',
      nodeEnv: typeof process !== 'undefined' ? 'defined' : 'undefined',
      locationHref: window.location.href,
      consoleErrors: [],
      documentBody: document.body.innerHTML.substring(0, 500),
      amplifyConfig: 'not found'
    };

    // Check if Amplify is in global scope
    try {
      info.amplifyConfig = (window as WindowWithAmplify).Amplify ? 'configured' : 'not found';
    } catch (e) {
      info.amplifyConfig = `error: ${String(e)}`;
    }

    // Check console errors
    const originalError = console.error;
    console.error = function(...args: unknown[]) {
      info.consoleErrors.push(args.map(String).join(' '));
      originalError.apply(console, args);
    };

    return info;
  });

  console.warn('Debug info:', JSON.stringify(debugInfo, null, 2));

  // Check if we can access environment variables
  const envCheck = await page.evaluate(() => {
    return {
      userPoolId: import.meta.env?.VITE_USER_POOL_ID ?? 'not found',
      graphqlEndpoint: import.meta.env?.VITE_GRAPHQL_ENDPOINT ?? 'not found',
      hasImportMeta: typeof import.meta !== 'undefined'
    };
  });

  console.warn('Environment check:', envCheck);

  // Try to access Amplify through modules
  const moduleCheck = await page.evaluate(() => {
    interface WindowWithAmplify extends Window {
      Amplify?: unknown;
    }

    try {
      // Try to access modules that should be available
      const result: { windowAmplify?: string } = {};

      // Check if we can access the configured Amplify
      if (typeof window !== 'undefined') {
        result.windowAmplify = typeof (window as WindowWithAmplify).Amplify;
      }

      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  console.warn('Module check:', moduleCheck);

  // Basic assertion - page should load
  expect(debugInfo.locationHref).toContain('localhost:3000');
});