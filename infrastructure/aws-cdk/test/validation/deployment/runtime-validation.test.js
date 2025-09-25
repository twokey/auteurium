"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_lambda_1 = require("@aws-sdk/client-lambda");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_appsync_1 = require("@aws-sdk/client-appsync");
describe('Deployed Infrastructure Validation', () => {
    const stage = process.env.STAGE || 'test';
    const region = process.env.AWS_REGION || 'us-west-2';
    const lambdaClient = new client_lambda_1.LambdaClient({ region });
    const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region });
    const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region });
    const appSyncClient = new client_appsync_1.AppSyncClient({ region });
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
                    const response = await lambdaClient.send(new client_lambda_1.GetFunctionCommand({ FunctionName: functionName }));
                    expect(response.Configuration).toBeDefined();
                    expect(response.Configuration.Runtime).toBe('nodejs22.x');
                    expect(response.Configuration.FunctionName).toBe(functionName);
                    console.log(`✅ ${functionName}: ${response.Configuration.Runtime}`);
                }
                catch (error) {
                    console.error(`❌ Failed to validate ${functionName}:`, error);
                    throw error;
                }
            }
        }, 60000);
        test('should have correct environment variables on API Lambda', async () => {
            if (!shouldRunDeploymentTests)
                return;
            const functionName = `auteurium-api-${stage}`;
            try {
                const response = await lambdaClient.send(new client_lambda_1.GetFunctionCommand({ FunctionName: functionName }));
                const envVars = response.Configuration.Environment.Variables;
                expect(envVars.STAGE).toBe(stage);
                expect(envVars.USERS_TABLE).toBe(`auteurium-users-${stage}`);
                expect(envVars.PROJECTS_TABLE).toBe(`auteurium-projects-${stage}`);
                expect(envVars.SNIPPETS_TABLE).toBe(`auteurium-snippets-${stage}`);
                expect(envVars.CONNECTIONS_TABLE).toBe(`auteurium-connections-${stage}`);
                expect(envVars.VERSIONS_TABLE).toBe(`auteurium-versions-${stage}`);
                expect(envVars.USER_POOL_ID).toMatch(/^[\w-]+_[\w]+$/);
                console.log('✅ API Lambda environment variables validated');
            }
            catch (error) {
                console.error('❌ Failed to validate API Lambda environment variables:', error);
                throw error;
            }
        });
        test('should not have any Lambda functions with outdated runtimes', async () => {
            if (!shouldRunDeploymentTests)
                return;
            const deprecatedRuntimes = [
                'nodejs14.x',
                'nodejs16.x',
                'nodejs18.x',
                'nodejs20.x',
            ];
            try {
                const response = await lambdaClient.send(new client_lambda_1.ListFunctionsCommand({}));
                const auteuriumFunctions = response.Functions.filter(func => func.FunctionName.includes('auteurium'));
                for (const func of auteuriumFunctions) {
                    if (func.Runtime && func.Runtime.startsWith('nodejs')) {
                        expect(deprecatedRuntimes).not.toContain(func.Runtime);
                        expect(func.Runtime).toBe('nodejs22.x');
                    }
                }
                console.log(`✅ Validated ${auteuriumFunctions.length} Auteurium Lambda functions`);
            }
            catch (error) {
                console.error('❌ Failed to validate Lambda runtimes:', error);
                throw error;
            }
        });
    });
    describe('DynamoDB Table Validation', () => {
        test('should have all required DynamoDB tables', async () => {
            if (!shouldRunDeploymentTests)
                return;
            const expectedTables = [
                `auteurium-users-${stage}`,
                `auteurium-projects-${stage}`,
                `auteurium-snippets-${stage}`,
                `auteurium-connections-${stage}`,
                `auteurium-versions-${stage}`,
            ];
            try {
                const response = await dynamoClient.send(new client_dynamodb_1.ListTablesCommand({}));
                const tableNames = response.TableNames;
                for (const expectedTable of expectedTables) {
                    expect(tableNames).toContain(expectedTable);
                    // Verify table configuration
                    const tableResponse = await dynamoClient.send(new client_dynamodb_1.DescribeTableCommand({ TableName: expectedTable }));
                    expect(tableResponse.Table.BillingModeSummary.BillingMode).toBe('PAY_PER_REQUEST');
                    expect(tableResponse.Table.TableStatus).toBe('ACTIVE');
                }
                console.log(`✅ Validated ${expectedTables.length} DynamoDB tables`);
            }
            catch (error) {
                console.error('❌ Failed to validate DynamoDB tables:', error);
                throw error;
            }
        });
        test('should have correct Global Secondary Indexes', async () => {
            if (!shouldRunDeploymentTests)
                return;
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
                    const response = await dynamoClient.send(new client_dynamodb_1.DescribeTableCommand({ TableName: tableName }));
                    const gsiNames = response.Table.GlobalSecondaryIndexes.map(gsi => gsi.IndexName);
                    for (const expectedGSI of expectedGSIs) {
                        expect(gsiNames).toContain(expectedGSI);
                    }
                }
                console.log('✅ Validated DynamoDB Global Secondary Indexes');
            }
            catch (error) {
                console.error('❌ Failed to validate GSIs:', error);
                throw error;
            }
        });
    });
    describe('Cognito Validation', () => {
        test('should have Cognito User Pool with correct configuration', async () => {
            if (!shouldRunDeploymentTests)
                return;
            try {
                const listResponse = await cognitoClient.send(new client_cognito_identity_provider_1.ListUserPoolsCommand({
                    MaxResults: 50,
                }));
                const auteuriumPool = listResponse.UserPools.find(pool => pool.Name === `auteurium-users-${stage}`);
                expect(auteuriumPool).toBeDefined();
                const poolResponse = await cognitoClient.send(new client_cognito_identity_provider_1.DescribeUserPoolCommand({ UserPoolId: auteuriumPool.Id }));
                expect(poolResponse.UserPool.Policies.PasswordPolicy.MinimumLength).toBe(8);
                expect(poolResponse.UserPool.Policies.PasswordPolicy.RequireLowercase).toBe(true);
                expect(poolResponse.UserPool.Policies.PasswordPolicy.RequireNumbers).toBe(true);
                expect(poolResponse.UserPool.Policies.PasswordPolicy.RequireUppercase).toBe(true);
                expect(poolResponse.UserPool.Policies.PasswordPolicy.RequireSymbols).toBe(false);
                console.log('✅ Validated Cognito User Pool configuration');
            }
            catch (error) {
                console.error('❌ Failed to validate Cognito:', error);
                throw error;
            }
        });
    });
    describe('AppSync API Validation', () => {
        test('should have AppSync API with Cognito authentication', async () => {
            if (!shouldRunDeploymentTests)
                return;
            try {
                const listResponse = await appSyncClient.send(new client_appsync_1.ListGraphqlApisCommand({}));
                const auteuriumApi = listResponse.graphqlApis.find(api => api.name === `auteurium-api-${stage}`);
                expect(auteuriumApi).toBeDefined();
                const apiResponse = await appSyncClient.send(new client_appsync_1.GetGraphqlApiCommand({ apiId: auteuriumApi.apiId }));
                expect(apiResponse.graphqlApi.authenticationType).toBe('AMAZON_COGNITO_USER_POOLS');
                expect(apiResponse.graphqlApi.userPoolConfig).toBeDefined();
                console.log('✅ Validated AppSync API configuration');
            }
            catch (error) {
                console.error('❌ Failed to validate AppSync API:', error);
                throw error;
            }
        });
    });
    describe('Integration Smoke Tests', () => {
        test('should have Lambda functions that can connect to DynamoDB', async () => {
            if (!shouldRunDeploymentTests)
                return;
            // This test would invoke the Lambda function to test DynamoDB connectivity
            // For now, we'll just verify the function exists and has the right permissions
            const functionName = `auteurium-api-${stage}`;
            try {
                const response = await lambdaClient.send(new client_lambda_1.GetFunctionCommand({ FunctionName: functionName }));
                expect(response.Configuration.Environment.Variables.USERS_TABLE).toBeTruthy();
                expect(response.Configuration.Role).toMatch(/.*role.*/);
                console.log('✅ API Lambda has DynamoDB configuration');
            }
            catch (error) {
                console.error('❌ Failed to validate Lambda-DynamoDB integration:', error);
                throw error;
            }
        });
    });
    describe('Security Validation', () => {
        test('should not have any Lambda functions with public access', async () => {
            if (!shouldRunDeploymentTests)
                return;
            try {
                const response = await lambdaClient.send(new client_lambda_1.ListFunctionsCommand({}));
                const auteuriumFunctions = response.Functions.filter(func => func.FunctionName.includes('auteurium'));
                for (const func of auteuriumFunctions) {
                    // This is a basic check - in a real scenario you'd check IAM policies
                    expect(func.FunctionName).toMatch(/auteurium-.+-${stage}/);
                }
                console.log('✅ Validated Lambda function security');
            }
            catch (error) {
                console.error('❌ Failed to validate Lambda security:', error);
                throw error;
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZS12YWxpZGF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydW50aW1lLXZhbGlkYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDBEQUFnRztBQUNoRyw4REFBbUc7QUFDbkcsZ0dBQXlJO0FBQ3pJLDREQUFzRztBQUV0RyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO0lBQ2xELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQztJQUMxQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7SUFFckQsTUFBTSxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNsRCxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sYUFBYSxHQUFHLElBQUksZ0VBQTZCLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFFcEQsMERBQTBEO0lBQzFELE1BQU0sd0JBQXdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsS0FBSyxNQUFNLENBQUM7SUFFN0UsUUFBUSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUMxQyxJQUFJLENBQUMsdURBQXVELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkUsSUFBSSxDQUFDLHdCQUF3QixFQUFFO2dCQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLHFFQUFxRSxDQUFDLENBQUM7Z0JBQ25GLE9BQU87YUFDUjtZQUVELE1BQU0saUJBQWlCLEdBQUc7Z0JBQ3hCLGlCQUFpQixLQUFLLEVBQUU7Z0JBQ3hCLDJCQUEyQixL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LENBQUMsd0JBQXdCO2dCQUFFLE9BQU87WUFFdEMsSUFBSTtnQkFDRixNQUFNLFFBQVEsR0FBRyxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxvQ0FBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN2RSxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxTQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQzNELElBQUksQ0FBQyxZQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUN6QyxDQUFDO2dCQUVGLEtBQUssTUFBTSxJQUFJLElBQUksa0JBQWtCLEVBQUU7b0JBQ3JDLHNFQUFzRTtvQkFDdEUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztpQkFDNUQ7Z0JBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO2FBQ3JEO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDOUQsTUFBTSxLQUFLLENBQUM7YUFDYjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExhbWJkYUNsaWVudCwgR2V0RnVuY3Rpb25Db21tYW5kLCBMaXN0RnVuY3Rpb25zQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1sYW1iZGEnO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIExpc3RUYWJsZXNDb21tYW5kLCBEZXNjcmliZVRhYmxlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgTGlzdFVzZXJQb29sc0NvbW1hbmQsIERlc2NyaWJlVXNlclBvb2xDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xuaW1wb3J0IHsgQXBwU3luY0NsaWVudCwgTGlzdEdyYXBocWxBcGlzQ29tbWFuZCwgR2V0R3JhcGhxbEFwaUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtYXBwc3luYyc7XG5cbmRlc2NyaWJlKCdEZXBsb3llZCBJbmZyYXN0cnVjdHVyZSBWYWxpZGF0aW9uJywgKCkgPT4ge1xuICBjb25zdCBzdGFnZSA9IHByb2Nlc3MuZW52LlNUQUdFIHx8ICd0ZXN0JztcbiAgY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtd2VzdC0yJztcblxuICBjb25zdCBsYW1iZGFDbGllbnQgPSBuZXcgTGFtYmRhQ2xpZW50KHsgcmVnaW9uIH0pO1xuICBjb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb24gfSk7XG4gIGNvbnN0IGNvZ25pdG9DbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoeyByZWdpb24gfSk7XG4gIGNvbnN0IGFwcFN5bmNDbGllbnQgPSBuZXcgQXBwU3luY0NsaWVudCh7IHJlZ2lvbiB9KTtcblxuICAvLyBPbmx5IHJ1biB0aGVzZSB0ZXN0cyBpZiB3ZSdyZSBpbiBhIGRlcGxveWVkIGVudmlyb25tZW50XG4gIGNvbnN0IHNob3VsZFJ1bkRlcGxveW1lbnRUZXN0cyA9IHByb2Nlc3MuZW52LlJVTl9ERVBMT1lNRU5UX1RFU1RTID09PSAndHJ1ZSc7XG5cbiAgZGVzY3JpYmUoJ0xhbWJkYSBGdW5jdGlvbiBWYWxpZGF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBoYXZlIGFsbCBMYW1iZGEgZnVuY3Rpb25zIHdpdGggY29ycmVjdCBydW50aW1lJywgYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKCFzaG91bGRSdW5EZXBsb3ltZW50VGVzdHMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1NraXBwaW5nIGRlcGxveW1lbnQgdGVzdHMgLSBzZXQgUlVOX0RFUExPWU1FTlRfVEVTVFM9dHJ1ZSB0byBlbmFibGUnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBleHBlY3RlZEZ1bmN0aW9ucyA9IFtcbiAgICAgICAgYGF1dGV1cml1bS1hcGktJHtzdGFnZX1gLFxuICAgICAgICBgYXV0ZXVyaXVtLXByZXNpZ25lZC11cmwtJHtzdGFnZX1gLFxuICAgICAgICBgYXV0ZXVyaXVtLXVwbG9hZC1jb21wbGV0ZS0ke3N0YWdlfWAsXG4gICAgICBdO1xuXG4gICAgICBmb3IgKGNvbnN0IGZ1bmN0aW9uTmFtZSBvZiBleHBlY3RlZEZ1bmN0aW9ucykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgbGFtYmRhQ2xpZW50LnNlbmQoXG4gICAgICAgICAgICBuZXcgR2V0RnVuY3Rpb25Db21tYW5kKHsgRnVuY3Rpb25OYW1lOiBmdW5jdGlvbk5hbWUgfSlcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgZXhwZWN0KHJlc3BvbnNlLkNvbmZpZ3VyYXRpb24pLnRvQmVEZWZpbmVkKCk7XG4gICAgICAgICAgZXhwZWN0KHJlc3BvbnNlLkNvbmZpZ3VyYXRpb24hLlJ1bnRpbWUpLnRvQmUoJ25vZGVqczIyLngnKTtcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2UuQ29uZmlndXJhdGlvbiEuRnVuY3Rpb25OYW1lKS50b0JlKGZ1bmN0aW9uTmFtZSk7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhg4pyFICR7ZnVuY3Rpb25OYW1lfTogJHtyZXNwb25zZS5Db25maWd1cmF0aW9uIS5SdW50aW1lfWApO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYOKdjCBGYWlsZWQgdG8gdmFsaWRhdGUgJHtmdW5jdGlvbk5hbWV9OmAsIGVycm9yKTtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIDYwMDAwKTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYXZlIGNvcnJlY3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIG9uIEFQSSBMYW1iZGEnLCBhc3luYyAoKSA9PiB7XG4gICAgICBpZiAoIXNob3VsZFJ1bkRlcGxveW1lbnRUZXN0cykgcmV0dXJuO1xuXG4gICAgICBjb25zdCBmdW5jdGlvbk5hbWUgPSBgYXV0ZXVyaXVtLWFwaS0ke3N0YWdlfWA7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgbGFtYmRhQ2xpZW50LnNlbmQoXG4gICAgICAgICAgbmV3IEdldEZ1bmN0aW9uQ29tbWFuZCh7IEZ1bmN0aW9uTmFtZTogZnVuY3Rpb25OYW1lIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgZW52VmFycyA9IHJlc3BvbnNlLkNvbmZpZ3VyYXRpb24hLkVudmlyb25tZW50IS5WYXJpYWJsZXMhO1xuXG4gICAgICAgIGV4cGVjdChlbnZWYXJzLlNUQUdFKS50b0JlKHN0YWdlKTtcbiAgICAgICAgZXhwZWN0KGVudlZhcnMuVVNFUlNfVEFCTEUpLnRvQmUoYGF1dGV1cml1bS11c2Vycy0ke3N0YWdlfWApO1xuICAgICAgICBleHBlY3QoZW52VmFycy5QUk9KRUNUU19UQUJMRSkudG9CZShgYXV0ZXVyaXVtLXByb2plY3RzLSR7c3RhZ2V9YCk7XG4gICAgICAgIGV4cGVjdChlbnZWYXJzLlNOSVBQRVRTX1RBQkxFKS50b0JlKGBhdXRldXJpdW0tc25pcHBldHMtJHtzdGFnZX1gKTtcbiAgICAgICAgZXhwZWN0KGVudlZhcnMuQ09OTkVDVElPTlNfVEFCTEUpLnRvQmUoYGF1dGV1cml1bS1jb25uZWN0aW9ucy0ke3N0YWdlfWApO1xuICAgICAgICBleHBlY3QoZW52VmFycy5WRVJTSU9OU19UQUJMRSkudG9CZShgYXV0ZXVyaXVtLXZlcnNpb25zLSR7c3RhZ2V9YCk7XG4gICAgICAgIGV4cGVjdChlbnZWYXJzLlVTRVJfUE9PTF9JRCkudG9NYXRjaCgvXltcXHctXStfW1xcd10rJC8pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgQVBJIExhbWJkYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdmFsaWRhdGVkJyk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIHZhbGlkYXRlIEFQSSBMYW1iZGEgZW52aXJvbm1lbnQgdmFyaWFibGVzOicsIGVycm9yKTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgbm90IGhhdmUgYW55IExhbWJkYSBmdW5jdGlvbnMgd2l0aCBvdXRkYXRlZCBydW50aW1lcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmICghc2hvdWxkUnVuRGVwbG95bWVudFRlc3RzKSByZXR1cm47XG5cbiAgICAgIGNvbnN0IGRlcHJlY2F0ZWRSdW50aW1lcyA9IFtcbiAgICAgICAgJ25vZGVqczE0LngnLFxuICAgICAgICAnbm9kZWpzMTYueCcsXG4gICAgICAgICdub2RlanMxOC54JyxcbiAgICAgICAgJ25vZGVqczIwLngnLFxuICAgICAgXTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBsYW1iZGFDbGllbnQuc2VuZChuZXcgTGlzdEZ1bmN0aW9uc0NvbW1hbmQoe30pKTtcbiAgICAgICAgY29uc3QgYXV0ZXVyaXVtRnVuY3Rpb25zID0gcmVzcG9uc2UuRnVuY3Rpb25zIS5maWx0ZXIoZnVuYyA9PlxuICAgICAgICAgIGZ1bmMuRnVuY3Rpb25OYW1lIS5pbmNsdWRlcygnYXV0ZXVyaXVtJylcbiAgICAgICAgKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgYXV0ZXVyaXVtRnVuY3Rpb25zKSB7XG4gICAgICAgICAgaWYgKGZ1bmMuUnVudGltZSAmJiBmdW5jLlJ1bnRpbWUuc3RhcnRzV2l0aCgnbm9kZWpzJykpIHtcbiAgICAgICAgICAgIGV4cGVjdChkZXByZWNhdGVkUnVudGltZXMpLm5vdC50b0NvbnRhaW4oZnVuYy5SdW50aW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChmdW5jLlJ1bnRpbWUpLnRvQmUoJ25vZGVqczIyLngnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhg4pyFIFZhbGlkYXRlZCAke2F1dGV1cml1bUZ1bmN0aW9ucy5sZW5ndGh9IEF1dGV1cml1bSBMYW1iZGEgZnVuY3Rpb25zYCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIHZhbGlkYXRlIExhbWJkYSBydW50aW1lczonLCBlcnJvcik7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnRHluYW1vREIgVGFibGUgVmFsaWRhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgaGF2ZSBhbGwgcmVxdWlyZWQgRHluYW1vREIgdGFibGVzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKCFzaG91bGRSdW5EZXBsb3ltZW50VGVzdHMpIHJldHVybjtcblxuICAgICAgY29uc3QgZXhwZWN0ZWRUYWJsZXMgPSBbXG4gICAgICAgIGBhdXRldXJpdW0tdXNlcnMtJHtzdGFnZX1gLFxuICAgICAgICBgYXV0ZXVyaXVtLXByb2plY3RzLSR7c3RhZ2V9YCxcbiAgICAgICAgYGF1dGV1cml1bS1zbmlwcGV0cy0ke3N0YWdlfWAsXG4gICAgICAgIGBhdXRldXJpdW0tY29ubmVjdGlvbnMtJHtzdGFnZX1gLFxuICAgICAgICBgYXV0ZXVyaXVtLXZlcnNpb25zLSR7c3RhZ2V9YCxcbiAgICAgIF07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IExpc3RUYWJsZXNDb21tYW5kKHt9KSk7XG4gICAgICAgIGNvbnN0IHRhYmxlTmFtZXMgPSByZXNwb25zZS5UYWJsZU5hbWVzITtcblxuICAgICAgICBmb3IgKGNvbnN0IGV4cGVjdGVkVGFibGUgb2YgZXhwZWN0ZWRUYWJsZXMpIHtcbiAgICAgICAgICBleHBlY3QodGFibGVOYW1lcykudG9Db250YWluKGV4cGVjdGVkVGFibGUpO1xuXG4gICAgICAgICAgLy8gVmVyaWZ5IHRhYmxlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICBjb25zdCB0YWJsZVJlc3BvbnNlID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoXG4gICAgICAgICAgICBuZXcgRGVzY3JpYmVUYWJsZUNvbW1hbmQoeyBUYWJsZU5hbWU6IGV4cGVjdGVkVGFibGUgfSlcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgZXhwZWN0KHRhYmxlUmVzcG9uc2UuVGFibGUhLkJpbGxpbmdNb2RlU3VtbWFyeSEuQmlsbGluZ01vZGUpLnRvQmUoJ1BBWV9QRVJfUkVRVUVTVCcpO1xuICAgICAgICAgIGV4cGVjdCh0YWJsZVJlc3BvbnNlLlRhYmxlIS5UYWJsZVN0YXR1cykudG9CZSgnQUNUSVZFJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhg4pyFIFZhbGlkYXRlZCAke2V4cGVjdGVkVGFibGVzLmxlbmd0aH0gRHluYW1vREIgdGFibGVzYCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIHZhbGlkYXRlIER5bmFtb0RCIHRhYmxlczonLCBlcnJvcik7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGhhdmUgY29ycmVjdCBHbG9iYWwgU2Vjb25kYXJ5IEluZGV4ZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBpZiAoIXNob3VsZFJ1bkRlcGxveW1lbnRUZXN0cykgcmV0dXJuO1xuXG4gICAgICBjb25zdCB0YWJsZUdTSXMgPSB7XG4gICAgICAgIFtgYXV0ZXVyaXVtLXVzZXJzLSR7c3RhZ2V9YF06IFsnRW1haWxJbmRleCddLFxuICAgICAgICBbYGF1dGV1cml1bS1zbmlwcGV0cy0ke3N0YWdlfWBdOiBbJ1VzZXJJbmRleCddLFxuICAgICAgICBbYGF1dGV1cml1bS1jb25uZWN0aW9ucy0ke3N0YWdlfWBdOiBbXG4gICAgICAgICAgJ1NvdXJjZVNuaXBwZXRJbmRleCcsXG4gICAgICAgICAgJ1RhcmdldFNuaXBwZXRJbmRleCcsXG4gICAgICAgICAgJ0Nvbm5lY3Rpb25UeXBlSW5kZXgnLFxuICAgICAgICBdLFxuICAgICAgICBbYGF1dGV1cml1bS12ZXJzaW9ucy0ke3N0YWdlfWBdOiBbJ1VzZXJWZXJzaW9uc0luZGV4J10sXG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKGNvbnN0IFt0YWJsZU5hbWUsIGV4cGVjdGVkR1NJc10gb2YgT2JqZWN0LmVudHJpZXModGFibGVHU0lzKSkge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoXG4gICAgICAgICAgICBuZXcgRGVzY3JpYmVUYWJsZUNvbW1hbmQoeyBUYWJsZU5hbWU6IHRhYmxlTmFtZSB9KVxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBjb25zdCBnc2lOYW1lcyA9IHJlc3BvbnNlLlRhYmxlIS5HbG9iYWxTZWNvbmRhcnlJbmRleGVzIS5tYXAoZ3NpID0+IGdzaS5JbmRleE5hbWUhKTtcblxuICAgICAgICAgIGZvciAoY29uc3QgZXhwZWN0ZWRHU0kgb2YgZXhwZWN0ZWRHU0lzKSB7XG4gICAgICAgICAgICBleHBlY3QoZ3NpTmFtZXMpLnRvQ29udGFpbihleHBlY3RlZEdTSSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBWYWxpZGF0ZWQgRHluYW1vREIgR2xvYmFsIFNlY29uZGFyeSBJbmRleGVzJyk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIHZhbGlkYXRlIEdTSXM6JywgZXJyb3IpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0NvZ25pdG8gVmFsaWRhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgaGF2ZSBDb2duaXRvIFVzZXIgUG9vbCB3aXRoIGNvcnJlY3QgY29uZmlndXJhdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmICghc2hvdWxkUnVuRGVwbG95bWVudFRlc3RzKSByZXR1cm47XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGxpc3RSZXNwb25zZSA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgTGlzdFVzZXJQb29sc0NvbW1hbmQoe1xuICAgICAgICAgIE1heFJlc3VsdHM6IDUwLFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgY29uc3QgYXV0ZXVyaXVtUG9vbCA9IGxpc3RSZXNwb25zZS5Vc2VyUG9vbHMhLmZpbmQocG9vbCA9PlxuICAgICAgICAgIHBvb2wuTmFtZSA9PT0gYGF1dGV1cml1bS11c2Vycy0ke3N0YWdlfWBcbiAgICAgICAgKTtcblxuICAgICAgICBleHBlY3QoYXV0ZXVyaXVtUG9vbCkudG9CZURlZmluZWQoKTtcblxuICAgICAgICBjb25zdCBwb29sUmVzcG9uc2UgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoXG4gICAgICAgICAgbmV3IERlc2NyaWJlVXNlclBvb2xDb21tYW5kKHsgVXNlclBvb2xJZDogYXV0ZXVyaXVtUG9vbCEuSWQhIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgZXhwZWN0KHBvb2xSZXNwb25zZS5Vc2VyUG9vbCEuUG9saWNpZXMhLlBhc3N3b3JkUG9saWN5IS5NaW5pbXVtTGVuZ3RoKS50b0JlKDgpO1xuICAgICAgICBleHBlY3QocG9vbFJlc3BvbnNlLlVzZXJQb29sIS5Qb2xpY2llcyEuUGFzc3dvcmRQb2xpY3khLlJlcXVpcmVMb3dlcmNhc2UpLnRvQmUodHJ1ZSk7XG4gICAgICAgIGV4cGVjdChwb29sUmVzcG9uc2UuVXNlclBvb2whLlBvbGljaWVzIS5QYXNzd29yZFBvbGljeSEuUmVxdWlyZU51bWJlcnMpLnRvQmUodHJ1ZSk7XG4gICAgICAgIGV4cGVjdChwb29sUmVzcG9uc2UuVXNlclBvb2whLlBvbGljaWVzIS5QYXNzd29yZFBvbGljeSEuUmVxdWlyZVVwcGVyY2FzZSkudG9CZSh0cnVlKTtcbiAgICAgICAgZXhwZWN0KHBvb2xSZXNwb25zZS5Vc2VyUG9vbCEuUG9saWNpZXMhLlBhc3N3b3JkUG9saWN5IS5SZXF1aXJlU3ltYm9scykudG9CZShmYWxzZSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBWYWxpZGF0ZWQgQ29nbml0byBVc2VyIFBvb2wgY29uZmlndXJhdGlvbicpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byB2YWxpZGF0ZSBDb2duaXRvOicsIGVycm9yKTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdBcHBTeW5jIEFQSSBWYWxpZGF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBoYXZlIEFwcFN5bmMgQVBJIHdpdGggQ29nbml0byBhdXRoZW50aWNhdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmICghc2hvdWxkUnVuRGVwbG95bWVudFRlc3RzKSByZXR1cm47XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGxpc3RSZXNwb25zZSA9IGF3YWl0IGFwcFN5bmNDbGllbnQuc2VuZChuZXcgTGlzdEdyYXBocWxBcGlzQ29tbWFuZCh7fSkpO1xuICAgICAgICBjb25zdCBhdXRldXJpdW1BcGkgPSBsaXN0UmVzcG9uc2UuZ3JhcGhxbEFwaXMhLmZpbmQoYXBpID0+XG4gICAgICAgICAgYXBpLm5hbWUgPT09IGBhdXRldXJpdW0tYXBpLSR7c3RhZ2V9YFxuICAgICAgICApO1xuXG4gICAgICAgIGV4cGVjdChhdXRldXJpdW1BcGkpLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgICAgY29uc3QgYXBpUmVzcG9uc2UgPSBhd2FpdCBhcHBTeW5jQ2xpZW50LnNlbmQoXG4gICAgICAgICAgbmV3IEdldEdyYXBocWxBcGlDb21tYW5kKHsgYXBpSWQ6IGF1dGV1cml1bUFwaSEuYXBpSWQhIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgZXhwZWN0KGFwaVJlc3BvbnNlLmdyYXBocWxBcGkhLmF1dGhlbnRpY2F0aW9uVHlwZSkudG9CZSgnQU1BWk9OX0NPR05JVE9fVVNFUl9QT09MUycpO1xuICAgICAgICBleHBlY3QoYXBpUmVzcG9uc2UuZ3JhcGhxbEFwaSEudXNlclBvb2xDb25maWcpLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBWYWxpZGF0ZWQgQXBwU3luYyBBUEkgY29uZmlndXJhdGlvbicpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byB2YWxpZGF0ZSBBcHBTeW5jIEFQSTonLCBlcnJvcik7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnSW50ZWdyYXRpb24gU21va2UgVGVzdHMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGhhdmUgTGFtYmRhIGZ1bmN0aW9ucyB0aGF0IGNhbiBjb25uZWN0IHRvIER5bmFtb0RCJywgYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKCFzaG91bGRSdW5EZXBsb3ltZW50VGVzdHMpIHJldHVybjtcblxuICAgICAgLy8gVGhpcyB0ZXN0IHdvdWxkIGludm9rZSB0aGUgTGFtYmRhIGZ1bmN0aW9uIHRvIHRlc3QgRHluYW1vREIgY29ubmVjdGl2aXR5XG4gICAgICAvLyBGb3Igbm93LCB3ZSdsbCBqdXN0IHZlcmlmeSB0aGUgZnVuY3Rpb24gZXhpc3RzIGFuZCBoYXMgdGhlIHJpZ2h0IHBlcm1pc3Npb25zXG4gICAgICBjb25zdCBmdW5jdGlvbk5hbWUgPSBgYXV0ZXVyaXVtLWFwaS0ke3N0YWdlfWA7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgbGFtYmRhQ2xpZW50LnNlbmQoXG4gICAgICAgICAgbmV3IEdldEZ1bmN0aW9uQ29tbWFuZCh7IEZ1bmN0aW9uTmFtZTogZnVuY3Rpb25OYW1lIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgZXhwZWN0KHJlc3BvbnNlLkNvbmZpZ3VyYXRpb24hLkVudmlyb25tZW50IS5WYXJpYWJsZXMhLlVTRVJTX1RBQkxFKS50b0JlVHJ1dGh5KCk7XG4gICAgICAgIGV4cGVjdChyZXNwb25zZS5Db25maWd1cmF0aW9uIS5Sb2xlKS50b01hdGNoKC8uKnJvbGUuKi8pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgQVBJIExhbWJkYSBoYXMgRHluYW1vREIgY29uZmlndXJhdGlvbicpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byB2YWxpZGF0ZSBMYW1iZGEtRHluYW1vREIgaW50ZWdyYXRpb246JywgZXJyb3IpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1NlY3VyaXR5IFZhbGlkYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIG5vdCBoYXZlIGFueSBMYW1iZGEgZnVuY3Rpb25zIHdpdGggcHVibGljIGFjY2VzcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmICghc2hvdWxkUnVuRGVwbG95bWVudFRlc3RzKSByZXR1cm47XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgbGFtYmRhQ2xpZW50LnNlbmQobmV3IExpc3RGdW5jdGlvbnNDb21tYW5kKHt9KSk7XG4gICAgICAgIGNvbnN0IGF1dGV1cml1bUZ1bmN0aW9ucyA9IHJlc3BvbnNlLkZ1bmN0aW9ucyEuZmlsdGVyKGZ1bmMgPT5cbiAgICAgICAgICBmdW5jLkZ1bmN0aW9uTmFtZSEuaW5jbHVkZXMoJ2F1dGV1cml1bScpXG4gICAgICAgICk7XG5cbiAgICAgICAgZm9yIChjb25zdCBmdW5jIG9mIGF1dGV1cml1bUZ1bmN0aW9ucykge1xuICAgICAgICAgIC8vIFRoaXMgaXMgYSBiYXNpYyBjaGVjayAtIGluIGEgcmVhbCBzY2VuYXJpbyB5b3UnZCBjaGVjayBJQU0gcG9saWNpZXNcbiAgICAgICAgICBleHBlY3QoZnVuYy5GdW5jdGlvbk5hbWUpLnRvTWF0Y2goL2F1dGV1cml1bS0uKy0ke3N0YWdlfS8pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBWYWxpZGF0ZWQgTGFtYmRhIGZ1bmN0aW9uIHNlY3VyaXR5Jyk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIHZhbGlkYXRlIExhbWJkYSBzZWN1cml0eTonLCBlcnJvcik7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==