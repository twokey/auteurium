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
                `${projectsTable.tableArn}/index/*`
            ]
        }));
        generateContentStreamFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${this.generationsTable.tableArn}/index/*`,
                `${snippetsTable.tableArn}/index/*`,
                `${projectsTable.tableArn}/index/*`
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
                `${this.generationsTable.tableArn}/index/*`
            ]
        }));
        // Grant GSI query permissions for generateImageFunction
        generateImageFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${connectionsTable.tableArn}/index/*`, // Need to query connections by targetSnippetId
                `${snippetsTable.tableArn}/index/*`
            ]
        }));
        // Grant GSI query permissions for createScenesFunction
        createScenesFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${this.generationsTable.tableArn}/index/*`,
                `${snippetsTable.tableArn}/index/*`
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWdlbmFpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0ZXVyaXVtLWdlbmFpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE0QjtBQUU1QixpREFBa0M7QUFDbEMsaUVBQWtEO0FBRWxELG1FQUFvRDtBQUNwRCx5REFBMEM7QUFDMUMsK0RBQWdEO0FBQ2hELDRFQUE2RDtBQUU3RCwrRUFBZ0U7QUFZaEUsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUdoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBRTFFLHlCQUF5QjtRQUN6QixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3hHLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDeEcsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUseUJBQXlCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFakgsaURBQWlEO1FBQ2pELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxvQkFBb0IsS0FBSyxFQUFFLEVBQUU7WUFDcEYsVUFBVSxFQUFFLDRCQUE0QixL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QUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUztZQUN0QyxXQUFXLEVBQUUsdUNBQXVDO1NBQ3JELENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDN0MsS0FBSyxFQUFFLGdCQUFnQixDQUFDLFNBQVM7WUFDakMsV0FBVyxFQUFFLHNDQUFzQztTQUNwRCxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUExYkQsa0RBMGJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcHBzeW5jJ1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0bydcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYidcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJ1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnXG5pbXBvcnQgKiBhcyBsYW1iZGFOb2RlanMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInXG5cbmltcG9ydCB0eXBlIHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuaW50ZXJmYWNlIEF1dGV1cml1bUdlbkFJU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZ1xuICBncmFwaHFsQXBpOiBhcHBzeW5jLklHcmFwaHFsQXBpXG4gIHVzZXJQb29sOiBjb2duaXRvLklVc2VyUG9vbFxuICB1c2VyUG9vbENsaWVudDogY29nbml0by5JVXNlclBvb2xDbGllbnRcbiAgbWVkaWFCdWNrZXQ6IHMzLklCdWNrZXRcbn1cblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bUdlbkFJU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgZ2VuZXJhdGlvbnNUYWJsZTogZHluYW1vZGIuVGFibGVcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXV0ZXVyaXVtR2VuQUlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIGNvbnN0IHsgc3RhZ2UsIGdyYXBocWxBcGksIHVzZXJQb29sLCB1c2VyUG9vbENsaWVudCwgbWVkaWFCdWNrZXQgfSA9IHByb3BzXG5cbiAgICAvLyBJbXBvcnQgZXhpc3RpbmcgdGFibGVzXG4gICAgY29uc3Qgc25pcHBldHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1NuaXBwZXRzVGFibGUnLCBgYXV0ZXVyaXVtLXNuaXBwZXRzLSR7c3RhZ2V9YClcbiAgICBjb25zdCBwcm9qZWN0c1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnUHJvamVjdHNUYWJsZScsIGBhdXRldXJpdW0tcHJvamVjdHMtJHtzdGFnZX1gKVxuICAgIGNvbnN0IGNvbm5lY3Rpb25zVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdDb25uZWN0aW9uc1RhYmxlJywgYGF1dGV1cml1bS1jb25uZWN0aW9ucy0ke3N0YWdlfWApXG5cbiAgICAvLyBDcmVhdGUgU2VjcmV0cyBNYW5hZ2VyIHNlY3JldCBmb3IgTExNIEFQSSBrZXlzXG4gICAgY29uc3QgbGxtQXBpS2V5c1NlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgYExMTUFwaUtleXNTZWNyZXQtJHtzdGFnZX1gLCB7XG4gICAgICBzZWNyZXROYW1lOiBgYXV0ZXVyaXVtL2dlbmFpL2FwaS1rZXlzLSR7c3RhZ2V9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGtleXMgZm9yIExMTSBwcm92aWRlcnMgKEdlbWluaSwgT3BlbkFJLCBldGMuKScsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGdlbWluaTogJ1JFUExBQ0VfV0lUSF9BQ1RVQUxfR0VNSU5JX0FQSV9LRVknLFxuICAgICAgICAgIG9wZW5haTogJ1JFUExBQ0VfV0lUSF9BQ1RVQUxfT1BFTkFJX0FQSV9LRVknXG4gICAgICAgIH0pLFxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3BsYWNlaG9sZGVyJ1xuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZSBmb3IgZ2VuZXJhdGlvbiBoaXN0b3J5XG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGBHZW5lcmF0aW9uc1RhYmxlLSR7c3RhZ2V9YCwge1xuICAgICAgdGFibGVOYW1lOiBgYXV0ZXVyaXVtLWdlbmVyYXRpb25zLSR7c3RhZ2V9YCxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnUEsnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ1NLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBzdGFnZSA9PT0gJ3Byb2QnXG4gICAgfSlcblxuICAgIC8vIEdTSTogUXVlcnkgZ2VuZXJhdGlvbnMgYnkgc25pcHBldCBJRFxuICAgIHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdzbmlwcGV0SWQtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdzbmlwcGV0SWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ2NyZWF0ZWRBdCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEdTSTogVHJhY2sgY29zdCBwZXIgdXNlciBwZXIgcHJvdmlkZXJcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAndXNlcklkLW1vZGVsUHJvdmlkZXItaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICd1c2VySWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ21vZGVsUHJvdmlkZXInLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGdlbmVyYXRlQ29udGVudCBtdXRhdGlvblxuICAgIGNvbnN0IGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgR2VuZXJhdGVDb250ZW50RnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tZ2VuYWktZ2VuZXJhdGUtJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2dlbmVyYXRlQ29udGVudC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAvLyBMb25nZXIgdGltZW91dCBmb3IgTExNIGdlbmVyYXRpb25cbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBmb3JtYXQ6IGxhbWJkYU5vZGVqcy5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgICAgICB0YXJnZXQ6ICdub2RlMjInLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIHRzY29uZmlnOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3RzY29uZmlnLmpzb24nKSxcbiAgICAgICAgbm9kZU1vZHVsZXM6IFsnQGdvb2dsZS9nZW5haSddIC8vIEluY2x1ZGUgR2VtaW5pIFNES1xuICAgICAgfSxcbiAgICAgIGRlcHNMb2NrRmlsZVBhdGg6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9wYWNrYWdlLWxvY2suanNvbicpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBR0U6IHN0YWdlLFxuICAgICAgICBHRU5FUkFUSU9OU19UQUJMRTogdGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgU05JUFBFVFNfVEFCTEU6IHNuaXBwZXRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUk9KRUNUU19UQUJMRTogcHJvamVjdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIExMTV9BUElfS0VZU19TRUNSRVRfQVJOOiBsbG1BcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICBBUFBTWU5DX0FQSV9OQU1FOiBgYXV0ZXVyaXVtLWFwaS0ke3N0YWdlfWBcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgY29uc3QgZ2VuZXJhdGVDb250ZW50U3RyZWFtRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsIGBHZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS1nZW5haS1nZW5lcmF0ZS1zdHJlYW0tJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2dlbmVyYXRlQ29udGVudFN0cmVhbS50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZWpzLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIHRhcmdldDogJ25vZGUyMicsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgdHNjb25maWc6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvdHNjb25maWcuanNvbicpLFxuICAgICAgICBub2RlTW9kdWxlczogWydAZ29vZ2xlL2dlbmFpJ11cbiAgICAgIH0sXG4gICAgICBkZXBzTG9ja0ZpbGVQYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vcGFja2FnZS1sb2NrLmpzb24nKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgR0VORVJBVElPTlNfVEFCTEU6IHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNOSVBQRVRTX1RBQkxFOiBzbmlwcGV0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJPSkVDVFNfVEFCTEU6IHByb2plY3RzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBMTE1fQVBJX0tFWVNfU0VDUkVUX0FSTjogbGxtQXBpS2V5c1NlY3JldC5zZWNyZXRBcm4sXG4gICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgQVBQU1lOQ19BUElfTkFNRTogYGF1dGV1cml1bS1hcGktJHtzdGFnZX1gXG4gICAgICB9XG4gICAgfSlcblxuICAgIGNvbnN0IGFwcFN5bmNGaWVsZEFybiA9IHRoaXMuZm9ybWF0QXJuKHtcbiAgICAgIHNlcnZpY2U6ICdhcHBzeW5jJyxcbiAgICAgIHJlc291cmNlOiAnYXBpcycsXG4gICAgICByZXNvdXJjZU5hbWU6IGAke2dyYXBocWxBcGkuYXBpSWR9L3R5cGVzLyovZmllbGRzLypgXG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgYXZhaWxhYmxlTW9kZWxzIHF1ZXJ5XG4gICAgY29uc3QgYXZhaWxhYmxlTW9kZWxzRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsIGBBdmFpbGFibGVNb2RlbHNGdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS1nZW5haS1tb2RlbHMtJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2F2YWlsYWJsZU1vZGVscy50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJylcbiAgICAgIH0sXG4gICAgICBkZXBzTG9ja0ZpbGVQYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vcGFja2FnZS1sb2NrLmpzb24nKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGdlbmVyYXRpb25IaXN0b3J5IHF1ZXJ5XG4gICAgY29uc3QgZ2VuZXJhdGlvbkhpc3RvcnlGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYEdlbmVyYXRpb25IaXN0b3J5RnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tZ2VuYWktaGlzdG9yeS0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3NyYy9yZXNvbHZlcnMvZ2VuYWkvZ2VuZXJhdGlvbkhpc3RvcnkudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZWpzLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIHRhcmdldDogJ25vZGUyMicsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgdHNjb25maWc6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvdHNjb25maWcuanNvbicpXG4gICAgICB9LFxuICAgICAgZGVwc0xvY2tGaWxlUGF0aDogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3BhY2thZ2UtbG9jay5qc29uJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIEdFTkVSQVRJT05TX1RBQkxFOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBnZW5lcmF0ZVNuaXBwZXRJbWFnZSBtdXRhdGlvblxuICAgIGNvbnN0IGdlbmVyYXRlSW1hZ2VGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYEdlbmVyYXRlSW1hZ2VGdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS1nZW5haS1nZW5lcmF0ZS1pbWFnZS0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3NyYy9yZXNvbHZlcnMvc25pcHBldC9nZW5lcmF0ZUltYWdlLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMjApLCAvLyBMb25nZXIgdGltZW91dCBmb3IgaW1hZ2UgZ2VuZXJhdGlvblxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZWpzLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIHRhcmdldDogJ25vZGUyMicsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgdHNjb25maWc6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvdHNjb25maWcuanNvbicpLFxuICAgICAgICBub2RlTW9kdWxlczogWydAZ29vZ2xlL2dlbmFpJ10gLy8gSW5jbHVkZSBHZW1pbmkgU0RLXG4gICAgICB9LFxuICAgICAgZGVwc0xvY2tGaWxlUGF0aDogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3BhY2thZ2UtbG9jay5qc29uJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIFNOSVBQRVRTX1RBQkxFOiBzbmlwcGV0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQ09OTkVDVElPTlNfVEFCTEU6IGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lLCAvLyBBZGQgY29ubmVjdGlvbnMgdGFibGUgZm9yIG11bHRpbW9kYWwgaW1hZ2UgZ2VuZXJhdGlvblxuICAgICAgICBHRU5FUkFUSU9OU19UQUJMRTogdGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTUVESUFfQlVDS0VUX05BTUU6IG1lZGlhQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIExMTV9BUElfS0VZU19TRUNSRVRfQVJOOiBsbG1BcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgY3JlYXRlU2NlbmVzIG11dGF0aW9uXG4gICAgY29uc3QgY3JlYXRlU2NlbmVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsIGBDcmVhdGVTY2VuZXNGdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS1nZW5haS1jcmVhdGUtc2NlbmVzLSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvc3JjL3Jlc29sdmVycy9nZW5haS9jcmVhdGVTY2VuZXMudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDkwKSwgLy8gTG9uZ2VyIHRpbWVvdXQgZm9yIExMTSBnZW5lcmF0aW9uICsgYmF0Y2ggc25pcHBldCBjcmVhdGlvblxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZWpzLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIHRhcmdldDogJ25vZGUyMicsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgdHNjb25maWc6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvdHNjb25maWcuanNvbicpLFxuICAgICAgICBub2RlTW9kdWxlczogWydAZ29vZ2xlL2dlbmFpJ10gLy8gSW5jbHVkZSBHZW1pbmkgU0RLXG4gICAgICB9LFxuICAgICAgZGVwc0xvY2tGaWxlUGF0aDogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3BhY2thZ2UtbG9jay5qc29uJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIFNOSVBQRVRTX1RBQkxFOiBzbmlwcGV0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVkVSU0lPTlNfVEFCTEU6IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1ZlcnNpb25zVGFibGUnLCBgYXV0ZXVyaXVtLXZlcnNpb25zLSR7c3RhZ2V9YCkudGFibGVOYW1lLFxuICAgICAgICBHRU5FUkFUSU9OU19UQUJMRTogdGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTExNX0FQSV9LRVlTX1NFQ1JFVF9BUk46IGxsbUFwaUtleXNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcbiAgICBsbG1BcGlLZXlzU2VjcmV0LmdyYW50UmVhZChnZW5lcmF0ZUNvbnRlbnRGdW5jdGlvbilcbiAgICBsbG1BcGlLZXlzU2VjcmV0LmdyYW50UmVhZChnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbilcbiAgICBsbG1BcGlLZXlzU2VjcmV0LmdyYW50UmVhZChnZW5lcmF0ZUltYWdlRnVuY3Rpb24pXG4gICAgbGxtQXBpS2V5c1NlY3JldC5ncmFudFJlYWQoY3JlYXRlU2NlbmVzRnVuY3Rpb24pXG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZW5lcmF0ZUNvbnRlbnRGdW5jdGlvbilcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uKVxuICAgIHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdGlvbkhpc3RvcnlGdW5jdGlvbilcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRlSW1hZ2VGdW5jdGlvbilcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNyZWF0ZVNjZW5lc0Z1bmN0aW9uKVxuICAgIHNuaXBwZXRzVGFibGUuZ3JhbnRSZWFkRGF0YShnZW5lcmF0ZUNvbnRlbnRGdW5jdGlvbilcbiAgICBzbmlwcGV0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2VuZXJhdGVDb250ZW50U3RyZWFtRnVuY3Rpb24pXG4gICAgc25pcHBldHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uKVxuICAgIHNuaXBwZXRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNyZWF0ZVNjZW5lc0Z1bmN0aW9uKSAvLyBOZWVkIHdyaXRlIGFjY2VzcyB0byBjcmVhdGUgc2NlbmUgc25pcHBldHNcbiAgICBwcm9qZWN0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24pXG4gICAgcHJvamVjdHNUYWJsZS5ncmFudFJlYWREYXRhKGdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uKVxuICAgIGNvbm5lY3Rpb25zVGFibGUuZ3JhbnRSZWFkRGF0YShnZW5lcmF0ZUltYWdlRnVuY3Rpb24pIC8vIE5lZWQgdG8gcXVlcnkgY29ubmVjdGlvbnMgZm9yIG11bHRpbW9kYWwgaW1hZ2UgZ2VuZXJhdGlvblxuICAgIG1lZGlhQnVja2V0LmdyYW50UmVhZFdyaXRlKGdlbmVyYXRlSW1hZ2VGdW5jdGlvbilcblxuICAgIC8vIEdyYW50IHZlcnNpb25zIHRhYmxlIHdyaXRlIGFjY2VzcyBmb3IgY3JlYXRlU2NlbmVzXG4gICAgY29uc3QgdmVyc2lvbnNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1ZlcnNpb25zVGFibGVGb3JTY2VuZXMnLCBgYXV0ZXVyaXVtLXZlcnNpb25zLSR7c3RhZ2V9YClcbiAgICB2ZXJzaW9uc1RhYmxlLmdyYW50V3JpdGVEYXRhKGNyZWF0ZVNjZW5lc0Z1bmN0aW9uKVxuXG4gICAgLy8gR3JhbnQgR1NJIHF1ZXJ5IHBlcm1pc3Npb25zXG4gICAgZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6UXVlcnknXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHt0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHtzbmlwcGV0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7cHJvamVjdHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgIF1cbiAgICB9KSlcblxuICAgIGdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlF1ZXJ5J10sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYCR7dGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7c25pcHBldHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3Byb2plY3RzVGFibGUudGFibGVBcm59L2luZGV4LypgXG4gICAgICBdXG4gICAgfSkpXG5cbiAgICBnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydhcHBzeW5jOkdyYXBoUUwnXSxcbiAgICAgIHJlc291cmNlczogW2FwcFN5bmNGaWVsZEFybl1cbiAgICB9KSlcblxuICAgIGdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2FwcHN5bmM6TGlzdEdyYXBocWxBcGlzJ10sXG4gICAgICByZXNvdXJjZXM6IFsnKiddXG4gICAgfSkpXG5cbiAgICBnZW5lcmF0aW9uSGlzdG9yeUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlF1ZXJ5J10sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYCR7dGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYFxuICAgICAgXVxuICAgIH0pKVxuXG4gICAgLy8gR3JhbnQgR1NJIHF1ZXJ5IHBlcm1pc3Npb25zIGZvciBnZW5lcmF0ZUltYWdlRnVuY3Rpb25cbiAgICBnZW5lcmF0ZUltYWdlRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6UXVlcnknXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHtjb25uZWN0aW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCwgLy8gTmVlZCB0byBxdWVyeSBjb25uZWN0aW9ucyBieSB0YXJnZXRTbmlwcGV0SWRcbiAgICAgICAgYCR7c25pcHBldHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgIF1cbiAgICB9KSlcblxuICAgIC8vIEdyYW50IEdTSSBxdWVyeSBwZXJtaXNzaW9ucyBmb3IgY3JlYXRlU2NlbmVzRnVuY3Rpb25cbiAgICBjcmVhdGVTY2VuZXNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydkeW5hbW9kYjpRdWVyeSddLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGAke3RoaXMuZ2VuZXJhdGlvbnNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3NuaXBwZXRzVGFibGUudGFibGVBcm59L2luZGV4LypgXG4gICAgICBdXG4gICAgfSkpXG5cbiAgICAvLyBDcmVhdGUgQXBwU3luYyBkYXRhIHNvdXJjZXNcbiAgICBjb25zdCBnZW5lcmF0ZUNvbnRlbnREYXRhU291cmNlID0gbmV3IGFwcHN5bmMuTGFtYmRhRGF0YVNvdXJjZSh0aGlzLCBgR2VuZXJhdGVDb250ZW50RGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1nZW5lcmF0ZS0ke3N0YWdlfWAsXG4gICAgICBsYW1iZGFGdW5jdGlvbjogZ2VuZXJhdGVDb250ZW50RnVuY3Rpb25cbiAgICB9KVxuXG4gICAgY29uc3QgZ2VuZXJhdGVDb250ZW50U3RyZWFtRGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLkxhbWJkYURhdGFTb3VyY2UodGhpcywgYEdlbmVyYXRlQ29udGVudFN0cmVhbURhdGFTb3VyY2UtJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICBuYW1lOiBgZ2VuYWktZ2VuZXJhdGUtc3RyZWFtLSR7c3RhZ2V9YCxcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvblxuICAgIH0pXG5cbiAgICBjb25zdCBhdmFpbGFibGVNb2RlbHNEYXRhU291cmNlID0gbmV3IGFwcHN5bmMuTGFtYmRhRGF0YVNvdXJjZSh0aGlzLCBgQXZhaWxhYmxlTW9kZWxzRGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1tb2RlbHMtJHtzdGFnZX1gLFxuICAgICAgbGFtYmRhRnVuY3Rpb246IGF2YWlsYWJsZU1vZGVsc0Z1bmN0aW9uXG4gICAgfSlcblxuICAgIGNvbnN0IGdlbmVyYXRpb25IaXN0b3J5RGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLkxhbWJkYURhdGFTb3VyY2UodGhpcywgYEdlbmVyYXRpb25IaXN0b3J5RGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1oaXN0b3J5LSR7c3RhZ2V9YCxcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBnZW5lcmF0aW9uSGlzdG9yeUZ1bmN0aW9uXG4gICAgfSlcblxuICAgIGNvbnN0IGdlbmVyYXRlSW1hZ2VEYXRhU291cmNlID0gbmV3IGFwcHN5bmMuTGFtYmRhRGF0YVNvdXJjZSh0aGlzLCBgR2VuZXJhdGVJbWFnZURhdGFTb3VyY2UtJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICBuYW1lOiBgZ2VuYWktZ2VuZXJhdGUtaW1hZ2UtJHtzdGFnZX1gLFxuICAgICAgbGFtYmRhRnVuY3Rpb246IGdlbmVyYXRlSW1hZ2VGdW5jdGlvblxuICAgIH0pXG5cbiAgICBjb25zdCBjcmVhdGVTY2VuZXNEYXRhU291cmNlID0gbmV3IGFwcHN5bmMuTGFtYmRhRGF0YVNvdXJjZSh0aGlzLCBgQ3JlYXRlU2NlbmVzRGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1jcmVhdGUtc2NlbmVzLSR7c3RhZ2V9YCxcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBjcmVhdGVTY2VuZXNGdW5jdGlvblxuICAgIH0pXG5cbiAgICBjb25zdCBnZW5lcmF0aW9uU3RyZWFtRXZlbnRzRGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLk5vbmVEYXRhU291cmNlKHRoaXMsIGBHZW5lcmF0aW9uU3RyZWFtRXZlbnRzRGF0YVNvdXJjZS0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIG5hbWU6IGBnZW5haS1zdHJlYW0tZXZlbnRzLSR7c3RhZ2V9YFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgcmVzb2x2ZXJzXG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYEdlbmVyYXRlQ29udGVudFJlc29sdmVyLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdnZW5lcmF0ZUNvbnRlbnQnLFxuICAgICAgZGF0YVNvdXJjZTogZ2VuZXJhdGVDb250ZW50RGF0YVNvdXJjZVxuICAgIH0pXG5cbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgR2VuZXJhdGVDb250ZW50U3RyZWFtUmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2dlbmVyYXRlQ29udGVudFN0cmVhbScsXG4gICAgICBkYXRhU291cmNlOiBnZW5lcmF0ZUNvbnRlbnRTdHJlYW1EYXRhU291cmNlXG4gICAgfSlcblxuICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsIGBBdmFpbGFibGVNb2RlbHNSZXNvbHZlci0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnYXZhaWxhYmxlTW9kZWxzJyxcbiAgICAgIGRhdGFTb3VyY2U6IGF2YWlsYWJsZU1vZGVsc0RhdGFTb3VyY2VcbiAgICB9KVxuXG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYEdlbmVyYXRpb25IaXN0b3J5UmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dlbmVyYXRpb25IaXN0b3J5JyxcbiAgICAgIGRhdGFTb3VyY2U6IGdlbmVyYXRpb25IaXN0b3J5RGF0YVNvdXJjZVxuICAgIH0pXG5cbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgR2VuZXJhdGVTbmlwcGV0SW1hZ2VSZXNvbHZlci0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnZ2VuZXJhdGVTbmlwcGV0SW1hZ2UnLFxuICAgICAgZGF0YVNvdXJjZTogZ2VuZXJhdGVJbWFnZURhdGFTb3VyY2VcbiAgICB9KVxuXG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYENyZWF0ZVNjZW5lc1Jlc29sdmVyLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdjcmVhdGVTY2VuZXMnLFxuICAgICAgZGF0YVNvdXJjZTogY3JlYXRlU2NlbmVzRGF0YVNvdXJjZVxuICAgIH0pXG5cbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgUHVibGlzaEdlbmVyYXRpb25TdHJlYW1FdmVudFJlc29sdmVyLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdwdWJsaXNoR2VuZXJhdGlvblN0cmVhbUV2ZW50JyxcbiAgICAgIGRhdGFTb3VyY2U6IGdlbmVyYXRpb25TdHJlYW1FdmVudHNEYXRhU291cmNlLFxuICAgICAgcmVxdWVzdE1hcHBpbmdUZW1wbGF0ZTogYXBwc3luYy5NYXBwaW5nVGVtcGxhdGUuZnJvbVN0cmluZygnJHV0aWwudG9Kc29uKCRjdHguYXJndW1lbnRzLmlucHV0KScpLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21TdHJpbmcoJyR1dGlsLnRvSnNvbigkY3R4LmFyZ3VtZW50cy5pbnB1dCknKVxuICAgIH0pXG5cbiAgICAvLyBTdWJzY3JpcHRpb24gcmVzb2x2ZXIgd2l0aCBzZXJ2ZXItc2lkZSBmaWx0ZXJpbmcgYnkgc25pcHBldElkXG4gICAgLy8gUmV0dXJucyBudWxsIGZvciBub24tbWF0Y2hpbmcgZXZlbnRzICh3aGljaCBpcyBub3cgYWxsb3dlZCBzaW5jZSByZXR1cm4gdHlwZSBpcyBudWxsYWJsZSlcbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgT25HZW5lcmF0aW9uU3RyZWFtU3Vic2NyaXB0aW9uUmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ1N1YnNjcmlwdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdvbkdlbmVyYXRpb25TdHJlYW0nLFxuICAgICAgZGF0YVNvdXJjZTogZ2VuZXJhdGlvblN0cmVhbUV2ZW50c0RhdGFTb3VyY2UsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tU3RyaW5nKGBcbiAgICAgICAge1xuICAgICAgICAgIFwidmVyc2lvblwiOiBcIjIwMTgtMDUtMjlcIixcbiAgICAgICAgICBcInBheWxvYWRcIjoge31cbiAgICAgICAgfVxuICAgICAgYCksXG4gICAgICByZXNwb25zZU1hcHBpbmdUZW1wbGF0ZTogYXBwc3luYy5NYXBwaW5nVGVtcGxhdGUuZnJvbVN0cmluZyhgXG4gICAgICAgICMjIEZpbHRlcjogb25seSBmb3J3YXJkIGV2ZW50cyB3aGVyZSBzbmlwcGV0SWQgbWF0Y2hlcyB0aGUgc3Vic2NyaXB0aW9uIGFyZ3VtZW50XG4gICAgICAgICNpZigkY3R4LnJlc3VsdCAmJiAkY3R4LnJlc3VsdC5zbmlwcGV0SWQgJiYgJGN0eC5yZXN1bHQuc25pcHBldElkID09ICRjdHguYXJncy5zbmlwcGV0SWQpXG4gICAgICAgICAgJHV0aWwudG9Kc29uKCRjdHgucmVzdWx0KVxuICAgICAgICAjZWxzZVxuICAgICAgICAgICMjIFJldHVybiBudWxsIHRvIHNraXAgdGhpcyBldmVudCAobnVsbGFibGUgcmV0dXJuIHR5cGUgYWxsb3dzIHRoaXMpXG4gICAgICAgICAgbnVsbFxuICAgICAgICAjZW5kXG4gICAgICBgKVxuICAgIH0pXG5cbiAgICAvLyBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgY29zdCBtb25pdG9yaW5nIChvcHRpb25hbCBmb3IgZGV2KVxuICAgIGlmIChzdGFnZSA9PT0gJ3Byb2QnKSB7XG4gICAgICAvLyBUT0RPOiBBZGQgQ2xvdWRXYXRjaCBhbGFybXMgZm9yOlxuICAgICAgLy8gLSBEYWlseSBnZW5lcmF0aW9uIGNvc3QgZXhjZWVkcyBidWRnZXRcbiAgICAgIC8vIC0gRXJyb3IgcmF0ZSA+IDUlXG4gICAgICAvLyAtIExhdGVuY3kgPiAzMCBzZWNvbmRzXG4gICAgfVxuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHZW5lcmF0aW9uc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3IgZ2VuZXJhdGlvbiBoaXN0b3J5J1xuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTExNQXBpS2V5c1NlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiBsbG1BcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjcmV0cyBNYW5hZ2VyIEFSTiBmb3IgTExNIEFQSSBrZXlzJ1xuICAgIH0pXG4gIH1cbn1cbiJdfQ==