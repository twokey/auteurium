"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");

const auteurium_app_1 = require("../../../lib/auteurium-app");

describe('Complete Infrastructure Integration', () => {
    let app;
    beforeEach(() => {
        // Set environment variables for testing
        process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
        process.env.CDK_DEFAULT_REGION = 'us-east-1';
        process.env.STAGE = 'test';
        app = new auteurium_app_1.AuteuriumApp();
    });
    afterEach(() => {
        // Clean up environment variables
        delete process.env.CDK_DEFAULT_ACCOUNT;
        delete process.env.CDK_DEFAULT_REGION;
        delete process.env.STAGE;
    });
    describe('Stack Creation and Dependencies', () => {
        test('should create all 5 required stacks', () => {
            const stacks = app.node.children.filter((child) => child instanceof cdk.Stack);
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
            const apiStackDeps = apiStack.dependencies;
            expect(apiStackDeps).toContain(authStack);
            expect(apiStackDeps).toContain(databaseStack);
        });
    });
    describe('Cross-Stack Resource References', () => {
        test('should properly share Cognito resources between Auth and API stacks', () => {
            const authStack = app.node.findChild('Auteurium-Auth-test');
            const apiStack = app.node.findChild('Auteurium-Api-test');
            const authTemplate = assertions_1.Template.fromStack(authStack);
            const apiTemplate = assertions_1.Template.fromStack(apiStack);
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
            const databaseStack = app.node.findChild('Auteurium-Database-test');
            const apiStack = app.node.findChild('Auteurium-Api-test');
            const databaseTemplate = assertions_1.Template.fromStack(databaseStack);
            const apiTemplate = assertions_1.Template.fromStack(apiStack);
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
            const stacks = app.node.children.filter((child) => child instanceof cdk.Stack);
            stacks.forEach((stack) => {
                expect(stack.node.id).toMatch(/^Auteurium-\w+-test$/);
            });
        });
        test('should use consistent resource naming within stacks', () => {
            const databaseStack = app.node.findChild('Auteurium-Database-test');
            const apiStack = app.node.findChild('Auteurium-Api-test');
            const databaseTemplate = assertions_1.Template.fromStack(databaseStack);
            const apiTemplate = assertions_1.Template.fromStack(apiStack);
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
            const prodApp = new auteurium_app_1.AuteuriumApp();
            const prodStacks = prodApp.node.children.filter((child) => child instanceof cdk.Stack);
            const prodStackNames = prodStacks.map((stack) => stack.node.id);
            expect(prodStackNames).toContain('Auteurium-Auth-prod');
            expect(prodStackNames).toContain('Auteurium-Database-prod');
            expect(prodStackNames).toContain('Auteurium-Api-prod');
            expect(prodStackNames).toContain('Auteurium-Media-prod');
            expect(prodStackNames).toContain('Auteurium-Web-prod');
        });
        test('should default to dev stage when not specified', () => {
            delete process.env.STAGE;
            const defaultApp = new auteurium_app_1.AuteuriumApp();
            const defaultStacks = defaultApp.node.children.filter((child) => child instanceof cdk.Stack);
            const defaultStackNames = defaultStacks.map((stack) => stack.node.id);
            expect(defaultStackNames).toContain('Auteurium-Auth-dev');
            expect(defaultStackNames).toContain('Auteurium-Database-dev');
        });
    });
    describe('Security and Access Control', () => {
        test('should configure proper IAM permissions between stacks', () => {
            const apiStack = app.node.findChild('Auteurium-Api-test');
            const apiTemplate = assertions_1.Template.fromStack(apiStack);
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
            const stacks = app.node.children.filter((child) => child instanceof cdk.Stack);
            stacks.forEach((stack) => {
                const template = assertions_1.Template.fromStack(stack);
                const lambdaFunctions = template.findResources('AWS::Lambda::Function');
                Object.values(lambdaFunctions).forEach((func) => {
                    if (func.Properties.Runtime && func.Properties.Runtime.startsWith('nodejs')) {
                        expect(func.Properties.Runtime).toBe('nodejs22.x');
                    }
                });
            });
        });
        test('should use consistent billing mode across DynamoDB tables', () => {
            const databaseStack = app.node.findChild('Auteurium-Database-test');
            const databaseTemplate = assertions_1.Template.fromStack(databaseStack);
            const tables = databaseTemplate.findResources('AWS::DynamoDB::Table');
            Object.values(tables).forEach((table) => {
                expect(table.Properties.BillingMode).toBe('PAY_PER_REQUEST');
            });
        });
    });
    describe('Output and Export Validation', () => {
        test('should export necessary values for cross-stack communication', () => {
            const authStack = app.node.findChild('Auteurium-Auth-test');
            const databaseStack = app.node.findChild('Auteurium-Database-test');
            const apiStack = app.node.findChild('Auteurium-Api-test');
            const authTemplate = assertions_1.Template.fromStack(authStack);
            const databaseTemplate = assertions_1.Template.fromStack(databaseStack);
            const apiTemplate = assertions_1.Template.fromStack(apiStack);
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
            const stacks = app.node.children.filter((child) => child instanceof cdk.Stack);
            const monitoringStack = stacks.find((stack) => stack.node.id.includes('Monitoring'));
            expect(monitoringStack).toBeUndefined();
        });
        test('should be ready for monitoring stack integration', () => {
            // Verify that API and Web stacks expose necessary properties for monitoring
            const apiStack = app.node.findChild('Auteurium-Api-test');
            const webStack = app.node.findChild('Auteurium-Web-test');
            expect(apiStack).toBeDefined();
            expect(webStack).toBeDefined();
            // These stacks should be available for monitoring stack to reference
            const apiTemplate = assertions_1.Template.fromStack(apiStack);
            const webTemplate = assertions_1.Template.fromStack(webStack);
            // API stack should have GraphQL API that can be monitored
            apiTemplate.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
            // Web stack should have CloudFront distribution that can be monitored
            webTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGUtaW5mcmFzdHJ1Y3R1cmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbXBsZXRlLWluZnJhc3RydWN0dXJlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBa0Q7QUFDbEQsOERBQTBEO0FBRTFELFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDbkQsSUFBSSxHQUFpQixDQUFDO0lBRXRCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCx3Q0FBd0M7UUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxjQUFjLENBQUM7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxXQUFXLENBQUM7UUFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO1FBRTNCLEdBQUcsR0FBRyxJQUFJLDRCQUFZLEVBQUUsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDYixpQ0FBaUM7UUFDakMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDO1FBQ3ZDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztRQUN0QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQy9DLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FDckMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssWUFBWSxHQUFHLENBQUMsS0FBSyxDQUN0QyxDQUFDO1lBRUYsTUFBTSxDQUFDLE1B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Q0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBUZW1wbGF0ZSB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xuaW1wb3J0IHsgQXV0ZXVyaXVtQXBwIH0gZnJvbSAnLi4vLi4vLi4vbGliL2F1dGV1cml1bS1hcHAnO1xuXG5kZXNjcmliZSgnQ29tcGxldGUgSW5mcmFzdHJ1Y3R1cmUgSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gIGxldCBhcHA6IEF1dGV1cml1bUFwcDtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAvLyBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0ZXN0aW5nXG4gICAgcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCA9ICcxMjM0NTY3ODkwMTInO1xuICAgIHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiA9ICd1cy1lYXN0LTEnO1xuICAgIHByb2Nlc3MuZW52LlNUQUdFID0gJ3Rlc3QnO1xuXG4gICAgYXBwID0gbmV3IEF1dGV1cml1bUFwcCgpO1xuICB9KTtcblxuICBhZnRlckVhY2goKCkgPT4ge1xuICAgIC8vIENsZWFuIHVwIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICAgIGRlbGV0ZSBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5UO1xuICAgIGRlbGV0ZSBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT047XG4gICAgZGVsZXRlIHByb2Nlc3MuZW52LlNUQUdFO1xuICB9KTtcblxuICBkZXNjcmliZSgnU3RhY2sgQ3JlYXRpb24gYW5kIERlcGVuZGVuY2llcycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIGFsbCA1IHJlcXVpcmVkIHN0YWNrcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHN0YWNrcyA9IGFwcC5ub2RlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAgICAgKGNoaWxkKSA9PiBjaGlsZCBpbnN0YW5jZW9mIGNkay5TdGFja1xuICAgICAgKTtcblxuICAgICAgZXhwZWN0KHN0YWNrcykudG9IYXZlTGVuZ3RoKDUpO1xuXG4gICAgICBjb25zdCBzdGFja05hbWVzID0gc3RhY2tzLm1hcCgoc3RhY2spID0+IHN0YWNrLm5vZGUuaWQpO1xuICAgICAgZXhwZWN0KHN0YWNrTmFtZXMpLnRvQ29udGFpbignQXV0ZXVyaXVtLUF1dGgtdGVzdCcpO1xuICAgICAgZXhwZWN0KHN0YWNrTmFtZXMpLnRvQ29udGFpbignQXV0ZXVyaXVtLURhdGFiYXNlLXRlc3QnKTtcbiAgICAgIGV4cGVjdChzdGFja05hbWVzKS50b0NvbnRhaW4oJ0F1dGV1cml1bS1BcGktdGVzdCcpO1xuICAgICAgZXhwZWN0KHN0YWNrTmFtZXMpLnRvQ29udGFpbignQXV0ZXVyaXVtLU1lZGlhLXRlc3QnKTtcbiAgICAgIGV4cGVjdChzdGFja05hbWVzKS50b0NvbnRhaW4oJ0F1dGV1cml1bS1XZWItdGVzdCcpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGVzdGFibGlzaCBjb3JyZWN0IHN0YWNrIGRlcGVuZGVuY2llcycsICgpID0+IHtcbiAgICAgIGNvbnN0IGF1dGhTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLUF1dGgtdGVzdCcpO1xuICAgICAgY29uc3QgZGF0YWJhc2VTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLURhdGFiYXNlLXRlc3QnKTtcbiAgICAgIGNvbnN0IGFwaVN0YWNrID0gYXBwLm5vZGUuZmluZENoaWxkKCdBdXRldXJpdW0tQXBpLXRlc3QnKTtcbiAgICAgIGNvbnN0IG1lZGlhU3RhY2sgPSBhcHAubm9kZS5maW5kQ2hpbGQoJ0F1dGV1cml1bS1NZWRpYS10ZXN0Jyk7XG4gICAgICBjb25zdCB3ZWJTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLVdlYi10ZXN0Jyk7XG5cbiAgICAgIGV4cGVjdChhdXRoU3RhY2spLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoZGF0YWJhc2VTdGFjaykudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChhcGlTdGFjaykudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChtZWRpYVN0YWNrKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHdlYlN0YWNrKS50b0JlRGVmaW5lZCgpO1xuXG4gICAgICAvLyBBUEkgc3RhY2sgc2hvdWxkIGRlcGVuZCBvbiBBdXRoIGFuZCBEYXRhYmFzZSBzdGFja3NcbiAgICAgIGNvbnN0IGFwaVN0YWNrRGVwcyA9IChhcGlTdGFjayBhcyBjZGsuU3RhY2spLmRlcGVuZGVuY2llcztcbiAgICAgIGV4cGVjdChhcGlTdGFja0RlcHMpLnRvQ29udGFpbihhdXRoU3RhY2spO1xuICAgICAgZXhwZWN0KGFwaVN0YWNrRGVwcykudG9Db250YWluKGRhdGFiYXNlU3RhY2spO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQ3Jvc3MtU3RhY2sgUmVzb3VyY2UgUmVmZXJlbmNlcycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgcHJvcGVybHkgc2hhcmUgQ29nbml0byByZXNvdXJjZXMgYmV0d2VlbiBBdXRoIGFuZCBBUEkgc3RhY2tzJywgKCkgPT4ge1xuICAgICAgY29uc3QgYXV0aFN0YWNrID0gYXBwLm5vZGUuZmluZENoaWxkKCdBdXRldXJpdW0tQXV0aC10ZXN0JykgYXMgY2RrLlN0YWNrO1xuICAgICAgY29uc3QgYXBpU3RhY2sgPSBhcHAubm9kZS5maW5kQ2hpbGQoJ0F1dGV1cml1bS1BcGktdGVzdCcpIGFzIGNkay5TdGFjaztcblxuICAgICAgY29uc3QgYXV0aFRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKGF1dGhTdGFjayk7XG4gICAgICBjb25zdCBhcGlUZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhhcGlTdGFjayk7XG5cbiAgICAgIC8vIEF1dGggc3RhY2sgc2hvdWxkIGV4cG9ydCB1c2VyIHBvb2wgaW5mb3JtYXRpb25cbiAgICAgIGF1dGhUZW1wbGF0ZS5oYXNPdXRwdXQoJ1VzZXJQb29sSWQnLCB7XG4gICAgICAgIEV4cG9ydDoge1xuICAgICAgICAgIE5hbWU6ICdBdXRldXJpdW0tVXNlclBvb2xJZC10ZXN0JyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBhdXRoVGVtcGxhdGUuaGFzT3V0cHV0KCdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgICBFeHBvcnQ6IHtcbiAgICAgICAgICBOYW1lOiAnQXV0ZXVyaXVtLVVzZXJQb29sQ2xpZW50SWQtdGVzdCcsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gQVBJIHN0YWNrIHNob3VsZCByZWZlcmVuY2UgdGhlIHVzZXIgcG9vbFxuICAgICAgYXBpVGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwcFN5bmM6OkdyYXBoUUxBcGknLCB7XG4gICAgICAgIEF1dGhlbnRpY2F0aW9uVHlwZTogJ0FNQVpPTl9DT0dOSVRPX1VTRVJfUE9PTFMnLFxuICAgICAgICBVc2VyUG9vbENvbmZpZzoge1xuICAgICAgICAgIFVzZXJQb29sSWQ6IGV4cGVjdC5hbnkoT2JqZWN0KSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHJlZmVyZW5jZSBEeW5hbW9EQiB0YWJsZXMgY29uc2lzdGVudGx5IGFjcm9zcyBzdGFja3MnLCAoKSA9PiB7XG4gICAgICBjb25zdCBkYXRhYmFzZVN0YWNrID0gYXBwLm5vZGUuZmluZENoaWxkKCdBdXRldXJpdW0tRGF0YWJhc2UtdGVzdCcpIGFzIGNkay5TdGFjaztcbiAgICAgIGNvbnN0IGFwaVN0YWNrID0gYXBwLm5vZGUuZmluZENoaWxkKCdBdXRldXJpdW0tQXBpLXRlc3QnKSBhcyBjZGsuU3RhY2s7XG5cbiAgICAgIGNvbnN0IGRhdGFiYXNlVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soZGF0YWJhc2VTdGFjayk7XG4gICAgICBjb25zdCBhcGlUZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhhcGlTdGFjayk7XG5cbiAgICAgIGNvbnN0IHRhYmxlTmFtZXMgPSBbXG4gICAgICAgICdhdXRldXJpdW0tdXNlcnMtdGVzdCcsXG4gICAgICAgICdhdXRldXJpdW0tcHJvamVjdHMtdGVzdCcsXG4gICAgICAgICdhdXRldXJpdW0tc25pcHBldHMtdGVzdCcsXG4gICAgICAgICdhdXRldXJpdW0tY29ubmVjdGlvbnMtdGVzdCcsXG4gICAgICAgICdhdXRldXJpdW0tdmVyc2lvbnMtdGVzdCcsXG4gICAgICBdO1xuXG4gICAgICAvLyBEYXRhYmFzZSBzdGFjayBzaG91bGQgY3JlYXRlIHRoZSB0YWJsZXNcbiAgICAgIHRhYmxlTmFtZXMuZm9yRWFjaCgodGFibGVOYW1lKSA9PiB7XG4gICAgICAgIGRhdGFiYXNlVGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gQVBJIHN0YWNrIHNob3VsZCByZWZlcmVuY2UgdGhlc2UgdGFibGVzIGluIExhbWJkYSBlbnZpcm9ubWVudFxuICAgICAgYXBpVGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICAgIEVudmlyb25tZW50OiB7XG4gICAgICAgICAgVmFyaWFibGVzOiB7XG4gICAgICAgICAgICBVU0VSU19UQUJMRTogJ2F1dGV1cml1bS11c2Vycy10ZXN0JyxcbiAgICAgICAgICAgIFBST0pFQ1RTX1RBQkxFOiAnYXV0ZXVyaXVtLXByb2plY3RzLXRlc3QnLFxuICAgICAgICAgICAgU05JUFBFVFNfVEFCTEU6ICdhdXRldXJpdW0tc25pcHBldHMtdGVzdCcsXG4gICAgICAgICAgICBDT05ORUNUSU9OU19UQUJMRTogJ2F1dGV1cml1bS1jb25uZWN0aW9ucy10ZXN0JyxcbiAgICAgICAgICAgIFZFUlNJT05TX1RBQkxFOiAnYXV0ZXVyaXVtLXZlcnNpb25zLXRlc3QnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ05hbWluZyBDb252ZW50aW9uIENvbnNpc3RlbmN5JywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCB1c2UgY29uc2lzdGVudCBuYW1pbmcgcGF0dGVybiBhY3Jvc3MgYWxsIHN0YWNrcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHN0YWNrcyA9IGFwcC5ub2RlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAgICAgKGNoaWxkKSA9PiBjaGlsZCBpbnN0YW5jZW9mIGNkay5TdGFja1xuICAgICAgKSBhcyBjZGsuU3RhY2tbXTtcblxuICAgICAgc3RhY2tzLmZvckVhY2goKHN0YWNrKSA9PiB7XG4gICAgICAgIGV4cGVjdChzdGFjay5ub2RlLmlkKS50b01hdGNoKC9eQXV0ZXVyaXVtLVxcdystdGVzdCQvKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHVzZSBjb25zaXN0ZW50IHJlc291cmNlIG5hbWluZyB3aXRoaW4gc3RhY2tzJywgKCkgPT4ge1xuICAgICAgY29uc3QgZGF0YWJhc2VTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLURhdGFiYXNlLXRlc3QnKSBhcyBjZGsuU3RhY2s7XG4gICAgICBjb25zdCBhcGlTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLUFwaS10ZXN0JykgYXMgY2RrLlN0YWNrO1xuXG4gICAgICBjb25zdCBkYXRhYmFzZVRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKGRhdGFiYXNlU3RhY2spO1xuICAgICAgY29uc3QgYXBpVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soYXBpU3RhY2spO1xuXG4gICAgICAvLyBBbGwgRHluYW1vREIgdGFibGVzIHNob3VsZCBmb2xsb3cgbmFtaW5nIHBhdHRlcm5cbiAgICAgIGNvbnN0IHRhYmxlTmFtZXMgPSBbXG4gICAgICAgICdhdXRldXJpdW0tdXNlcnMtdGVzdCcsXG4gICAgICAgICdhdXRldXJpdW0tcHJvamVjdHMtdGVzdCcsXG4gICAgICAgICdhdXRldXJpdW0tc25pcHBldHMtdGVzdCcsXG4gICAgICAgICdhdXRldXJpdW0tY29ubmVjdGlvbnMtdGVzdCcsXG4gICAgICAgICdhdXRldXJpdW0tdmVyc2lvbnMtdGVzdCcsXG4gICAgICBdO1xuXG4gICAgICB0YWJsZU5hbWVzLmZvckVhY2goKHRhYmxlTmFtZSkgPT4ge1xuICAgICAgICBleHBlY3QodGFibGVOYW1lKS50b01hdGNoKC9eYXV0ZXVyaXVtLVxcdystdGVzdCQvKTtcbiAgICAgICAgZGF0YWJhc2VUZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBMYW1iZGEgZnVuY3Rpb24gc2hvdWxkIGZvbGxvdyBuYW1pbmcgcGF0dGVyblxuICAgICAgYXBpVGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogJ2F1dGV1cml1bS1hcGktdGVzdCcsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0Vudmlyb25tZW50IGFuZCBTdGFnZSBDb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgZGlmZmVyZW50IHN0YWdlcyBjb3JyZWN0bHknLCAoKSA9PiB7XG4gICAgICBwcm9jZXNzLmVudi5TVEFHRSA9ICdwcm9kJztcbiAgICAgIGNvbnN0IHByb2RBcHAgPSBuZXcgQXV0ZXVyaXVtQXBwKCk7XG5cbiAgICAgIGNvbnN0IHByb2RTdGFja3MgPSBwcm9kQXBwLm5vZGUuY2hpbGRyZW4uZmlsdGVyKFxuICAgICAgICAoY2hpbGQpID0+IGNoaWxkIGluc3RhbmNlb2YgY2RrLlN0YWNrXG4gICAgICApO1xuXG4gICAgICBjb25zdCBwcm9kU3RhY2tOYW1lcyA9IHByb2RTdGFja3MubWFwKChzdGFjaykgPT4gc3RhY2subm9kZS5pZCk7XG4gICAgICBleHBlY3QocHJvZFN0YWNrTmFtZXMpLnRvQ29udGFpbignQXV0ZXVyaXVtLUF1dGgtcHJvZCcpO1xuICAgICAgZXhwZWN0KHByb2RTdGFja05hbWVzKS50b0NvbnRhaW4oJ0F1dGV1cml1bS1EYXRhYmFzZS1wcm9kJyk7XG4gICAgICBleHBlY3QocHJvZFN0YWNrTmFtZXMpLnRvQ29udGFpbignQXV0ZXVyaXVtLUFwaS1wcm9kJyk7XG4gICAgICBleHBlY3QocHJvZFN0YWNrTmFtZXMpLnRvQ29udGFpbignQXV0ZXVyaXVtLU1lZGlhLXByb2QnKTtcbiAgICAgIGV4cGVjdChwcm9kU3RhY2tOYW1lcykudG9Db250YWluKCdBdXRldXJpdW0tV2ViLXByb2QnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBkZWZhdWx0IHRvIGRldiBzdGFnZSB3aGVuIG5vdCBzcGVjaWZpZWQnLCAoKSA9PiB7XG4gICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuU1RBR0U7XG4gICAgICBjb25zdCBkZWZhdWx0QXBwID0gbmV3IEF1dGV1cml1bUFwcCgpO1xuXG4gICAgICBjb25zdCBkZWZhdWx0U3RhY2tzID0gZGVmYXVsdEFwcC5ub2RlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAgICAgKGNoaWxkKSA9PiBjaGlsZCBpbnN0YW5jZW9mIGNkay5TdGFja1xuICAgICAgKTtcblxuICAgICAgY29uc3QgZGVmYXVsdFN0YWNrTmFtZXMgPSBkZWZhdWx0U3RhY2tzLm1hcCgoc3RhY2spID0+IHN0YWNrLm5vZGUuaWQpO1xuICAgICAgZXhwZWN0KGRlZmF1bHRTdGFja05hbWVzKS50b0NvbnRhaW4oJ0F1dGV1cml1bS1BdXRoLWRldicpO1xuICAgICAgZXhwZWN0KGRlZmF1bHRTdGFja05hbWVzKS50b0NvbnRhaW4oJ0F1dGV1cml1bS1EYXRhYmFzZS1kZXYnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1NlY3VyaXR5IGFuZCBBY2Nlc3MgQ29udHJvbCcsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY29uZmlndXJlIHByb3BlciBJQU0gcGVybWlzc2lvbnMgYmV0d2VlbiBzdGFja3MnLCAoKSA9PiB7XG4gICAgICBjb25zdCBhcGlTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLUFwaS10ZXN0JykgYXMgY2RrLlN0YWNrO1xuICAgICAgY29uc3QgYXBpVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soYXBpU3RhY2spO1xuXG4gICAgICAvLyBBUEkgTGFtYmRhIHNob3VsZCBoYXZlIHBlcm1pc3Npb25zIHRvIGFjY2VzcyBEeW5hbW9EQiB0YWJsZXNcbiAgICAgIGFwaVRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICAgICAgUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgICBBY3Rpb246IFtcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6QmF0Y2hHZXRJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0UmVjb3JkcycsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldFNoYXJkSXRlcmF0b3InLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpRdWVyeScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpTY2FuJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6Q29uZGl0aW9uQ2hlY2tJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6QmF0Y2hXcml0ZUl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpEZXNjcmliZVRhYmxlJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgUmVzb3VyY2U6IGV4cGVjdC5hbnkoQXJyYXkpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFQSSBMYW1iZGEgc2hvdWxkIGhhdmUgQ29nbml0byBhZG1pbiBwZXJtaXNzaW9uc1xuICAgICAgYXBpVGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkRlbGV0ZVVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCcsXG4gICAgICAgICAgICAgICAgJ2NvZ25pdG8taWRwOkxpc3RVc2VycycsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIFJlc291cmNlOiBleHBlY3QuYW55KE9iamVjdCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1J1bnRpbWUgYW5kIFRlY2hub2xvZ3kgU3RhbmRhcmRzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBlbnN1cmUgYWxsIExhbWJkYSBmdW5jdGlvbnMgdXNlIE5vZGUuanMgMjIueCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHN0YWNrcyA9IGFwcC5ub2RlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAgICAgKGNoaWxkKSA9PiBjaGlsZCBpbnN0YW5jZW9mIGNkay5TdGFja1xuICAgICAgKSBhcyBjZGsuU3RhY2tbXTtcblxuICAgICAgc3RhY2tzLmZvckVhY2goKHN0YWNrKSA9PiB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgICAgICAgY29uc3QgbGFtYmRhRnVuY3Rpb25zID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyk7XG5cbiAgICAgICAgT2JqZWN0LnZhbHVlcyhsYW1iZGFGdW5jdGlvbnMpLmZvckVhY2goKGZ1bmM6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChmdW5jLlByb3BlcnRpZXMuUnVudGltZSAmJiBmdW5jLlByb3BlcnRpZXMuUnVudGltZS5zdGFydHNXaXRoKCdub2RlanMnKSkge1xuICAgICAgICAgICAgZXhwZWN0KGZ1bmMuUHJvcGVydGllcy5SdW50aW1lKS50b0JlKCdub2RlanMyMi54Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHVzZSBjb25zaXN0ZW50IGJpbGxpbmcgbW9kZSBhY3Jvc3MgRHluYW1vREIgdGFibGVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgZGF0YWJhc2VTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLURhdGFiYXNlLXRlc3QnKSBhcyBjZGsuU3RhY2s7XG4gICAgICBjb25zdCBkYXRhYmFzZVRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKGRhdGFiYXNlU3RhY2spO1xuXG4gICAgICBjb25zdCB0YWJsZXMgPSBkYXRhYmFzZVRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJyk7XG4gICAgICBPYmplY3QudmFsdWVzKHRhYmxlcykuZm9yRWFjaCgodGFibGU6IGFueSkgPT4ge1xuICAgICAgICBleHBlY3QodGFibGUuUHJvcGVydGllcy5CaWxsaW5nTW9kZSkudG9CZSgnUEFZX1BFUl9SRVFVRVNUJyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ091dHB1dCBhbmQgRXhwb3J0IFZhbGlkYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGV4cG9ydCBuZWNlc3NhcnkgdmFsdWVzIGZvciBjcm9zcy1zdGFjayBjb21tdW5pY2F0aW9uJywgKCkgPT4ge1xuICAgICAgY29uc3QgYXV0aFN0YWNrID0gYXBwLm5vZGUuZmluZENoaWxkKCdBdXRldXJpdW0tQXV0aC10ZXN0JykgYXMgY2RrLlN0YWNrO1xuICAgICAgY29uc3QgZGF0YWJhc2VTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLURhdGFiYXNlLXRlc3QnKSBhcyBjZGsuU3RhY2s7XG4gICAgICBjb25zdCBhcGlTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLUFwaS10ZXN0JykgYXMgY2RrLlN0YWNrO1xuXG4gICAgICBjb25zdCBhdXRoVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soYXV0aFN0YWNrKTtcbiAgICAgIGNvbnN0IGRhdGFiYXNlVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soZGF0YWJhc2VTdGFjayk7XG4gICAgICBjb25zdCBhcGlUZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhhcGlTdGFjayk7XG5cbiAgICAgIC8vIEF1dGggc3RhY2sgZXhwb3J0c1xuICAgICAgYXV0aFRlbXBsYXRlLmhhc091dHB1dCgnVXNlclBvb2xJZCcsIHtcbiAgICAgICAgRXhwb3J0OiB7IE5hbWU6ICdBdXRldXJpdW0tVXNlclBvb2xJZC10ZXN0JyB9LFxuICAgICAgfSk7XG4gICAgICBhdXRoVGVtcGxhdGUuaGFzT3V0cHV0KCdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgICBFeHBvcnQ6IHsgTmFtZTogJ0F1dGV1cml1bS1Vc2VyUG9vbENsaWVudElkLXRlc3QnIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gRGF0YWJhc2Ugc3RhY2sgZXhwb3J0c1xuICAgICAgZGF0YWJhc2VUZW1wbGF0ZS5oYXNPdXRwdXQoJ1VzZXJzVGFibGVOYW1lLXRlc3QnLCB7XG4gICAgICAgIEV4cG9ydDogeyBOYW1lOiAnQXV0ZXVyaXVtVXNlcnNUYWJsZS10ZXN0JyB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFQSSBzdGFjayBleHBvcnRzXG4gICAgICBhcGlUZW1wbGF0ZS5oYXNPdXRwdXQoJ0dyYXBoUUxBcGlVcmwnLCB7XG4gICAgICAgIEV4cG9ydDogeyBOYW1lOiAnQXV0ZXVyaXVtLUdyYXBoUUxBcGlVcmwtdGVzdCcgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnTW9uaXRvcmluZyBTdGFjayBJbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgbm90IGRlcGxveSBtb25pdG9yaW5nIHN0YWNrIGluIGN1cnJlbnQgY29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IHN0YWNrcyA9IGFwcC5ub2RlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAgICAgKGNoaWxkKSA9PiBjaGlsZCBpbnN0YW5jZW9mIGNkay5TdGFja1xuICAgICAgKTtcblxuICAgICAgY29uc3QgbW9uaXRvcmluZ1N0YWNrID0gc3RhY2tzLmZpbmQoKHN0YWNrKSA9PlxuICAgICAgICBzdGFjay5ub2RlLmlkLmluY2x1ZGVzKCdNb25pdG9yaW5nJylcbiAgICAgICk7XG5cbiAgICAgIGV4cGVjdChtb25pdG9yaW5nU3RhY2spLnRvQmVVbmRlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBiZSByZWFkeSBmb3IgbW9uaXRvcmluZyBzdGFjayBpbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICAgIC8vIFZlcmlmeSB0aGF0IEFQSSBhbmQgV2ViIHN0YWNrcyBleHBvc2UgbmVjZXNzYXJ5IHByb3BlcnRpZXMgZm9yIG1vbml0b3JpbmdcbiAgICAgIGNvbnN0IGFwaVN0YWNrID0gYXBwLm5vZGUuZmluZENoaWxkKCdBdXRldXJpdW0tQXBpLXRlc3QnKSBhcyBjZGsuU3RhY2s7XG4gICAgICBjb25zdCB3ZWJTdGFjayA9IGFwcC5ub2RlLmZpbmRDaGlsZCgnQXV0ZXVyaXVtLVdlYi10ZXN0JykgYXMgY2RrLlN0YWNrO1xuXG4gICAgICBleHBlY3QoYXBpU3RhY2spLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3Qod2ViU3RhY2spLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgIC8vIFRoZXNlIHN0YWNrcyBzaG91bGQgYmUgYXZhaWxhYmxlIGZvciBtb25pdG9yaW5nIHN0YWNrIHRvIHJlZmVyZW5jZVxuICAgICAgY29uc3QgYXBpVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soYXBpU3RhY2spO1xuICAgICAgY29uc3Qgd2ViVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2sod2ViU3RhY2spO1xuXG4gICAgICAvLyBBUEkgc3RhY2sgc2hvdWxkIGhhdmUgR3JhcGhRTCBBUEkgdGhhdCBjYW4gYmUgbW9uaXRvcmVkXG4gICAgICBhcGlUZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6QXBwU3luYzo6R3JhcGhRTEFwaScsIDEpO1xuXG4gICAgICAvLyBXZWIgc3RhY2sgc2hvdWxkIGhhdmUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gdGhhdCBjYW4gYmUgbW9uaXRvcmVkXG4gICAgICB3ZWJUZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJywgMSk7XG4gICAgfSk7XG4gIH0pO1xufSk7Il19