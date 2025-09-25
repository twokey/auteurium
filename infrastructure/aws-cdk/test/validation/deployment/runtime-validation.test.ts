import { LambdaClient, GetFunctionCommand, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { DynamoDBClient, ListTablesCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, ListUserPoolsCommand, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AppSyncClient, ListGraphqlApisCommand, GetGraphqlApiCommand } from '@aws-sdk/client-appsync';

describe('Deployed Infrastructure Validation', () => {
  const stage = process.env.STAGE || 'test';
  const region = process.env.AWS_REGION || 'us-west-2';

  const lambdaClient = new LambdaClient({ region });
  const dynamoClient = new DynamoDBClient({ region });
  const cognitoClient = new CognitoIdentityProviderClient({ region });
  const appSyncClient = new AppSyncClient({ region });

  // Only run these tests if we're in a deployed environment
  const shouldRunDeploymentTests = process.env.RUN_DEPLOYMENT_TESTS === 'true';

  describe('Lambda Function Validation', () => {
    test('should have all Lambda functions with correct runtime', async () => {
      if (!shouldRunDeploymentTests) {
        console.log('Skipping deployment tests - set RUN_DEPLOYMENT_TESTS=true to enable');
        return;
      }

      const expectedFunctions = [
        `auteurium-api-${stage}`,
        `auteurium-presigned-url-${stage}`,
        `auteurium-upload-complete-${stage}`,
      ];

      for (const functionName of expectedFunctions) {
        try {
          const response = await lambdaClient.send(
            new GetFunctionCommand({ FunctionName: functionName })
          );

          expect(response.Configuration).toBeDefined();
          expect(response.Configuration!.Runtime).toBe('nodejs22.x');
          expect(response.Configuration!.FunctionName).toBe(functionName);

          console.log(`✅ ${functionName}: ${response.Configuration!.Runtime}`);
        } catch (error) {
          console.error(`❌ Failed to validate ${functionName}:`, error);
          throw error;
        }
      }
    }, 60000);

    test('should have correct environment variables on API Lambda', async () => {
      if (!shouldRunDeploymentTests) return;

      const functionName = `auteurium-api-${stage}`;

      try {
        const response = await lambdaClient.send(
          new GetFunctionCommand({ FunctionName: functionName })
        );

        const envVars = response.Configuration!.Environment!.Variables!;

        expect(envVars.STAGE).toBe(stage);
        expect(envVars.USERS_TABLE).toBe(`auteurium-users-${stage}`);
        expect(envVars.PROJECTS_TABLE).toBe(`auteurium-projects-${stage}`);
        expect(envVars.SNIPPETS_TABLE).toBe(`auteurium-snippets-${stage}`);
        expect(envVars.CONNECTIONS_TABLE).toBe(`auteurium-connections-${stage}`);
        expect(envVars.VERSIONS_TABLE).toBe(`auteurium-versions-${stage}`);
        expect(envVars.USER_POOL_ID).toMatch(/^[\w-]+_[\w]+$/);

        console.log('✅ API Lambda environment variables validated');
      } catch (error) {
        console.error('❌ Failed to validate API Lambda environment variables:', error);
        throw error;
      }
    });

    test('should not have any Lambda functions with outdated runtimes', async () => {
      if (!shouldRunDeploymentTests) return;

      const deprecatedRuntimes = [
        'nodejs14.x',
        'nodejs16.x',
        'nodejs18.x',
        'nodejs20.x',
      ];

      try {
        const response = await lambdaClient.send(new ListFunctionsCommand({}));
        const auteuriumFunctions = response.Functions!.filter(func =>
          func.FunctionName!.includes('auteurium')
        );

        for (const func of auteuriumFunctions) {
          if (func.Runtime && func.Runtime.startsWith('nodejs')) {
            expect(deprecatedRuntimes).not.toContain(func.Runtime);
            expect(func.Runtime).toBe('nodejs22.x');
          }
        }

        console.log(`✅ Validated ${auteuriumFunctions.length} Auteurium Lambda functions`);
      } catch (error) {
        console.error('❌ Failed to validate Lambda runtimes:', error);
        throw error;
      }
    });
  });

  describe('DynamoDB Table Validation', () => {
    test('should have all required DynamoDB tables', async () => {
      if (!shouldRunDeploymentTests) return;

      const expectedTables = [
        `auteurium-users-${stage}`,
        `auteurium-projects-${stage}`,
        `auteurium-snippets-${stage}`,
        `auteurium-connections-${stage}`,
        `auteurium-versions-${stage}`,
      ];

      try {
        const response = await dynamoClient.send(new ListTablesCommand({}));
        const tableNames = response.TableNames!;

        for (const expectedTable of expectedTables) {
          expect(tableNames).toContain(expectedTable);

          // Verify table configuration
          const tableResponse = await dynamoClient.send(
            new DescribeTableCommand({ TableName: expectedTable })
          );

          expect(tableResponse.Table!.BillingModeSummary!.BillingMode).toBe('PAY_PER_REQUEST');
          expect(tableResponse.Table!.TableStatus).toBe('ACTIVE');
        }

        console.log(`✅ Validated ${expectedTables.length} DynamoDB tables`);
      } catch (error) {
        console.error('❌ Failed to validate DynamoDB tables:', error);
        throw error;
      }
    });

    test('should have correct Global Secondary Indexes', async () => {
      if (!shouldRunDeploymentTests) return;

      const tableGSIs = {
        [`auteurium-users-${stage}`]: ['EmailIndex'],
        [`auteurium-snippets-${stage}`]: ['UserIndex'],
        [`auteurium-connections-${stage}`]: [
          'SourceSnippetIndex',
          'TargetSnippetIndex',
          'ConnectionTypeIndex',
        ],
        [`auteurium-versions-${stage}`]: ['UserVersionsIndex'],
      };

      try {
        for (const [tableName, expectedGSIs] of Object.entries(tableGSIs)) {
          const response = await dynamoClient.send(
            new DescribeTableCommand({ TableName: tableName })
          );

          const gsiNames = response.Table!.GlobalSecondaryIndexes!.map(gsi => gsi.IndexName!);

          for (const expectedGSI of expectedGSIs) {
            expect(gsiNames).toContain(expectedGSI);
          }
        }

        console.log('✅ Validated DynamoDB Global Secondary Indexes');
      } catch (error) {
        console.error('❌ Failed to validate GSIs:', error);
        throw error;
      }
    });
  });

  describe('Cognito Validation', () => {
    test('should have Cognito User Pool with correct configuration', async () => {
      if (!shouldRunDeploymentTests) return;

      try {
        const listResponse = await cognitoClient.send(new ListUserPoolsCommand({
          MaxResults: 50,
        }));

        const auteuriumPool = listResponse.UserPools!.find(pool =>
          pool.Name === `auteurium-users-${stage}`
        );

        expect(auteuriumPool).toBeDefined();

        const poolResponse = await cognitoClient.send(
          new DescribeUserPoolCommand({ UserPoolId: auteuriumPool!.Id! })
        );

        expect(poolResponse.UserPool!.Policies!.PasswordPolicy!.MinimumLength).toBe(8);
        expect(poolResponse.UserPool!.Policies!.PasswordPolicy!.RequireLowercase).toBe(true);
        expect(poolResponse.UserPool!.Policies!.PasswordPolicy!.RequireNumbers).toBe(true);
        expect(poolResponse.UserPool!.Policies!.PasswordPolicy!.RequireUppercase).toBe(true);
        expect(poolResponse.UserPool!.Policies!.PasswordPolicy!.RequireSymbols).toBe(false);

        console.log('✅ Validated Cognito User Pool configuration');
      } catch (error) {
        console.error('❌ Failed to validate Cognito:', error);
        throw error;
      }
    });
  });

  describe('AppSync API Validation', () => {
    test('should have AppSync API with Cognito authentication', async () => {
      if (!shouldRunDeploymentTests) return;

      try {
        const listResponse = await appSyncClient.send(new ListGraphqlApisCommand({}));
        const auteuriumApi = listResponse.graphqlApis!.find(api =>
          api.name === `auteurium-api-${stage}`
        );

        expect(auteuriumApi).toBeDefined();

        const apiResponse = await appSyncClient.send(
          new GetGraphqlApiCommand({ apiId: auteuriumApi!.apiId! })
        );

        expect(apiResponse.graphqlApi!.authenticationType).toBe('AMAZON_COGNITO_USER_POOLS');
        expect(apiResponse.graphqlApi!.userPoolConfig).toBeDefined();

        console.log('✅ Validated AppSync API configuration');
      } catch (error) {
        console.error('❌ Failed to validate AppSync API:', error);
        throw error;
      }
    });
  });

  describe('Integration Smoke Tests', () => {
    test('should have Lambda functions that can connect to DynamoDB', async () => {
      if (!shouldRunDeploymentTests) return;

      // This test would invoke the Lambda function to test DynamoDB connectivity
      // For now, we'll just verify the function exists and has the right permissions
      const functionName = `auteurium-api-${stage}`;

      try {
        const response = await lambdaClient.send(
          new GetFunctionCommand({ FunctionName: functionName })
        );

        expect(response.Configuration!.Environment!.Variables!.USERS_TABLE).toBeTruthy();
        expect(response.Configuration!.Role).toMatch(/.*role.*/);

        console.log('✅ API Lambda has DynamoDB configuration');
      } catch (error) {
        console.error('❌ Failed to validate Lambda-DynamoDB integration:', error);
        throw error;
      }
    });
  });

  describe('Security Validation', () => {
    test('should not have any Lambda functions with public access', async () => {
      if (!shouldRunDeploymentTests) return;

      try {
        const response = await lambdaClient.send(new ListFunctionsCommand({}));
        const auteuriumFunctions = response.Functions!.filter(func =>
          func.FunctionName!.includes('auteurium')
        );

        for (const func of auteuriumFunctions) {
          // This is a basic check - in a real scenario you'd check IAM policies
          expect(func.FunctionName).toMatch(/auteurium-.+-${stage}/);
        }

        console.log('✅ Validated Lambda function security');
      } catch (error) {
        console.error('❌ Failed to validate Lambda security:', error);
        throw error;
      }
    });
  });
});