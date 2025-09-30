import { Template } from 'aws-cdk-lib/assertions';

import { AuteuriumApp } from '../../../lib/auteurium-app';

describe('Complete Infrastructure Integration', () => {
  let app: AuteuriumApp;

  beforeEach(() => {
    // Set environment variables for testing
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.STAGE = 'test';

    app = new AuteuriumApp();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.CDK_DEFAULT_ACCOUNT;
    delete process.env.CDK_DEFAULT_REGION;
    delete process.env.STAGE;
  });

  describe('Stack Creation and Dependencies', () => {
    test('should create all 5 required stacks', () => {
      const stacks = app.node.children.filter(
        (child) => child instanceof cdk.Stack
      );

      expect(stacks).toHaveLength(5);

      const stackNames = stacks.map((stack) => stack.node.id);
      expect(stackNames).toContain('Auteurium-Auth-test');
      expect(stackNames).toContain('Auteurium-Database-test');
      expect(stackNames).toContain('Auteurium-Api-test');
      expect(stackNames).toContain('Auteurium-Media-test');
      expect(stackNames).toContain('Auteurium-Web-test');
    });

    test('should establish correct stack dependencies', () => {
      const authStack = app.node.findChild('Auteurium-Auth-test');
      const databaseStack = app.node.findChild('Auteurium-Database-test');
      const apiStack = app.node.findChild('Auteurium-Api-test');
      const mediaStack = app.node.findChild('Auteurium-Media-test');
      const webStack = app.node.findChild('Auteurium-Web-test');

      expect(authStack).toBeDefined();
      expect(databaseStack).toBeDefined();
      expect(apiStack).toBeDefined();
      expect(mediaStack).toBeDefined();
      expect(webStack).toBeDefined();

      // API stack should depend on Auth and Database stacks
      const apiStackDeps = (apiStack as cdk.Stack).dependencies;
      expect(apiStackDeps).toContain(authStack);
      expect(apiStackDeps).toContain(databaseStack);
    });
  });

  describe('Cross-Stack Resource References', () => {
    test('should properly share Cognito resources between Auth and API stacks', () => {
      const authStack = app.node.findChild('Auteurium-Auth-test') as cdk.Stack;
      const apiStack = app.node.findChild('Auteurium-Api-test') as cdk.Stack;

      const authTemplate = Template.fromStack(authStack);
      const apiTemplate = Template.fromStack(apiStack);

      // Auth stack should export user pool information
      authTemplate.hasOutput('UserPoolId', {
        Export: {
          Name: 'Auteurium-UserPoolId-test',
        },
      });

      authTemplate.hasOutput('UserPoolClientId', {
        Export: {
          Name: 'Auteurium-UserPoolClientId-test',
        },
      });

      // API stack should reference the user pool
      apiTemplate.hasResourceProperties('AWS::AppSync::GraphQLApi', {
        AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
        UserPoolConfig: {
          UserPoolId: expect.any(Object),
        },
      });
    });

    test('should reference DynamoDB tables consistently across stacks', () => {
      const databaseStack = app.node.findChild('Auteurium-Database-test') as cdk.Stack;
      const apiStack = app.node.findChild('Auteurium-Api-test') as cdk.Stack;

      const databaseTemplate = Template.fromStack(databaseStack);
      const apiTemplate = Template.fromStack(apiStack);

      const tableNames = [
        'auteurium-users-test',
        'auteurium-projects-test',
        'auteurium-snippets-test',
        'auteurium-connections-test',
        'auteurium-versions-test',
      ];

      // Database stack should create the tables
      tableNames.forEach((tableName) => {
        databaseTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
          TableName: tableName,
        });
      });

      // API stack should reference these tables in Lambda environment
      apiTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            USERS_TABLE: 'auteurium-users-test',
            PROJECTS_TABLE: 'auteurium-projects-test',
            SNIPPETS_TABLE: 'auteurium-snippets-test',
            CONNECTIONS_TABLE: 'auteurium-connections-test',
            VERSIONS_TABLE: 'auteurium-versions-test',
          },
        },
      });
    });
  });

  describe('Naming Convention Consistency', () => {
    test('should use consistent naming pattern across all stacks', () => {
      const stacks = app.node.children.filter(
        (child) => child instanceof cdk.Stack
      ) as cdk.Stack[];

      stacks.forEach((stack) => {
        expect(stack.node.id).toMatch(/^Auteurium-\w+-test$/);
      });
    });

    test('should use consistent resource naming within stacks', () => {
      const databaseStack = app.node.findChild('Auteurium-Database-test') as cdk.Stack;
      const apiStack = app.node.findChild('Auteurium-Api-test') as cdk.Stack;

      const databaseTemplate = Template.fromStack(databaseStack);
      const apiTemplate = Template.fromStack(apiStack);

      // All DynamoDB tables should follow naming pattern
      const tableNames = [
        'auteurium-users-test',
        'auteurium-projects-test',
        'auteurium-snippets-test',
        'auteurium-connections-test',
        'auteurium-versions-test',
      ];

      tableNames.forEach((tableName) => {
        expect(tableName).toMatch(/^auteurium-\w+-test$/);
        databaseTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
          TableName: tableName,
        });
      });

      // Lambda function should follow naming pattern
      apiTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'auteurium-api-test',
      });
    });
  });

  describe('Environment and Stage Configuration', () => {
    test('should handle different stages correctly', () => {
      process.env.STAGE = 'prod';
      const prodApp = new AuteuriumApp();

      const prodStacks = prodApp.node.children.filter(
        (child) => child instanceof cdk.Stack
      );

      const prodStackNames = prodStacks.map((stack) => stack.node.id);
      expect(prodStackNames).toContain('Auteurium-Auth-prod');
      expect(prodStackNames).toContain('Auteurium-Database-prod');
      expect(prodStackNames).toContain('Auteurium-Api-prod');
      expect(prodStackNames).toContain('Auteurium-Media-prod');
      expect(prodStackNames).toContain('Auteurium-Web-prod');
    });

    test('should default to dev stage when not specified', () => {
      delete process.env.STAGE;
      const defaultApp = new AuteuriumApp();

      const defaultStacks = defaultApp.node.children.filter(
        (child) => child instanceof cdk.Stack
      );

      const defaultStackNames = defaultStacks.map((stack) => stack.node.id);
      expect(defaultStackNames).toContain('Auteurium-Auth-dev');
      expect(defaultStackNames).toContain('Auteurium-Database-dev');
    });
  });

  describe('Security and Access Control', () => {
    test('should configure proper IAM permissions between stacks', () => {
      const apiStack = app.node.findChild('Auteurium-Api-test') as cdk.Stack;
      const apiTemplate = Template.fromStack(apiStack);

      // API Lambda should have permissions to access DynamoDB tables
      apiTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'dynamodb:BatchGetItem',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:Query',
                'dynamodb:GetItem',
                'dynamodb:Scan',
                'dynamodb:ConditionCheckItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
              ],
              Resource: expect.any(Array),
            },
          ],
        },
      });

      // API Lambda should have Cognito admin permissions
      apiTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:ListUsers',
              ],
              Resource: expect.any(Object),
            },
          ],
        },
      });
    });
  });

  describe('Runtime and Technology Standards', () => {
    test('should ensure all Lambda functions use Node.js 22.x', () => {
      const stacks = app.node.children.filter(
        (child) => child instanceof cdk.Stack
      ) as cdk.Stack[];

      stacks.forEach((stack) => {
        const template = Template.fromStack(stack);
        const lambdaFunctions = template.findResources('AWS::Lambda::Function');

        Object.values(lambdaFunctions).forEach((func: any) => {
          if (func.Properties.Runtime && func.Properties.Runtime.startsWith('nodejs')) {
            expect(func.Properties.Runtime).toBe('nodejs22.x');
          }
        });
      });
    });

    test('should use consistent billing mode across DynamoDB tables', () => {
      const databaseStack = app.node.findChild('Auteurium-Database-test') as cdk.Stack;
      const databaseTemplate = Template.fromStack(databaseStack);

      const tables = databaseTemplate.findResources('AWS::DynamoDB::Table');
      Object.values(tables).forEach((table: any) => {
        expect(table.Properties.BillingMode).toBe('PAY_PER_REQUEST');
      });
    });
  });

  describe('Output and Export Validation', () => {
    test('should export necessary values for cross-stack communication', () => {
      const authStack = app.node.findChild('Auteurium-Auth-test') as cdk.Stack;
      const databaseStack = app.node.findChild('Auteurium-Database-test') as cdk.Stack;
      const apiStack = app.node.findChild('Auteurium-Api-test') as cdk.Stack;

      const authTemplate = Template.fromStack(authStack);
      const databaseTemplate = Template.fromStack(databaseStack);
      const apiTemplate = Template.fromStack(apiStack);

      // Auth stack exports
      authTemplate.hasOutput('UserPoolId', {
        Export: { Name: 'Auteurium-UserPoolId-test' },
      });
      authTemplate.hasOutput('UserPoolClientId', {
        Export: { Name: 'Auteurium-UserPoolClientId-test' },
      });

      // Database stack exports
      databaseTemplate.hasOutput('UsersTableName-test', {
        Export: { Name: 'AuteuriumUsersTable-test' },
      });

      // API stack exports
      apiTemplate.hasOutput('GraphQLApiUrl', {
        Export: { Name: 'Auteurium-GraphQLApiUrl-test' },
      });
    });
  });

  describe('Monitoring Stack Integration', () => {
    test('should not deploy monitoring stack in current configuration', () => {
      const stacks = app.node.children.filter(
        (child) => child instanceof cdk.Stack
      );

      const monitoringStack = stacks.find((stack) =>
        stack.node.id.includes('Monitoring')
      );

      expect(monitoringStack).toBeUndefined();
    });

    test('should be ready for monitoring stack integration', () => {
      // Verify that API and Web stacks expose necessary properties for monitoring
      const apiStack = app.node.findChild('Auteurium-Api-test') as cdk.Stack;
      const webStack = app.node.findChild('Auteurium-Web-test') as cdk.Stack;

      expect(apiStack).toBeDefined();
      expect(webStack).toBeDefined();

      // These stacks should be available for monitoring stack to reference
      const apiTemplate = Template.fromStack(apiStack);
      const webTemplate = Template.fromStack(webStack);

      // API stack should have GraphQL API that can be monitored
      apiTemplate.resourceCountIs('AWS::AppSync::GraphQLApi', 1);

      // Web stack should have CloudFront distribution that can be monitored
      webTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });
  });
});