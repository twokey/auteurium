# Infrastructure Testing Guide

This directory contains comprehensive Test-Driven Development (TDD) tests for the Auteurium AWS CDK infrastructure.

## 🎯 Testing Strategy

Our infrastructure testing follows a three-tier approach:

### 1. **Unit Tests** (`test/unit/`)
- **Purpose**: Test individual CDK constructs and stacks in isolation
- **Speed**: Fast (< 10 seconds)
- **Coverage**: Stack configurations, resource properties, naming conventions
- **Run with**: `npm run test:unit`

### 2. **Integration Tests** (`test/integration/`)
- **Purpose**: Test cross-stack dependencies and complete infrastructure
- **Speed**: Medium (10-30 seconds)
- **Coverage**: Stack dependencies, resource references, exports/imports
- **Run with**: `npm run test:integration`

### 3. **Validation Tests** (`test/validation/`)
- **Purpose**: Test actual deployed infrastructure
- **Speed**: Slow (30-60 seconds)
- **Coverage**: Runtime validation, security compliance, live resource verification
- **Run with**: `npm run test:validation`

## 🛡️ Critical Protection Areas

### Runtime Version Safety
- **Prevents regression** to older Node.js versions (18.x, 20.x)
- **Ensures consistency** between development and production
- **Validates** all Lambda functions use Node.js 22.x

### Security Compliance
- **IAM permissions** validation
- **CORS configuration** verification
- **Authentication setup** testing
- **Public access** prevention

### Resource Integrity
- **Naming conventions** enforcement
- **Cross-stack references** validation
- **Database schema** consistency
- **Environment variables** verification

## 📁 Test Structure

```
test/
├── unit/                    # Fast, isolated tests
│   ├── stacks/             # Individual stack tests
│   │   ├── auth-stack.test.ts
│   │   ├── database-stack.test.ts
│   │   ├── api-stack.test.ts
│   │   └── media-stack.test.ts
│   ├── constructs/         # Custom construct tests
│   └── utils/              # Utility function tests
├── integration/            # Cross-stack integration tests
│   ├── aws-resources/      # AWS resource interaction tests
│   └── cross-stack/        # Stack dependency tests
│       └── complete-infrastructure.test.ts
├── validation/             # Deployed infrastructure tests
│   ├── deployment/         # Post-deployment validation
│   │   └── runtime-validation.test.ts
│   └── smoke-tests/        # End-to-end smoke tests
├── fixtures/               # Test data and mocks
├── setup.ts               # Global test configuration
└── README.md              # This file
```

## 🚀 Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run only unit tests (recommended for development)
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Targeted Testing
```bash
# Test specific stack
npm test -- auth-stack.test.ts

# Test with pattern matching
npm test -- --testNamePattern="Node.js"

# Run integration tests only
npm run test:integration
```

### Deployment Validation
```bash
# Set environment for deployment tests
export RUN_DEPLOYMENT_TESTS=true
export AWS_REGION=us-west-2
export STAGE=dev

# Run validation tests against deployed infrastructure
npm run test:validation
```

## 📊 Test Coverage Goals

- **Unit Tests**: 100% of CDK stack configurations
- **Integration Tests**: All cross-stack dependencies
- **Validation Tests**: Critical runtime configurations

### Current Coverage

| Stack | Unit Tests | Integration | Validation |
|-------|------------|-------------|------------|
| Auth | ✅ Complete | ✅ Complete | ✅ Complete |
| Database | ✅ Complete | ✅ Complete | ✅ Complete |
| API | ✅ Complete | ✅ Complete | ✅ Complete |
| Media | ✅ Complete | ✅ Complete | ✅ Complete |
| Web | ⚡ Partial | ✅ Complete | ⚡ Partial |

## 🔍 Key Test Categories

### Stack Configuration Tests
- Resource creation and properties
- Naming convention compliance
- Stage-specific configurations
- IAM permissions and security

### Runtime Validation Tests
- **CRITICAL**: Node.js version verification
- Environment variable configuration
- DynamoDB table structure
- Lambda function connectivity

