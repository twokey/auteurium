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
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class AuteuriumGenAIStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, graphqlApi, userPool, userPoolClient } = props;
        // Import existing tables
        const snippetsTable = dynamodb.Table.fromTableName(this, 'SnippetsTable', `auteurium-snippets-${stage}`);
        const projectsTable = dynamodb.Table.fromTableName(this, 'ProjectsTable', `auteurium-projects-${stage}`);
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
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
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
        // Grant permissions
        llmApiKeysSecret.grantRead(generateContentFunction);
        this.generationsTable.grantReadWriteData(generateContentFunction);
        this.generationsTable.grantReadWriteData(generationHistoryFunction);
        snippetsTable.grantReadData(generateContentFunction);
        projectsTable.grantReadData(generateContentFunction);
        // Grant GSI query permissions
        generateContentFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${this.generationsTable.tableArn}/index/*`,
                `${snippetsTable.tableArn}/index/*`,
                `${projectsTable.tableArn}/index/*`
            ]
        }));
        generationHistoryFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [
                `${this.generationsTable.tableArn}/index/*`
            ]
        }));
        // Create Lambda data sources
        const generateContentDataSource = graphqlApi.addLambdaDataSource(`GenerateContentDataSource-${stage}`, generateContentFunction);
        const availableModelsDataSource = graphqlApi.addLambdaDataSource(`AvailableModelsDataSource-${stage}`, availableModelsFunction);
        const generationHistoryDataSource = graphqlApi.addLambdaDataSource(`GenerationHistoryDataSource-${stage}`, generationHistoryFunction);
        // Create resolvers
        generateContentDataSource.createResolver(`GenerateContentResolver-${stage}`, {
            typeName: 'Mutation',
            fieldName: 'generateContent'
        });
        availableModelsDataSource.createResolver(`AvailableModelsResolver-${stage}`, {
            typeName: 'Query',
            fieldName: 'availableModels'
        });
        generationHistoryDataSource.createResolver(`GenerationHistoryResolver-${stage}`, {
            typeName: 'Query',
            fieldName: 'generationHistory'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWdlbmFpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0ZXVyaXVtLWdlbmFpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRCO0FBRTVCLGlEQUFrQztBQUdsQyxtRUFBb0Q7QUFDcEQseURBQTBDO0FBQzFDLCtEQUFnRDtBQUNoRCw0RUFBNkQ7QUFDN0QsK0VBQWdFO0FBV2hFLE1BQWEsbUJBQW9CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QixNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBRTdELHlCQUF5QjtRQUN6QixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3hHLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFeEcsaURBQWlEO1FBQ2pELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxvQkFBb0IsS0FBSyxFQUFFLEVBQUU7WUFDcEYsVUFBVSxFQUFFLDRCQUE0QixLQUFLLEVBQUU7WUFDL0MsV0FBVyxFQUFFLG1EQUFtRDtZQUNoRSxvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkMsTUFBTSxFQUFFLG9DQUFvQztvQkFDNUMsTUFBTSxFQUFFLG9DQUFv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QUVELFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUztZQUN0QyxXQUFXLEVBQUUsdUNBQXVDO1NBQ3JELENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDN0MsS0FBSyxFQUFFLGdCQUFnQixDQUFDLFNBQVM7WUFDakMsV0FBVyxFQUFFLHNDQUFzQztTQUNwRCxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUFsTkQsa0RBa05DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcHBzeW5jJ1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0bydcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYidcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJ1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnXG5pbXBvcnQgKiBhcyBsYW1iZGFOb2RlanMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInXG5cbmltcG9ydCB0eXBlIHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuaW50ZXJmYWNlIEF1dGV1cml1bUdlbkFJU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZ1xuICBncmFwaHFsQXBpOiBhcHBzeW5jLklHcmFwaHFsQXBpXG4gIHVzZXJQb29sOiBjb2duaXRvLklVc2VyUG9vbFxuICB1c2VyUG9vbENsaWVudDogY29nbml0by5JVXNlclBvb2xDbGllbnRcbn1cblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bUdlbkFJU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgZ2VuZXJhdGlvbnNUYWJsZTogZHluYW1vZGIuVGFibGVcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXV0ZXVyaXVtR2VuQUlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIGNvbnN0IHsgc3RhZ2UsIGdyYXBocWxBcGksIHVzZXJQb29sLCB1c2VyUG9vbENsaWVudCB9ID0gcHJvcHNcblxuICAgIC8vIEltcG9ydCBleGlzdGluZyB0YWJsZXNcbiAgICBjb25zdCBzbmlwcGV0c1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnU25pcHBldHNUYWJsZScsIGBhdXRldXJpdW0tc25pcHBldHMtJHtzdGFnZX1gKVxuICAgIGNvbnN0IHByb2plY3RzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdQcm9qZWN0c1RhYmxlJywgYGF1dGV1cml1bS1wcm9qZWN0cy0ke3N0YWdlfWApXG5cbiAgICAvLyBDcmVhdGUgU2VjcmV0cyBNYW5hZ2VyIHNlY3JldCBmb3IgTExNIEFQSSBrZXlzXG4gICAgY29uc3QgbGxtQXBpS2V5c1NlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgYExMTUFwaUtleXNTZWNyZXQtJHtzdGFnZX1gLCB7XG4gICAgICBzZWNyZXROYW1lOiBgYXV0ZXVyaXVtL2dlbmFpL2FwaS1rZXlzLSR7c3RhZ2V9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGtleXMgZm9yIExMTSBwcm92aWRlcnMgKEdlbWluaSwgT3BlbkFJLCBldGMuKScsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGdlbWluaTogJ1JFUExBQ0VfV0lUSF9BQ1RVQUxfR0VNSU5JX0FQSV9LRVknLFxuICAgICAgICAgIG9wZW5haTogJ1JFUExBQ0VfV0lUSF9BQ1RVQUxfT1BFTkFJX0FQSV9LRVknXG4gICAgICAgIH0pLFxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3BsYWNlaG9sZGVyJ1xuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZSBmb3IgZ2VuZXJhdGlvbiBoaXN0b3J5XG4gICAgdGhpcy5nZW5lcmF0aW9uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGBHZW5lcmF0aW9uc1RhYmxlLSR7c3RhZ2V9YCwge1xuICAgICAgdGFibGVOYW1lOiBgYXV0ZXVyaXVtLWdlbmVyYXRpb25zLSR7c3RhZ2V9YCxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnUEsnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ1NLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBzdGFnZSA9PT0gJ3Byb2QnXG4gICAgfSlcblxuICAgIC8vIEdTSTogUXVlcnkgZ2VuZXJhdGlvbnMgYnkgc25pcHBldCBJRFxuICAgIHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdzbmlwcGV0SWQtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdzbmlwcGV0SWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ2NyZWF0ZWRBdCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEdTSTogVHJhY2sgY29zdCBwZXIgdXNlciBwZXIgcHJvdmlkZXJcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAndXNlcklkLW1vZGVsUHJvdmlkZXItaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICd1c2VySWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ21vZGVsUHJvdmlkZXInLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGdlbmVyYXRlQ29udGVudCBtdXRhdGlvblxuICAgIGNvbnN0IGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgR2VuZXJhdGVDb250ZW50RnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tZ2VuYWktZ2VuZXJhdGUtJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS9zcmMvcmVzb2x2ZXJzL2dlbmFpL2dlbmVyYXRlQ29udGVudC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAvLyBMb25nZXIgdGltZW91dCBmb3IgTExNIGdlbmVyYXRpb25cbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBmb3JtYXQ6IGxhbWJkYU5vZGVqcy5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgICAgICB0YXJnZXQ6ICdub2RlMjInLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIHRzY29uZmlnOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvYXBpL3RzY29uZmlnLmpzb24nKSxcbiAgICAgICAgbm9kZU1vZHVsZXM6IFsnQGdvb2dsZS9nZW5haSddIC8vIEluY2x1ZGUgR2VtaW5pIFNES1xuICAgICAgfSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgR0VORVJBVElPTlNfVEFCTEU6IHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNOSVBQRVRTX1RBQkxFOiBzbmlwcGV0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJPSkVDVFNfVEFCTEU6IHByb2plY3RzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBMTE1fQVBJX0tFWVNfU0VDUkVUX0FSTjogbGxtQXBpS2V5c1NlY3JldC5zZWNyZXRBcm4sXG4gICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZFxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGF2YWlsYWJsZU1vZGVscyBxdWVyeVxuICAgIGNvbnN0IGF2YWlsYWJsZU1vZGVsc0Z1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgQXZhaWxhYmxlTW9kZWxzRnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tZ2VuYWktbW9kZWxzLSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvc3JjL3Jlc29sdmVycy9nZW5haS9hdmFpbGFibGVNb2RlbHMudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZWpzLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIHRhcmdldDogJ25vZGUyMicsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgdHNjb25maWc6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvdHNjb25maWcuanNvbicpXG4gICAgICB9LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBR0U6IHN0YWdlXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgZ2VuZXJhdGlvbkhpc3RvcnkgcXVlcnlcbiAgICBjb25zdCBnZW5lcmF0aW9uSGlzdG9yeUZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBgR2VuZXJhdGlvbkhpc3RvcnlGdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS1nZW5haS1oaXN0b3J5LSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9hcGkvc3JjL3Jlc29sdmVycy9nZW5haS9nZW5lcmF0aW9uSGlzdG9yeS50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlanMuT3V0cHV0Rm9ybWF0LkNKUyxcbiAgICAgICAgdGFyZ2V0OiAnbm9kZTIyJyxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB0c2NvbmZpZzogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL2FwaS90c2NvbmZpZy5qc29uJylcbiAgICAgIH0sXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIEdFTkVSQVRJT05TX1RBQkxFOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcbiAgICBsbG1BcGlLZXlzU2VjcmV0LmdyYW50UmVhZChnZW5lcmF0ZUNvbnRlbnRGdW5jdGlvbilcbiAgICB0aGlzLmdlbmVyYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uKVxuICAgIHRoaXMuZ2VuZXJhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdGlvbkhpc3RvcnlGdW5jdGlvbilcbiAgICBzbmlwcGV0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24pXG4gICAgcHJvamVjdHNUYWJsZS5ncmFudFJlYWREYXRhKGdlbmVyYXRlQ29udGVudEZ1bmN0aW9uKVxuXG4gICAgLy8gR3JhbnQgR1NJIHF1ZXJ5IHBlcm1pc3Npb25zXG4gICAgZ2VuZXJhdGVDb250ZW50RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6UXVlcnknXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHt0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHtzbmlwcGV0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgICAgYCR7cHJvamVjdHNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgIF1cbiAgICB9KSlcblxuICAgIGdlbmVyYXRpb25IaXN0b3J5RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6UXVlcnknXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgJHt0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVBcm59L2luZGV4LypgXG4gICAgICBdXG4gICAgfSkpXG5cbiAgICAvLyBDcmVhdGUgTGFtYmRhIGRhdGEgc291cmNlc1xuICAgIGNvbnN0IGdlbmVyYXRlQ29udGVudERhdGFTb3VyY2UgPSBncmFwaHFsQXBpLmFkZExhbWJkYURhdGFTb3VyY2UoXG4gICAgICBgR2VuZXJhdGVDb250ZW50RGF0YVNvdXJjZS0ke3N0YWdlfWAsXG4gICAgICBnZW5lcmF0ZUNvbnRlbnRGdW5jdGlvblxuICAgIClcblxuICAgIGNvbnN0IGF2YWlsYWJsZU1vZGVsc0RhdGFTb3VyY2UgPSBncmFwaHFsQXBpLmFkZExhbWJkYURhdGFTb3VyY2UoXG4gICAgICBgQXZhaWxhYmxlTW9kZWxzRGF0YVNvdXJjZS0ke3N0YWdlfWAsXG4gICAgICBhdmFpbGFibGVNb2RlbHNGdW5jdGlvblxuICAgIClcblxuICAgIGNvbnN0IGdlbmVyYXRpb25IaXN0b3J5RGF0YVNvdXJjZSA9IGdyYXBocWxBcGkuYWRkTGFtYmRhRGF0YVNvdXJjZShcbiAgICAgIGBHZW5lcmF0aW9uSGlzdG9yeURhdGFTb3VyY2UtJHtzdGFnZX1gLFxuICAgICAgZ2VuZXJhdGlvbkhpc3RvcnlGdW5jdGlvblxuICAgIClcblxuICAgIC8vIENyZWF0ZSByZXNvbHZlcnNcbiAgICBnZW5lcmF0ZUNvbnRlbnREYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKGBHZW5lcmF0ZUNvbnRlbnRSZXNvbHZlci0ke3N0YWdlfWAsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnZ2VuZXJhdGVDb250ZW50J1xuICAgIH0pXG5cbiAgICBhdmFpbGFibGVNb2RlbHNEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKGBBdmFpbGFibGVNb2RlbHNSZXNvbHZlci0ke3N0YWdlfWAsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnYXZhaWxhYmxlTW9kZWxzJ1xuICAgIH0pXG5cbiAgICBnZW5lcmF0aW9uSGlzdG9yeURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoYEdlbmVyYXRpb25IaXN0b3J5UmVzb2x2ZXItJHtzdGFnZX1gLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dlbmVyYXRpb25IaXN0b3J5J1xuICAgIH0pXG5cbiAgICAvLyBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgY29zdCBtb25pdG9yaW5nIChvcHRpb25hbCBmb3IgZGV2KVxuICAgIGlmIChzdGFnZSA9PT0gJ3Byb2QnKSB7XG4gICAgICAvLyBUT0RPOiBBZGQgQ2xvdWRXYXRjaCBhbGFybXMgZm9yOlxuICAgICAgLy8gLSBEYWlseSBnZW5lcmF0aW9uIGNvc3QgZXhjZWVkcyBidWRnZXRcbiAgICAgIC8vIC0gRXJyb3IgcmF0ZSA+IDUlXG4gICAgICAvLyAtIExhdGVuY3kgPiAzMCBzZWNvbmRzXG4gICAgfVxuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHZW5lcmF0aW9uc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmdlbmVyYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3IgZ2VuZXJhdGlvbiBoaXN0b3J5J1xuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTExNQXBpS2V5c1NlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiBsbG1BcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjcmV0cyBNYW5hZ2VyIEFSTiBmb3IgTExNIEFQSSBrZXlzJ1xuICAgIH0pXG4gIH1cbn1cbiJdfQ==