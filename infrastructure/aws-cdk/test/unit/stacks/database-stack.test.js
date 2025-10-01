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

const auteurium_database_stack_1 = require("../../../lib/stacks/auteurium-database-stack");

describe('AuteuriumDatabaseStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new auteurium_database_stack_1.AuteuriumDatabaseStack(app, 'TestAuteuriumDatabaseStack', {
            stage: 'test',
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
        template = assertions_1.Template.fromStack(stack);
    });
    describe('DynamoDB Tables Creation', () => {
        test('should create exactly 5 DynamoDB tables', () => {
            template.resourceCountIs('AWS::DynamoDB::Table', 5);
        });
        test('should create users table with correct configuration', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-users-test',
                AttributeDefinitions: [
                    {
                        AttributeName: 'id',
                        AttributeType: 'S',
                    },
                    {
                        AttributeName: 'email',
                        AttributeType: 'S',
                    },
                ],
                KeySchema: [
                    {
                        AttributeName: 'id',
                        KeyType: 'HASH',
                    },
                ],
                BillingMode: 'PAY_PER_REQUEST',
            });
        });
        test('should create projects table with composite key', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-projects-test',
                AttributeDefinitions: [
                    {
                        AttributeName: 'userId',
                        AttributeType: 'S',
                    },
                    {
                        AttributeName: 'id',
                        AttributeType: 'S',
                    },
                ],
                KeySchema: [
                    {
                        AttributeName: 'userId',
                        KeyType: 'HASH',
                    },
                    {
                        AttributeName: 'id',
                        KeyType: 'RANGE',
                    },
                ],
            });
        });
        test('should create snippets table with project partition', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-snippets-test',
                KeySchema: [
                    {
                        AttributeName: 'projectId',
                        KeyType: 'HASH',
                    },
                    {
                        AttributeName: 'id',
                        KeyType: 'RANGE',
                    },
                ],
            });
        });
        test('should create connections table for many-to-many relationships', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-connections-test',
                KeySchema: [
                    {
                        AttributeName: 'projectId',
                        KeyType: 'HASH',
                    },
                    {
                        AttributeName: 'id',
                        KeyType: 'RANGE',
                    },
                ],
            });
        });
        test('should create versions table for snippet history', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-versions-test',
                KeySchema: [
                    {
                        AttributeName: 'snippetId',
                        KeyType: 'HASH',
                    },
                    {
                        AttributeName: 'version',
                        KeyType: 'RANGE',
                    },
                ],
            });
        });
    });
    describe('Global Secondary Indexes (GSIs)', () => {
        test('should create EmailIndex on users table', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-users-test',
                GlobalSecondaryIndexes: [
                    {
                        IndexName: 'EmailIndex',
                        KeySchema: [
                            {
                                AttributeName: 'email',
                                KeyType: 'HASH',
                            },
                        ],
                        Projection: {
                            ProjectionType: 'ALL',
                        },
                    },
                ],
            });
        });
        test('should create UserIndex on snippets table', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-snippets-test',
                GlobalSecondaryIndexes: [
                    {
                        IndexName: 'UserIndex',
                        KeySchema: [
                            {
                                AttributeName: 'userId',
                                KeyType: 'HASH',
                            },
                            {
                                AttributeName: 'createdAt',
                                KeyType: 'RANGE',
                            },
                        ],
                        Projection: {
                            ProjectionType: 'ALL',
                        },
                    },
                ],
            });
        });
        test('should create connection lookup indexes', () => {
            // Source snippet index
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-connections-test',
                GlobalSecondaryIndexes: [
                    {
                        IndexName: 'SourceSnippetIndex',
                        KeySchema: [
                            {
                                AttributeName: 'sourceSnippetId',
                                KeyType: 'HASH',
                            },
                        ],
                    },
                    {
                        IndexName: 'TargetSnippetIndex',
                        KeySchema: [
                            {
                                AttributeName: 'targetSnippetId',
                                KeyType: 'HASH',
                            },
                        ],
                    },
                    {
                        IndexName: 'ConnectionTypeIndex',
                        KeySchema: [
                            {
                                AttributeName: 'connectionType',
                                KeyType: 'HASH',
                            },
                            {
                                AttributeName: 'createdAt',
                                KeyType: 'RANGE',
                            },
                        ],
                    },
                ],
            });
        });
        test('should create UserVersionsIndex on versions table', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-versions-test',
                GlobalSecondaryIndexes: [
                    {
                        IndexName: 'UserVersionsIndex',
                        KeySchema: [
                            {
                                AttributeName: 'userId',
                                KeyType: 'HASH',
                            },
                            {
                                AttributeName: 'createdAt',
                                KeyType: 'RANGE',
                            },
                        ],
                    },
                ],
            });
        });
    });
    describe('Data Protection and Recovery', () => {
        test('should enable point-in-time recovery for production', () => {
            const prodStack = new auteurium_database_stack_1.AuteuriumDatabaseStack(app, 'ProdAuteuriumDatabaseStack', {
                stage: 'prod',
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
            });
            const prodTemplate = assertions_1.Template.fromStack(prodStack);
            prodTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
                PointInTimeRecoverySpecification: {
                    PointInTimeRecoveryEnabled: true,
                },
            });
        });
        test('should not enable point-in-time recovery for test stage', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                PointInTimeRecoverySpecification: {
                    PointInTimeRecoveryEnabled: false,
                },
            });
        });
        test('should set correct deletion policy for test stage', () => {
            template.hasResource('AWS::DynamoDB::Table', {
                DeletionPolicy: 'Delete',
            });
        });
        test('should set retention policy for production stage', () => {
            const prodStack = new auteurium_database_stack_1.AuteuriumDatabaseStack(app, 'ProdAuteuriumDatabaseStack', {
                stage: 'prod',
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
            });
            const prodTemplate = assertions_1.Template.fromStack(prodStack);
            prodTemplate.hasResource('AWS::DynamoDB::Table', {
                DeletionPolicy: 'Retain',
            });
        });
    });
    describe('Billing Configuration', () => {
        test('should use pay-per-request billing mode', () => {
            const tableNames = [
                'auteurium-users-test',
                'auteurium-projects-test',
                'auteurium-snippets-test',
                'auteurium-connections-test',
                'auteurium-versions-test',
            ];
            tableNames.forEach((tableName) => {
                template.hasResourceProperties('AWS::DynamoDB::Table', {
                    TableName: tableName,
                    BillingMode: 'PAY_PER_REQUEST',
                });
            });
        });
        test('should not specify provisioned throughput', () => {
            // Ensure no table has provisioned throughput settings
            const resources = template.findResources('AWS::DynamoDB::Table');
            Object.values(resources).forEach((resource) => {
                expect(resource.Properties.ProvisionedThroughput).toBeUndefined();
            });
        });
    });
    describe('Stack Outputs', () => {
        test('should export all table names', () => {
            const expectedOutputs = [
                'UsersTableName-test',
                'ProjectsTableName-test',
                'SnippetsTableName-test',
                'ConnectionsTableName-test',
                'VersionsTableName-test',
            ];
            expectedOutputs.forEach((outputKey) => {
                template.hasOutput(outputKey, {});
            });
        });
        test('should export table names with correct values', () => {
            template.hasOutput('UsersTableName-test', {
                Value: {
                    Ref: template.findResources('AWS::DynamoDB::Table', {
                        Properties: {
                            TableName: 'auteurium-users-test',
                        },
                    }),
                },
                Export: {
                    Name: 'AuteuriumUsersTable-test',
                },
            });
        });
    });
    describe('Attribute Definitions', () => {
        test('should define all required attributes for GSIs', () => {
            // Users table - should have id and email attributes
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-users-test',
                AttributeDefinitions: [
                    { AttributeName: 'id', AttributeType: 'S' },
                    { AttributeName: 'email', AttributeType: 'S' },
                ],
            });
            // Snippets table - should have projectId, id, userId, createdAt
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-snippets-test',
                AttributeDefinitions: [
                    { AttributeName: 'projectId', AttributeType: 'S' },
                    { AttributeName: 'id', AttributeType: 'S' },
                    { AttributeName: 'userId', AttributeType: 'S' },
                    { AttributeName: 'createdAt', AttributeType: 'S' },
                ],
            });
        });
    });
    describe('Public Properties', () => {
        test('should expose all tables as public properties', () => {
            expect(stack.usersTable).toBeDefined();
            expect(stack.projectsTable).toBeDefined();
            expect(stack.snippetsTable).toBeDefined();
            expect(stack.connectionsTable).toBeDefined();
            expect(stack.versionsTable).toBeDefined();
        });
        test('should have correct table names', () => {
            expect(stack.usersTable.tableName).toBe('auteurium-users-test');
            expect(stack.projectsTable.tableName).toBe('auteurium-projects-test');
            expect(stack.snippetsTable.tableName).toBe('auteurium-snippets-test');
            expect(stack.connectionsTable.tableName).toBe('auteurium-connections-test');
            expect(stack.versionsTable.tableName).toBe('auteurium-versions-test');
        });
    });
    describe('Data Model Validation', () => {
        test('should support user data isolation pattern', () => {
            // Projects table should partition by userId
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-projects-test',
                KeySchema: [
                    { AttributeName: 'userId', KeyType: 'HASH' },
                    { AttributeName: 'id', KeyType: 'RANGE' },
                ],
            });
        });
        test('should support snippet versioning pattern', () => {
            // Versions table should partition by snippetId and sort by version number
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-versions-test',
                KeySchema: [
                    { AttributeName: 'snippetId', KeyType: 'HASH' },
                    { AttributeName: 'version', KeyType: 'RANGE' },
                ],
            });
        });
        test('should support many-to-many connections pattern', () => {
            // Connections table should support bidirectional lookups
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'auteurium-connections-test',
                GlobalSecondaryIndexes: [
                    {
                        IndexName: 'SourceSnippetIndex',
                        KeySchema: [{ AttributeName: 'sourceSnippetId', KeyType: 'HASH' }],
                    },
                    {
                        IndexName: 'TargetSnippetIndex',
                        KeySchema: [{ AttributeName: 'targetSnippetId', KeyType: 'HASH' }],
                    },
                ],
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2sudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFiYXNlLXN0YWNrLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBa0Q7QUFDbEQsMkZBQXNGO0FBRXRGLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDdEMsSUFBSSxHQUFZLENBQUM7SUFDakIsSUFBSSxLQUE2QixDQUFDO0lBQ2xDLElBQUksUUFBa0IsQ0FBQztJQUV2QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLGlEQUFzQixDQUFDLEdBQUcsRUFBRSw0QkFBNEIsRUFBRTtZQUNwRSxLQUFLLEVBQUUsTUFBTTtZQUNiLEdBQUcsRUFBRTtnQkFDSCxPQUFPLEVBQUUsY0FBYztnQkFDdkIsTUFBTSxFQUFFLFdBQVc7YUFDcEI7U0FDRixDQUFDLENBQUM7UUFDSCxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7WUFDbkQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7WUFDaEUsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixFQUFFO2dCQUNyRCxTQUFTLEVBQUUsc0JBQXNCO2dCQUNqQyxvQkFBb0IsRUFBRTtvQkFDcEI7d0JBQ0UsYUFBYSxFQUFFLElBQUk7d0JBQ25CLGFBQWEsRUFBRSxH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LE9BQU8sRUFBRSxNQUFNLEVBQUU7b0JBQzVDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO2lCQUMxQzthQUNGLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtZQUNyRCwwRUFBMEU7WUFDMUUsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixFQUFFO2dCQUNyRCxTQUFTLEVBQUUseUJBQXlCO2dCQUNwQyxTQUFTLEVBQUU7b0JBQ1QsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUU7b0JBQy9DLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO2lCQUMvQzthQUNGLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtZQUMzRCx5REFBeUQ7WUFDekQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixFQUFFO2dCQUNyRCxTQUFTLEVBQUUsNEJBQTRCO2dCQUN2QyxzQkFBc0IsRUFBRTtvQkFDdEI7d0JBQ0UsU0FBUyxFQUFFLG9CQUFvQjt3QkFDL0IsU0FBUyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO3FCQUNuRTtvQkFDRDt3QkFDRSxTQUFTLEVBQUUsb0JBQW9CO3dCQUMvQixTQUFTLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUM7cUJBQ25FO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBBdXRldXJpdW1EYXRhYmFzZVN0YWNrIH0gZnJvbSAnLi4vLi4vLi4vbGliL3N0YWNrcy9hdXRldXJpdW0tZGF0YWJhc2Utc3RhY2snO1xuXG5kZXNjcmliZSgnQXV0ZXVyaXVtRGF0YWJhc2VTdGFjaycsICgpID0+IHtcbiAgbGV0IGFwcDogY2RrLkFwcDtcbiAgbGV0IHN0YWNrOiBBdXRldXJpdW1EYXRhYmFzZVN0YWNrO1xuICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgc3RhY2sgPSBuZXcgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayhhcHAsICdUZXN0QXV0ZXVyaXVtRGF0YWJhc2VTdGFjaycsIHtcbiAgICAgIHN0YWdlOiAndGVzdCcsXG4gICAgICBlbnY6IHtcbiAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0R5bmFtb0RCIFRhYmxlcyBDcmVhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIGV4YWN0bHkgNSBEeW5hbW9EQiB0YWJsZXMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywgNSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIHVzZXJzIHRhYmxlIHdpdGggY29ycmVjdCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYXV0ZXVyaXVtLXVzZXJzLXRlc3QnLFxuICAgICAgICBBdHRyaWJ1dGVEZWZpbml0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICdpZCcsXG4gICAgICAgICAgICBBdHRyaWJ1dGVUeXBlOiAnUycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAnZW1haWwnLFxuICAgICAgICAgICAgQXR0cmlidXRlVHlwZTogJ1MnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICdpZCcsXG4gICAgICAgICAgICBLZXlUeXBlOiAnSEFTSCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgQmlsbGluZ01vZGU6ICdQQVlfUEVSX1JFUVVFU1QnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIHByb2plY3RzIHRhYmxlIHdpdGggY29tcG9zaXRlIGtleScsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2F1dGV1cml1bS1wcm9qZWN0cy10ZXN0JyxcbiAgICAgICAgQXR0cmlidXRlRGVmaW5pdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAndXNlcklkJyxcbiAgICAgICAgICAgIEF0dHJpYnV0ZVR5cGU6ICdTJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICdpZCcsXG4gICAgICAgICAgICBBdHRyaWJ1dGVUeXBlOiAnUycsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgS2V5U2NoZW1hOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3VzZXJJZCcsXG4gICAgICAgICAgICBLZXlUeXBlOiAnSEFTSCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAnaWQnLFxuICAgICAgICAgICAgS2V5VHlwZTogJ1JBTkdFJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIHNuaXBwZXRzIHRhYmxlIHdpdGggcHJvamVjdCBwYXJ0aXRpb24nLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdhdXRldXJpdW0tc25pcHBldHMtdGVzdCcsXG4gICAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICdwcm9qZWN0SWQnLFxuICAgICAgICAgICAgS2V5VHlwZTogJ0hBU0gnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ2lkJyxcbiAgICAgICAgICAgIEtleVR5cGU6ICdSQU5HRScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBjb25uZWN0aW9ucyB0YWJsZSBmb3IgbWFueS10by1tYW55IHJlbGF0aW9uc2hpcHMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdhdXRldXJpdW0tY29ubmVjdGlvbnMtdGVzdCcsXG4gICAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICdwcm9qZWN0SWQnLFxuICAgICAgICAgICAgS2V5VHlwZTogJ0hBU0gnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ2lkJyxcbiAgICAgICAgICAgIEtleVR5cGU6ICdSQU5HRScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSB2ZXJzaW9ucyB0YWJsZSBmb3Igc25pcHBldCBoaXN0b3J5JywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYXV0ZXVyaXVtLXZlcnNpb25zLXRlc3QnLFxuICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAnc25pcHBldElkJyxcbiAgICAgICAgICAgIEtleVR5cGU6ICdIQVNIJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICd2ZXJzaW9uJyxcbiAgICAgICAgICAgIEtleVR5cGU6ICdSQU5HRScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnR2xvYmFsIFNlY29uZGFyeSBJbmRleGVzIChHU0lzKScsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIEVtYWlsSW5kZXggb24gdXNlcnMgdGFibGUnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdhdXRldXJpdW0tdXNlcnMtdGVzdCcsXG4gICAgICAgIEdsb2JhbFNlY29uZGFyeUluZGV4ZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBJbmRleE5hbWU6ICdFbWFpbEluZGV4JyxcbiAgICAgICAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICBLZXlUeXBlOiAnSEFTSCcsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgUHJvamVjdGlvbjoge1xuICAgICAgICAgICAgICBQcm9qZWN0aW9uVHlwZTogJ0FMTCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjcmVhdGUgVXNlckluZGV4IG9uIHNuaXBwZXRzIHRhYmxlJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYXV0ZXVyaXVtLXNuaXBwZXRzLXRlc3QnLFxuICAgICAgICBHbG9iYWxTZWNvbmRhcnlJbmRleGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgSW5kZXhOYW1lOiAnVXNlckluZGV4JyxcbiAgICAgICAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3VzZXJJZCcsXG4gICAgICAgICAgICAgICAgS2V5VHlwZTogJ0hBU0gnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ2NyZWF0ZWRBdCcsXG4gICAgICAgICAgICAgICAgS2V5VHlwZTogJ1JBTkdFJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBQcm9qZWN0aW9uOiB7XG4gICAgICAgICAgICAgIFByb2plY3Rpb25UeXBlOiAnQUxMJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBjb25uZWN0aW9uIGxvb2t1cCBpbmRleGVzJywgKCkgPT4ge1xuICAgICAgLy8gU291cmNlIHNuaXBwZXQgaW5kZXhcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2F1dGV1cml1bS1jb25uZWN0aW9ucy10ZXN0JyxcbiAgICAgICAgR2xvYmFsU2Vjb25kYXJ5SW5kZXhlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEluZGV4TmFtZTogJ1NvdXJjZVNuaXBwZXRJbmRleCcsXG4gICAgICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICdzb3VyY2VTbmlwcGV0SWQnLFxuICAgICAgICAgICAgICAgIEtleVR5cGU6ICdIQVNIJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBJbmRleE5hbWU6ICdUYXJnZXRTbmlwcGV0SW5kZXgnLFxuICAgICAgICAgICAgS2V5U2NoZW1hOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAndGFyZ2V0U25pcHBldElkJyxcbiAgICAgICAgICAgICAgICBLZXlUeXBlOiAnSEFTSCcsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgSW5kZXhOYW1lOiAnQ29ubmVjdGlvblR5cGVJbmRleCcsXG4gICAgICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICdjb25uZWN0aW9uVHlwZScsXG4gICAgICAgICAgICAgICAgS2V5VHlwZTogJ0hBU0gnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ2NyZWF0ZWRBdCcsXG4gICAgICAgICAgICAgICAgS2V5VHlwZTogJ1JBTkdFJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBVc2VyVmVyc2lvbnNJbmRleCBvbiB2ZXJzaW9ucyB0YWJsZScsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2F1dGV1cml1bS12ZXJzaW9ucy10ZXN0JyxcbiAgICAgICAgR2xvYmFsU2Vjb25kYXJ5SW5kZXhlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEluZGV4TmFtZTogJ1VzZXJWZXJzaW9uc0luZGV4JyxcbiAgICAgICAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3VzZXJJZCcsXG4gICAgICAgICAgICAgICAgS2V5VHlwZTogJ0hBU0gnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgQXR0cmlidXRlTmFtZTogJ2NyZWF0ZWRBdCcsXG4gICAgICAgICAgICAgICAgS2V5VHlwZTogJ1JBTkdFJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnRGF0YSBQcm90ZWN0aW9uIGFuZCBSZWNvdmVyeScsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgZW5hYmxlIHBvaW50LWluLXRpbWUgcmVjb3ZlcnkgZm9yIHByb2R1Y3Rpb24nLCAoKSA9PiB7XG4gICAgICBjb25zdCBwcm9kU3RhY2sgPSBuZXcgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayhhcHAsICdQcm9kQXV0ZXVyaXVtRGF0YWJhc2VTdGFjaycsIHtcbiAgICAgICAgc3RhZ2U6ICdwcm9kJyxcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcHJvZFRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHByb2RTdGFjayk7XG5cbiAgICAgIHByb2RUZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBQb2ludEluVGltZVJlY292ZXJ5U3BlY2lmaWNhdGlvbjoge1xuICAgICAgICAgIFBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgbm90IGVuYWJsZSBwb2ludC1pbi10aW1lIHJlY292ZXJ5IGZvciB0ZXN0IHN0YWdlJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgUG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHtcbiAgICAgICAgICBQb2ludEluVGltZVJlY292ZXJ5RW5hYmxlZDogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBzZXQgY29ycmVjdCBkZWxldGlvbiBwb2xpY3kgZm9yIHRlc3Qgc3RhZ2UnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZSgnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIERlbGV0aW9uUG9saWN5OiAnRGVsZXRlJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHNldCByZXRlbnRpb24gcG9saWN5IGZvciBwcm9kdWN0aW9uIHN0YWdlJywgKCkgPT4ge1xuICAgICAgY29uc3QgcHJvZFN0YWNrID0gbmV3IEF1dGV1cml1bURhdGFiYXNlU3RhY2soYXBwLCAnUHJvZEF1dGV1cml1bURhdGFiYXNlU3RhY2snLCB7XG4gICAgICAgIHN0YWdlOiAncHJvZCcsXG4gICAgICAgIGVudjoge1xuICAgICAgICAgIGFjY291bnQ6ICcxMjM0NTY3ODkwMTInLFxuICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb2RUZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhwcm9kU3RhY2spO1xuXG4gICAgICBwcm9kVGVtcGxhdGUuaGFzUmVzb3VyY2UoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBEZWxldGlvblBvbGljeTogJ1JldGFpbicsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0JpbGxpbmcgQ29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgdXNlIHBheS1wZXItcmVxdWVzdCBiaWxsaW5nIG1vZGUnLCAoKSA9PiB7XG4gICAgICBjb25zdCB0YWJsZU5hbWVzID0gW1xuICAgICAgICAnYXV0ZXVyaXVtLXVzZXJzLXRlc3QnLFxuICAgICAgICAnYXV0ZXVyaXVtLXByb2plY3RzLXRlc3QnLFxuICAgICAgICAnYXV0ZXVyaXVtLXNuaXBwZXRzLXRlc3QnLFxuICAgICAgICAnYXV0ZXVyaXVtLWNvbm5lY3Rpb25zLXRlc3QnLFxuICAgICAgICAnYXV0ZXVyaXVtLXZlcnNpb25zLXRlc3QnLFxuICAgICAgXTtcblxuICAgICAgdGFibGVOYW1lcy5mb3JFYWNoKCh0YWJsZU5hbWUpID0+IHtcbiAgICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcbiAgICAgICAgICBCaWxsaW5nTW9kZTogJ1BBWV9QRVJfUkVRVUVTVCcsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgbm90IHNwZWNpZnkgcHJvdmlzaW9uZWQgdGhyb3VnaHB1dCcsICgpID0+IHtcbiAgICAgIC8vIEVuc3VyZSBubyB0YWJsZSBoYXMgcHJvdmlzaW9uZWQgdGhyb3VnaHB1dCBzZXR0aW5nc1xuICAgICAgY29uc3QgcmVzb3VyY2VzID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnKTtcbiAgICAgIE9iamVjdC52YWx1ZXMocmVzb3VyY2VzKS5mb3JFYWNoKChyZXNvdXJjZTogYW55KSA9PiB7XG4gICAgICAgIGV4cGVjdChyZXNvdXJjZS5Qcm9wZXJ0aWVzLlByb3Zpc2lvbmVkVGhyb3VnaHB1dCkudG9CZVVuZGVmaW5lZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTdGFjayBPdXRwdXRzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBleHBvcnQgYWxsIHRhYmxlIG5hbWVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgZXhwZWN0ZWRPdXRwdXRzID0gW1xuICAgICAgICAnVXNlcnNUYWJsZU5hbWUtdGVzdCcsXG4gICAgICAgICdQcm9qZWN0c1RhYmxlTmFtZS10ZXN0JyxcbiAgICAgICAgJ1NuaXBwZXRzVGFibGVOYW1lLXRlc3QnLFxuICAgICAgICAnQ29ubmVjdGlvbnNUYWJsZU5hbWUtdGVzdCcsXG4gICAgICAgICdWZXJzaW9uc1RhYmxlTmFtZS10ZXN0JyxcbiAgICAgIF07XG5cbiAgICAgIGV4cGVjdGVkT3V0cHV0cy5mb3JFYWNoKChvdXRwdXRLZXkpID0+IHtcbiAgICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KG91dHB1dEtleSwge30pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgZXhwb3J0IHRhYmxlIG5hbWVzIHdpdGggY29ycmVjdCB2YWx1ZXMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ1VzZXJzVGFibGVOYW1lLXRlc3QnLCB7XG4gICAgICAgIFZhbHVlOiB7XG4gICAgICAgICAgUmVmOiB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgVGFibGVOYW1lOiAnYXV0ZXVyaXVtLXVzZXJzLXRlc3QnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfSxcbiAgICAgICAgRXhwb3J0OiB7XG4gICAgICAgICAgTmFtZTogJ0F1dGV1cml1bVVzZXJzVGFibGUtdGVzdCcsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0F0dHJpYnV0ZSBEZWZpbml0aW9ucycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgZGVmaW5lIGFsbCByZXF1aXJlZCBhdHRyaWJ1dGVzIGZvciBHU0lzJywgKCkgPT4ge1xuICAgICAgLy8gVXNlcnMgdGFibGUgLSBzaG91bGQgaGF2ZSBpZCBhbmQgZW1haWwgYXR0cmlidXRlc1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYXV0ZXVyaXVtLXVzZXJzLXRlc3QnLFxuICAgICAgICBBdHRyaWJ1dGVEZWZpbml0aW9uczogW1xuICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ2lkJywgQXR0cmlidXRlVHlwZTogJ1MnIH0sXG4gICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnZW1haWwnLCBBdHRyaWJ1dGVUeXBlOiAnUycgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTbmlwcGV0cyB0YWJsZSAtIHNob3VsZCBoYXZlIHByb2plY3RJZCwgaWQsIHVzZXJJZCwgY3JlYXRlZEF0XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdhdXRldXJpdW0tc25pcHBldHMtdGVzdCcsXG4gICAgICAgIEF0dHJpYnV0ZURlZmluaXRpb25zOiBbXG4gICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAncHJvamVjdElkJywgQXR0cmlidXRlVHlwZTogJ1MnIH0sXG4gICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnaWQnLCBBdHRyaWJ1dGVUeXBlOiAnUycgfSxcbiAgICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICd1c2VySWQnLCBBdHRyaWJ1dGVUeXBlOiAnUycgfSxcbiAgICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICdjcmVhdGVkQXQnLCBBdHRyaWJ1dGVUeXBlOiAnUycgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUHVibGljIFByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGV4cG9zZSBhbGwgdGFibGVzIGFzIHB1YmxpYyBwcm9wZXJ0aWVzJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHN0YWNrLnVzZXJzVGFibGUpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3Qoc3RhY2sucHJvamVjdHNUYWJsZSkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChzdGFjay5zbmlwcGV0c1RhYmxlKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHN0YWNrLmNvbm5lY3Rpb25zVGFibGUpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3Qoc3RhY2sudmVyc2lvbnNUYWJsZSkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYXZlIGNvcnJlY3QgdGFibGUgbmFtZXMnLCAoKSA9PiB7XG4gICAgICBleHBlY3Qoc3RhY2sudXNlcnNUYWJsZS50YWJsZU5hbWUpLnRvQmUoJ2F1dGV1cml1bS11c2Vycy10ZXN0Jyk7XG4gICAgICBleHBlY3Qoc3RhY2sucHJvamVjdHNUYWJsZS50YWJsZU5hbWUpLnRvQmUoJ2F1dGV1cml1bS1wcm9qZWN0cy10ZXN0Jyk7XG4gICAgICBleHBlY3Qoc3RhY2suc25pcHBldHNUYWJsZS50YWJsZU5hbWUpLnRvQmUoJ2F1dGV1cml1bS1zbmlwcGV0cy10ZXN0Jyk7XG4gICAgICBleHBlY3Qoc3RhY2suY29ubmVjdGlvbnNUYWJsZS50YWJsZU5hbWUpLnRvQmUoJ2F1dGV1cml1bS1jb25uZWN0aW9ucy10ZXN0Jyk7XG4gICAgICBleHBlY3Qoc3RhY2sudmVyc2lvbnNUYWJsZS50YWJsZU5hbWUpLnRvQmUoJ2F1dGV1cml1bS12ZXJzaW9ucy10ZXN0Jyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdEYXRhIE1vZGVsIFZhbGlkYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIHN1cHBvcnQgdXNlciBkYXRhIGlzb2xhdGlvbiBwYXR0ZXJuJywgKCkgPT4ge1xuICAgICAgLy8gUHJvamVjdHMgdGFibGUgc2hvdWxkIHBhcnRpdGlvbiBieSB1c2VySWRcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2F1dGV1cml1bS1wcm9qZWN0cy10ZXN0JyxcbiAgICAgICAgS2V5U2NoZW1hOiBbXG4gICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAndXNlcklkJywgS2V5VHlwZTogJ0hBU0gnIH0sXG4gICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnaWQnLCBLZXlUeXBlOiAnUkFOR0UnIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBzdXBwb3J0IHNuaXBwZXQgdmVyc2lvbmluZyBwYXR0ZXJuJywgKCkgPT4ge1xuICAgICAgLy8gVmVyc2lvbnMgdGFibGUgc2hvdWxkIHBhcnRpdGlvbiBieSBzbmlwcGV0SWQgYW5kIHNvcnQgYnkgdmVyc2lvbiBudW1iZXJcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2F1dGV1cml1bS12ZXJzaW9ucy10ZXN0JyxcbiAgICAgICAgS2V5U2NoZW1hOiBbXG4gICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnc25pcHBldElkJywgS2V5VHlwZTogJ0hBU0gnIH0sXG4gICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAndmVyc2lvbicsIEtleVR5cGU6ICdSQU5HRScgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHN1cHBvcnQgbWFueS10by1tYW55IGNvbm5lY3Rpb25zIHBhdHRlcm4nLCAoKSA9PiB7XG4gICAgICAvLyBDb25uZWN0aW9ucyB0YWJsZSBzaG91bGQgc3VwcG9ydCBiaWRpcmVjdGlvbmFsIGxvb2t1cHNcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2F1dGV1cml1bS1jb25uZWN0aW9ucy10ZXN0JyxcbiAgICAgICAgR2xvYmFsU2Vjb25kYXJ5SW5kZXhlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEluZGV4TmFtZTogJ1NvdXJjZVNuaXBwZXRJbmRleCcsXG4gICAgICAgICAgICBLZXlTY2hlbWE6IFt7IEF0dHJpYnV0ZU5hbWU6ICdzb3VyY2VTbmlwcGV0SWQnLCBLZXlUeXBlOiAnSEFTSCcgfV0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBJbmRleE5hbWU6ICdUYXJnZXRTbmlwcGV0SW5kZXgnLFxuICAgICAgICAgICAgS2V5U2NoZW1hOiBbeyBBdHRyaWJ1dGVOYW1lOiAndGFyZ2V0U25pcHBldElkJywgS2V5VHlwZTogJ0hBU0gnIH1dLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59KTsiXX0=