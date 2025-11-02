import * as path from 'path'

import * as cdk from 'aws-cdk-lib'
import * as appsync from 'aws-cdk-lib/aws-appsync'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'

import type { Construct } from 'constructs'

interface AuteuriumGenAIStackProps extends cdk.StackProps {
  stage: string
  graphqlApi: appsync.IGraphqlApi
  userPool: cognito.IUserPool
  userPoolClient: cognito.IUserPoolClient
  mediaBucket: s3.IBucket
}

export class AuteuriumGenAIStack extends cdk.Stack {
  public readonly generationsTable: dynamodb.Table

  constructor(scope: Construct, id: string, props: AuteuriumGenAIStackProps) {
    super(scope, id, props)

    const { stage, graphqlApi, userPool, userPoolClient, mediaBucket } = props

    // Import existing tables
    const snippetsTable = dynamodb.Table.fromTableName(this, 'SnippetsTable', `auteurium-snippets-${stage}`)
    const projectsTable = dynamodb.Table.fromTableName(this, 'ProjectsTable', `auteurium-projects-${stage}`)
    const connectionsTable = dynamodb.Table.fromTableName(this, 'ConnectionsTable', `auteurium-connections-${stage}`)

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
    })

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
    })

    const appSyncFieldArn = this.formatArn({
      service: 'appsync',
      resource: 'apis',
      resourceName: `${graphqlApi.apiId}/types/*/fields/*`
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
      depsLockFilePath: path.join(__dirname, '../../../../package-lock.json'),
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
      depsLockFilePath: path.join(__dirname, '../../../../package-lock.json'),
      environment: {
        STAGE: stage,
        GENERATIONS_TABLE: this.generationsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
      }
    })

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
    })

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
    })

    // Grant permissions
    llmApiKeysSecret.grantRead(generateContentFunction)
    llmApiKeysSecret.grantRead(generateContentStreamFunction)
    llmApiKeysSecret.grantRead(generateImageFunction)
    llmApiKeysSecret.grantRead(createScenesFunction)
    this.generationsTable.grantReadWriteData(generateContentFunction)
    this.generationsTable.grantReadWriteData(generateContentStreamFunction)
    this.generationsTable.grantReadWriteData(generationHistoryFunction)
    this.generationsTable.grantReadWriteData(generateImageFunction)
    this.generationsTable.grantReadWriteData(createScenesFunction)
    snippetsTable.grantReadData(generateContentFunction)
    snippetsTable.grantReadData(generateContentStreamFunction)
    snippetsTable.grantReadWriteData(generateImageFunction)
    snippetsTable.grantReadWriteData(createScenesFunction) // Need write access to create scene snippets
    projectsTable.grantReadData(generateContentFunction)
    projectsTable.grantReadData(generateContentStreamFunction)
    connectionsTable.grantReadData(generateImageFunction) // Need to query connections for multimodal image generation
    mediaBucket.grantReadWrite(generateImageFunction)

    // Grant versions table write access for createScenes
    const versionsTable = dynamodb.Table.fromTableName(this, 'VersionsTableForScenes', `auteurium-versions-${stage}`)
    versionsTable.grantWriteData(createScenesFunction)

    // Grant GSI query permissions
    generateContentFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [
        `${this.generationsTable.tableArn}/index/*`,
        `${snippetsTable.tableArn}/index/*`,
        `${projectsTable.tableArn}/index/*`
      ]
    }))

    generateContentStreamFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [
        `${this.generationsTable.tableArn}/index/*`,
        `${snippetsTable.tableArn}/index/*`,
        `${projectsTable.tableArn}/index/*`
      ]
    }))

    generateContentStreamFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['appsync:GraphQL'],
      resources: [appSyncFieldArn]
    }))

    generateContentStreamFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['appsync:ListGraphqlApis'],
      resources: ['*']
    }))

    generationHistoryFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [
        `${this.generationsTable.tableArn}/index/*`
      ]
    }))

    // Grant GSI query permissions for generateImageFunction
    generateImageFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [
        `${connectionsTable.tableArn}/index/*`, // Need to query connections by targetSnippetId
        `${snippetsTable.tableArn}/index/*`
      ]
    }))

    // Grant GSI query permissions for createScenesFunction
    createScenesFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [
        `${this.generationsTable.tableArn}/index/*`,
        `${snippetsTable.tableArn}/index/*`
      ]
    }))

    // Create AppSync data sources
    const generateContentDataSource = new appsync.LambdaDataSource(this, `GenerateContentDataSource-${stage}`, {
      api: graphqlApi,
      name: `genai-generate-${stage}`,
      lambdaFunction: generateContentFunction
    })

    const generateContentStreamDataSource = new appsync.LambdaDataSource(this, `GenerateContentStreamDataSource-${stage}`, {
      api: graphqlApi,
      name: `genai-generate-stream-${stage}`,
      lambdaFunction: generateContentStreamFunction
    })

    const availableModelsDataSource = new appsync.LambdaDataSource(this, `AvailableModelsDataSource-${stage}`, {
      api: graphqlApi,
      name: `genai-models-${stage}`,
      lambdaFunction: availableModelsFunction
    })

    const generationHistoryDataSource = new appsync.LambdaDataSource(this, `GenerationHistoryDataSource-${stage}`, {
      api: graphqlApi,
      name: `genai-history-${stage}`,
      lambdaFunction: generationHistoryFunction
    })

    const generateImageDataSource = new appsync.LambdaDataSource(this, `GenerateImageDataSource-${stage}`, {
      api: graphqlApi,
      name: `genai-generate-image-${stage}`,
      lambdaFunction: generateImageFunction
    })

    const createScenesDataSource = new appsync.LambdaDataSource(this, `CreateScenesDataSource-${stage}`, {
      api: graphqlApi,
      name: `genai-create-scenes-${stage}`,
      lambdaFunction: createScenesFunction
    })

    const generationStreamEventsDataSource = new appsync.NoneDataSource(this, `GenerationStreamEventsDataSource-${stage}`, {
      api: graphqlApi,
      name: `genai-stream-events-${stage}`
    })

    // Create resolvers
    new appsync.Resolver(this, `GenerateContentResolver-${stage}`, {
      api: graphqlApi,
      typeName: 'Mutation',
      fieldName: 'generateContent',
      dataSource: generateContentDataSource
    })

    new appsync.Resolver(this, `GenerateContentStreamResolver-${stage}`, {
      api: graphqlApi,
      typeName: 'Mutation',
      fieldName: 'generateContentStream',
      dataSource: generateContentStreamDataSource
    })

    new appsync.Resolver(this, `AvailableModelsResolver-${stage}`, {
      api: graphqlApi,
      typeName: 'Query',
      fieldName: 'availableModels',
      dataSource: availableModelsDataSource
    })

    new appsync.Resolver(this, `GenerationHistoryResolver-${stage}`, {
      api: graphqlApi,
      typeName: 'Query',
      fieldName: 'generationHistory',
      dataSource: generationHistoryDataSource
    })

    new appsync.Resolver(this, `GenerateSnippetImageResolver-${stage}`, {
      api: graphqlApi,
      typeName: 'Mutation',
      fieldName: 'generateSnippetImage',
      dataSource: generateImageDataSource
    })

    new appsync.Resolver(this, `CreateScenesResolver-${stage}`, {
      api: graphqlApi,
      typeName: 'Mutation',
      fieldName: 'createScenes',
      dataSource: createScenesDataSource
    })

    new appsync.Resolver(this, `PublishGenerationStreamEventResolver-${stage}`, {
      api: graphqlApi,
      typeName: 'Mutation',
      fieldName: 'publishGenerationStreamEvent',
      dataSource: generationStreamEventsDataSource,
      requestMappingTemplate: appsync.MappingTemplate.fromString('$util.toJson($ctx.arguments.input)'),
      responseMappingTemplate: appsync.MappingTemplate.fromString('$util.toJson($ctx.arguments.input)')
    })

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
