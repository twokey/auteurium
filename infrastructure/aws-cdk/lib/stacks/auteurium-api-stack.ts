import * as path from 'path'

import * as cdk from 'aws-cdk-lib'
import * as appsync from 'aws-cdk-lib/aws-appsync'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as s3 from 'aws-cdk-lib/aws-s3'

import type * as cognito from 'aws-cdk-lib/aws-cognito'
import type { Construct } from 'constructs'

interface AuteuriumApiStackProps extends cdk.StackProps {
  stage: string
  userPool: cognito.IUserPool
  userPoolClient: cognito.IUserPoolClient
  mediaBucket: s3.IBucket
}

export class AuteuriumApiStack extends cdk.Stack {
  public readonly graphqlApi: appsync.GraphqlApi
  
  constructor(scope: Construct, id: string, props: AuteuriumApiStackProps) {
    super(scope, id, props)

    const { stage, userPool, userPoolClient, mediaBucket } = props

    // Import DynamoDB tables from database stack
    const usersTable = dynamodb.Table.fromTableName(this, 'UsersTable', `auteurium-users-${stage}`)
    const projectsTable = dynamodb.Table.fromTableName(this, 'ProjectsTable', `auteurium-projects-${stage}`)
    const snippetsTable = dynamodb.Table.fromTableName(this, 'SnippetsTable', `auteurium-snippets-${stage}`)
    const connectionsTable = dynamodb.Table.fromTableName(this, 'ConnectionsTable', `auteurium-connections-${stage}`)
    const versionsTable = dynamodb.Table.fromTableName(this, 'VersionsTable', `auteurium-versions-${stage}`)

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
    })

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
    })

    // Grant S3 read permissions for generating presigned URLs
    mediaBucket.grantRead(apiFunction)

    // Grant DynamoDB permissions to Lambda
    usersTable.grantReadWriteData(apiFunction)
    projectsTable.grantReadWriteData(apiFunction)
    snippetsTable.grantReadWriteData(apiFunction)
    connectionsTable.grantReadWriteData(apiFunction)
    versionsTable.grantReadWriteData(apiFunction)

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
    }))

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
    }))

    // Create AppSync data source
    const lambdaDataSource = this.graphqlApi.addLambdaDataSource('LambdaDataSource', apiFunction)

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
    ]

    resolvers.forEach(({ typeName, fieldName }) => {
      new appsync.Resolver(this, `${typeName}${fieldName}Resolver`, {
        api: this.graphqlApi,
        typeName,
        fieldName,
        dataSource: lambdaDataSource
      })
    })

    // Export GraphQL API URL
    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: this.graphqlApi.graphqlUrl,
      exportName: `Auteurium-GraphQLApiUrl-${stage}`
    })

    new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: this.graphqlApi.apiKey ?? 'No API Key (using Cognito)',
      exportName: `Auteurium-GraphQLApiKey-${stage}`
    })
  }
}
