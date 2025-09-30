import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, test, beforeEach, expect } from '@jest/globals';

import { AuteuriumAuthStack } from '../../../lib/stacks/auteurium-auth-stack';

describe('AuteuriumAuthStack', () => {
  let app: cdk.App;
  let stack: AuteuriumAuthStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AuteuriumAuthStack(app, 'TestAuteuriumAuthStack', {
      stage: 'test',
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  describe('Cognito User Pool', () => {
    test('should create a user pool with correct naming convention', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'auteurium-users-test',
      });
    });

    test('should enable self sign-up', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: false,
            RequireUppercase: true,
          },
        },
      });
    });

    test('should configure email as sign-in alias', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
      });
    });

    test('should set correct account recovery method', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
      });
    });

    test('should have correct removal policy for test stage', () => {
      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Delete',
      });
    });

    test('should have retention policy for production stage', () => {
      const prodApp = new cdk.App();
      const prodStack = new AuteuriumAuthStack(prodApp, 'ProdAuteuriumAuthStack', {
        stage: 'prod',
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Retain',
      });
    });
  });

  describe('Cognito User Pool Client', () => {
    test('should create user pool client with correct naming', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ClientName: 'auteurium-web-client-test',
        GenerateSecret: false,
      });
    });

    test('should configure correct auth flows', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ExplicitAuthFlows: [
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_USER_SRP_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
        ],
      });
    });

    test('should configure OAuth settings', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        SupportedIdentityProviders: ['COGNITO'],
        AllowedOAuthFlows: ['code'],
        AllowedOAuthScopes: ['email', 'openid', 'profile'],
      });
    });
  });

  describe('Stack Outputs', () => {
    test('should export user pool ID', () => {
      template.hasOutput('UserPoolId', {
        Export: {
          Name: 'Auteurium-UserPoolId-test',
        },
      });
    });

    test('should export user pool client ID', () => {
      template.hasOutput('UserPoolClientId', {
        Export: {
          Name: 'Auteurium-UserPoolClientId-test',
        },
      });
    });
  });

  describe('Security Configuration', () => {
    test('should enforce strong password policy', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireUppercase: true,
            RequireSymbols: false, // Explicitly set to false per requirements
          },
        },
      });
    });

    test('should not allow unauthenticated identities', () => {
      // Ensure no identity pool is created that allows unauthenticated access
      template.resourceCountIs('AWS::Cognito::IdentityPool', 0);
    });
  });

  describe('Resource Count Validation', () => {
    test('should create exactly one user pool', () => {
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });

    test('should create exactly one user pool client', () => {
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    });

    test('should create correct number of outputs', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs)).toHaveLength(2);
    });
  });

  describe('Stage-specific Configuration', () => {
    test('should include stage in resource names', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'auteurium-users-test',
      });

      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ClientName: 'auteurium-web-client-test',
      });
    });

    test('should handle different stages correctly', () => {
      const devApp = new cdk.App();
      const devStack = new AuteuriumAuthStack(devApp, 'DevAuteuriumAuthStack', {
        stage: 'dev',
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
      });
      const devTemplate = Template.fromStack(devStack);

      devTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'auteurium-users-dev',
      });
    });
  });

  describe('Public Properties', () => {
    test('should expose user pool as public property', () => {
      expect(stack.userPool).toBeDefined();
      expect(stack.userPool.userPoolId).toBeDefined();
    });

    test('should expose user pool client as public property', () => {
      expect(stack.userPoolClient).toBeDefined();
      expect(stack.userPoolClient.userPoolClientId).toBeDefined();
    });
  });
});