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
exports.AuteuriumApiStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const appsync = __importStar(require("aws-cdk-lib/aws-appsync"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
class AuteuriumApiStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, userPool, userPoolClient } = props;
        // Import DynamoDB tables from database stack
        const usersTable = dynamodb.Table.fromTableName(this, 'UsersTable', `auteurium-users-${stage}`);
        const projectsTable = dynamodb.Table.fromTableName(this, 'ProjectsTable', `auteurium-projects-${stage}`);
        const snippetsTable = dynamodb.Table.fromTableName(this, 'SnippetsTable', `auteurium-snippets-${stage}`);
        const connectionsTable = dynamodb.Table.fromTableName(this, 'ConnectionsTable', `auteurium-connections-${stage}`);
        const versionsTable = dynamodb.Table.fromTableName(this, 'VersionsTable', `auteurium-versions-${stage}`);
        // Create AppSync GraphQL API
        this.graphqlApi = new appsync.GraphqlApi(this, `AuteuriumGraphQLApi-${stage}`, {
            name: `auteurium-api-${stage}`,
            definition: appsync.Definition.fromFile(path.join(__dirname, '../../../../packages/graphql-schema/schema.graphql')),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: appsync.AuthorizationType.USER_POOL,
                    userPoolConfig: {
                        userPool,
                        defaultAction: appsync.UserPoolDefaultAction.ALLOW
                    }
                }
            },
            logConfig: {
                fieldLogLevel: appsync.FieldLogLevel.ALL,
                excludeVerboseContent: false
            }
        });
        // Lambda function for GraphQL resolvers
        const apiFunction = new lambdaNodejs.NodejsFunction(this, `AuteuriumApiFunction-${stage}`, {
            functionName: `auteurium-api-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, '../../../../services/api/src/index.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            bundling: {
                format: lambdaNodejs.OutputFormat.CJS,
                target: 'node22',
                sourceMap: true,
                tsconfig: path.join(__dirname, '../../../../services/api/tsconfig.json')
            },
            environment: {
                STAGE: stage,
                USERS_TABLE: usersTable.tableName,
                PROJECTS_TABLE: projectsTable.tableName,
                SNIPPETS_TABLE: snippetsTable.tableName,
                CONNECTIONS_TABLE: connectionsTable.tableName,
                VERSIONS_TABLE: versionsTable.tableName,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        // Grant DynamoDB permissions to Lambda
        usersTable.grantReadWriteData(apiFunction);
        projectsTable.grantReadWriteData(apiFunction);
        snippetsTable.grantReadWriteData(apiFunction);
        connectionsTable.grantReadWriteData(apiFunction);
        versionsTable.grantReadWriteData(apiFunction);
        // Grant permissions to query GSIs (Query only, Scan removed for security and cost)
        apiFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'dynamodb:Query'
            ],
            resources: [
                `${connectionsTable.tableArn}/index/*`,
                `${snippetsTable.tableArn}/index/*`,
                `${versionsTable.tableArn}/index/*`,
                `${usersTable.tableArn}/index/*`,
                `${projectsTable.tableArn}/index/*`
            ]
        }));
        // Grant Cognito permissions
        apiFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:ListUsers'
            ],
            resources: [userPool.userPoolArn]
        }));
        // Create AppSync data source
        const lambdaDataSource = this.graphqlApi.addLambdaDataSource('LambdaDataSource', apiFunction);
        // Attach resolvers
        const resolvers = [
            // Query resolvers
            { typeName: 'Query', fieldName: 'me' },
            { typeName: 'Query', fieldName: 'users' },
            { typeName: 'Query', fieldName: 'projects' },
            { typeName: 'Query', fieldName: 'project' },
            { typeName: 'Query', fieldName: 'snippet' },
            { typeName: 'Query', fieldName: 'snippetVersions' },
            { typeName: 'Query', fieldName: 'systemAnalytics' },
            // Mutation resolvers
            { typeName: 'Mutation', fieldName: 'createProject' },
            { typeName: 'Mutation', fieldName: 'updateProject' },
            { typeName: 'Mutation', fieldName: 'deleteProject' },
            { typeName: 'Mutation', fieldName: 'createSnippet' },
            { typeName: 'Mutation', fieldName: 'updateSnippet' },
            { typeName: 'Mutation', fieldName: 'deleteSnippet' },
            { typeName: 'Mutation', fieldName: 'revertSnippet' },
            { typeName: 'Mutation', fieldName: 'createConnection' },
            { typeName: 'Mutation', fieldName: 'updateConnection' },
            { typeName: 'Mutation', fieldName: 'deleteConnection' },
            { typeName: 'Mutation', fieldName: 'createUser' },
            { typeName: 'Mutation', fieldName: 'deleteUser' },
            { typeName: 'Mutation', fieldName: 'resetUserPassword' },
            // Field resolvers
            { typeName: 'Project', fieldName: 'snippets' },
            { typeName: 'Snippet', fieldName: 'connections' }
        ];
        resolvers.forEach(({ typeName, fieldName }) => {
            new appsync.Resolver(this, `${typeName}${fieldName}Resolver`, {
                api: this.graphqlApi,
                typeName,
                fieldName,
                dataSource: lambdaDataSource
            });
        });
        // Export GraphQL API URL
        new cdk.CfnOutput(this, 'GraphQLApiUrl', {
            value: this.graphqlApi.graphqlUrl,
            exportName: `Auteurium-GraphQLApiUrl-${stage}`
        });
        new cdk.CfnOutput(this, 'GraphQLApiKey', {
            value: this.graphqlApi.apiKey ?? 'No API Key (using Cognito)',
            exportName: `Auteurium-GraphQLApiKey-${stage}`
        });
    }
}
exports.AuteuriumApiStack = AuteuriumApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcGktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNEI7QUFFNUIsaURBQWtDO0FBQ2xDLGlFQUFrRDtBQUVsRCxtRUFBb0Q7QUFDcEQseURBQTBDO0FBQzFDLCtEQUFnRDtBQUNoRCw0RUFBNkQ7QUFTN0QsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUc5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3JFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxHQUFHLEtBQUssQ0FBQTtRQUVqRCw2Q0FBNkM7UUFDN0MsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxtQkFBbUIsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUMvRixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3hHLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDeEcsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUseUJBQXlCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDakgsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUV4Ryw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLHVCQUF1QixLQUFLLEVBQUUsRUFBRTtZQUM3RSxJQUFJLEVBQUUsaUJBQWlCLEtBQUssRUFBRTtZQUM5QixVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztZQUNuSCxtQkFBbUIsRUFBRTtnQkFDbkIsb0JBQW9CLEVBQUU7b0JBQ3BCLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO29CQUN0RCxjQUFjLEVBQUU7d0JBQ2QsUUFBUTt3QkFDUixhQUFhLEVBQUUsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEtBQUs7cUJBQ25EO2lCQUNGO2FBQ0Y7WUFDRCxTQUFTLEVBQUU7Z0JBQ1QsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRztnQkFDeEMscUJBQXFCLEVBQUUsS0FBSzthQUM3QjtTQUNGLENBQUMsQ0FBQTtRQUVGLHdDQUF3QztRQUN4QyxNQUFNLFdBQVcsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLHdCQUF3QixLQUFLLEVBQUUsRUFBRTtZQUN6RixZQUFZLEVBQUUsaUJBQWlCLEtBQUssRUFBRTtZQUN0QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx1Q0FBdUMsQ0FBQztZQUNwRSxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsUUFBUSxFQUFFO2dCQUNSLE1BQU0sRUFBRSxZQUFZLENBQUMsWUFBWSxDQUFDLEdBQUc7Z0JBQ3JDLE1BQU0sRUFBRSxRQUFRO2dCQUNoQixTQUFTLEVBQUUsSUFBSTtnQkFDZixRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsd0NBQXdDLENBQUM7YUFDekU7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osV0FBVyxFQUFFLFVBQVUsQ0FBQyxTQUFTO2dCQUNqQyxjQUFjLEVBQUUsYUFBYSxDQUFDLFNBQVM7Z0JBQ3ZDLGNBQWMsRUFBRSxhQUFhLENBQUMsU0FBUztnQkFDdkMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsU0FBUztnQkFDN0MsY0FBYyxFQUFFLGFBQWEsQ0FBQyxTQUFTO2dCQUN2QyxZQUFZLEVBQUUsUUFBUSxDQUFDLFVBQVU7Z0JBQ2pDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxnQkFBZ0I7YUFDckQ7U0FDRixDQUFDLENBQUE7UUFFRix1Q0FBdUM7UUFDdkMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3QyxhQUFhLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0MsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDaEQsYUFBYSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRTdDLG1GQUFtRjtRQUNuRixXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNsRCxPQUFPLEVBQUU7Z0JBQ1AsZ0JBQWdCO2FBQ2pCO1lBQ0QsU0FBUyxFQUFFO2dCQUNULEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxVQUFVO2dCQUN0QyxHQUFHLGFBQWEsQ0FBQyxRQUFRLFVBQVU7Z0JBQ25DLEdBQUcsYUFBYSxDQUFDLFFBQVEsVUFBVTtnQkFDbkMsR0FBRyxVQUFVLENBQUMsUUFBUSxVQUFVO2dCQUNoQyxHQUFHLGFBQWEsQ0FBQyxRQUFRLFVBQVU7YUFDcEM7U0FDRixDQUFDLENBQUMsQ0FBQTtRQUVILDRCQUE0QjtRQUM1QixXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNsRCxPQUFPLEVBQUU7Z0JBQ1AsMEJBQTBCO2dCQUMxQiw2QkFBNkI7Z0JBQzdCLDZCQUE2QjtnQkFDN0Isa0NBQWtDO2dCQUNsQyx1QkFBdUI7YUFDeEI7WUFDRCxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1NBQ2xDLENBQUMsQ0FBQyxDQUFBO1FBRUgsNkJBQTZCO1FBQzdCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU3RixtQkFBbUI7UUFDbkIsTUFBTSxTQUFTLEdBQUc7WUFDaEIsa0JBQWtCO1lBQ2xCLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQ3RDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFO1lBQ3pDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFO1lBQzVDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1lBQzNDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1lBQzNDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUU7WUFDbkQsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRTtZQUVuRCxxQkFBcUI7WUFDckIsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUU7WUFDcEQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUU7WUFDcEQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUU7WUFDcEQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUU7WUFDcEQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUU7WUFDcEQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUU7WUFDcEQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUU7WUFDcEQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRTtZQUN2RCxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFO1lBQ3ZELEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUU7WUFDdkQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUU7WUFDakQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUU7WUFDakQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxtQkFBbUIsRUFBRTtZQUV4RCxrQkFBa0I7WUFDbEIsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUU7WUFDOUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUU7U0FDbEQsQ0FBQTtRQUVELFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFO1lBQzVDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxRQUFRLEdBQUcsU0FBUyxVQUFVLEVBQUU7Z0JBQzVELEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDcEIsUUFBUTtnQkFDUixTQUFTO2dCQUNULFVBQVUsRUFBRSxnQkFBZ0I7YUFDN0IsQ0FBQyxDQUFBO1FBQ0osQ0FBQyxDQUFDLENBQUE7UUFFRix5QkFBeUI7UUFDekIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVTtZQUNqQyxVQUFVLEVBQUUsMkJBQTJCLEtBQUssRUFBRTtTQUMvQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLElBQUksNEJBQTRCO1lBQzdELFVBQVUsRUFBRSwyQkFBMkIsS0FBSyxFQUFFO1NBQy9DLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQW5KRCw4Q0FtSkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCAqIGFzIGFwcHN5bmMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwcHN5bmMnXG5pbXBvcnQgdHlwZSAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSdcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xuaW1wb3J0ICogYXMgbGFtYmRhTm9kZWpzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJ1xuaW1wb3J0IHR5cGUgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5pbnRlcmZhY2UgQXV0ZXVyaXVtQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZ1xuICB1c2VyUG9vbDogY29nbml0by5JVXNlclBvb2xcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uSVVzZXJQb29sQ2xpZW50XG59XG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1BcGlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBncmFwaHFsQXBpOiBhcHBzeW5jLkdyYXBocWxBcGlcbiAgXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBdXRldXJpdW1BcGlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIGNvbnN0IHsgc3RhZ2UsIHVzZXJQb29sLCB1c2VyUG9vbENsaWVudCB9ID0gcHJvcHNcblxuICAgIC8vIEltcG9ydCBEeW5hbW9EQiB0YWJsZXMgZnJvbSBkYXRhYmFzZSBzdGFja1xuICAgIGNvbnN0IHVzZXJzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdVc2Vyc1RhYmxlJywgYGF1dGV1cml1bS11c2Vycy0ke3N0YWdlfWApXG4gICAgY29uc3QgcHJvamVjdHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1Byb2plY3RzVGFibGUnLCBgYXV0ZXVyaXVtLXByb2plY3RzLSR7c3RhZ2V9YClcbiAgICBjb25zdCBzbmlwcGV0c1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnU25pcHBldHNUYWJsZScsIGBhdXRldXJpdW0tc25pcHBldHMtJHtzdGFnZX1gKVxuICAgIGNvbnN0IGNvbm5lY3Rpb25zVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdDb25uZWN0aW9uc1RhYmxlJywgYGF1dGV1cml1bS1jb25uZWN0aW9ucy0ke3N0YWdlfWApXG4gICAgY29uc3QgdmVyc2lvbnNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1ZlcnNpb25zVGFibGUnLCBgYXV0ZXVyaXVtLXZlcnNpb25zLSR7c3RhZ2V9YClcblxuICAgIC8vIENyZWF0ZSBBcHBTeW5jIEdyYXBoUUwgQVBJXG4gICAgdGhpcy5ncmFwaHFsQXBpID0gbmV3IGFwcHN5bmMuR3JhcGhxbEFwaSh0aGlzLCBgQXV0ZXVyaXVtR3JhcGhRTEFwaS0ke3N0YWdlfWAsIHtcbiAgICAgIG5hbWU6IGBhdXRldXJpdW0tYXBpLSR7c3RhZ2V9YCxcbiAgICAgIGRlZmluaXRpb246IGFwcHN5bmMuRGVmaW5pdGlvbi5mcm9tRmlsZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vcGFja2FnZXMvZ3JhcGhxbC1zY2hlbWEvc2NoZW1hLmdyYXBocWwnKSksXG4gICAgICBhdXRob3JpemF0aW9uQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHRBdXRob3JpemF0aW9uOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuVVNFUl9QT09MLFxuICAgICAgICAgIHVzZXJQb29sQ29uZmlnOiB7XG4gICAgICAgICAgICB1c2VyUG9vbCxcbiAgICAgICAgICAgIGRlZmF1bHRBY3Rpb246IGFwcHN5bmMuVXNlclBvb2xEZWZhdWx0QWN0aW9uLkFMTE9XXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbG9nQ29uZmlnOiB7XG4gICAgICAgIGZpZWxkTG9nTGV2ZWw6IGFwcHN5bmMuRmllbGRMb2dMZXZlbC5BTEwsXG4gICAgICAgIGV4Y2x1ZGVWZXJib3NlQ29udGVudDogZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBHcmFwaFFMIHJlc29sdmVyc1xuICAgIGNvbnN0IGFwaUZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgQXV0ZXVyaXVtQXBpRnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tYXBpLSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvc3JjL2luZGV4LnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBmb3JtYXQ6IGxhbWJkYU5vZGVqcy5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgICAgICB0YXJnZXQ6ICdub2RlMjInLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIHRzY29uZmlnOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3RzY29uZmlnLmpzb24nKVxuICAgICAgfSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgVVNFUlNfVEFCTEU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUk9KRUNUU19UQUJMRTogcHJvamVjdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNOSVBQRVRTX1RBQkxFOiBzbmlwcGV0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQ09OTkVDVElPTlNfVEFCTEU6IGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBWRVJTSU9OU19UQUJMRTogdmVyc2lvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZFxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9ucyB0byBMYW1iZGFcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcbiAgICBwcm9qZWN0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcbiAgICBzbmlwcGV0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcbiAgICB2ZXJzaW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIHF1ZXJ5IEdTSXMgKFF1ZXJ5IG9ubHksIFNjYW4gcmVtb3ZlZCBmb3Igc2VjdXJpdHkgYW5kIGNvc3QpXG4gICAgYXBpRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5J1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHtjb25uZWN0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7c25pcHBldHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3ZlcnNpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHt1c2Vyc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7cHJvamVjdHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgIF1cbiAgICB9KSlcblxuICAgIC8vIEdyYW50IENvZ25pdG8gcGVybWlzc2lvbnNcbiAgICBhcGlGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkRlbGV0ZVVzZXInLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyUGFzc3dvcmQnLFxuICAgICAgICAnY29nbml0by1pZHA6TGlzdFVzZXJzJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxuICAgIH0pKVxuXG4gICAgLy8gQ3JlYXRlIEFwcFN5bmMgZGF0YSBzb3VyY2VcbiAgICBjb25zdCBsYW1iZGFEYXRhU291cmNlID0gdGhpcy5ncmFwaHFsQXBpLmFkZExhbWJkYURhdGFTb3VyY2UoJ0xhbWJkYURhdGFTb3VyY2UnLCBhcGlGdW5jdGlvbilcblxuICAgIC8vIEF0dGFjaCByZXNvbHZlcnNcbiAgICBjb25zdCByZXNvbHZlcnMgPSBbXG4gICAgICAvLyBRdWVyeSByZXNvbHZlcnNcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ21lJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ1F1ZXJ5JywgZmllbGROYW1lOiAndXNlcnMnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICdwcm9qZWN0cycgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ3Byb2plY3QnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICdzbmlwcGV0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ1F1ZXJ5JywgZmllbGROYW1lOiAnc25pcHBldFZlcnNpb25zJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ1F1ZXJ5JywgZmllbGROYW1lOiAnc3lzdGVtQW5hbHl0aWNzJyB9LFxuXG4gICAgICAvLyBNdXRhdGlvbiByZXNvbHZlcnNcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2NyZWF0ZVByb2plY3QnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICd1cGRhdGVQcm9qZWN0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAnZGVsZXRlUHJvamVjdCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2NyZWF0ZVNuaXBwZXQnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICd1cGRhdGVTbmlwcGV0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAnZGVsZXRlU25pcHBldCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ3JldmVydFNuaXBwZXQnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdjcmVhdGVDb25uZWN0aW9uJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAndXBkYXRlQ29ubmVjdGlvbicgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2RlbGV0ZUNvbm5lY3Rpb24nIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdjcmVhdGVVc2VyJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAnZGVsZXRlVXNlcicgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ3Jlc2V0VXNlclBhc3N3b3JkJyB9LFxuXG4gICAgICAvLyBGaWVsZCByZXNvbHZlcnNcbiAgICAgIHsgdHlwZU5hbWU6ICdQcm9qZWN0JywgZmllbGROYW1lOiAnc25pcHBldHMnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnU25pcHBldCcsIGZpZWxkTmFtZTogJ2Nvbm5lY3Rpb25zJyB9XG4gICAgXVxuXG4gICAgcmVzb2x2ZXJzLmZvckVhY2goKHsgdHlwZU5hbWUsIGZpZWxkTmFtZSB9KSA9PiB7XG4gICAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgJHt0eXBlTmFtZX0ke2ZpZWxkTmFtZX1SZXNvbHZlcmAsIHtcbiAgICAgICAgYXBpOiB0aGlzLmdyYXBocWxBcGksXG4gICAgICAgIHR5cGVOYW1lLFxuICAgICAgICBmaWVsZE5hbWUsXG4gICAgICAgIGRhdGFTb3VyY2U6IGxhbWJkYURhdGFTb3VyY2VcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIEV4cG9ydCBHcmFwaFFMIEFQSSBVUkxcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR3JhcGhRTEFwaVVybCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmdyYXBocWxBcGkuZ3JhcGhxbFVybCxcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tR3JhcGhRTEFwaVVybC0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dyYXBoUUxBcGlLZXknLCB7XG4gICAgICB2YWx1ZTogdGhpcy5ncmFwaHFsQXBpLmFwaUtleSA/PyAnTm8gQVBJIEtleSAodXNpbmcgQ29nbml0byknLFxuICAgICAgZXhwb3J0TmFtZTogYEF1dGV1cml1bS1HcmFwaFFMQXBpS2V5LSR7c3RhZ2V9YFxuICAgIH0pXG4gIH1cbn1cbiJdfQ==