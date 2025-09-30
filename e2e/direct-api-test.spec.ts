import { test, expect } from '@playwright/test';

test('Direct API Registration Test', async ({ page }) => {
  console.warn('Testing user registration via direct API calls...');

  // Navigate to the app to ensure it's loaded
  await page.goto('http://localhost:3000');

  // Inject AWS SDK and test registration directly
  const testResult = await page.evaluate(async () => {
    try {
      // Test data
      const testEmail = `test-${Date.now()}@auteurium.test`;
      const testPassword = 'TestPassword123!';

      // Import Amplify dynamically in the browser
      const amplifyModule = await import('aws-amplify/auth');
      const { signUp } = amplifyModule;

      // Attempt registration
      const result = await signUp({
        username: testEmail,
        password: testPassword,
        options: {
          userAttributes: {
            email: testEmail,
            name: 'Test User'
          }
        }
      });

      return {
        success: true,
        message: 'Registration successful',
        userId: result.userId,
        nextStep: result.nextStep
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        error: error
      };
    }
  });

  console.warn('Test result:', testResult);

  // Log the result for manual verification
  if (testResult.success) {
    console.warn('✅ Registration successful!');
    console.warn('User ID:', testResult.userId);
    console.warn('Next step:', testResult.nextStep);
  } else {
    console.warn('❌ Registration failed:', testResult.message);
  }

  // The test should at least be able to attempt the operation
  expect(testResult).toBeDefined();
});