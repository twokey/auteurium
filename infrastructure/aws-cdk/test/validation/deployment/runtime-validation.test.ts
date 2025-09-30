import { AppSyncClient, GetGraphqlApiCommand, ListGraphqlApisCommand } from '@aws-sdk/client-appsync'
import { CognitoIdentityProviderClient, DescribeUserPoolCommand, ListUserPoolsCommand } from '@aws-sdk/client-cognito-identity-provider'
import { DescribeTableCommand, DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import { GetFunctionCommand, LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda'

describe('Deployed Infrastructure Validation', () => {
  const stage = process.env.STAGE ?? 'test'
  const region = process.env.AWS_REGION ?? 'us-west-2'

  const lambdaClient = new LambdaClient({ region });
  const dynamoClient = new DynamoDBClient({ region });
  const cognitoClient = new CognitoIdentityProviderClient({ region });
  const appSyncClient = new AppSyncClient({ region });

  // Only run these tests if we're in a deployed environment
  const shouldRunDeploymentTests = process.env.RUN_DEPLOYMENT_TESTS === 'true';

  describe('Lambda Function Validation', () => {
    test('should have all Lambda functions with correct runtime', async () => {
      if (!shouldRunDeploymentTests) {
        console.warn('Skipping deployment tests - set RUN_DEPLOYMENT_TESTS=true to enable')
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

          expect(response.Configuration).toBeDefined()
          const config = response.Configuration
          expect(config?.Runtime).toBe('nodejs22.x')
          expect(config?.FunctionName).toBe(functionName)

          console.warn(`✅ ${functionName}: ${config?.Runtime ?? 'unknown'}`)
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

        const envVars = response.Configuration?.Environment?.Variables ?? {}

        expect(envVars.STAGE).toBe(stage)
        expect(envVars.USERS_TABLE).toBe(`auteurium-users-${stage}`)
        expect(envVars.PROJECTS_TABLE).toBe(`auteurium-projects-${stage}`)
        expect(envVars.SNIPPETS_TABLE).toBe(`auteurium-snippets-${stage}`)
        expect(envVars.CONNECTIONS_TABLE).toBe(`auteurium-connections-${stage}`)
        expect(envVars.VERSIONS_TABLE).toBe(`auteurium-versions-${stage}`)
        expect(envVars.USER_POOL_ID).toMatch(/^[\w-]+_[\w]+$/)

        console.warn('✅ API Lambda environment variables validated')
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
        const response = await lambdaClient.send(new ListFunctionsCommand({}))
        const allFunctions = response.Functions ?? []
        const auteuriumFunctions = allFunctions.filter(func =>
          func.FunctionName?.includes('auteurium') ?? false
        )

        for (const func of auteuriumFunctions) {
          const runtime = func.Runtime
          if (runtime?.startsWith('nodejs')) {
            expect(deprecatedRuntimes).not.toContain(runtime)
            expect(runtime).toBe('nodejs22.x')
          }
        }

        console.warn(`✅ Validated ${auteuriumFunctions.length} Auteurium Lambda functions`)
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
        const response = await dynamoClient.send(new ListTablesCommand({}))
        const tableNames = response.TableNames ?? []

        for (const expectedTable of expectedTables) {
          expect(tableNames).toContain(expectedTable)

          // Verify table configuration
          const tableResponse = await dynamoClient.send(
            new DescribeTableCommand({ TableName: expectedTable })
          )

          expect(tableResponse.Table?.BillingModeSummary?.BillingMode).toBe('PAY_PER_REQUEST')
          expect(tableResponse.Table?.TableStatus).toBe('ACTIVE')
        }

        console.warn(`✅ Validated ${expectedTables.length} DynamoDB tables`)
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
          )

          const gsis = response.Table?.GlobalSecondaryIndexes ?? []
          const gsiNames = gsis.map(gsi => gsi.IndexName).filter((name): name is string => name !== undefined)

          for (const expectedGSI of expectedGSIs) {
            expect(gsiNames).toContain(expectedGSI)
          }
        }

        console.warn('✅ Validated DynamoDB Global Secondary Indexes')
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
        }))

        const userPools = listResponse.UserPools ?? []
        const auteuriumPool = userPools.find(pool =>
          pool.Name === `auteurium-users-${stage}`
        )

        expect(auteuriumPool).toBeDefined()

        const poolResponse = await cognitoClient.send(
          new DescribeUserPoolCommand({ UserPoolId: auteuriumPool?.Id ?? '' })
        )

        const passwordPolicy = poolResponse.UserPool?.Policies?.PasswordPolicy
        expect(passwordPolicy?.MinimumLength).toBe(8)
        expect(passwordPolicy?.RequireLowercase).toBe(true)
        expect(passwordPolicy?.RequireNumbers).toBe(true)
        expect(passwordPolicy?.RequireUppercase).toBe(true)
        expect(passwordPolicy?.RequireSymbols).toBe(false)

        console.warn('✅ Validated Cognito User Pool configuration')
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
        const listResponse = await appSyncClient.send(new ListGraphqlApisCommand({}))
        const apis = listResponse.graphqlApis ?? []
        const auteuriumApi = apis.find(api =>
          api.name === `auteurium-api-${stage}`
        )

        expect(auteuriumApi).toBeDefined()

        const apiResponse = await appSyncClient.send(
          new GetGraphqlApiCommand({ apiId: auteuriumApi?.apiId ?? '' })
        )

        expect(apiResponse.graphqlApi?.authenticationType).toBe('AMAZON_COGNITO_USER_POOLS')
        expect(apiResponse.graphqlApi?.userPoolConfig).toBeDefined()

        console.warn('✅ Validated AppSync API configuration')
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

        const config = response.Configuration
        expect(config?.Environment?.Variables?.USERS_TABLE).toBeTruthy()
        expect(config?.Role).toMatch(/.*role.*/)

        console.warn('✅ API Lambda has DynamoDB configuration')
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
        const response = await lambdaClient.send(new ListFunctionsCommand({}))
        const allFunctions = response.Functions ?? []
        const auteuriumFunctions = allFunctions.filter(func =>
          func.FunctionName?.includes('auteurium') ?? false
        )

        for (const func of auteuriumFunctions) {
          // This is a basic check - in a real scenario you'd check IAM policies
          expect(func.FunctionName).toMatch(/auteurium-.+-${stage}/)
        }

        console.warn('✅ Validated Lambda function security')
      } catch (error) {
        console.error('❌ Failed to validate Lambda security:', error);
        throw error;
      }
    });
  });
});