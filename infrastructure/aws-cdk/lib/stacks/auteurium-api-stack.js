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
        // Grant S3 read permissions for generating presigned URLs
        mediaBucket.grantRead(apiFunction);
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
            { typeName: 'Mutation', fieldName: 'combineSnippetConnections' },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcGktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNEI7QUFFNUIsaURBQWtDO0FBQ2xDLGlFQUFrRDtBQUNsRCxtRUFBb0Q7QUFDcEQseURBQTBDO0FBQzFDLCtEQUFnRDtBQUNoRCw0RUFBNkQ7QUFhN0QsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUc5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3JFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFOUQsNkNBQTZDO1FBQzdDLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsbUJBQW1CLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDL0YsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN4RyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3hHLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFLHlCQUF5QixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2pILE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUks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QUMsSUFBSSxFQUFFLEdBQUcsUUFBUSxHQUFHLFNBQVMsVUFBVSxFQUFFO2dCQUM1RCxHQUFHLEVBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQ3BCLFFBQVE7Z0JBQ1IsU0FBUztnQkFDVCxVQUFVLEVBQUUsZ0JBQWdCO2FBQzdCLENBQUMsQ0FBQTtRQUNKLENBQUMsQ0FBQyxDQUFBO1FBRUYseUJBQXlCO1FBQ3pCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVU7WUFDakMsVUFBVSxFQUFFLDJCQUEyQixLQUFLLEVBQUU7U0FDL0MsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLDRCQUE0QjtZQUM3RCxVQUFVLEVBQUUsMkJBQTJCLEtBQUssRUFBRTtTQUMvQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUF4SkQsOENBd0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcHBzeW5jJ1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJ1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcydcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMydcblxuaW1wb3J0IHR5cGUgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJ1xuaW1wb3J0IHR5cGUgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5pbnRlcmZhY2UgQXV0ZXVyaXVtQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZ1xuICB1c2VyUG9vbDogY29nbml0by5JVXNlclBvb2xcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uSVVzZXJQb29sQ2xpZW50XG4gIG1lZGlhQnVja2V0OiBzMy5JQnVja2V0XG59XG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1BcGlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBncmFwaHFsQXBpOiBhcHBzeW5jLkdyYXBocWxBcGlcbiAgXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBdXRldXJpdW1BcGlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIGNvbnN0IHsgc3RhZ2UsIHVzZXJQb29sLCB1c2VyUG9vbENsaWVudCwgbWVkaWFCdWNrZXQgfSA9IHByb3BzXG5cbiAgICAvLyBJbXBvcnQgRHluYW1vREIgdGFibGVzIGZyb20gZGF0YWJhc2Ugc3RhY2tcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnVXNlcnNUYWJsZScsIGBhdXRldXJpdW0tdXNlcnMtJHtzdGFnZX1gKVxuICAgIGNvbnN0IHByb2plY3RzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdQcm9qZWN0c1RhYmxlJywgYGF1dGV1cml1bS1wcm9qZWN0cy0ke3N0YWdlfWApXG4gICAgY29uc3Qgc25pcHBldHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1NuaXBwZXRzVGFibGUnLCBgYXV0ZXVyaXVtLXNuaXBwZXRzLSR7c3RhZ2V9YClcbiAgICBjb25zdCBjb25uZWN0aW9uc1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnQ29ubmVjdGlvbnNUYWJsZScsIGBhdXRldXJpdW0tY29ubmVjdGlvbnMtJHtzdGFnZX1gKVxuICAgIGNvbnN0IHZlcnNpb25zVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdWZXJzaW9uc1RhYmxlJywgYGF1dGV1cml1bS12ZXJzaW9ucy0ke3N0YWdlfWApXG5cbiAgICAvLyBDcmVhdGUgQXBwU3luYyBHcmFwaFFMIEFQSVxuICAgIHRoaXMuZ3JhcGhxbEFwaSA9IG5ldyBhcHBzeW5jLkdyYXBocWxBcGkodGhpcywgYEF1dGV1cml1bUdyYXBoUUxBcGktJHtzdGFnZX1gLCB7XG4gICAgICBuYW1lOiBgYXV0ZXVyaXVtLWFwaS0ke3N0YWdlfWAsXG4gICAgICBkZWZpbml0aW9uOiBhcHBzeW5jLkRlZmluaXRpb24uZnJvbUZpbGUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3BhY2thZ2VzL2dyYXBocWwtc2NoZW1hL3NjaGVtYS5ncmFwaHFsJykpLFxuICAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgICAgICBkZWZhdWx0QXV0aG9yaXphdGlvbjoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLlVTRVJfUE9PTCxcbiAgICAgICAgICB1c2VyUG9vbENvbmZpZzoge1xuICAgICAgICAgICAgdXNlclBvb2wsXG4gICAgICAgICAgICBkZWZhdWx0QWN0aW9uOiBhcHBzeW5jLlVzZXJQb29sRGVmYXVsdEFjdGlvbi5BTExPV1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGxvZ0NvbmZpZzoge1xuICAgICAgICBmaWVsZExvZ0xldmVsOiBhcHBzeW5jLkZpZWxkTG9nTGV2ZWwuQUxMLFxuICAgICAgICBleGNsdWRlVmVyYm9zZUNvbnRlbnQ6IGZhbHNlXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgR3JhcGhRTCByZXNvbHZlcnNcbiAgICBjb25zdCBhcGlGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYEF1dGV1cml1bUFwaUZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWFwaS0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3NyYy9pbmRleC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJylcbiAgICAgIH0sXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJPSkVDVFNfVEFCTEU6IHByb2plY3RzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTTklQUEVUU19UQUJMRTogc25pcHBldHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIENPTk5FQ1RJT05TX1RBQkxFOiBjb25uZWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVkVSU0lPTlNfVEFCTEU6IHZlcnNpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgIE1FRElBX0JVQ0tFVF9OQU1FOiBtZWRpYUJ1Y2tldC5idWNrZXROYW1lXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEdyYW50IFMzIHJlYWQgcGVybWlzc2lvbnMgZm9yIGdlbmVyYXRpbmcgcHJlc2lnbmVkIFVSTHNcbiAgICBtZWRpYUJ1Y2tldC5ncmFudFJlYWQoYXBpRnVuY3Rpb24pXG5cbiAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9ucyB0byBMYW1iZGFcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcbiAgICBwcm9qZWN0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcbiAgICBzbmlwcGV0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcbiAgICB2ZXJzaW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbilcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIHF1ZXJ5IEdTSXMgKFF1ZXJ5IG9ubHksIFNjYW4gcmVtb3ZlZCBmb3Igc2VjdXJpdHkgYW5kIGNvc3QpXG4gICAgYXBpRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5J1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHtjb25uZWN0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7c25pcHBldHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3ZlcnNpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHt1c2Vyc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7cHJvamVjdHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgIF1cbiAgICB9KSlcblxuICAgIC8vIEdyYW50IENvZ25pdG8gcGVybWlzc2lvbnNcbiAgICBhcGlGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkRlbGV0ZVVzZXInLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyUGFzc3dvcmQnLFxuICAgICAgICAnY29nbml0by1pZHA6TGlzdFVzZXJzJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxuICAgIH0pKVxuXG4gICAgLy8gQ3JlYXRlIEFwcFN5bmMgZGF0YSBzb3VyY2VcbiAgICBjb25zdCBsYW1iZGFEYXRhU291cmNlID0gdGhpcy5ncmFwaHFsQXBpLmFkZExhbWJkYURhdGFTb3VyY2UoJ0xhbWJkYURhdGFTb3VyY2UnLCBhcGlGdW5jdGlvbilcblxuICAgIC8vIEF0dGFjaCByZXNvbHZlcnNcbiAgICBjb25zdCByZXNvbHZlcnMgPSBbXG4gICAgICAvLyBRdWVyeSByZXNvbHZlcnNcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ21lJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ1F1ZXJ5JywgZmllbGROYW1lOiAndXNlcnMnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICdwcm9qZWN0cycgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdRdWVyeScsIGZpZWxkTmFtZTogJ3Byb2plY3QnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnUXVlcnknLCBmaWVsZE5hbWU6ICdzbmlwcGV0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ1F1ZXJ5JywgZmllbGROYW1lOiAnc25pcHBldFZlcnNpb25zJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ1F1ZXJ5JywgZmllbGROYW1lOiAnc3lzdGVtQW5hbHl0aWNzJyB9LFxuXG4gICAgICAvLyBNdXRhdGlvbiByZXNvbHZlcnNcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2NyZWF0ZVByb2plY3QnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICd1cGRhdGVQcm9qZWN0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAnZGVsZXRlUHJvamVjdCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2NyZWF0ZVNuaXBwZXQnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICd1cGRhdGVTbmlwcGV0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAnZGVsZXRlU25pcHBldCcgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2NvbWJpbmVTbmlwcGV0Q29ubmVjdGlvbnMnIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdyZXZlcnRTbmlwcGV0JyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAnY3JlYXRlQ29ubmVjdGlvbicgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ3VwZGF0ZUNvbm5lY3Rpb24nIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdkZWxldGVDb25uZWN0aW9uJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ011dGF0aW9uJywgZmllbGROYW1lOiAnY3JlYXRlVXNlcicgfSxcbiAgICAgIHsgdHlwZU5hbWU6ICdNdXRhdGlvbicsIGZpZWxkTmFtZTogJ2RlbGV0ZVVzZXInIH0sXG4gICAgICB7IHR5cGVOYW1lOiAnTXV0YXRpb24nLCBmaWVsZE5hbWU6ICdyZXNldFVzZXJQYXNzd29yZCcgfSxcblxuICAgICAgLy8gRmllbGQgcmVzb2x2ZXJzXG4gICAgICB7IHR5cGVOYW1lOiAnUHJvamVjdCcsIGZpZWxkTmFtZTogJ3NuaXBwZXRzJyB9LFxuICAgICAgeyB0eXBlTmFtZTogJ1NuaXBwZXQnLCBmaWVsZE5hbWU6ICdjb25uZWN0aW9ucycgfVxuICAgIF1cblxuICAgIHJlc29sdmVycy5mb3JFYWNoKCh7IHR5cGVOYW1lLCBmaWVsZE5hbWUgfSkgPT4ge1xuICAgICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYCR7dHlwZU5hbWV9JHtmaWVsZE5hbWV9UmVzb2x2ZXJgLCB7XG4gICAgICAgIGFwaTogdGhpcy5ncmFwaHFsQXBpLFxuICAgICAgICB0eXBlTmFtZSxcbiAgICAgICAgZmllbGROYW1lLFxuICAgICAgICBkYXRhU291cmNlOiBsYW1iZGFEYXRhU291cmNlXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBFeHBvcnQgR3JhcGhRTCBBUEkgVVJMXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dyYXBoUUxBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5ncmFwaHFsQXBpLmdyYXBocWxVcmwsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLUdyYXBoUUxBcGlVcmwtJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHcmFwaFFMQXBpS2V5Jywge1xuICAgICAgdmFsdWU6IHRoaXMuZ3JhcGhxbEFwaS5hcGlLZXkgPz8gJ05vIEFQSSBLZXkgKHVzaW5nIENvZ25pdG8pJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tR3JhcGhRTEFwaUtleS0ke3N0YWdlfWBcbiAgICB9KVxuICB9XG59XG4iXX0=