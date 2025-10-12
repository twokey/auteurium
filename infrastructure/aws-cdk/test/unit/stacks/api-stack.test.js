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

const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const auteurium_api_stack_1 = require("../../../lib/stacks/auteurium-api-stack");

describe('AuteuriumApiStack', () => {
    let app;
    let stack;
    let template;
    let mockUserPool;
    let mockUserPoolClient;
    beforeEach(() => {
        app = new cdk.App();
        // Create mock Cognito resources
        const authStack = new cdk.Stack(app, 'MockAuthStack');
        mockUserPool = new cognito.UserPool(authStack, 'MockUserPool', {
            userPoolName: 'test-user-pool',
        });
        mockUserPoolClient = new cognito.UserPoolClient(authStack, 'MockUserPoolClient', {
            userPool: mockUserPool,
        });
        stack = new auteurium_api_stack_1.AuteuriumApiStack(app, 'TestAuteuriumApiStack', {
            stage: 'test',
            userPool: mockUserPool,
            userPoolClient: mockUserPoolClient,
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
        template = assertions_1.Template.fromStack(stack);
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
                    UserPoolId: {
                        Ref: template.findResources('AWS::Cognito::UserPool', {}),
                    },
                    DefaultAction: 'ALLOW',
                    AwsRegion: 'us-east-1',
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
            template.hasResourceProperties('AWS::AppSync::GraphQLSchema', {
                ApiId: {
                    'Fn::GetAtt': [
                        template.findResources('AWS::AppSync::GraphQLApi', {}),
                        'ApiId',
                    ],
                },
            });
        });
    });
    describe('Lambda Function Configuration', () => {
        test('should create API Lambda with Node.js 22.x runtime', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                FunctionName: 'auteurium-api-test',
                Runtime: 'nodejs22.x',
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
                        USER_POOL_ID: {
                            Ref: template.findResources('AWS::Cognito::UserPool', {}),
                        },
                    },
                },
            });
        });
        test('should use correct code asset path', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                Code: {
                    S3Bucket: {
                        'Fn::Sub': template.findResources('AWS::CDK::AssetParameters', {}),
                    },
                },
            });
        });
    });
    describe('IAM Permissions', () => {
        test('should grant DynamoDB read/write permissions to all tables', () => {
            const tableNames = [
                'auteurium-users-test',
                'auteurium-projects-test',
                'auteurium-snippets-test',
                'auteurium-connections-test',
                'auteurium-versions-test',
            ];
            tableNames.forEach((tableName) => {
                template.hasResourceProperties('AWS::IAM::Policy', {
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
                                Resource: [
                                    {
                                        'Fn::GetAtt': [
                                            template.findResources('AWS::DynamoDB::Table', {
                                                Properties: { TableName: tableName },
                                            }),
                                            'Arn',
                                        ],
                                    },
                                    {
                                        'Fn::Join': [
                                            '',
                                            [
                                                {
                                                    'Fn::GetAtt': [
                                                        template.findResources('AWS::DynamoDB::Table', {
                                                            Properties: { TableName: tableName },
                                                        }),
                                                        'Arn',
                                                    ],
                                                },
                                                '/index/*',
                                            ],
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                });
            });
        });
        test('should grant Cognito admin permissions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
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
                            Resource: {
                                'Fn::GetAtt': [
                                    template.findResources('AWS::Cognito::UserPool', {}),
                                    'Arn',
                                ],
                            },
                        },
                    ],
                },
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
            queryResolvers.forEach((resolver) => {
                const [typeName, fieldName] = resolver.split('.');
                template.hasResourceProperties('AWS::AppSync::Resolver', {
                    ApiId: {
                        'Fn::GetAtt': [
                            template.findResources('AWS::AppSync::GraphQLApi', {}),
                            'ApiId',
                        ],
                    },
                    TypeName: typeName,
                    FieldName: fieldName,
                });
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
            template.hasResourceProperties('AWS::AppSync::DataSource', {
                ApiId: {
                    'Fn::GetAtt': [
                        template.findResources('AWS::AppSync::GraphQLApi', {}),
                        'ApiId',
                    ],
                },
                Type: 'AWS_LAMBDA',
                LambdaConfig: {
                    LambdaFunctionArn: {
                        'Fn::GetAtt': [
                            template.findResources('AWS::Lambda::Function', {
                                Properties: { FunctionName: 'auteurium-api-test' },
                            }),
                            'Arn',
                        ],
                    },
                },
            });
        });
    });
    describe('Stack Outputs', () => {
        test('should export GraphQL API URL', () => {
            template.hasOutput('GraphQLApiUrl', {
                Value: {
                    'Fn::GetAtt': [
                        template.findResources('AWS::AppSync::GraphQLApi', {}),
                        'GraphQLUrl',
                    ],
                },
                Export: {
                    Name: 'Auteurium-GraphQLApiUrl-test',
                },
            });
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
            Object.values(graphqlApi).forEach((api) => {
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
            template.resourceCountIs('AWS::Lambda::Function', 1);
        });
        test('should create exactly one Lambda data source', () => {
            template.resourceCountIs('AWS::AppSync::DataSource', 1);
        });
        test('should create correct number of resolvers', () => {
            // 7 queries + 9 mutations = 16 total resolvers
            template.resourceCountIs('AWS::AppSync::Resolver', 16);
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
            Object.values(lambdaFunctions).forEach((func) => {
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
                    UserPoolId: {
                        Ref: expect.any(String),
                    },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcGktc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUFrRDtBQUNsRCxpRUFBbUQ7QUFDbkQsaUZBQTRFO0FBRTVFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsSUFBSSxHQUFZLENBQUM7SUFDakIsSUFBSSxLQUF3QixDQUFDO0lBQzdCLElBQUksUUFBa0IsQ0FBQztJQUN2QixJQUFJLFlBQThCLENBQUM7SUFDbkMsSUFBSSxrQkFBMEMsQ0FBQztJQUUvQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRXBCLGdDQUFnQztRQUNoQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3RELFlBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLGNBQWMsRUFBRTtZQUM3RCxZQUFZLEVBQUUsZ0JBQWdCO1NBQy9CLENBQUMsQ0FBQztRQUNILGtCQUFrQixHQUFHLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLEVBQUU7WUFDL0UsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsS0FBSyxHQUFHLElBQUksdUNBQWlCLENBQUMsR0FBRyxFQUFFLHVCQUF1QixFQUFFO1lBQzFELEtBQUssRUFBRSxNQUFNO1lBQ2IsUUFBUSxFQUFFLFlBQVk7WUFDdEIsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyxHQUFHLEVBQUU7Z0JBQ0gsT0FBTyxFQUFFLGNBQWM7Z0JBQ3ZCLE1BQU0sRUFBRSxXQUFXO2FBQ3BCO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxH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O0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7WUFDaEUsUUFBUSxDQUFDLHFCQUFxQixDQUFDLDBCQUEwQixFQUFFO2dCQUN6RCxjQUFjLEVBQUU7b0JBQ2QsVUFBVSxFQUFFO3dCQUNWLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztxQkFDeEI7aUJBQ0Y7YUFDRixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7WUFDL0QsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFO2dCQUN0RCxXQUFXLEVBQUU7b0JBQ1gsU0FBUyxFQUFFO3dCQUNULFdBQVcsRUFBRSxzQkFBc0I7d0JBQ25DLGNBQWMsRUFBRSx5QkFBeUI7d0JBQ3pDLGNBQWMsRUFBRSx5QkFBeUI7d0JBQ3pDLGlCQUFpQixFQUFFLDRCQUE0Qjt3QkFDL0MsY0FBYyxFQUFFLHlCQUF5QjtxQkFDMUM7aUJBQ0Y7YUFDRixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0IHsgQXV0ZXVyaXVtQXBpU3RhY2sgfSBmcm9tICcuLi8uLi8uLi9saWIvc3RhY2tzL2F1dGV1cml1bS1hcGktc3RhY2snO1xuXG5kZXNjcmliZSgnQXV0ZXVyaXVtQXBpU3RhY2snLCAoKSA9PiB7XG4gIGxldCBhcHA6IGNkay5BcHA7XG4gIGxldCBzdGFjazogQXV0ZXVyaXVtQXBpU3RhY2s7XG4gIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGU7XG4gIGxldCBtb2NrVXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XG4gIGxldCBtb2NrVXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuICAgIC8vIENyZWF0ZSBtb2NrIENvZ25pdG8gcmVzb3VyY2VzXG4gICAgY29uc3QgYXV0aFN0YWNrID0gbmV3IGNkay5TdGFjayhhcHAsICdNb2NrQXV0aFN0YWNrJyk7XG4gICAgbW9ja1VzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2woYXV0aFN0YWNrLCAnTW9ja1VzZXJQb29sJywge1xuICAgICAgdXNlclBvb2xOYW1lOiAndGVzdC11c2VyLXBvb2wnLFxuICAgIH0pO1xuICAgIG1vY2tVc2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KGF1dGhTdGFjaywgJ01vY2tVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sOiBtb2NrVXNlclBvb2wsXG4gICAgfSk7XG5cbiAgICBzdGFjayA9IG5ldyBBdXRldXJpdW1BcGlTdGFjayhhcHAsICdUZXN0QXV0ZXVyaXVtQXBpU3RhY2snLCB7XG4gICAgICBzdGFnZTogJ3Rlc3QnLFxuICAgICAgdXNlclBvb2w6IG1vY2tVc2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50OiBtb2NrVXNlclBvb2xDbGllbnQsXG4gICAgICBlbnY6IHtcbiAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0FwcFN5bmMgR3JhcGhRTCBBUEknLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBBcHBTeW5jIEFQSSB3aXRoIGNvcnJlY3QgbmFtaW5nJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwcFN5bmM6OkdyYXBoUUxBcGknLCB7XG4gICAgICAgIE5hbWU6ICdhdXRldXJpdW0tYXBpLXRlc3QnLFxuICAgICAgICBBdXRoZW50aWNhdGlvblR5cGU6ICdBTUFaT05fQ09HTklUT19VU0VSX1BPT0xTJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNvbmZpZ3VyZSBDb2duaXRvIGF1dGhlbnRpY2F0aW9uJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwcFN5bmM6OkdyYXBoUUxBcGknLCB7XG4gICAgICAgIFVzZXJQb29sQ29uZmlnOiB7XG4gICAgICAgICAgVXNlclBvb2xJZDoge1xuICAgICAgICAgICAgUmVmOiB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sJywge30pLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgRGVmYXVsdEFjdGlvbjogJ0FMTE9XJyxcbiAgICAgICAgICBBd3NSZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgZW5hYmxlIGNvbXByZWhlbnNpdmUgbG9nZ2luZycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcHBTeW5jOjpHcmFwaFFMQXBpJywge1xuICAgICAgICBMb2dDb25maWc6IHtcbiAgICAgICAgICBGaWVsZExvZ0xldmVsOiAnQUxMJyxcbiAgICAgICAgICBFeGNsdWRlVmVyYm9zZUNvbnRlbnQ6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgcmVmZXJlbmNlIEdyYXBoUUwgc2NoZW1hIGZpbGUnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwU3luYzo6R3JhcGhRTFNjaGVtYScsIHtcbiAgICAgICAgQXBpSWQ6IHtcbiAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6QXBwU3luYzo6R3JhcGhRTEFwaScsIHt9KSxcbiAgICAgICAgICAgICdBcGlJZCcsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnTGFtYmRhIEZ1bmN0aW9uIENvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBBUEkgTGFtYmRhIHdpdGggTm9kZS5qcyAyMi54IHJ1bnRpbWUnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIHtcbiAgICAgICAgRnVuY3Rpb25OYW1lOiAnYXV0ZXVyaXVtLWFwaS10ZXN0JyxcbiAgICAgICAgUnVudGltZTogJ25vZGVqczIyLngnLCAvLyBDUklUSUNBTDogUHJldmVudCByZWdyZXNzaW9uIHRvIG9sZGVyIHZlcnNpb25zXG4gICAgICAgIEhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgICAgVGltZW91dDogMzAsXG4gICAgICAgIE1lbW9yeVNpemU6IDUxMixcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNvbmZpZ3VyZSBjb3JyZWN0IGVudmlyb25tZW50IHZhcmlhYmxlcycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xuICAgICAgICBFbnZpcm9ubWVudDoge1xuICAgICAgICAgIFZhcmlhYmxlczoge1xuICAgICAgICAgICAgU1RBR0U6ICd0ZXN0JyxcbiAgICAgICAgICAgIFVTRVJTX1RBQkxFOiAnYXV0ZXVyaXVtLXVzZXJzLXRlc3QnLFxuICAgICAgICAgICAgUFJPSkVDVFNfVEFCTEU6ICdhdXRldXJpdW0tcHJvamVjdHMtdGVzdCcsXG4gICAgICAgICAgICBTTklQUEVUU19UQUJMRTogJ2F1dGV1cml1bS1zbmlwcGV0cy10ZXN0JyxcbiAgICAgICAgICAgIENPTk5FQ1RJT05TX1RBQkxFOiAnYXV0ZXVyaXVtLWNvbm5lY3Rpb25zLXRlc3QnLFxuICAgICAgICAgICAgVkVSU0lPTlNfVEFCTEU6ICdhdXRldXJpdW0tdmVyc2lvbnMtdGVzdCcsXG4gICAgICAgICAgICBVU0VSX1BPT0xfSUQ6IHtcbiAgICAgICAgICAgICAgUmVmOiB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sJywge30pLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgdXNlIGNvcnJlY3QgY29kZSBhc3NldCBwYXRoJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICAgIENvZGU6IHtcbiAgICAgICAgICBTM0J1Y2tldDoge1xuICAgICAgICAgICAgJ0ZuOjpTdWInOiB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkNESzo6QXNzZXRQYXJhbWV0ZXJzJywge30pLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0lBTSBQZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgZ3JhbnQgRHluYW1vREIgcmVhZC93cml0ZSBwZXJtaXNzaW9ucyB0byBhbGwgdGFibGVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgdGFibGVOYW1lcyA9IFtcbiAgICAgICAgJ2F1dGV1cml1bS11c2Vycy10ZXN0JyxcbiAgICAgICAgJ2F1dGV1cml1bS1wcm9qZWN0cy10ZXN0JyxcbiAgICAgICAgJ2F1dGV1cml1bS1zbmlwcGV0cy10ZXN0JyxcbiAgICAgICAgJ2F1dGV1cml1bS1jb25uZWN0aW9ucy10ZXN0JyxcbiAgICAgICAgJ2F1dGV1cml1bS12ZXJzaW9ucy10ZXN0JyxcbiAgICAgIF07XG5cbiAgICAgIHRhYmxlTmFtZXMuZm9yRWFjaCgodGFibGVOYW1lKSA9PiB7XG4gICAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgICAgQWN0aW9uOiBbXG4gICAgICAgICAgICAgICAgICAnZHluYW1vZGI6QmF0Y2hHZXRJdGVtJyxcbiAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpHZXRSZWNvcmRzJyxcbiAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpHZXRTaGFyZEl0ZXJhdG9yJyxcbiAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpRdWVyeScsXG4gICAgICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXG4gICAgICAgICAgICAgICAgICAnZHluYW1vZGI6U2NhbicsXG4gICAgICAgICAgICAgICAgICAnZHluYW1vZGI6Q29uZGl0aW9uQ2hlY2tJdGVtJyxcbiAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpCYXRjaFdyaXRlSXRlbScsXG4gICAgICAgICAgICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICAgICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICAgICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXG4gICAgICAgICAgICAgICAgICAnZHluYW1vZGI6RGVzY3JpYmVUYWJsZScsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBSZXNvdXJjZTogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFByb3BlcnRpZXM6IHsgVGFibGVOYW1lOiB0YWJsZU5hbWUgfSxcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAnQXJuJyxcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICdGbjo6Sm9pbic6IFtcbiAgICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUHJvcGVydGllczogeyBUYWJsZU5hbWU6IHRhYmxlTmFtZSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdBcm4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICcvaW5kZXgvKicsXG4gICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBncmFudCBDb2duaXRvIGFkbWluIHBlcm1pc3Npb25zJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkRlbGV0ZVVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCcsXG4gICAgICAgICAgICAgICAgJ2NvZ25pdG8taWRwOkxpc3RVc2VycycsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIFJlc291cmNlOiB7XG4gICAgICAgICAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sJywge30pLFxuICAgICAgICAgICAgICAgICAgJ0FybicsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQXBwU3luYyBSZXNvbHZlcnMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBhbGwgcmVxdWlyZWQgcXVlcnkgcmVzb2x2ZXJzJywgKCkgPT4ge1xuICAgICAgY29uc3QgcXVlcnlSZXNvbHZlcnMgPSBbXG4gICAgICAgICdRdWVyeS5tZScsXG4gICAgICAgICdRdWVyeS51c2VycycsXG4gICAgICAgICdRdWVyeS5wcm9qZWN0cycsXG4gICAgICAgICdRdWVyeS5wcm9qZWN0JyxcbiAgICAgICAgJ1F1ZXJ5LnNuaXBwZXQnLFxuICAgICAgICAnUXVlcnkuc25pcHBldFZlcnNpb25zJyxcbiAgICAgICAgJ1F1ZXJ5LnN5c3RlbUFuYWx5dGljcycsXG4gICAgICBdO1xuXG4gICAgICBxdWVyeVJlc29sdmVycy5mb3JFYWNoKChyZXNvbHZlcikgPT4ge1xuICAgICAgICBjb25zdCBbdHlwZU5hbWUsIGZpZWxkTmFtZV0gPSByZXNvbHZlci5zcGxpdCgnLicpO1xuICAgICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwU3luYzo6UmVzb2x2ZXInLCB7XG4gICAgICAgICAgQXBpSWQ6IHtcbiAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkFwcFN5bmM6OkdyYXBoUUxBcGknLCB7fSksXG4gICAgICAgICAgICAgICdBcGlJZCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgVHlwZU5hbWU6IHR5cGVOYW1lLFxuICAgICAgICAgIEZpZWxkTmFtZTogZmllbGROYW1lLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBhbGwgcmVxdWlyZWQgbXV0YXRpb24gcmVzb2x2ZXJzJywgKCkgPT4ge1xuICAgICAgY29uc3QgbXV0YXRpb25SZXNvbHZlcnMgPSBbXG4gICAgICAgICdNdXRhdGlvbi5jcmVhdGVQcm9qZWN0JyxcbiAgICAgICAgJ011dGF0aW9uLnVwZGF0ZVByb2plY3QnLFxuICAgICAgICAnTXV0YXRpb24uZGVsZXRlUHJvamVjdCcsXG4gICAgICAgICdNdXRhdGlvbi5jcmVhdGVTbmlwcGV0JyxcbiAgICAgICAgJ011dGF0aW9uLnVwZGF0ZVNuaXBwZXQnLFxuICAgICAgICAnTXV0YXRpb24uZGVsZXRlU25pcHBldCcsXG4gICAgICAgICdNdXRhdGlvbi5yZXZlcnRTbmlwcGV0JyxcbiAgICAgICAgJ011dGF0aW9uLmNyZWF0ZUNvbm5lY3Rpb24nLFxuICAgICAgICAnTXV0YXRpb24udXBkYXRlQ29ubmVjdGlvbicsXG4gICAgICAgICdNdXRhdGlvbi5kZWxldGVDb25uZWN0aW9uJyxcbiAgICAgICAgJ011dGF0aW9uLmNyZWF0ZVVzZXInLFxuICAgICAgICAnTXV0YXRpb24uZGVsZXRlVXNlcicsXG4gICAgICAgICdNdXRhdGlvbi5yZXNldFVzZXJQYXNzd29yZCcsXG4gICAgICBdO1xuXG4gICAgICBtdXRhdGlvblJlc29sdmVycy5mb3JFYWNoKChyZXNvbHZlcikgPT4ge1xuICAgICAgICBjb25zdCBbdHlwZU5hbWUsIGZpZWxkTmFtZV0gPSByZXNvbHZlci5zcGxpdCgnLicpO1xuICAgICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwU3luYzo6UmVzb2x2ZXInLCB7XG4gICAgICAgICAgVHlwZU5hbWU6IHR5cGVOYW1lLFxuICAgICAgICAgIEZpZWxkTmFtZTogZmllbGROYW1lLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNvbm5lY3QgYWxsIHJlc29sdmVycyB0byBMYW1iZGEgZGF0YSBzb3VyY2UnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwU3luYzo6RGF0YVNvdXJjZScsIHtcbiAgICAgICAgQXBpSWQ6IHtcbiAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6QXBwU3luYzo6R3JhcGhRTEFwaScsIHt9KSxcbiAgICAgICAgICAgICdBcGlJZCcsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgVHlwZTogJ0FXU19MQU1CREEnLFxuICAgICAgICBMYW1iZGFDb25maWc6IHtcbiAgICAgICAgICBMYW1iZGFGdW5jdGlvbkFybjoge1xuICAgICAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIHtcbiAgICAgICAgICAgICAgICBQcm9wZXJ0aWVzOiB7IEZ1bmN0aW9uTmFtZTogJ2F1dGV1cml1bS1hcGktdGVzdCcgfSxcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICdBcm4nLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTdGFjayBPdXRwdXRzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBleHBvcnQgR3JhcGhRTCBBUEkgVVJMJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdHcmFwaFFMQXBpVXJsJywge1xuICAgICAgICBWYWx1ZToge1xuICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpBcHBTeW5jOjpHcmFwaFFMQXBpJywge30pLFxuICAgICAgICAgICAgJ0dyYXBoUUxVcmwnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIEV4cG9ydDoge1xuICAgICAgICAgIE5hbWU6ICdBdXRldXJpdW0tR3JhcGhRTEFwaVVybC10ZXN0JyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGV4cG9ydCBBUEkga2V5IHN0YXR1cycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnR3JhcGhRTEFwaUtleScsIHtcbiAgICAgICAgVmFsdWU6ICdObyBBUEkgS2V5ICh1c2luZyBDb2duaXRvKScsXG4gICAgICAgIEV4cG9ydDoge1xuICAgICAgICAgIE5hbWU6ICdBdXRldXJpdW0tR3JhcGhRTEFwaUtleS10ZXN0JyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnU2VjdXJpdHkgQ29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgb25seSBhbGxvdyBDb2duaXRvIGF1dGhlbnRpY2F0ZWQgcmVxdWVzdHMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwU3luYzo6R3JhcGhRTEFwaScsIHtcbiAgICAgICAgQXV0aGVudGljYXRpb25UeXBlOiAnQU1BWk9OX0NPR05JVE9fVVNFUl9QT09MUycsXG4gICAgICB9KTtcblxuICAgICAgLy8gRW5zdXJlIG5vIEFQSSBrZXkgYXV0aGVudGljYXRpb24gaXMgY29uZmlndXJlZFxuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkFwcFN5bmM6OkFwaUtleScsIDApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIG5vdCBhbGxvdyB1bmF1dGhlbnRpY2F0ZWQgYWNjZXNzJywgKCkgPT4ge1xuICAgICAgLy8gRW5zdXJlIG5vIElBTSBhdXRoZW50aWNhdGlvbiBpcyBjb25maWd1cmVkIGZvciBwdWJsaWMgYWNjZXNzXG4gICAgICBjb25zdCBncmFwaHFsQXBpID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpBcHBTeW5jOjpHcmFwaFFMQXBpJyk7XG4gICAgICBPYmplY3QudmFsdWVzKGdyYXBocWxBcGkpLmZvckVhY2goKGFwaTogYW55KSA9PiB7XG4gICAgICAgIGV4cGVjdChhcGkuUHJvcGVydGllcy5BdXRoZW50aWNhdGlvblR5cGUpLnRvQmUoJ0FNQVpPTl9DT0dOSVRPX1VTRVJfUE9PTFMnKTtcbiAgICAgICAgZXhwZWN0KGFwaS5Qcm9wZXJ0aWVzLkFkZGl0aW9uYWxBdXRoZW50aWNhdGlvblByb3ZpZGVycykudG9CZVVuZGVmaW5lZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdSZXNvdXJjZSBDb3VudCBWYWxpZGF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBjcmVhdGUgZXhhY3RseSBvbmUgR3JhcGhRTCBBUEknLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6QXBwU3luYzo6R3JhcGhRTEFwaScsIDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBleGFjdGx5IG9uZSBMYW1iZGEgZnVuY3Rpb24nLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBleGFjdGx5IG9uZSBMYW1iZGEgZGF0YSBzb3VyY2UnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6QXBwU3luYzo6RGF0YVNvdXJjZScsIDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBjb3JyZWN0IG51bWJlciBvZiByZXNvbHZlcnMnLCAoKSA9PiB7XG4gICAgICAvLyA3IHF1ZXJpZXMgKyA5IG11dGF0aW9ucyA9IDE2IHRvdGFsIHJlc29sdmVyc1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkFwcFN5bmM6OlJlc29sdmVyJywgMTYpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUnVudGltZSBWZXJzaW9uIFZhbGlkYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIG5ldmVyIHVzZSBvdXRkYXRlZCBOb2RlLmpzIHJ1bnRpbWVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgZGVwcmVjYXRlZFJ1bnRpbWVzID0gW1xuICAgICAgICAnbm9kZWpzMTQueCcsXG4gICAgICAgICdub2RlanMxNi54JyxcbiAgICAgICAgJ25vZGVqczE4LngnLFxuICAgICAgICAnbm9kZWpzMjAueCcsXG4gICAgICBdO1xuXG4gICAgICBjb25zdCBsYW1iZGFGdW5jdGlvbnMgPSB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nKTtcbiAgICAgIE9iamVjdC52YWx1ZXMobGFtYmRhRnVuY3Rpb25zKS5mb3JFYWNoKChmdW5jOiBhbnkpID0+IHtcbiAgICAgICAgY29uc3QgcnVudGltZSA9IGZ1bmMuUHJvcGVydGllcy5SdW50aW1lO1xuICAgICAgICBleHBlY3QoZGVwcmVjYXRlZFJ1bnRpbWVzKS5ub3QudG9Db250YWluKHJ1bnRpbWUpO1xuICAgICAgICBleHBlY3QocnVudGltZSkudG9CZSgnbm9kZWpzMjIueCcpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgdXNlIGxhdGVzdCBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICAgIFJ1bnRpbWU6ICdub2RlanMyMi54JyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUHVibGljIFByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGV4cG9zZSBHcmFwaFFMIEFQSSBhcyBwdWJsaWMgcHJvcGVydHknLCAoKSA9PiB7XG4gICAgICBleHBlY3Qoc3RhY2suZ3JhcGhxbEFwaSkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChzdGFjay5ncmFwaHFsQXBpLmFwaUlkKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQ3Jvc3MtU3RhY2sgRGVwZW5kZW5jaWVzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBwcm9wZXJseSByZWZlcmVuY2UgZXh0ZXJuYWwgQ29nbml0byByZXNvdXJjZXMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwU3luYzo6R3JhcGhRTEFwaScsIHtcbiAgICAgICAgVXNlclBvb2xDb25maWc6IHtcbiAgICAgICAgICBVc2VyUG9vbElkOiB7XG4gICAgICAgICAgICBSZWY6IGV4cGVjdC5hbnkoU3RyaW5nKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgcmVmZXJlbmNlIER5bmFtb0RCIHRhYmxlcyBieSBuYW1lIGNvbnZlbnRpb24nLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIHtcbiAgICAgICAgRW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBWYXJpYWJsZXM6IHtcbiAgICAgICAgICAgIFVTRVJTX1RBQkxFOiAnYXV0ZXVyaXVtLXVzZXJzLXRlc3QnLFxuICAgICAgICAgICAgUFJPSkVDVFNfVEFCTEU6ICdhdXRldXJpdW0tcHJvamVjdHMtdGVzdCcsXG4gICAgICAgICAgICBTTklQUEVUU19UQUJMRTogJ2F1dGV1cml1bS1zbmlwcGV0cy10ZXN0JyxcbiAgICAgICAgICAgIENPTk5FQ1RJT05TX1RBQkxFOiAnYXV0ZXVyaXVtLWNvbm5lY3Rpb25zLXRlc3QnLFxuICAgICAgICAgICAgVkVSU0lPTlNfVEFCTEU6ICdhdXRldXJpdW0tdmVyc2lvbnMtdGVzdCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==
