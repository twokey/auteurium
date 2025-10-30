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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        const { stage, userPool, userPoolClient, mediaBucket } = props;
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
            depsLockFilePath: path.join(__dirname, '../../../../package-lock.json'),
            environment: {
                STAGE: stage,
                USERS_TABLE: usersTable.tableName,
                PROJECTS_TABLE: projectsTable.tableName,
                SNIPPETS_TABLE: snippetsTable.tableName,
                CONNECTIONS_TABLE: connectionsTable.tableName,
                VERSIONS_TABLE: versionsTable.tableName,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                MEDIA_BUCKET_NAME: mediaBucket.bucketName
            }
        });
        // Grant S3 read/write permissions so the API can manage snippet media lifecycle
        mediaBucket.grantReadWrite(apiFunction);
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
            { typeName: 'Query', fieldName: 'projectConnections' },
            { typeName: 'Query', fieldName: 'snippetConnections' },
            { typeName: 'Query', fieldName: 'connectionsByType' },
            { typeName: 'Query', fieldName: 'exploreGraph' },
            { typeName: 'Query', fieldName: 'connectionStats' },
            { typeName: 'Query', fieldName: 'systemAnalytics' },
            // Mutation resolvers
            { typeName: 'Mutation', fieldName: 'createProject' },
            { typeName: 'Mutation', fieldName: 'updateProject' },
            { typeName: 'Mutation', fieldName: 'deleteProject' },
            { typeName: 'Mutation', fieldName: 'createSnippet' },
            { typeName: 'Mutation', fieldName: 'updateSnippet' },
            { typeName: 'Mutation', fieldName: 'deleteSnippet' },
            { typeName: 'Mutation', fieldName: 'combineSnippetConnections' },
            { typeName: 'Mutation', fieldName: 'revertSnippet' },
            { typeName: 'Mutation', fieldName: 'createConnection' },
            { typeName: 'Mutation', fieldName: 'updateConnection' },
            { typeName: 'Mutation', fieldName: 'deleteConnection' },
            { typeName: 'Mutation', fieldName: 'createUser' },
            { typeName: 'Mutation', fieldName: 'deleteUser' },
            { typeName: 'Mutation', fieldName: 'resetUserPassword' },
            // Field resolvers
            { typeName: 'Project', fieldName: 'snippets' }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcGktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRCO0FBRTVCLGlEQUFrQztBQUNsQyxpRUFBa0Q7QUFDbEQsbUVBQW9EO0FBQ3BELHlEQUEwQztBQUMxQywrREFBZ0Q7QUFDaEQsNEVBQTZEO0FBYTdELE1BQWEsaUJBQWtCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHOUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE2QjtRQUNyRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QixNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBRTlELDZDQUE2QztRQUM3QyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLG1CQUFtQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDeEcsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN4RyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSx5QkFBeUIsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNqSCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXhHLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEtBQUssRUFBRSxFQUFFO1lBQzdFLElBQUksRUFBRSxpQkFBaUIsS0FBSyxFQUFFO1lBQzlCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxvREFBb0QsQ0FBQyxDQUFDO1lBQ25ILG1CQUFtQixFQUFFO2dCQUNuQixvQkFBb0IsRUFBRTtvQkFDcEIsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFNBQVM7b0JBQ3RELGNBQWMsRUFBRTt3QkFDZCxRQUFRO3dCQUNSLGFBQWEsRUFBRSxPQUFPLENBQUMscUJBQXFCLENBQUMsS0FBSztxQkFDbkQ7aUJBQ0Y7YUFDRjtZQUNELFNBQVMsRUFBRTtnQkFDVCxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHO2dCQUN4QyxxQkFBcUIsRUFBRSxLQUFLO2FBQzdCO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsd0NBQXdDO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLElBQUksWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEtBQUssRUFBRSxFQUFFO1lBQ3pGLFlBQVksRUFBRSxpQkFBaUIsS0FBSyxFQUFFO1lBQ3RDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHVDQUF1QyxDQUFDO1lBQ3BFLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLFlBQVksQ0FBQyxZQUFZLENBQUMsR0FBRztnQkFDckMsTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQzthQUN6RTtZQUNELGdCQUFnQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLCtCQUErQixDQUFDO1lBQ3ZFLFdBQVcsRUFBRTtnQkFDWCxLQUFLLEVBQUUsS0FBSztnQkFDWixXQUFXLEVBQUUsVUFBVSxDQUFDLFNBQVM7Z0JBQ2pDLGNBQWMsRUFBRSxhQUFhLENBQUMsU0FBUztnQkFDdkMsY0FBYyxFQUFFLGFBQWEsQ0FBQyxTQUFTO2dCQUN2QyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO2dCQUM3QyxjQUFjLEVBQUUsYUFBYSxDQUFDLFNBQVM7Z0JBQ3ZDLFlBQVksRUFBRSxRQUFRLENBQUMsVUFBVTtnQkFDakMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLGdCQUFnQjtnQkFDcEQsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLFVBQVU7YUFDMUM7U0FDRixDQUFDLENBQUE7UUFFRixnRkFBZ0Y7UUFDaEYsV0FBVyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUV2Qyx1Q0FBdUM7UUFDdkMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3QyxhQUFhLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0MsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDaEQsYUFBYSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRTdDLG1GQUFtRjtRQUNuRixXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNsRCxPQUFPLEVBQUU7Z0JBQ1AsZ0JBQWdCO2FBQ2pCO1lBQ0QsU0FBUyxFQUFFO2dCQUNULEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxVQUFVO2dCQUN0QyxHQUFHLGFBQWEsQ0FBQyxRQUFRLFVBQVU7Z0JBQ25DLEdBQUcsYUFBYSxDQUFDLFFBQVEsVUFBVTtnQkFDbkMsR0FBRyxVQUFVLENBQUMsUUFBUSxVQUFVO2dCQUNoQyxHQUFHLGFBQWEsQ0FBQyxRQUFRLFVBQVU7YUFDcEM7U0FDRixDQUFDLENBQUMsQ0FBQTtRQUVILDRCQUE0QjtRQUM1QixXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNsRCxPQUFPLEVBQUU7Z0JBQ1AsMEJBQTBCO2dCQUMxQiw2QkFBNkI7Z0JBQzdCLDZCQUE2QjtnQkFDN0Isa0NBQWtDO2dCQUNsQyx1QkFBdUI7YUFDeEI7WUFDRCxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1NBQ2xDLENBQUMsQ0FBQyxDQUFBO1FBRUgsNkJBQTZCO1FBQzdCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU3RixtQkFBbUI7UUFDbkIsTUFBTSxTQUFTLEdBQUc7WUFDaEIsa0JBQWtCO1lBQ2xCLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQ3RDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFO1lBQ3pDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFO1lBQzVDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1lBQzNDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1lBQzNDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUU7WUFDbkQsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxvQkFBb0IsRUFBRTtZQUN0RCxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixFQUFFO1lBQ3RELEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUU7WUFDckQsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUU7WUFDaEQsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRTtZQUNuRCxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFO1lBRW5ELHFCQUFxQjtZQUNyQixFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRTtZQUNwRCxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRTtZQUNwRCxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRTtZQUNwRCxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRTtZQUNwRCxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRTtZQUNwRCxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRTtZQUNwRCxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLDJCQUEyQixFQUFFO1lBQ2hFLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFO1lBQ3BELEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUU7WUFDdkQsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRTtZQUN2RCxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFO1lBQ3ZELEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFO1lBQ2pELEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFO1lBQ2pELEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUU7WUFFeEQsa0JBQWtCO1lBQ2xCLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFO1NBQy9DLENBQUE7UUFFRCxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtZQUM1QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsUUFBUSxHQUFHLFNBQVMsVUFBVSxFQUFFO2dCQUM1RCxHQUFHLEVBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQ3BCLFFBQVE7Z0JBQ1IsU0FBUztnQkFDVCxVQUFVLEVBQUUsZ0JBQWdCO2FBQzdCLENBQUMsQ0FBQTtRQUNKLENBQUMsQ0FBQyxDQUFBO1FBRUYseUJBQXlCO1FBQ3pCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVU7WUFDakMsVUFBVSxFQUFFLDJCQUEyQixLQUFLLEVBQUU7U0FDL0MsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLDRCQUE0QjtZQUM3RCxVQUFVLEVBQUUsMkJBQTJCLEtBQUssRUFBRTtTQUMvQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUE3SkQsOENBNkpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcHBzeW5jJ1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJ1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcydcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMydcblxuaW1wb3J0IHR5cGUgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJ1xuaW1wb3J0IHR5cGUgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5pbnRlcmZhY2UgQXV0ZXVyaXVtQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZ1xuICB1c2VyUG9vbDogY29nbml0by5JVXNlclBvb2xcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uSVVzZXJQb29sQ2xpZW50XG4gIG1lZGlhQnVja2V0OiBzMy5JQnVja2V0XG59XG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1BcGlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBncmFwaHFsQXBpOiBhcHBzeW5jLkdyYXBocWxBcGlcbiAgXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBdXRldXJpdW1BcGlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIGNvbnN0IHsgc3RhZ2UsIHVzZXJQb29sLCB1c2VyUG9vbENsaWVudCwgbWVkaWFCdWNrZXQgfSA9IHByb3BzXG5cbiAgICAvLyBJbXBvcnQgRHluYW1vREIgdGFibGVzIGZyb20gZGF0YWJhc2Ugc3RhY2tcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnVXNlcnNUYWJsZScsIGBhdXRldXJpdW0tdXNlcnMtJHtzdGFnZX1gKVxuICAgIGNvbnN0IHByb2plY3RzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdQcm9qZWN0c1RhYmxlJywgYGF1dGV1cml1bS1wcm9qZWN0cy0ke3N0YWdlfWApXG4gICAgY29uc3Qgc25pcHBldHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1NuaXBwZXRzVGFibGUnLCBgYXV0ZXVyaXVtLXNuaXBwZXRzLSR7c3RhZ2V9YClcbiAgICBjb25zdCBjb25uZWN0aW9uc1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnQ29ubmVjdGlvbnNUYWJsZScsIGBhdXRldXJpdW0tY29ubmVjdGlvbnMtJHtzdGFnZX1gKVxuICAgIGNvbnN0IHZlcnNpb25zVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdWZXJzaW9uc1RhYmxlJywgYGF1dGV1cml1bS12ZXJzaW9ucy0ke3N0YWdlfWApXG5cbiAgICAvLyBDcmVhdGUgQXBwU3luYyBHcmFwaFFMIEFQSVxuICAgIHRoaXMuZ3JhcGhxbEFwaSA9IG5ldyBhcHBzeW5jLkdyYXBocWxBcGkodGhpcywgYEF1dGV1cml1bUdyYXBoUUxBcGktJHtzdGFnZX1gLCB7XG4gICAgICBuYW1lOiBgYXV0ZXVyaXVtLWFwaS0ke3N0YWdlfWAsXG4gICAgICBkZWZpbml0aW9uOiBhcHBzeW5jLkRlZmluaXRpb24uZnJvbUZpbGUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3BhY2thZ2VzL2dyYXBocWwtc2NoZW1hL3NjaGVtYS5ncmFwaHFsJykpLFxuICAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgICAgICBkZWZhdWx0QXV0aG9yaXphdGlvbjoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLlVTRVJfUE9PTCxcbiAgICAgICAgICB1c2VyUG9vbENvbmZpZzoge1xuICAgICAgICAgICAgdXNlclBvb2wsXG4gICAgICAgICAgICBkZWZhdWx0QWN0aW9uOiBhcHBzeW5jLlVzZXJQb29sRGVmYXVsdEFjdGlvbi5BTExPV1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGxvZ0NvbmZpZzoge1xuICAgICAgICBmaWVsZExvZ0xldmVsOiBhcHBzeW5jLkZpZWxkTG9nTGV2ZWwuQUxMLFxuICAgICAgICBleGNsdWRlVmVyYm9zZUNvbnRlbnQ6IGZhbHNlXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgR3JhcGhRTCByZXNvbHZlcnNcbiAgICBjb25zdCBhcGlGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYEF1dGV1cml1bUFwaUZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWFwaS0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3NyYy9pbmRleC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJylcbiAgICAgIH0sXG4gICAgICBkZXBzTG9ja0ZpbGVQYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vcGFja2FnZS1sb2NrLmpzb24nKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgVVNFUlNfVEFCTEU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUk9KRUNUU19UQUJMRTogcHJvamVjdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNOSVBQRVRTX1RBQkxFOiBzbmlwcGV0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQ09OTkVDVElPTlNfVEFCTEU6IGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBWRVJTSU9OU19UQUJMRTogdmVyc2lvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgTUVESUFfQlVDS0VUX05BTUU6IG1lZGlhQnVja2V0LmJ1Y2tldE5hbWVcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgUzMgcmVhZC93cml0ZSBwZXJtaXNzaW9ucyBzbyB0aGUgQVBJIGNhbiBtYW5hZ2Ugc25pcHBldCBtZWRpYSBsaWZlY3ljbGVcbiAgICBtZWRpYUJ1Y2tldC5ncmFudFJlYWRXcml0ZShhcGlGdW5jdGlvbilcblxuICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zIHRvIExhbWJkYVxuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUZ1bmN0aW9uKVxuICAgIHByb2plY3RzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUZ1bmN0aW9uKVxuICAgIHNuaXBwZXRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUZ1bmN0aW9uKVxuICAgIGNvbm5lY3Rpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUZ1bmN0aW9uKVxuICAgIHZlcnNpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUZ1bmN0aW9uKVxuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gcXVlcnkgR1NJcyAoUXVlcnkgb25seSwgU2NhbiByZW1vdmVkIGZvciBzZWN1cml0eSBhbmQgY29zdClcbiAgICBhcGlGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnZHluYW1vZGI6UXVlcnknXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGAke2Nvbm5lY3Rpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHtzbmlwcGV0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7dmVyc2lvbnNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3VzZXJzVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHtwcm9qZWN0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYFxuICAgICAgXVxuICAgIH0pKVxuXG4gICAgLy8gR3JhbnQgQ29nbml0byBwZXJtaXNzaW9uc1xuICAgIGFwaUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGVsZXRlVXNlcicsXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCcsXG4gICAgICAgICdjb2duaXRvLWlkcDpMaXN0VXNlcnMnXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXG4gICAgfSkpXG5cbiAgICAvLyBDcmVhdGUgQXBwU3luYyBkYXRhIHNvdXJjZVxuICAgIGNvbnN0IGxhbWJkYURhdGFTb3VyY2UgPSB0aGlzLmdyYXBocWxBcGkuYWRkTGFtYmRhRGF0YVNvdXJjZSgnTGFtYmRhRGF0YVNvdXJjZScsIGFwaUZ1bmN0aW9uKVxuXG4gICAgLy8gQXR0YWNoIHJlc29sdmVyc1xuICAgIGNvbnN0IHJlc29sdmVycyA9IFtcbiAgICAgIC8vIFF1ZXJ5IHJlc29sdmVyc1xuICAgICAgeyB0eXBlTmFtZTogJ1F1ZXJ5JywgZmllbGROYW1lOiAnbWUnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICd1c2VycycgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ3Byb2plY3RzJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ1F1ZXJ5JywgZmllbGROYW1lOiAncHJvamVjdCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ3NuaXBwZXQnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICdzbmlwcGV0VmVyc2lvbnMnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICdwcm9qZWN0Q29ubmVjdGlvbnMnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICdzbmlwcGV0Q29ubmVjdGlvbnMnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICdjb25uZWN0aW9uc0J5VHlwZScgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ2V4cGxvcmVHcmFwaCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ2Nvbm5lY3Rpb25TdGF0cycgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ3N5c3RlbUFuYWx5dGljcycgfSxcblxuICAgICAgLy8gTXV0YXRpb24gcmVzb2x2ZXJzXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdjcmVhdGVQcm9qZWN0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAndXBkYXRlUHJvamVjdCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2RlbGV0ZVByb2plY3QnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdjcmVhdGVTbmlwcGV0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAndXBkYXRlU25pcHBldCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2RlbGV0ZVNuaXBwZXQnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdjb21iaW5lU25pcHBldENvbm5lY3Rpb25zJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAncmV2ZXJ0U25pcHBldCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2NyZWF0ZUNvbm5lY3Rpb24nIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICd1cGRhdGVDb25uZWN0aW9uJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAnZGVsZXRlQ29ubmVjdGlvbicgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2NyZWF0ZVVzZXInIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdkZWxldGVVc2VyJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAncmVzZXRVc2VyUGFzc3dvcmQnIH0sXG5cbiAgICAgIC8vIEZpZWxkIHJlc29sdmVyc1xuICAgICAgeyB0eXBlTmFtZTogJ1Byb2plY3QnLCBmaWVsZE5hbWU6ICdzbmlwcGV0cycgfVxuICAgIF1cblxuICAgIHJlc29sdmVycy5mb3JFYWNoKCh7IHR5cGVOYW1lLCBmaWVsZE5hbWUgfSkgPT4ge1xuICAgICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYCR7dHlwZU5hbWV9JHtmaWVsZE5hbWV9UmVzb2x2ZXJgLCB7XG4gICAgICAgIGFwaTogdGhpcy5ncmFwaHFsQXBpLFxuICAgICAgICB0eXBlTmFtZSxcbiAgICAgICAgZmllbGROYW1lLFxuICAgICAgICBkYXRhU291cmNlOiBsYW1iZGFEYXRhU291cmNlXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBFeHBvcnQgR3JhcGhRTCBBUEkgVVJMXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dyYXBoUUxBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5ncmFwaHFsQXBpLmdyYXBocWxVcmwsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLUdyYXBoUUxBcGlVcmwtJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHcmFwaFFMQXBpS2V5Jywge1xuICAgICAgdmFsdWU6IHRoaXMuZ3JhcGhxbEFwaS5hcGlLZXkgPz8gJ05vIEFQSSBLZXkgKHVzaW5nIENvZ25pdG8pJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tR3JhcGhRTEFwaUtleS0ke3N0YWdlfWBcbiAgICB9KVxuICB9XG59XG4iXX0=