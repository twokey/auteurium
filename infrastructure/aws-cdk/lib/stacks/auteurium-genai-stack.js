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
            timeout: cdk.Duration.seconds(60),
            memorySize: 1024,
            bundling: {
                format: lambdaNodejs.OutputFormat.CJS,
                target: 'node22',
                sourceMap: true,
                tsconfig: path.join(__dirname, '../../../../services/api/tsconfig.json'),
                nodeModules: ['@google/genai'] // Include Gemini SDK
            },
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
            timeout: cdk.Duration.seconds(120),
            memorySize: 1024,
            bundling: {
                format: lambdaNodejs.OutputFormat.CJS,
                target: 'node22',
                sourceMap: true,
                tsconfig: path.join(__dirname, '../../../../services/api/tsconfig.json'),
                nodeModules: ['@google/genai'] // Include Gemini SDK
            },
            environment: {
                STAGE: stage,
                SNIPPETS_TABLE: snippetsTable.tableName,
                CONNECTIONS_TABLE: connectionsTable.tableName,
                GENERATIONS_TABLE: this.generationsTable.tableName,
                MEDIA_BUCKET_NAME: mediaBucket.bucketName,
                LLM_API_KEYS_SECRET_ARN: llmApiKeysSecret.secretArn,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        // Grant permissions
        llmApiKeysSecret.grantRead(generateContentFunction);
        llmApiKeysSecret.grantRead(generateContentStreamFunction);
        llmApiKeysSecret.grantRead(generateImageFunction);
        this.generationsTable.grantReadWriteData(generateContentFunction);
        this.generationsTable.grantReadWriteData(generateContentStreamFunction);
        this.generationsTable.grantReadWriteData(generationHistoryFunction);
        this.generationsTable.grantReadWriteData(generateImageFunction);
        snippetsTable.grantReadData(generateContentFunction);
        snippetsTable.grantReadData(generateContentStreamFunction);
        snippetsTable.grantReadWriteData(generateImageFunction);
        projectsTable.grantReadData(generateContentFunction);
        projectsTable.grantReadData(generateContentStreamFunction);
        connectionsTable.grantReadData(generateImageFunction); // Need to query connections for multimodal image generation
        mediaBucket.grantReadWrite(generateImageFunction);
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
                `${connectionsTable.tableArn}/index/*`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWdlbmFpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0ZXVyaXVtLWdlbmFpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRCO0FBRTVCLGlEQUFrQztBQUNsQyxpRUFBa0Q7QUFFbEQsbUVBQW9EO0FBQ3BELHlEQUEwQztBQUMxQywrREFBZ0Q7QUFDaEQsNEVBQTZEO0FBRTdELCtFQUFnRTtBQVloRSxNQUFhLG1CQUFvQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBR2hELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBK0I7UUFDdkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkIsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFMUUseUJBQXlCO1FBQ3pCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDeEcsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN4RyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSx5QkFBeUIsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUVqSCxpREFBaUQ7UUFDakQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG9CQUFvQixLQUFLLEVBQUUsRUFBRTtZQUNwRixVQUFVLEVBQUUsNEJBQTRCLEtBQUssRUFBRTtZ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QUFVLENBQUMsb0NBQW9DLENBQUM7U0FDbEcsQ0FBQyxDQUFBO1FBRUYsZ0VBQWdFO1FBQ2hFLDRGQUE0RjtRQUM1RixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDBDQUEwQyxLQUFLLEVBQUUsRUFBRTtZQUM1RSxHQUFHLEVBQUUsVUFBVTtZQUNmLFFBQVEsRUFBRSxjQUFjO1lBQ3hCLFNBQVMsRUFBRSxvQkFBb0I7WUFDL0IsVUFBVSxFQUFFLGdDQUFnQztZQUM1QyxzQkFBc0IsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQzs7Ozs7T0FLMUQsQ0FBQztZQUNGLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDOzs7Ozs7OztPQVEzRCxDQUFDO1NBQ0gsQ0FBQyxDQUFBO1FBRUYsMkRBQTJEO1FBQzNELElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRTtZQUNwQixtQ0FBbUM7WUFDbkMseUNBQXlDO1lBQ3pDLG9CQUFvQjtZQUNwQix5QkFBeUI7U0FDMUI7UUFFRCxVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM5QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVM7WUFDdEMsV0FBVyxFQUFFLHVDQUF1QztTQUNyRCxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzdDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO1lBQ2pDLFdBQVcsRUFBRSxzQ0FBc0M7U0FDcEQsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBN1hELGtEQTZYQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgYXBwc3luYyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBwc3luYydcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSdcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xuaW1wb3J0ICogYXMgbGFtYmRhTm9kZWpzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJ1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJ1xuXG5pbXBvcnQgdHlwZSB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5cbmludGVyZmFjZSBBdXRldXJpdW1HZW5BSVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmdcbiAgZ3JhcGhxbEFwaTogYXBwc3luYy5JR3JhcGhxbEFwaVxuICB1c2VyUG9vbDogY29nbml0by5JVXNlclBvb2xcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uSVVzZXJQb29sQ2xpZW50XG4gIG1lZGlhQnVja2V0OiBzMy5JQnVja2V0XG59XG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1HZW5BSVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGdlbmVyYXRpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEF1dGV1cml1bUdlbkFJU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpXG5cbiAgICBjb25zdCB7IHN0YWdlLCBncmFwaHFsQXBpLCB1c2VyUG9vbCwgdXNlclBvb2xDbGllbnQsIG1lZGlhQnVja2V0IH0gPSBwcm9wc1xuXG4gICAgLy8gSW1wb3J0IGV4aXN0aW5nIHRhYmxlc1xuICAgIGNvbnN0IHNuaXBwZXRzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdTbmlwcGV0c1RhYmxlJywgYGF1dGV1cml1bS1zbmlwcGV0cy0ke3N0YWdlfWApXG4gICAgY29uc3QgcHJvamVjdHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ1Byb2plY3RzVGFibGUnLCBgYXV0ZXVyaXVtLXByb2plY3RzLSR7c3RhZ2V9YClcbiAgICBjb25zdCBjb25uZWN0aW9uc1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnQ29ubmVjdGlvbnNUYWJsZScsIGBhdXRldXJpdW0tY29ubmVjdGlvbnMtJHtzdGFnZX1gKVxuXG4gICAgLy8gQ3JlYXRlIFNlY3JldHMgTWFuYWdlciBzZWNyZXQgZm9yIExMTSBBUEkga2V5c1xuICAgIGNvbnN0IGxsbUFwaUtleXNTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsIGBMTE1BcGlLZXlzU2VjcmV0LSR7c3RhZ2V9YCwge1xuICAgICAgc2VjcmV0TmFtZTogYGF1dGV1cml1bS9nZW5haS9hcGkta2V5cy0ke3N0YWdlfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBrZXlzIGZvciBMTE0gcHJvdmlkZXJzIChHZW1pbmksIE9wZW5BSSwgZXRjLiknLFxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBnZW1pbmk6ICdSRVBMQUNFX1dJVEhfQUNUVUFMX0dFTUlOSV9BUElfS0VZJyxcbiAgICAgICAgICBvcGVuYWk6ICdSRVBMQUNFX1dJVEhfQUNUVUFMX09QRU5BSV9BUElfS0VZJ1xuICAgICAgICB9KSxcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwbGFjZWhvbGRlcidcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gRHluYW1vREIgdGFibGUgZm9yIGdlbmVyYXRpb24gaGlzdG9yeVxuICAgIHRoaXMuZ2VuZXJhdGlvbnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBgR2VuZXJhdGlvbnNUYWJsZS0ke3N0YWdlfWAsIHtcbiAgICAgIHRhYmxlTmFtZTogYGF1dGV1cml1bS1nZW5lcmF0aW9ucy0ke3N0YWdlfWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogJ1BLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6ICdTSycsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogc3RhZ2UgPT09ICdwcm9kJ1xuICAgIH0pXG5cbiAgICAvLyBHU0k6IFF1ZXJ5IGdlbmVyYXRpb25zIGJ5IHNuaXBwZXQgSURcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnc25pcHBldElkLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnc25pcHBldElkJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6ICdjcmVhdGVkQXQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBHU0k6IFRyYWNrIGNvc3QgcGVyIHVzZXIgcGVyIHByb3ZpZGVyXG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC1tb2RlbFByb3ZpZGVyLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAndXNlcklkJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6ICdtb2RlbFByb3ZpZGVyJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBnZW5lcmF0ZUNvbnRlbnQgbXV0YXRpb25cbiAgICBjb25zdCBnZW5lcmF0ZUNvbnRlbnRGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYEdlbmVyYXRlQ29udGVudEZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWdlbmFpLWdlbmVyYXRlLSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvc3JjL3Jlc29sdmVycy9nZW5haS9nZW5lcmF0ZUNvbnRlbnQudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSwgLy8gTG9uZ2VyIHRpbWVvdXQgZm9yIExMTSBnZW5lcmF0aW9uXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJyksXG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ0Bnb29nbGUvZ2VuYWknXSAvLyBJbmNsdWRlIEdlbWluaSBTREtcbiAgICAgIH0sXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIEdFTkVSQVRJT05TX1RBQkxFOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTTklQUEVUU19UQUJMRTogc25pcHBldHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBST0pFQ1RTX1RBQkxFOiBwcm9qZWN0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTExNX0FQSV9LRVlTX1NFQ1JFVF9BUk46IGxsbUFwaUtleXNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgIEFQUFNZTkNfQVBJX05BTUU6IGBhdXRldXJpdW0tYXBpLSR7c3RhZ2V9YFxuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCBnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgYEdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWdlbmFpLWdlbmVyYXRlLXN0cmVhbS0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3NyYy9yZXNvbHZlcnMvZ2VuYWkvZ2VuZXJhdGVDb250ZW50U3RyZWFtLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJyksXG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ0Bnb29nbGUvZ2VuYWknXVxuICAgICAgfSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgR0VORVJBVElPTlNfVEFCTEU6IHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNOSVBQRVRTX1RBQkxFOiBzbmlwcGV0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJPSkVDVFNfVEFCTEU6IHByb2plY3RzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBMTE1fQVBJX0tFWVNfU0VDUkVUX0FSTjogbGxtQXBpS2V5c1NlY3JldC5zZWNyZXRBcm4sXG4gICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgQVBQU1lOQ19BUElfTkFNRTogYGF1dGV1cml1bS1hcGktJHtzdGFnZX1gXG4gICAgICB9XG4gICAgfSlcblxuICAgIGNvbnN0IGFwcFN5bmNGaWVsZEFybiA9IHRoaXMuZm9ybWF0QXJuKHtcbiAgICAgIHNlcnZpY2U6ICdhcHBzeW5jJyxcbiAgICAgIHJlc291cmNlOiAnYXBpcycsXG4gICAgICByZXNvdXJjZU5hbWU6IGAke2dyYXBocWxBcGkuYXBpSWR9L3R5cGVzLyovZmllbGRzLypgXG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgYXZhaWxhYmxlTW9kZWxzIHF1ZXJ5XG4gICAgY29uc3QgYXZhaWxhYmxlTW9kZWxzRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsIGBBdmFpbGFibGVNb2RlbHNGdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS1nZW5haS1tb2RlbHMtJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2F2YWlsYWJsZU1vZGVscy50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJylcbiAgICAgIH0sXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2VcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBnZW5lcmF0aW9uSGlzdG9yeSBxdWVyeVxuICAgIGNvbnN0IGdlbmVyYXRpb25IaXN0b3J5RnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsIGBHZW5lcmF0aW9uSGlzdG9yeUZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWdlbmFpLWhpc3RvcnktJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2dlbmVyYXRpb25IaXN0b3J5LnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBmb3JtYXQ6IGxhbWJkYU5vZGVqcy5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgICAgICB0YXJnZXQ6ICdub2RlMjInLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIHRzY29uZmlnOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3RzY29uZmlnLmpzb24nKVxuICAgICAgfSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgR0VORVJBVElPTlNfVEFCTEU6IHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZFxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGdlbmVyYXRlU25pcHBldEltYWdlIG11dGF0aW9uXG4gICAgY29uc3QgZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgR2VuZXJhdGVJbWFnZUZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLWdlbmFpLWdlbmVyYXRlLWltYWdlLSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvc3JjL3Jlc29sdmVycy9zbmlwcGV0L2dlbmVyYXRlSW1hZ2UudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEyMCksIC8vIExvbmdlciB0aW1lb3V0IGZvciBpbWFnZSBnZW5lcmF0aW9uXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJyksXG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ0Bnb29nbGUvZ2VuYWknXSAvLyBJbmNsdWRlIEdlbWluaSBTREtcbiAgICAgIH0sXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIFNOSVBQRVRTX1RBQkxFOiBzbmlwcGV0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQ09OTkVDVElPTlNfVEFCTEU6IGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lLCAvLyBBZGQgY29ubmVjdGlvbnMgdGFibGUgZm9yIG11bHRpbW9kYWwgaW1hZ2UgZ2VuZXJhdGlvblxuICAgICAgICBHRU5FUkFUSU9OU19UQUJMRTogdGhpcy5nZW5lcmF0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTUVESUFfQlVDS0VUX05BTUU6IG1lZGlhQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIExMTV9BUElfS0VZU19TRUNSRVRfQVJOOiBsbG1BcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zXG4gICAgbGxtQXBpS2V5c1NlY3JldC5ncmFudFJlYWQoZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24pXG4gICAgbGxtQXBpS2V5c1NlY3JldC5ncmFudFJlYWQoZ2VuZXJhdGVDb250ZW50U3RyZWFtRnVuY3Rpb24pXG4gICAgbGxtQXBpS2V5c1NlY3JldC5ncmFudFJlYWQoZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uKVxuICAgIHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24pXG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbilcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRpb25IaXN0b3J5RnVuY3Rpb24pXG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZW5lcmF0ZUltYWdlRnVuY3Rpb24pXG4gICAgc25pcHBldHNUYWJsZS5ncmFudFJlYWREYXRhKGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uKVxuICAgIHNuaXBwZXRzVGFibGUuZ3JhbnRSZWFkRGF0YShnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbilcbiAgICBzbmlwcGV0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZW5lcmF0ZUltYWdlRnVuY3Rpb24pXG4gICAgcHJvamVjdHNUYWJsZS5ncmFudFJlYWREYXRhKGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uKVxuICAgIHByb2plY3RzVGFibGUuZ3JhbnRSZWFkRGF0YShnZW5lcmF0ZUNvbnRlbnRTdHJlYW1GdW5jdGlvbilcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZERhdGEoZ2VuZXJhdGVJbWFnZUZ1bmN0aW9uKSAvLyBOZWVkIHRvIHF1ZXJ5IGNvbm5lY3Rpb25zIGZvciBtdWx0aW1vZGFsIGltYWdlIGdlbmVyYXRpb25cbiAgICBtZWRpYUJ1Y2tldC5ncmFudFJlYWRXcml0ZShnZW5lcmF0ZUltYWdlRnVuY3Rpb24pXG5cbiAgICAvLyBHcmFudCBHU0kgcXVlcnkgcGVybWlzc2lvbnNcbiAgICBnZW5lcmF0ZUNvbnRlbnRGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydkeW5hbW9kYjpRdWVyeSddLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGAke3RoaXMuZ2VuZXJhdGlvbnNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXG4gICAgICAgIGAke3NuaXBwZXRzVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHtwcm9qZWN0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYFxuICAgICAgXVxuICAgIH0pKVxuXG4gICAgZ2VuZXJhdGVDb250ZW50U3RyZWFtRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6UXVlcnknXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHt0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHtzbmlwcGV0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7cHJvamVjdHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgIF1cbiAgICB9KSlcblxuICAgIGdlbmVyYXRlQ29udGVudFN0cmVhbUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2FwcHN5bmM6R3JhcGhRTCddLFxuICAgICAgcmVzb3VyY2VzOiBbYXBwU3luY0ZpZWxkQXJuXVxuICAgIH0pKVxuXG4gICAgZ2VuZXJhdGVDb250ZW50U3RyZWFtRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnYXBwc3luYzpMaXN0R3JhcGhxbEFwaXMnXSxcbiAgICAgIHJlc291cmNlczogWycqJ11cbiAgICB9KSlcblxuICAgIGdlbmVyYXRpb25IaXN0b3J5RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6UXVlcnknXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHt0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgXG4gICAgICBdXG4gICAgfSkpXG5cbiAgICAvLyBHcmFudCBHU0kgcXVlcnkgcGVybWlzc2lvbnMgZm9yIGdlbmVyYXRlSW1hZ2VGdW5jdGlvblxuICAgIGdlbmVyYXRlSW1hZ2VGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydkeW5hbW9kYjpRdWVyeSddLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGAke2Nvbm5lY3Rpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLCAvLyBOZWVkIHRvIHF1ZXJ5IGNvbm5lY3Rpb25zIGJ5IHRhcmdldFNuaXBwZXRJZFxuICAgICAgICBgJHtzbmlwcGV0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYFxuICAgICAgXVxuICAgIH0pKVxuXG4gICAgLy8gQ3JlYXRlIEFwcFN5bmMgZGF0YSBzb3VyY2VzXG4gICAgY29uc3QgZ2VuZXJhdGVDb250ZW50RGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLkxhbWJkYURhdGFTb3VyY2UodGhpcywgYEdlbmVyYXRlQ29udGVudERhdGFTb3VyY2UtJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICBuYW1lOiBgZ2VuYWktZ2VuZXJhdGUtJHtzdGFnZX1gLFxuICAgICAgbGFtYmRhRnVuY3Rpb246IGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uXG4gICAgfSlcblxuICAgIGNvbnN0IGdlbmVyYXRlQ29udGVudFN0cmVhbURhdGFTb3VyY2UgPSBuZXcgYXBwc3luYy5MYW1iZGFEYXRhU291cmNlKHRoaXMsIGBHZW5lcmF0ZUNvbnRlbnRTdHJlYW1EYXRhU291cmNlLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgbmFtZTogYGdlbmFpLWdlbmVyYXRlLXN0cmVhbS0ke3N0YWdlfWAsXG4gICAgICBsYW1iZGFGdW5jdGlvbjogZ2VuZXJhdGVDb250ZW50U3RyZWFtRnVuY3Rpb25cbiAgICB9KVxuXG4gICAgY29uc3QgYXZhaWxhYmxlTW9kZWxzRGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLkxhbWJkYURhdGFTb3VyY2UodGhpcywgYEF2YWlsYWJsZU1vZGVsc0RhdGFTb3VyY2UtJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICBuYW1lOiBgZ2VuYWktbW9kZWxzLSR7c3RhZ2V9YCxcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBhdmFpbGFibGVNb2RlbHNGdW5jdGlvblxuICAgIH0pXG5cbiAgICBjb25zdCBnZW5lcmF0aW9uSGlzdG9yeURhdGFTb3VyY2UgPSBuZXcgYXBwc3luYy5MYW1iZGFEYXRhU291cmNlKHRoaXMsIGBHZW5lcmF0aW9uSGlzdG9yeURhdGFTb3VyY2UtJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICBuYW1lOiBgZ2VuYWktaGlzdG9yeS0ke3N0YWdlfWAsXG4gICAgICBsYW1iZGFGdW5jdGlvbjogZ2VuZXJhdGlvbkhpc3RvcnlGdW5jdGlvblxuICAgIH0pXG5cbiAgICBjb25zdCBnZW5lcmF0ZUltYWdlRGF0YVNvdXJjZSA9IG5ldyBhcHBzeW5jLkxhbWJkYURhdGFTb3VyY2UodGhpcywgYEdlbmVyYXRlSW1hZ2VEYXRhU291cmNlLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgbmFtZTogYGdlbmFpLWdlbmVyYXRlLWltYWdlLSR7c3RhZ2V9YCxcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBnZW5lcmF0ZUltYWdlRnVuY3Rpb25cbiAgICB9KVxuXG4gICAgY29uc3QgZ2VuZXJhdGlvblN0cmVhbUV2ZW50c0RhdGFTb3VyY2UgPSBuZXcgYXBwc3luYy5Ob25lRGF0YVNvdXJjZSh0aGlzLCBgR2VuZXJhdGlvblN0cmVhbUV2ZW50c0RhdGFTb3VyY2UtJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICBuYW1lOiBgZ2VuYWktc3RyZWFtLWV2ZW50cy0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgLy8gQ3JlYXRlIHJlc29sdmVyc1xuICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsIGBHZW5lcmF0ZUNvbnRlbnRSZXNvbHZlci0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnZ2VuZXJhdGVDb250ZW50JyxcbiAgICAgIGRhdGFTb3VyY2U6IGdlbmVyYXRlQ29udGVudERhdGFTb3VyY2VcbiAgICB9KVxuXG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYEdlbmVyYXRlQ29udGVudFN0cmVhbVJlc29sdmVyLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdnZW5lcmF0ZUNvbnRlbnRTdHJlYW0nLFxuICAgICAgZGF0YVNvdXJjZTogZ2VuZXJhdGVDb250ZW50U3RyZWFtRGF0YVNvdXJjZVxuICAgIH0pXG5cbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBgQXZhaWxhYmxlTW9kZWxzUmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2F2YWlsYWJsZU1vZGVscycsXG4gICAgICBkYXRhU291cmNlOiBhdmFpbGFibGVNb2RlbHNEYXRhU291cmNlXG4gICAgfSlcblxuICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsIGBHZW5lcmF0aW9uSGlzdG9yeVJlc29sdmVyLSR7c3RhZ2V9YCwge1xuICAgICAgYXBpOiBncmFwaHFsQXBpLFxuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZW5lcmF0aW9uSGlzdG9yeScsXG4gICAgICBkYXRhU291cmNlOiBnZW5lcmF0aW9uSGlzdG9yeURhdGFTb3VyY2VcbiAgICB9KVxuXG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgYEdlbmVyYXRlU25pcHBldEltYWdlUmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2dlbmVyYXRlU25pcHBldEltYWdlJyxcbiAgICAgIGRhdGFTb3VyY2U6IGdlbmVyYXRlSW1hZ2VEYXRhU291cmNlXG4gICAgfSlcblxuICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsIGBQdWJsaXNoR2VuZXJhdGlvblN0cmVhbUV2ZW50UmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICBhcGk6IGdyYXBocWxBcGksXG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ3B1Ymxpc2hHZW5lcmF0aW9uU3RyZWFtRXZlbnQnLFxuICAgICAgZGF0YVNvdXJjZTogZ2VuZXJhdGlvblN0cmVhbUV2ZW50c0RhdGFTb3VyY2UsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tU3RyaW5nKCckdXRpbC50b0pzb24oJGN0eC5hcmd1bWVudHMuaW5wdXQpJyksXG4gICAgICByZXNwb25zZU1hcHBpbmdUZW1wbGF0ZTogYXBwc3luYy5NYXBwaW5nVGVtcGxhdGUuZnJvbVN0cmluZygnJHV0aWwudG9Kc29uKCRjdHguYXJndW1lbnRzLmlucHV0KScpXG4gICAgfSlcblxuICAgIC8vIFN1YnNjcmlwdGlvbiByZXNvbHZlciB3aXRoIHNlcnZlci1zaWRlIGZpbHRlcmluZyBieSBzbmlwcGV0SWRcbiAgICAvLyBSZXR1cm5zIG51bGwgZm9yIG5vbi1tYXRjaGluZyBldmVudHMgKHdoaWNoIGlzIG5vdyBhbGxvd2VkIHNpbmNlIHJldHVybiB0eXBlIGlzIG51bGxhYmxlKVxuICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsIGBPbkdlbmVyYXRpb25TdHJlYW1TdWJzY3JpcHRpb25SZXNvbHZlci0ke3N0YWdlfWAsIHtcbiAgICAgIGFwaTogZ3JhcGhxbEFwaSxcbiAgICAgIHR5cGVOYW1lOiAnU3Vic2NyaXB0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ29uR2VuZXJhdGlvblN0cmVhbScsXG4gICAgICBkYXRhU291cmNlOiBnZW5lcmF0aW9uU3RyZWFtRXZlbnRzRGF0YVNvdXJjZSxcbiAgICAgIHJlcXVlc3RNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21TdHJpbmcoYFxuICAgICAgICB7XG4gICAgICAgICAgXCJ2ZXJzaW9uXCI6IFwiMjAxOC0wNS0yOVwiLFxuICAgICAgICAgIFwicGF5bG9hZFwiOiB7fVxuICAgICAgICB9XG4gICAgICBgKSxcbiAgICAgIHJlc3BvbnNlTWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tU3RyaW5nKGBcbiAgICAgICAgIyMgRmlsdGVyOiBvbmx5IGZvcndhcmQgZXZlbnRzIHdoZXJlIHNuaXBwZXRJZCBtYXRjaGVzIHRoZSBzdWJzY3JpcHRpb24gYXJndW1lbnRcbiAgICAgICAgI2lmKCRjdHgucmVzdWx0ICYmICRjdHgucmVzdWx0LnNuaXBwZXRJZCAmJiAkY3R4LnJlc3VsdC5zbmlwcGV0SWQgPT0gJGN0eC5hcmdzLnNuaXBwZXRJZClcbiAgICAgICAgICAkdXRpbC50b0pzb24oJGN0eC5yZXN1bHQpXG4gICAgICAgICNlbHNlXG4gICAgICAgICAgIyMgUmV0dXJuIG51bGwgdG8gc2tpcCB0aGlzIGV2ZW50IChudWxsYWJsZSByZXR1cm4gdHlwZSBhbGxvd3MgdGhpcylcbiAgICAgICAgICBudWxsXG4gICAgICAgICNlbmRcbiAgICAgIGApXG4gICAgfSlcblxuICAgIC8vIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBjb3N0IG1vbml0b3JpbmcgKG9wdGlvbmFsIGZvciBkZXYpXG4gICAgaWYgKHN0YWdlID09PSAncHJvZCcpIHtcbiAgICAgIC8vIFRPRE86IEFkZCBDbG91ZFdhdGNoIGFsYXJtcyBmb3I6XG4gICAgICAvLyAtIERhaWx5IGdlbmVyYXRpb24gY29zdCBleGNlZWRzIGJ1ZGdldFxuICAgICAgLy8gLSBFcnJvciByYXRlID4gNSVcbiAgICAgIC8vIC0gTGF0ZW5jeSA+IDMwIHNlY29uZHNcbiAgICB9XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dlbmVyYXRpb25zVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIGZvciBnZW5lcmF0aW9uIGhpc3RvcnknXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMTE1BcGlLZXlzU2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IGxsbUFwaUtleXNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWNyZXRzIE1hbmFnZXIgQVJOIGZvciBMTE0gQVBJIGtleXMnXG4gICAgfSlcbiAgfVxufVxuIl19