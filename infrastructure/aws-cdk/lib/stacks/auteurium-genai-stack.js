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
exports.AuteuriumGenAIStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const appsync = __importStar(require("aws-cdk-lib/aws-appsync"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class AuteuriumGenAIStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, graphqlApi, userPool, userPoolClient, mediaBucket } = props;
        // Import existing tables
        const snippetsTable = dynamodb.Table.fromTableName(this, 'SnippetsTable', `auteurium-snippets-${stage}`);
        const projectsTable = dynamodb.Table.fromTableName(this, 'ProjectsTable', `auteurium-projects-${stage}`);
        const connectionsTable = dynamodb.Table.fromTableName(this, 'ConnectionsTable', `auteurium-connections-${stage}`);
        const usersTable = dynamodb.Table.fromTableName(this, 'UsersTable', `auteurium-users-${stage}`);
        // Create Secrets Manager secret for LLM API keys
        const llmApiKeysSecret = new secretsmanager.Secret(this, `LLMApiKeysSecret-${stage}`, {
            secretName: `auteurium/genai/api-keys-${stage}`,
            description: 'API keys for LLM providers (Gemini, OpenAI, etc.)',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    gemini: 'REPLACE_WITH_ACTUAL_GEMINI_API_KEY',
                    openai: 'REPLACE_WITH_ACTUAL_OPENAI_API_KEY'
                }),
                generateStringKey: 'placeholder'
            }
        });
        // DynamoDB table for generation history
        this.generationsTable = new dynamodb.Table(this, `GenerationsTable-${stage}`, {
            tableName: `auteurium-generations-${stage}`,
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            pointInTimeRecovery: stage === 'prod'
        });
        // GSI: Query generations by snippet ID
        this.generationsTable.addGlobalSecondaryIndex({
            indexName: 'snippetId-index',
            partitionKey: {
                name: 'snippetId',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'createdAt',
                type: dynamodb.AttributeType.STRING
            }
        });
        // GSI: Track cost per user per provider
        this.generationsTable.addGlobalSecondaryIndex({
            indexName: 'userId-modelProvider-index',
            partitionKey: {
                name: 'userId',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'modelProvider',
                type: dynamodb.AttributeType.STRING
            }
        });
        // Lambda function for generateContent mutation
        const generateContentFunction = new lambdaNodejs.NodejsFunction(this, `GenerateContentFunction-${stage}`, {
            functionName: `auteurium-genai-generate-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, '../../../../services/api/src/resolvers/genai/generateContent.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(60), // Longer timeout for LLM generation
            memorySize: 1024,
            bundling: {
                format: lambdaNodejs.OutputFormat.CJS,
                target: 'node22',
                sourceMap: true,
                tsconfig: path.join(__dirname, '../../../../services/api/tsconfig.json'),
                nodeModules: ['@google/genai'] // Include Gemini SDK
            },
            depsLockFilePath: path.join(__dirname, '../../../../package-lock.json'),
            environment: {
                STAGE: stage,
                USERS_TABLE: usersTable.tableName,
                GENERATIONS_TABLE: this.generationsTable.tableName,
                SNIPPETS_TABLE: snippetsTable.tableName,
                PROJECTS_TABLE: projectsTable.tableName,
                LLM_API_KEYS_SECRET_ARN: llmApiKeysSecret.secretArn,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                APPSYNC_API_NAME: `auteurium-api-${stage}`
            }
        });
        const generateContentStreamFunction = new lambdaNodejs.NodejsFunction(this, `GenerateContentStreamFunction-${stage}`, {
            functionName: `auteurium-genai-generate-stream-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, '../../../../services/api/src/resolvers/genai/generateContentStream.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(60),
            memorySize: 1024,
            bundling: {
                format: lambdaNodejs.OutputFormat.CJS,
                target: 'node22',
                sourceMap: true,
                tsconfig: path.join(__dirname, '../../../../services/api/tsconfig.json'),
                nodeModules: ['@google/genai']
            },
            depsLockFilePath: path.join(__dirname, '../../../../package-lock.json'),
            environment: {
                STAGE: stage,
                USERS_TABLE: usersTable.tableName,
                GENERATIONS_TABLE: this.generationsTable.tableName,
                SNIPPETS_TABLE: snippetsTable.tableName,
                PROJECTS_TABLE: projectsTable.tableName,
                LLM_API_KEYS_SECRET_ARN: llmApiKeysSecret.secretArn,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                APPSYNC_API_NAME: `auteurium-api-${stage}`
            }
        });
        const appSyncFieldArn = this.formatArn({
            service: 'appsync',
            resource: 'apis',
            resourceName: `${graphqlApi.apiId}/types/*/fields/*`
        });
        // Lambda function for availableModels query
        const availableModelsFunction = new lambdaNodejs.NodejsFunction(this, `AvailableModelsFunction-${stage}`, {
            functionName: `auteurium-genai-models-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, '../../../../services/api/src/resolvers/genai/availableModels.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            bundling: {
                format: lambdaNodejs.OutputFormat.CJS,
                target: 'node22',
                sourceMap: true,
                tsconfig: path.join(__dirname, '../../../../services/api/tsconfig.json')
            },
            depsLockFilePath: path.join(__dirname, '../../../../package-lock.json'),
            environment: {
                STAGE: stage
            }
        });
        // Lambda function for generationHistory query
        const generationHistoryFunction = new lambdaNodejs.NodejsFunction(this, `GenerationHistoryFunction-${stage}`, {
            functionName: `auteurium-genai-history-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, '../../../../services/api/src/resolvers/genai/generationHistory.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
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
                GENERATIONS_TABLE: this.generationsTable.tableName,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        // Lambda function for generateSnippetImage mutation
        const generateImageFunction = new lambdaNodejs.NodejsFunction(this, `GenerateImageFunction-${stage}`, {
            functionName: `auteurium-genai-generate-image-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, '../../../../services/api/src/resolvers/snippet/generateImage.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(120), // Longer timeout for image generation
            memorySize: 1024,
            bundling: {
                format: lambdaNodejs.OutputFormat.CJS,
                target: 'node22',
                sourceMap: true,
                tsconfig: path.join(__dirname, '../../../../services/api/tsconfig.json'),
                nodeModules: ['@google/genai'] // Include Gemini SDK
            },
            depsLockFilePath: path.join(__dirname, '../../../../package-lock.json'),
            environment: {
                STAGE: stage,
                USERS_TABLE: usersTable.tableName,
                SNIPPETS_TABLE: snippetsTable.tableName,
                CONNECTIONS_TABLE: connectionsTable.tableName, // Add connections table for multimodal image generation
                GENERATIONS_TABLE: this.generationsTable.tableName,
                MEDIA_BUCKET_NAME: mediaBucket.bucketName,
                LLM_API_KEYS_SECRET_ARN: llmApiKeysSecret.secretArn,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        // Lambda function for createScenes mutation
        const createScenesFunction = new lambdaNodejs.NodejsFunction(this, `CreateScenesFunction-${stage}`, {
            functionName: `auteurium-genai-create-scenes-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, '../../../../services/api/src/resolvers/genai/createScenes.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(90), // Longer timeout for LLM generation + batch snippet creation
            memorySize: 1024,
            bundling: {
                format: lambdaNodejs.OutputFormat.CJS,
                target: 'node22',
                sourceMap: true,
                tsconfig: path.join(__dirname, '../../../../services/api/tsconfig.json'),
                nodeModules: ['@google/genai'] // Include Gemini SDK
            },
            depsLockFilePath: path.join(__dirname, '../../../../package-lock.json'),
            environment: {
                STAGE: stage,
                USERS_TABLE: usersTable.tableName,
                SNIPPETS_TABLE: snippetsTable.tableName,
                VERSIONS_TABLE: dynamodb.Table.fromTableName(this, 'VersionsTable', `auteurium-versions-${stage}`).tableName,
                GENERATIONS_TABLE: this.generationsTable.tableName,
                LLM_API_KEYS_SECRET_ARN: llmApiKeysSecret.secretArn,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        // Grant permissions
        llmApiKeysSecret.grantRead(generateContentFunction);
        llmApiKeysSecret.grantRead(generateContentStreamFunction);
        llmApiKeysSecret.grantRead(generateImageFunction);
        llmApiKeysSecret.grantRead(createScenesFunction);
        usersTable.grantReadWriteData(generateContentFunction);
        usersTable.grantReadWriteData(generateContentStreamFunction);
        usersTable.grantReadWriteData(generationHistoryFunction);
        usersTable.grantReadWriteData(generateImageFunction);
        usersTable.grantReadWriteData(createScenesFunction);
        this.generationsTable.grantReadWriteData(generateContentFunction);
        this.generationsTable.grantReadWriteData(generateContentStreamFunction);
        this.generationsTable.grantReadWriteData(generationHistoryFunction);
        this.generationsTable.grantReadWriteData(generateImageFunction);
        this.generationsTable.grantReadWriteData(createScenesFunction);
        snippetsTable.grantReadData(generateContentFunction);
        snippetsTable.grantReadData(generateContentStreamFunction);
        snippetsTable.grantReadWriteData(generateImageFunction);
        snippetsTable.grantReadWriteData(createScenesFunction); // Need write access to create scene snippets
        projectsTable.grantReadData(generateContentFunction);
        projectsTable.grantReadData(generateContentStreamFunction);
        connectionsTable.grantReadData(generateImageFunction); // Need to query connections for multimodal image generation
        mediaBucket.grantReadWrite(generateImageFunction);
        // Grant versions table write access for createScenes
        const versionsTable = dynamodb.Table.fromTableName(this, 'VersionsTableForScenes', `auteurium-versions-${stage}`);
        versionsTable.grantWriteData(createScenesFunction);
        // Grant GSI query permissions
        generateContentFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${this.generationsTable.tableArn}/index/*`,
                `${snippetsTable.tableArn}/index/*`,
                `${projectsTable.tableArn}/index/*`,
                `${usersTable.tableArn}/index/*`
            ]
        }));
        generateContentStreamFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${this.generationsTable.tableArn}/index/*`,
                `${snippetsTable.tableArn}/index/*`,
                `${projectsTable.tableArn}/index/*`,
                `${usersTable.tableArn}/index/*`
            ]
        }));
        generateContentStreamFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['appsync:GraphQL'],
            resources: [appSyncFieldArn]
        }));
        generateContentStreamFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['appsync:ListGraphqlApis'],
            resources: ['*']
        }));
        generationHistoryFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${this.generationsTable.tableArn}/index/*`,
                `${usersTable.tableArn}/index/*`
            ]
        }));
        // Grant GSI query permissions for generateImageFunction
        generateImageFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${connectionsTable.tableArn}/index/*`, // Need to query connections by targetSnippetId
                `${snippetsTable.tableArn}/index/*`,
                `${usersTable.tableArn}/index/*`
            ]
        }));
        // Grant GSI query permissions for createScenesFunction
        createScenesFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${this.generationsTable.tableArn}/index/*`,
                `${snippetsTable.tableArn}/index/*`,
                `${usersTable.tableArn}/index/*`
            ]
        }));
        // Create AppSync data sources
        const generateContentDataSource = new appsync.LambdaDataSource(this, `GenerateContentDataSource-${stage}`, {
            api: graphqlApi,
            name: `genai-generate-${stage}`,
            lambdaFunction: generateContentFunction
        });
        const generateContentStreamDataSource = new appsync.LambdaDataSource(this, `GenerateContentStreamDataSource-${stage}`, {
            api: graphqlApi,
            name: `genai-generate-stream-${stage}`,
            lambdaFunction: generateContentStreamFunction
        });
        const availableModelsDataSource = new appsync.LambdaDataSource(this, `AvailableModelsDataSource-${stage}`, {
            api: graphqlApi,
            name: `genai-models-${stage}`,
            lambdaFunction: availableModelsFunction
        });
        const generationHistoryDataSource = new appsync.LambdaDataSource(this, `GenerationHistoryDataSource-${stage}`, {
            api: graphqlApi,
            name: `genai-history-${stage}`,
            lambdaFunction: generationHistoryFunction
        });
        const generateImageDataSource = new appsync.LambdaDataSource(this, `GenerateImageDataSource-${stage}`, {
            api: graphqlApi,
            name: `genai-generate-image-${stage}`,
            lambdaFunction: generateImageFunction
        });
        const createScenesDataSource = new appsync.LambdaDataSource(this, `CreateScenesDataSource-${stage}`, {
            api: graphqlApi,
            name: `genai-create-scenes-${stage}`,
            lambdaFunction: createScenesFunction
        });
        const generationStreamEventsDataSource = new appsync.NoneDataSource(this, `GenerationStreamEventsDataSource-${stage}`, {
            api: graphqlApi,
            name: `genai-stream-events-${stage}`
        });
        // Create resolvers
        new appsync.Resolver(this, `GenerateContentResolver-${stage}`, {
            api: graphqlApi,
            typeName: 'Mutation',
            fieldName: 'generateContent',
            dataSource: generateContentDataSource
        });
        new appsync.Resolver(this, `GenerateContentStreamResolver-${stage}`, {
            api: graphqlApi,
            typeName: 'Mutation',
            fieldName: 'generateContentStream',
            dataSource: generateContentStreamDataSource
        });
        new appsync.Resolver(this, `AvailableModelsResolver-${stage}`, {
            api: graphqlApi,
            typeName: 'Query',
            fieldName: 'availableModels',
            dataSource: availableModelsDataSource
        });
        new appsync.Resolver(this, `GenerationHistoryResolver-${stage}`, {
            api: graphqlApi,
            typeName: 'Query',
            fieldName: 'generationHistory',
            dataSource: generationHistoryDataSource
        });
        new appsync.Resolver(this, `GenerateSnippetImageResolver-${stage}`, {
            api: graphqlApi,
            typeName: 'Mutation',
            fieldName: 'generateSnippetImage',
            dataSource: generateImageDataSource
        });
        new appsync.Resolver(this, `CreateScenesResolver-${stage}`, {
            api: graphqlApi,
            typeName: 'Mutation',
            fieldName: 'createScenes',
            dataSource: createScenesDataSource
        });
        new appsync.Resolver(this, `PublishGenerationStreamEventResolver-${stage}`, {
            api: graphqlApi,
            typeName: 'Mutation',
            fieldName: 'publishGenerationStreamEvent',
            dataSource: generationStreamEventsDataSource,
            requestMappingTemplate: appsync.MappingTemplate.fromString('$util.toJson($ctx.arguments.input)'),
            responseMappingTemplate: appsync.MappingTemplate.fromString('$util.toJson($ctx.arguments.input)')
        });
        // Subscription resolver with server-side filtering by snippetId
        // Returns null for non-matching events (which is now allowed since return type is nullable)
        new appsync.Resolver(this, `OnGenerationStreamSubscriptionResolver-${stage}`, {
            api: graphqlApi,
            typeName: 'Subscription',
            fieldName: 'onGenerationStream',
            dataSource: generationStreamEventsDataSource,
            requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2018-05-29",
          "payload": {}
        }
      `),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
        ## Filter: only forward events where snippetId matches the subscription argument
        #if($ctx.result && $ctx.result.snippetId && $ctx.result.snippetId == $ctx.args.snippetId)
          $util.toJson($ctx.result)
        #else
          ## Return null to skip this event (nullable return type allows this)
          null
        #end
      `)
        });
        // CloudWatch alarms for cost monitoring (optional for dev)
        if (stage === 'prod') {
            // TODO: Add CloudWatch alarms for:
            // - Daily generation cost exceeds budget
            // - Error rate > 5%
            // - Latency > 30 seconds
        }
        // Outputs
        new cdk.CfnOutput(this, 'GenerationsTableName', {
            value: this.generationsTable.tableName,
            description: 'DynamoDB table for generation history'
        });
        new cdk.CfnOutput(this, 'LLMApiKeysSecretArn', {
            value: llmApiKeysSecret.secretArn,
            description: 'Secrets Manager ARN for LLM API keys'
        });
    }
}
exports.AuteuriumGenAIStack = AuteuriumGenAIStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWdlbmFpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0ZXVyaXVtLWdlbmFpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE0QjtBQUU1QixpREFBa0M7QUFDbEMsaUVBQWtEO0FBRWxELG1FQUFvRDtBQUNwRCx5REFBMEM7QUFDMUMsK0RBQWdEO0FBQ2hELDRFQUE2RDtBQUU3RCwrRUFBZ0U7QUFZaEUsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUdoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBRTFFLHlCQUF5QjtRQUN6QixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3hHLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDeEcsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUseUJBQXlCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDakgsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxtQkFBbUIsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUUvRixpREFBaUQ7UUFDakQs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IHBhdGggZnJvbSAncGF0aCdcblxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgYXBwc3luYyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBwc3luYydcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSdcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xuaW1wb3J0ICogYXMgbGFtYmRhTm9kZWpzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJ1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJ1xuXG5pbXBvcnQgdHlwZSB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5cbmludGVyZmFjZSBBdXRldXJpdW1HZW5BSVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmdcbiAgZ3JhcGhxbEFwaTogYXBwc3luYy5JR3JhcGhxbEFwaVxuICB1c2VyUG9vbDogY29nbml0by5JVXNlclBvb2xcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uSVVzZXJQb29sQ2xpZW50XG4gIG1lZGlhQnVja2V0OiBzMy5JQnVja2V0XG59XG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1HZW5BSVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGdlbmVyYXRpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEF1dGV1cml1bUdlbkFJU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpXG5cbiAgICBjb25zdCB7IHN0YWdlLCBncmFwaHFsQXBpLCB1c2VyUG9vbCwgdXNlclBvb2xDbGllbnQsIG1lZGlhQnVja2V0IH0gPSBwcm9wc1xuXG4gICAgLy8gSW1wb3J0IGV4aXN0aW5nIHRhYmxlc1xuICAgIGNvbnN0IHNuaXBwZXRzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdTbmlwcGV0c1RhYmxlJywgYGF1dGV1cml1bS1zbmlwcGV0cy0ke3N0YWdlfWApXG4gICAgY29uc3QgcHJvamVjdHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1Byb2plY3RzVGFibGUnLCBgYXV0ZXVyaXVtLXByb2plY3RzLSR7c3RhZ2V9YClcbiAgICBjb25zdCBjb25uZWN0aW9uc1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnQ29ubmVjdGlvbnNUYWJsZScsIGBhdXRldXJpdW0tY29ubmVjdGlvbnMtJHtzdGFnZX1gKVxuICAgIGNvbnN0IHVzZXJzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdVc2Vyc1RhYmxlJywgYGF1dGV1cml1bS11c2Vycy0ke3N0YWdlfWApXG5cbiAgICAvLyBDcmVhdGUgU2VjcmV0cyBNYW5hZ2VyIHNlY3JldCBmb3IgTExNIEFQSSBrZXlzXG4gICAgY29uc3QgbGxtQXBpS2V5c1NlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgYExMTUFwaUtleXNTZWNyZXQtJHtzdGFnZX1gLCB7XG4gICAgICBzZWNyZXROYW1lOiBgYXV0ZXVyaXVtL2dlbmFpL2FwaS1rZXlzLSR7c3RhZ2V9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGtleXMgZm9yIExMTSBwcm92aWRlcnMgKEdlbWluaSwgT3BlbkFJLCBldGMuKScsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGdlbWluaTogJ1JFUExBQ0VfV0lUSF9BQ1RVQUxfR0VNSU5JX0FQSV9LRVknLFxuICAgICAgICAgIG9wZW5haTogJ1JFUExBQ0VfV0lUSF9BQ1RVQUxfT1BFTkFJX0FQSV9LRVknXG4gICAgICAgIH0pLFxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3BsYWNlaG9sZGVyJ1xuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZSBmb3IgZ2VuZXJhdGlvbiBoaXN0b3J5XG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGBHZW5lcmF0aW9uc1RhYmxlLSR7c3RhZ2V9YCwge1xuICAgICAgdGFibGVOYW1lOiBgYXV0ZXVyaXVtLWdlbmVyYXRpb25zLSR7c3RhZ2V9YCxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnUEsnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ1NLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBzdGFnZSA9PT0gJ3Byb2QnXG4gICAgfSlcblxuICAgIC8vIEdTSTogUXVlcnkgZ2VuZXJhdGlvbnMgYnkgc25pcHBldCBJRFxuICAgIHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdzbmlwcGV0SWQtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdzbmlwcGV0SWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ2NyZWF0ZWRBdCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEdTSTogVHJhY2sgY29zdCBwZXIgdXNlciBwZXIgcHJvdmlkZXJcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAndXNlcklkLW1vZGVsUHJvdmlkZXItaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICd1c2VySWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ21vZGVsUHJvdmlkZXInLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGdlbmVyYXRlQ29udGVudCBtdXRhdGlvblxuICAgIGNvbnN0IGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgR2VuZXJhdGVDb250ZW50RnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tZ2VuYWktZ2VuZXJhdGUtJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2dlbmVyYXRlQ29udGVudC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAvLyBMb25nZXIgdGltZW91dCBmb3IgTExNIGdlbmVyYXRpb25cbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBmb3JtYXQ6IGxhbWJkYU5vZGVqcy5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgICAgICB0YXJnZXQ6ICdub2RlMjInLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIHRzY29uZmlnOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3RzY29uZmlnLmpzb24nKSxcbiAgICAgICAgbm9kZU1vZHVsZXM6IFsnQGdvb2dsZS9nZW5haSddIC8vIEluY2x1ZGUgR2VtaW5pIFNES1xuICAgICAgfSxcbiAgICAgIGRlcHNMb2NrRmlsZVBhdGg6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9wYWNrYWdlLWxvY2suanNvbicpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBR0U6IHN0YWdlLFxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEdFTkVSQVRJT05TX1RBQkxFOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTTklQUEVUU19UQUJMRTogc25pcHBldHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBST0pFQ1RTX1RBQkxFOiBwcm9qZWN0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTExNX0FQSV9LRVlTX1NFQ1JFVF9BUk46IGxsbUFwaUtleXNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgIEFQUFNZTkNfQVBJX05BTUU6IGBhdXRldXJpdW0tYXBpLSR7c3RhZ2V9YFxuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCBnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYEdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWdlbmFpLWdlbmVyYXRlLXN0cmVhbS0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3NyYy9yZXNvbHZlcnMvZ2VuYWkvZ2VuZXJhdGVDb250ZW50U3RyZWFtLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJyksXG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ0Bnb29nbGUvZ2VuYWknXVxuICAgICAgfSxcbiAgICAgIGRlcHNMb2NrRmlsZVBhdGg6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9wYWNrYWdlLWxvY2suanNvbicpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBR0U6IHN0YWdlLFxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEdFTkVSQVRJT05TX1RBQkxFOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTTklQUEVUU19UQUJMRTogc25pcHBldHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBST0pFQ1RTX1RBQkxFOiBwcm9qZWN0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTExNX0FQSV9LRVlTX1NFQ1JFVF9BUk46IGxsbUFwaUtleXNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgIEFQUFNZTkNfQVBJX05BTUU6IGBhdXRldXJpdW0tYXBpLSR7c3RhZ2V9YFxuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCBhcHBTeW5jRmllbGRBcm4gPSB0aGlzLmZvcm1hdEFybih7XG4gICAgICBzZXJ2aWNlOiAnYXBwc3luYycsXG4gICAgICByZXNvdXJjZTogJ2FwaXMnLFxuICAgICAgcmVzb3VyY2VOYW1lOiBgJHtncmFwaHFsQXBpLmFwaUlkfS90eXBlcy8qL2ZpZWxkcy8qYFxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGF2YWlsYWJsZU1vZGVscyBxdWVyeVxuICAgIGNvbnN0IGF2YWlsYWJsZU1vZGVsc0Z1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgQXZhaWxhYmxlTW9kZWxzRnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tZ2VuYWktbW9kZWxzLSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvc3JjL3Jlc29sdmVycy9nZW5haS9hdmFpbGFibGVNb2RlbHMudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZWpzLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIHRhcmdldDogJ25vZGUyMicsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgdHNjb25maWc6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvdHNjb25maWcuanNvbicpXG4gICAgICB9LFxuICAgICAgZGVwc0xvY2tGaWxlUGF0aDogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3BhY2thZ2UtbG9jay5qc29uJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2VcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBnZW5lcmF0aW9uSGlzdG9yeSBxdWVyeVxuICAgIGNvbnN0IGdlbmVyYXRpb25IaXN0b3J5RnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsIGBHZW5lcmF0aW9uSGlzdG9yeUZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWdlbmFpLWhpc3RvcnktJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2dlbmVyYXRpb25IaXN0b3J5LnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBmb3JtYXQ6IGxhbWJkYU5vZGVqcy5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgICAgICB0YXJnZXQ6ICdub2RlMjInLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIHRzY29uZmlnOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3RzY29uZmlnLmpzb24nKVxuICAgICAgfSxcbiAgICAgIGRlcHNMb2NrRmlsZVBhdGg6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9wYWNrYWdlLWxvY2suanNvbicpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBR0U6IHN0YWdlLFxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEdFTkVSQVRJT05TX1RBQkxFOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBnZW5lcmF0ZVNuaXBwZXRJbWFnZSBtdXRhdGlvblxuICAgIGNvbnN0IGdlbmVyYXRlSW1hZ2VGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYEdlbmVyYXRlSW1hZ2VGdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS1nZW5haS1nZW5lcmF0ZS1pbWFnZS0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3NyYy9yZXNvbHZlcnMvc25pcHBldC9nZW5lcmF0ZUltYWdlLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMjApLCAvLyBMb25nZXIgdGltZW91dCBmb3IgaW1hZ2UgZ2VuZXJhdGlvblxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZWpzLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIHRhcmdldDogJ25vZGUyMicsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgdHNjb25maWc6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvdHNjb25maWcuanNvbicpLFxuICAgICAgICBub2RlTW9kdWxlczogWydAZ29vZ2xlL2dlbmFpJ10gLy8gSW5jbHVkZSBHZW1pbmkgU0RLXG4gICAgICB9LFxuICAgICAgZGVwc0xvY2tGaWxlUGF0aDogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3BhY2thZ2UtbG9jay5qc29uJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgU05JUFBFVFNfVEFCTEU6IHNuaXBwZXRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBDT05ORUNUSU9OU19UQUJMRTogY29ubmVjdGlvbnNUYWJsZS50YWJsZU5hbWUsIC8vIEFkZCBjb25uZWN0aW9ucyB0YWJsZSBmb3IgbXVsdGltb2RhbCBpbWFnZSBnZW5lcmF0aW9uXG4gICAgICAgIEdFTkVSQVRJT05TX1RBQkxFOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBNRURJQV9CVUNLRVRfTkFNRTogbWVkaWFCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgTExNX0FQSV9LRVlTX1NFQ1JFVF9BUk46IGxsbUFwaUtleXNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBjcmVhdGVTY2VuZXMgbXV0YXRpb25cbiAgICBjb25zdCBjcmVhdGVTY2VuZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYENyZWF0ZVNjZW5lc0Z1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWdlbmFpLWNyZWF0ZS1zY2VuZXMtJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2NyZWF0ZVNjZW5lcy50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoOTApLCAvLyBMb25nZXIgdGltZW91dCBmb3IgTExNIGdlbmVyYXRpb24gKyBiYXRjaCBzbmlwcGV0IGNyZWF0aW9uXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJyksXG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ0Bnb29nbGUvZ2VuYWknXSAvLyBJbmNsdWRlIEdlbWluaSBTREtcbiAgICAgIH0sXG4gICAgICBkZXBzTG9ja0ZpbGVQYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vcGFja2FnZS1sb2NrLmpzb24nKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgVVNFUlNfVEFCTEU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTTklQUEVUU19UQUJMRTogc25pcHBldHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFZFUlNJT05TX1RBQkxFOiBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdWZXJzaW9uc1RhYmxlJywgYGF1dGV1cml1bS12ZXJzaW9ucy0ke3N0YWdlfWApLnRhYmxlTmFtZSxcbiAgICAgICAgR0VORVJBVElPTlNfVEFCTEU6IHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIExMTV9BUElfS0VZU19TRUNSRVRfQVJOOiBsbG1BcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zXG4gICAgbGxtQXBpS2V5c1NlY3JldC5ncmFudFJlYWQoZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24pXG4gICAgbGxtQXBpS2V5c1NlY3JldC5ncmFudFJlYWQoZ2VuZXJhdGVDb250ZW50U3RyZWFtRnVuY3Rpb24pXG4gICAgbGxtQXBpS2V5c1NlY3JldC5ncmFudFJlYWQoZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uKVxuICAgIGxsbUFwaUtleXNTZWNyZXQuZ3JhbnRSZWFkKGNyZWF0ZVNjZW5lc0Z1bmN0aW9uKVxuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uKVxuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uKVxuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRpb25IaXN0b3J5RnVuY3Rpb24pXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uKVxuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNyZWF0ZVNjZW5lc0Z1bmN0aW9uKVxuICAgIHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24pXG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbilcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRpb25IaXN0b3J5RnVuY3Rpb24pXG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZW5lcmF0ZUltYWdlRnVuY3Rpb24pXG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVTY2VuZXNGdW5jdGlvbilcbiAgICBzbmlwcGV0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24pXG4gICAgc25pcHBldHNUYWJsZS5ncmFudFJlYWREYXRhKGdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uKVxuICAgIHNuaXBwZXRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRlSW1hZ2VGdW5jdGlvbilcbiAgICBzbmlwcGV0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVTY2VuZXNGdW5jdGlvbikgLy8gTmVlZCB3cml0ZSBhY2Nlc3MgdG8gY3JlYXRlIHNjZW5lIHNuaXBwZXRzXG4gICAgcHJvamVjdHNUYWJsZS5ncmFudFJlYWREYXRhKGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uKVxuICAgIHByb2plY3RzVGFibGUuZ3JhbnRSZWFkRGF0YShnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbilcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZERhdGEoZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uKSAvLyBOZWVkIHRvIHF1ZXJ5IGNvbm5lY3Rpb25zIGZvciBtdWx0aW1vZGFsIGltYWdlIGdlbmVyYXRpb25cbiAgICBtZWRpYUJ1Y2tldC5ncmFudFJlYWRXcml0ZShnZW5lcmF0ZUltYWdlRnVuY3Rpb24pXG5cbiAgICAvLyBHcmFudCB2ZXJzaW9ucyB0YWJsZSB3cml0ZSBhY2Nlc3MgZm9yIGNyZWF0ZVNjZW5lc1xuICAgIGNvbnN0IHZlcnNpb25zVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdWZXJzaW9uc1RhYmxlRm9yU2NlbmVzJywgYGF1dGV1cml1bS12ZXJzaW9ucy0ke3N0YWdlfWApXG4gICAgdmVyc2lvbnNUYWJsZS5ncmFudFdyaXRlRGF0YShjcmVhdGVTY2VuZXNGdW5jdGlvbilcblxuICAgIC8vIEdyYW50IEdTSSBxdWVyeSBwZXJtaXNzaW9uc1xuICAgIGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlF1ZXJ5J10sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYCR7dGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7c25pcHBldHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3Byb2plY3RzVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHt1c2Vyc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYFxuICAgICAgXVxuICAgIH0pKVxuXG4gICAgZ2VuZXJhdGVDb250ZW50U3RyZWFtRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6UXVlcnknXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHt0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHtzbmlwcGV0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7cHJvamVjdHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3VzZXJzVGFibGUudGFibGVBcm59L2luZGV4LypgXG4gICAgICBdXG4gICAgfSkpXG5cbiAgICBnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydhcHBzeW5jOkdyYXBoUUwnXSxcbiAgICAgIHJlc291cmNlczogW2FwcFN5bmNGaWVsZEFybl1cbiAgICB9KSlcblxuICAgIGdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2FwcHN5bmM6TGlzdEdyYXBocWxBcGlzJ10sXG4gICAgICByZXNvdXJjZXM6IFsnKiddXG4gICAgfSkpXG5cbiAgICBnZW5lcmF0aW9uSGlzdG9yeUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlF1ZXJ5J10sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYCR7dGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7dXNlcnNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgIF1cbiAgICB9KSlcblxuICAgIC8vIEdyYW50IEdTSSBxdWVyeSBwZXJtaXNzaW9ucyBmb3IgZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uXG4gICAgZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlF1ZXJ5J10sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYCR7Y29ubmVjdGlvbnNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsIC8vIE5lZWQgdG8gcXVlcnkgY29ubmVjdGlvbnMgYnkgdGFyZ2V0U25pcHBldElkXG4gICAgICAgIGAke3NuaXBwZXRzVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHt1c2Vyc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYFxuICAgICAgXVxuICAgIH0pKVxuXG4gICAgLy8gR3JhbnQgR1NJIHF1ZXJ5IHBlcm1pc3Npb25zIGZvciBjcmVhdGVTY2VuZXNGdW5jdGlvblxuICAgIGNyZWF0ZVNjZW5lc0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlF1ZXJ5J10sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYCR7dGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7c25pcHBldHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3VzZXJzVGFibGUudGFibGVBcm59L2luZGV4LypgXG4gICAgICBdXG4gICAgfSkpXG5cbiAgICAvLyBDcmVhdGUgQXBwU3luYyBkYXRhIHNvdXJjZXNcbiAgICBjb25zdCBnZW5lcmF0ZUNvbnRlbnREYXRhU291cmNlID0gbmV3IGFwcHN5bmMuTGFtYmRhRGF0YVNvdXJjZSh0aGlzLCBgR2VuZXJhdGVDb250ZW50RGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1nZW5lcmF0ZS0ke3N0YWdlfWAsXG4gICAgICBsYW1iZGFGdW5jdGlvbjogZ2VuZXJhdGVDb250ZW50RnVuY3Rpb25cbiAgICB9KVxuXG4gICAgY29uc3QgZ2VuZXJhdGVDb250ZW50U3RyZWFtRGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLkxhbWJkYURhdGFTb3VyY2UodGhpcywgYEdlbmVyYXRlQ29udGVudFN0cmVhbURhdGFTb3VyY2UtJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICBuYW1lOiBgZ2VuYWktZ2VuZXJhdGUtc3RyZWFtLSR7c3RhZ2V9YCxcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvblxuICAgIH0pXG5cbiAgICBjb25zdCBhdmFpbGFibGVNb2RlbHNEYXRhU291cmNlID0gbmV3IGFwcHN5bmMuTGFtYmRhRGF0YVNvdXJjZSh0aGlzLCBgQXZhaWxhYmxlTW9kZWxzRGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1tb2RlbHMtJHtzdGFnZX1gLFxuICAgICAgbGFtYmRhRnVuY3Rpb246IGF2YWlsYWJsZU1vZGVsc0Z1bmN0aW9uXG4gICAgfSlcblxuICAgIGNvbnN0IGdlbmVyYXRpb25IaXN0b3J5RGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLkxhbWJkYURhdGFTb3VyY2UodGhpcywgYEdlbmVyYXRpb25IaXN0b3J5RGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1oaXN0b3J5LSR7c3RhZ2V9YCxcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBnZW5lcmF0aW9uSGlzdG9yeUZ1bmN0aW9uXG4gICAgfSlcblxuICAgIGNvbnN0IGdlbmVyYXRlSW1hZ2VEYXRhU291cmNlID0gbmV3IGFwcHN5bmMuTGFtYmRhRGF0YVNvdXJjZSh0aGlzLCBgR2VuZXJhdGVJbWFnZURhdGFTb3VyY2UtJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICBuYW1lOiBgZ2VuYWktZ2VuZXJhdGUtaW1hZ2UtJHtzdGFnZX1gLFxuICAgICAgbGFtYmRhRnVuY3Rpb246IGdlbmVyYXRlSW1hZ2VGdW5jdGlvblxuICAgIH0pXG5cbiAgICBjb25zdCBjcmVhdGVTY2VuZXNEYXRhU291cmNlID0gbmV3IGFwcHN5bmMuTGFtYmRhRGF0YVNvdXJjZSh0aGlzLCBgQ3JlYXRlU2NlbmVzRGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1jcmVhdGUtc2NlbmVzLSR7c3RhZ2V9YCxcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBjcmVhdGVTY2VuZXNGdW5jdGlvblxuICAgIH0pXG5cbiAgICBjb25zdCBnZW5lcmF0aW9uU3RyZWFtRXZlbnRzRGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLk5vbmVEYXRhU291cmNlKHRoaXMsIGBHZW5lcmF0aW9uU3RyZWFtRXZlbnRzRGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1zdHJlYW0tZXZlbnRzLSR7c3RhZ2V9YFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgcmVzb2x2ZXJzXG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYEdlbmVyYXRlQ29udGVudFJlc29sdmVyLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdnZW5lcmF0ZUNvbnRlbnQnLFxuICAgICAgZGF0YVNvdXJjZTogZ2VuZXJhdGVDb250ZW50RGF0YVNvdXJjZVxuICAgIH0pXG5cbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgR2VuZXJhdGVDb250ZW50U3RyZWFtUmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2dlbmVyYXRlQ29udGVudFN0cmVhbScsXG4gICAgICBkYXRhU291cmNlOiBnZW5lcmF0ZUNvbnRlbnRTdHJlYW1EYXRhU291cmNlXG4gICAgfSlcblxuICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsIGBBdmFpbGFibGVNb2RlbHNSZXNvbHZlci0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnYXZhaWxhYmxlTW9kZWxzJyxcbiAgICAgIGRhdGFTb3VyY2U6IGF2YWlsYWJsZU1vZGVsc0RhdGFTb3VyY2VcbiAgICB9KVxuXG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYEdlbmVyYXRpb25IaXN0b3J5UmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dlbmVyYXRpb25IaXN0b3J5JyxcbiAgICAgIGRhdGFTb3VyY2U6IGdlbmVyYXRpb25IaXN0b3J5RGF0YVNvdXJjZVxuICAgIH0pXG5cbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgR2VuZXJhdGVTbmlwcGV0SW1hZ2VSZXNvbHZlci0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnZ2VuZXJhdGVTbmlwcGV0SW1hZ2UnLFxuICAgICAgZGF0YVNvdXJjZTogZ2VuZXJhdGVJbWFnZURhdGFTb3VyY2VcbiAgICB9KVxuXG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYENyZWF0ZVNjZW5lc1Jlc29sdmVyLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdjcmVhdGVTY2VuZXMnLFxuICAgICAgZGF0YVNvdXJjZTogY3JlYXRlU2NlbmVzRGF0YVNvdXJjZVxuICAgIH0pXG5cbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgUHVibGlzaEdlbmVyYXRpb25TdHJlYW1FdmVudFJlc29sdmVyLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdwdWJsaXNoR2VuZXJhdGlvblN0cmVhbUV2ZW50JyxcbiAgICAgIGRhdGFTb3VyY2U6IGdlbmVyYXRpb25TdHJlYW1FdmVudHNEYXRhU291cmNlLFxuICAgICAgcmVxdWVzdE1hcHBpbmdUZW1wbGF0ZTogYXBwc3luYy5NYXBwaW5nVGVtcGxhdGUuZnJvbVN0cmluZygnJHV0aWwudG9Kc29uKCRjdHguYXJndW1lbnRzLmlucHV0KScpLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21TdHJpbmcoJyR1dGlsLnRvSnNvbigkY3R4LmFyZ3VtZW50cy5pbnB1dCknKVxuICAgIH0pXG5cbiAgICAvLyBTdWJzY3JpcHRpb24gcmVzb2x2ZXIgd2l0aCBzZXJ2ZXItc2lkZSBmaWx0ZXJpbmcgYnkgc25pcHBldElkXG4gICAgLy8gUmV0dXJucyBudWxsIGZvciBub24tbWF0Y2hpbmcgZXZlbnRzICh3aGljaCBpcyBub3cgYWxsb3dlZCBzaW5jZSByZXR1cm4gdHlwZSBpcyBudWxsYWJsZSlcbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgT25HZW5lcmF0aW9uU3RyZWFtU3Vic2NyaXB0aW9uUmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ1N1YnNjcmlwdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdvbkdlbmVyYXRpb25TdHJlYW0nLFxuICAgICAgZGF0YVNvdXJjZTogZ2VuZXJhdGlvblN0cmVhbUV2ZW50c0RhdGFTb3VyY2UsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tU3RyaW5nKGBcbiAgICAgICAge1xuICAgICAgICAgIFwidmVyc2lvblwiOiBcIjIwMTgtMDUtMjlcIixcbiAgICAgICAgICBcInBheWxvYWRcIjoge31cbiAgICAgICAgfVxuICAgICAgYCksXG4gICAgICByZXNwb25zZU1hcHBpbmdUZW1wbGF0ZTogYXBwc3luYy5NYXBwaW5nVGVtcGxhdGUuZnJvbVN0cmluZyhgXG4gICAgICAgICMjIEZpbHRlcjogb25seSBmb3J3YXJkIGV2ZW50cyB3aGVyZSBzbmlwcGV0SWQgbWF0Y2hlcyB0aGUgc3Vic2NyaXB0aW9uIGFyZ3VtZW50XG4gICAgICAgICNpZigkY3R4LnJlc3VsdCAmJiAkY3R4LnJlc3VsdC5zbmlwcGV0SWQgJiYgJGN0eC5yZXN1bHQuc25pcHBldElkID09ICRjdHguYXJncy5zbmlwcGV0SWQpXG4gICAgICAgICAgJHV0aWwudG9Kc29uKCRjdHgucmVzdWx0KVxuICAgICAgICAjZWxzZVxuICAgICAgICAgICMjIFJldHVybiBudWxsIHRvIHNraXAgdGhpcyBldmVudCAobnVsbGFibGUgcmV0dXJuIHR5cGUgYWxsb3dzIHRoaXMpXG4gICAgICAgICAgbnVsbFxuICAgICAgICAjZW5kXG4gICAgICBgKVxuICAgIH0pXG5cbiAgICAvLyBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgY29zdCBtb25pdG9yaW5nIChvcHRpb25hbCBmb3IgZGV2KVxuICAgIGlmIChzdGFnZSA9PT0gJ3Byb2QnKSB7XG4gICAgICAvLyBUT0RPOiBBZGQgQ2xvdWRXYXRjaCBhbGFybXMgZm9yOlxuICAgICAgLy8gLSBEYWlseSBnZW5lcmF0aW9uIGNvc3QgZXhjZWVkcyBidWRnZXRcbiAgICAgIC8vIC0gRXJyb3IgcmF0ZSA+IDUlXG4gICAgICAvLyAtIExhdGVuY3kgPiAzMCBzZWNvbmRzXG4gICAgfVxuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHZW5lcmF0aW9uc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3IgZ2VuZXJhdGlvbiBoaXN0b3J5J1xuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTExNQXBpS2V5c1NlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiBsbG1BcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjcmV0cyBNYW5hZ2VyIEFSTiBmb3IgTExNIEFQSSBrZXlzJ1xuICAgIH0pXG4gIH1cbn1cbiJdfQ==