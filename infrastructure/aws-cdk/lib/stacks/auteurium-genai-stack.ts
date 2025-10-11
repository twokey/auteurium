import * as path from 'path'

import * as cdk from 'aws-cdk-lib'
import * as appsync from 'aws-cdk-lib/aws-appsync'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'

import type { Construct } from 'constructs'

interface AuteuriumGenAIStackProps extends cdk.StackProps {
  stage: string
  graphqlApi: appsync.IGraphqlApi
  userPool: cognito.IUserPool
  userPoolClient: cognito.IUserPoolClient
}

export class AuteuriumGenAIStack extends cdk.Stack {
  public readonly generationsTable: dynamodb.Table

  constructor(scope: Construct, id: string, props: AuteuriumGenAIStackProps) {
    super(scope, id, props)

    const { stage, graphqlApi, userPool, userPoolClient } = props

    // Import existing tables
    const snippetsTable = dynamodb.Table.fromTableName(this, 'SnippetsTable', `auteurium-snippets-${stage}`)
    const projectsTable = dynamodb.Table.fromTableName(this, 'ProjectsTable', `auteurium-projects-${stage}`)

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
    })

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
    })

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
    })

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
    })

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
      environment: {
        STAGE: stage,
        GENERATIONS_TABLE: this.generationsTable.tableName,
        SNIPPETS_TABLE: snippetsTable.tableName,
        PROJECTS_TABLE: projectsTable.tableName,
        LLM_API_KEYS_SECRET_ARN: llmApiKeysSecret.secretArn,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
      }
    })

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
    })

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
    })

    // Grant permissions
    llmApiKeysSecret.grantRead(generateContentFunction)
    this.generationsTable.grantReadWriteData(generateContentFunction)
    this.generationsTable.grantReadWriteData(generationHistoryFunction)
    snippetsTable.grantReadData(generateContentFunction)
    projectsTable.grantReadData(generateContentFunction)

    // Grant GSI query permissions
    generateContentFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [
        `${this.generationsTable.tableArn}/index/*`,
        `${snippetsTable.tableArn}/index/*`,
        `${projectsTable.tableArn}/index/*`
      ]
    }))

    generationHistoryFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [
        `${this.generationsTable.tableArn}/index/*`
      ]
    }))

    // Create Lambda data sources
    const generateContentDataSource = graphqlApi.addLambdaDataSource(
      `GenerateContentDataSource-${stage}`,
      generateContentFunction
    )

    const availableModelsDataSource = graphqlApi.addLambdaDataSource(
      `AvailableModelsDataSource-${stage}`,
      availableModelsFunction
    )

    const generationHistoryDataSource = graphqlApi.addLambdaDataSource(
      `GenerationHistoryDataSource-${stage}`,
      generationHistoryFunction
    )

    // Create resolvers
    generateContentDataSource.createResolver(`GenerateContentResolver-${stage}`, {
      typeName: 'Mutation',
      fieldName: 'generateContent'
    })

    availableModelsDataSource.createResolver(`AvailableModelsResolver-${stage}`, {
      typeName: 'Query',
      fieldName: 'availableModels'
    })

    generationHistoryDataSource.createResolver(`GenerationHistoryResolver-${stage}`, {
      typeName: 'Query',
      fieldName: 'generationHistory'
    })

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
    })

    new cdk.CfnOutput(this, 'LLMApiKeysSecretArn', {
      value: llmApiKeysSecret.secretArn,
      description: 'Secrets Manager ARN for LLM API keys'
    })
  }
}
