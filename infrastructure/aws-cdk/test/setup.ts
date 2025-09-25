/**
 * Jest setup file for CDK infrastructure tests
 * This file is executed before each test file
 */

// Set default AWS region for tests
process.env.CDK_DEFAULT_REGION = 'us-east-1';
process.env.CDK_DEFAULT_ACCOUNT = '123456789012';

// Set test stage
process.env.STAGE = 'test';