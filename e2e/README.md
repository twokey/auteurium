# E2E Testing with Playwright

This directory contains end-to-end tests for the Auteurium application using Playwright.

## Structure

```
e2e/
├── fixtures/          # Test fixtures for authentication and database setup
│   ├── auth.ts        # Authentication fixtures and helpers
│   └── database.ts    # Database state management fixtures
├── page-objects/      # Page Object Model classes
│   ├── AuthPage.ts    # Authentication page interactions
│   ├── DashboardPage.ts # Dashboard page interactions
│   └── CanvasPage.ts  # Canvas page interactions
├── utils/             # Utility functions
│   └── test-helpers.ts # Common test helper functions
├── auth.spec.ts       # Authentication flow tests
├── dashboard.spec.ts  # Dashboard functionality tests
├── canvas.spec.ts     # Canvas functionality tests
├── navigation.spec.ts # Navigation and routing tests
└── README.md         # This file
```

## Setup

1. **Install Playwright browsers** (if not already done):
   ```bash
   npm run test:e2e:install
   ```

2. **Configure environment variables**:
   - Copy `.env.e2e` and update with your test environment values
   - Set up test user credentials for AWS Cognito

3. **Ensure your app is ready**:
   - Deploy your AWS infrastructure if needed
   - Make sure your React app can connect to the backend

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with browser UI visible
npm run test:e2e:headed

# Run tests in debug mode (step through)
npm run test:e2e:debug

# Run tests with Playwright UI
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

## Test Configuration

The tests are configured to:
- Automatically start the React dev server (`npm run dev:web`)
- Use `http://localhost:3000` as the base URL
- Run against Chromium, Firefox, and Safari
- Take screenshots on failure
- Record videos on failure
- Generate HTML reports

## Test Data

Tests use:
- Generated test data for isolation
- Environment variables for user credentials
- Fixtures for consistent setup/teardown
- Page Object Model for maintainable test code

## Key Test Scenarios

### Authentication (`auth.spec.ts`)
- User registration and login
- Password validation
- Session persistence
- Logout functionality

### Dashboard (`dashboard.spec.ts`)
- Project creation, editing, deletion
- Project list management
- Navigation to canvas

### Canvas (`canvas.spec.ts`)
- Snippet creation, editing, deletion
- Drag and drop positioning
- Snippet connections
- Canvas zoom and pan

### Navigation (`navigation.spec.ts`)
- Route protection
- Browser navigation (back/forward)
- Deep linking
- URL state management

## Troubleshooting

1. **Tests fail with authentication errors**:
   - Verify your AWS Cognito configuration
   - Check test user credentials in `.env.e2e`
   - Ensure your backend is running and accessible

2. **Tests timeout**:
   - Increase timeout in `playwright.config.ts`
   - Check if your dev server starts properly
   - Verify network connectivity to AWS services

3. **Element not found errors**:
   - Verify your React components have the expected `data-testid` attributes
   - Check if your UI matches the page object selectors
   - Run tests in headed mode to debug visually

4. **Canvas/React Flow tests fail**:
   - Ensure React Flow is properly initialized
   - Check for any console errors in the browser
   - Verify canvas interactions work manually first

## Adding New Tests

1. **Create test files** following the naming pattern `*.spec.ts`
2. **Use fixtures** for authentication and database state
3. **Implement page objects** for new pages/components
4. **Add helper functions** to `utils/test-helpers.ts` for reusable logic
5. **Follow the existing patterns** for consistency

## CI/CD Integration

These tests are designed to run in CI environments:
- Use `process.env.CI` checks for CI-specific behavior
- Reduced parallelism in CI for stability
- Retry failed tests automatically
- Generate artifacts (screenshots, videos, reports)