### Security Tests
- Authentication configuration
- CORS policy validation
- Public access prevention
- IAM role restrictions

### Integration Tests
- Cross-stack dependencies
- Resource reference integrity
- Export/import validation
- Complete infrastructure synthesis

## 🛠️ Development Workflow

### Before Making Changes
```bash
# Run tests to establish baseline
npm run test:unit
```

### After Making Changes
```bash
# Run affected tests
npm test -- --changedSince=origin/main

# Run full test suite before deployment
npm test
```

### Before Deployment
```bash
# Validate infrastructure configuration
npm run test:integration

# After deployment, validate runtime
export RUN_DEPLOYMENT_TESTS=true
npm run test:validation
```

## 🎭 Mock vs Real AWS Resources

### Unit & Integration Tests
- Use **CDK Template assertions**
- **No AWS API calls**
- Test CloudFormation template generation
- Validate resource properties and dependencies

### Validation Tests
- Use **real AWS SDK clients**
- **Require deployed infrastructure**
- Test actual resource configurations
- Validate runtime behavior

## 🚨 Test Failure Scenarios

### Common Failures and Solutions

#### Runtime Version Regression
```
❌ Expected 'nodejs22.x' but received 'nodejs18.x'
```
**Solution**: Check CDK stack Lambda runtime configuration

#### Missing Cross-Stack Reference
```
❌ Cannot resolve reference to exported value
```
**Solution**: Verify stack dependencies and exports

#### Deployment Validation Timeout
```
❌ AWS operation timed out
```
**Solution**: Check AWS credentials and region configuration

## 📝 Writing New Tests

### Unit Test Template
```typescript
describe('MyNewStack', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new MyNewStack(app, 'TestStack', {
      stage: 'test',
    });
    template = Template.fromStack(stack);
  });

  test('should create resource with correct properties', () => {
    template.hasResourceProperties('AWS::Service::Resource', {
      PropertyName: 'expected-value',
    });
  });
});
```

### Integration Test Template
```typescript
describe('Cross-Stack Integration', () => {
  test('should reference external resources correctly', () => {
    const app = new AuteuriumApp();
    // Test complete app synthesis
  });
});
```

## 🔧 Configuration

### Jest Configuration
- **Preset**: ts-jest
- **Environment**: node
- **Timeout**: 30 seconds (configurable per test type)
- **Coverage**: Excludes generated files and node_modules

### Environment Variables
- `STAGE`: Infrastructure stage (test/dev/prod)
- `RUN_DEPLOYMENT_TESTS`: Enable validation tests
- `AWS_REGION`: AWS region for validation tests
- `CDK_DEFAULT_ACCOUNT`: Default AWS account for testing

## 📚 Best Practices

### Test Organization
- **One test file per stack**
- **Group related tests** with describe blocks
- **Use descriptive test names** that explain what is being tested
- **Keep tests independent** and idempotent

### Assertions
- **Be specific** with resource property assertions
- **Test both positive and negative cases**
- **Verify resource counts** to catch unexpected resources
- **Check stage-specific behavior**

### Performance
- **Unit tests should be fast** (< 1 second each)
- **Use beforeEach for common setup**
- **Avoid unnecessary AWS SDK calls in unit tests**
- **Mock external dependencies when possible**

## 🤝 Contributing

When adding new infrastructure:

1. **Write tests first** (TDD approach)
2. **Cover all critical properties**
3. **Test stage-specific behavior**
4. **Add integration tests for dependencies**
5. **Update this README** if needed

## 🎯 Testing Goals

- **Prevent regressions** during infrastructure changes
- **Ensure consistency** across development stages
- **Validate security** configurations
- **Document infrastructure** through executable tests
- **Build confidence** in deployment processes

## 📞 Support

For testing issues or questions:
- Check test output for specific failure details
- Review AWS console for deployment validation issues
- Ensure AWS credentials are properly configured
- Verify CDK version compatibility with tests