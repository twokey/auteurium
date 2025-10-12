import { describe, test, beforeEach, expect } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as cognito from 'aws-cdk-lib/aws-cognito';

import { AuteuriumApiStack } from '../../../lib/stacks/auteurium-api-stack';

describe('AuteuriumApiStack', () => {
  let app: cdk.App;
  let stack: AuteuriumApiStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();

    // Create a temporary stack for the mock resources
    const mockStack = new cdk.Stack(app, 'MockStack');
    const mockUserPool = cognito.UserPool.fromUserPoolId(mockStack, 'MockUserPool', 'test-user-pool-id');
    const mockUserPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
      mockStack,
      'MockUserPoolClient',
      'test-user-pool-client-id'
    );

    stack = new AuteuriumApiStack(app, 'TestAuteuriumApiStack', {
      stage: 'test',
      userPool: mockUserPool,
      userPoolClient: mockUserPoolClient,
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  describe('AppSync GraphQL API', () => {
    test('should create AppSync API with correct naming', () => {
      template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
        Name: 'auteurium-api-test',
        AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
      });
    });

    test('should configure Cognito authentication', () => {
      template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
        UserPoolConfig: {
          UserPoolId: 'test-user-pool-id',
          DefaultAction: 'ALLOW',
          AwsRegion: { 'Ref': 'AWS::Region' },
        },
      });
    });

    test('should enable comprehensive logging', () => {
      template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
        LogConfig: {
          FieldLogLevel: 'ALL',
          ExcludeVerboseContent: false,
        },
      });
    });

    test('should reference GraphQL schema file', () => {
      // Check that GraphQL schema exists and is connected to the API
      const schemas = template.findResources('AWS::AppSync::GraphQLSchema');
      expect(Object.keys(schemas)).toHaveLength(1);

      interface SchemaProperties {
        Properties: {
          ApiId: {
            'Fn::GetAtt': [string, string];
          };
          Definition: unknown;
        };
      }

      const schema = Object.values(schemas)[0] as SchemaProperties;
      expect(schema.Properties.ApiId).toBeDefined();
      expect(schema.Properties.ApiId['Fn::GetAtt']).toHaveLength(2);
      expect(schema.Properties.ApiId['Fn::GetAtt'][1]).toBe('ApiId');
      expect(schema.Properties.Definition).toBeDefined();
    });
  });

  describe('Lambda Function Configuration', () => {
    test('should create API Lambda with Node.js 22.x runtime', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'auteurium-api-test',
        Runtime: 'nodejs22.x', // CRITICAL: Prevent regression to older versions
        Handler: 'index.handler',
        Timeout: 30,
        MemorySize: 512,
      });
    });

    test('should configure correct environment variables', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            STAGE: 'test',
            USERS_TABLE: 'auteurium-users-test',
            PROJECTS_TABLE: 'auteurium-projects-test',
            SNIPPETS_TABLE: 'auteurium-snippets-test',
            CONNECTIONS_TABLE: 'auteurium-connections-test',
            VERSIONS_TABLE: 'auteurium-versions-test',
            USER_POOL_ID: 'test-user-pool-id',
          },
        },
      });
    });

    test('should use correct code asset path', () => {
      // Check that Lambda functions have proper S3 code assets
      const functions = template.findResources('AWS::Lambda::Function');
      const appFunctions = Object.values(functions).filter((func: any) =>
        func.Properties.FunctionName?.includes('auteurium-api')
      );

      appFunctions.forEach((func: any) => {
        expect(func.Properties.Code).toBeDefined();
        expect(func.Properties.Code.S3Bucket).toBeDefined();
        expect(func.Properties.Code.S3Key).toBeDefined();
        expect(func.Properties.Code.S3Key).toMatch(/\.zip$/);
      });
    });
  });

  describe('IAM Permissions', () => {
    test('should grant DynamoDB read/write permissions to all tables', () => {
      // Check that IAM policies exist for DynamoDB permissions
      const policies = template.findResources('AWS::IAM::Policy');
      const dynamoDbPolicies = Object.values(policies).filter((policy: any) =>
        policy.Properties.PolicyDocument.Statement.some((stmt: any) => {
          if (!stmt.Action) return false;
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          return actions.some((action: any) => action.includes('dynamodb:'));
        })
      );

      expect(dynamoDbPolicies.length).toBeGreaterThan(0);

      dynamoDbPolicies.forEach((policy: any) => {
        const dynamoDbStatement = policy.Properties.PolicyDocument.Statement.find((stmt: any) => {
          if (!stmt.Action) return false;
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          return actions.some((action: any) => action.includes('dynamodb:'));
        });

        expect(dynamoDbStatement).toBeDefined();
        expect(dynamoDbStatement.Effect).toBe('Allow');
        expect(dynamoDbStatement.Resource).toBeDefined();
      });
    });

    test('should grant Cognito admin permissions', () => {
      // Check that IAM policies exist for Cognito permissions
      const policies = template.findResources('AWS::IAM::Policy');
      const cognitoPolicies = Object.values(policies).filter((policy: any) =>
        policy.Properties.PolicyDocument.Statement.some((stmt: any) => {
          if (!stmt.Action) return false;
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          return actions.some((action: any) => action.includes('cognito-idp:'));
        })
      );

      expect(cognitoPolicies.length).toBeGreaterThan(0);

      cognitoPolicies.forEach((policy: any) => {
        const cognitoStatement = policy.Properties.PolicyDocument.Statement.find((stmt: any) => {
          if (!stmt.Action) return false;
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          return actions.some((action: any) => action.includes('cognito-idp:'));
        });

        expect(cognitoStatement).toBeDefined();
        expect(cognitoStatement.Effect).toBe('Allow');
        expect(cognitoStatement.Resource).toBeDefined();
      });
    });
  });

  describe('AppSync Resolvers', () => {
    test('should create all required query resolvers', () => {
      const queryResolvers = [
        'Query.me',
        'Query.users',
        'Query.projects',
        'Query.project',
        'Query.snippet',
        'Query.snippetVersions',
        'Query.systemAnalytics',
      ];

      // Check that all required resolvers exist
      const resolvers = template.findResources('AWS::AppSync::Resolver');
      const resolverFields = Object.values(resolvers).map((resolver: any) =>
        `${resolver.Properties.TypeName}.${resolver.Properties.FieldName}`
      );

      queryResolvers.forEach((expectedResolver) => {
        expect(resolverFields).toContain(expectedResolver);
      });

      // Verify they're connected to the API
      Object.values(resolvers).forEach((resolver: any) => {
        expect(resolver.Properties.ApiId).toBeDefined();
        expect(resolver.Properties.ApiId['Fn::GetAtt']).toHaveLength(2);
        expect(resolver.Properties.ApiId['Fn::GetAtt'][1]).toBe('ApiId');
      });
    });

    test('should create all required mutation resolvers', () => {
      const mutationResolvers = [
        'Mutation.createProject',
        'Mutation.updateProject',
        'Mutation.deleteProject',
        'Mutation.createSnippet',
        'Mutation.updateSnippet',
        'Mutation.deleteSnippet',
        'Mutation.combineSnippetConnections',
        'Mutation.revertSnippet',
        'Mutation.createConnection',
        'Mutation.updateConnection',
        'Mutation.deleteConnection',
        'Mutation.createUser',
        'Mutation.deleteUser',
        'Mutation.resetUserPassword',
      ];

      mutationResolvers.forEach((resolver) => {
        const [typeName, fieldName] = resolver.split('.');
        template.hasResourceProperties('AWS::AppSync::Resolver', {
          TypeName: typeName,
          FieldName: fieldName,
        });
      });
    });

    test('should connect all resolvers to Lambda data source', () => {
      // Check that the Lambda data source exists
      const dataSources = template.findResources('AWS::AppSync::DataSource');
      const lambdaDataSources = Object.values(dataSources).filter((ds: any) =>
        ds.Properties.Type === 'AWS_LAMBDA'
      );

      expect(lambdaDataSources).toHaveLength(1);

      const lambdaDataSource = lambdaDataSources[0];
      expect(lambdaDataSource.Properties.ApiId).toBeDefined();
      expect(lambdaDataSource.Properties.ApiId['Fn::GetAtt']).toHaveLength(2);
      expect(lambdaDataSource.Properties.ApiId['Fn::GetAtt'][1]).toBe('ApiId');
      expect(lambdaDataSource.Properties.LambdaConfig).toBeDefined();
      expect(lambdaDataSource.Properties.LambdaConfig.LambdaFunctionArn).toBeDefined();
      expect(lambdaDataSource.Properties.LambdaConfig.LambdaFunctionArn['Fn::GetAtt']).toHaveLength(2);
      expect(lambdaDataSource.Properties.LambdaConfig.LambdaFunctionArn['Fn::GetAtt'][1]).toBe('Arn');
    });
  });

  describe('Stack Outputs', () => {
    test('should export GraphQL API URL', () => {
      const outputs = template.findOutputs('GraphQLApiUrl');
      expect(Object.keys(outputs)).toHaveLength(1);

      const output = outputs.GraphQLApiUrl;
      expect(output.Value).toBeDefined();
      expect(output.Value['Fn::GetAtt']).toBeDefined();
      expect(output.Value['Fn::GetAtt']).toHaveLength(2);
      expect(output.Value['Fn::GetAtt'][1]).toBe('GraphQLUrl');
      expect(output.Export.Name).toBe('Auteurium-GraphQLApiUrl-test');
    });

    test('should export API key status', () => {
      template.hasOutput('GraphQLApiKey', {
        Value: 'No API Key (using Cognito)',
        Export: {
          Name: 'Auteurium-GraphQLApiKey-test',
        },
      });
    });
  });

  describe('Security Configuration', () => {
    test('should only allow Cognito authenticated requests', () => {
      template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
        AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
      });

      // Ensure no API key authentication is configured
      template.resourceCountIs('AWS::AppSync::ApiKey', 0);
    });

    test('should not allow unauthenticated access', () => {
      // Ensure no IAM authentication is configured for public access
      const graphqlApi = template.findResources('AWS::AppSync::GraphQLApi');
      Object.values(graphqlApi).forEach((api: any) => {
        expect(api.Properties.AuthenticationType).toBe('AMAZON_COGNITO_USER_POOLS');
        expect(api.Properties.AdditionalAuthenticationProviders).toBeUndefined();
      });
    });
  });

  describe('Resource Count Validation', () => {
    test('should create exactly one GraphQL API', () => {
      template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    });

    test('should create exactly one Lambda function', () => {
      // API stack may have additional custom resource handlers
      const functions = template.findResources('AWS::Lambda::Function');
      const appFunctions = Object.values(functions).filter((func: any) =>
        func.Properties.FunctionName?.includes('auteurium-api')
      );
      expect(appFunctions).toHaveLength(1);
    });

    test('should create exactly one Lambda data source', () => {
      template.resourceCountIs('AWS::AppSync::DataSource', 1);
    });

    test('should create correct number of resolvers', () => {
      // AppSync may create additional resolvers for complex schemas
      const resolvers = template.findResources('AWS::AppSync::Resolver');
      expect(Object.keys(resolvers).length).toBeGreaterThanOrEqual(16);
    });
  });

  describe('Runtime Version Validation', () => {
    test('should never use outdated Node.js runtimes', () => {
      const deprecatedRuntimes = [
        'nodejs14.x',
        'nodejs16.x',
        'nodejs18.x',
        'nodejs20.x',
      ];

      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      Object.values(lambdaFunctions).forEach((func: any) => {
        const runtime = func.Properties.Runtime;
        expect(deprecatedRuntimes).not.toContain(runtime);
        expect(runtime).toBe('nodejs22.x');
      });
    });

    test('should use latest supported Node.js runtime', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs22.x',
      });
    });
  });

  describe('Public Properties', () => {
    test('should expose GraphQL API as public property', () => {
      expect(stack.graphqlApi).toBeDefined();
      expect(stack.graphqlApi.apiId).toBeDefined();
    });
  });

  describe('Cross-Stack Dependencies', () => {
    test('should properly reference external Cognito resources', () => {
      template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
        UserPoolConfig: {
          UserPoolId: 'test-user-pool-id',
        },
      });
    });

    test('should reference DynamoDB tables by name convention', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
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
});
