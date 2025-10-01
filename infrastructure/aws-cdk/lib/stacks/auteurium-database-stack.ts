import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { type Construct } from 'constructs'

interface AuteuriumDatabaseStackProps extends cdk.StackProps {
  stage: string
}

export class AuteuriumDatabaseStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table
  public readonly projectsTable: dynamodb.Table
  public readonly snippetsTable: dynamodb.Table
  public readonly connectionsTable: dynamodb.Table
  public readonly versionsTable: dynamodb.Table

  constructor(scope: Construct, id: string, props: AuteuriumDatabaseStackProps) {
    super(scope, id, props)

    const { stage } = props

    // Users table
    this.usersTable = new dynamodb.Table(this, `AuteuriumUsers-${stage}`, {
      tableName: `auteurium-users-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: stage === 'prod'
      }
    })

    // Add GSI for email lookup
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    })

    // Projects table
    this.projectsTable = new dynamodb.Table(this, `AuteuriumProjects-${stage}`, {
      tableName: `auteurium-projects-${stage}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: stage === 'prod'
      }
    })

    // Snippets table
    this.snippetsTable = new dynamodb.Table(this, `AuteuriumSnippets-${stage}`, {
      tableName: `auteurium-snippets-${stage}`,
      partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: stage === 'prod'
      }
    })

    // Add GSI for user lookup
    this.snippetsTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    })

    // Connections table (for snippet relationships)
    this.connectionsTable = new dynamodb.Table(this, `AuteuriumConnections-${stage}`, {
      tableName: `auteurium-connections-${stage}`,
      partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: stage === 'prod'
      }
    })

    // Add GSI for source snippet lookup
    this.connectionsTable.addGlobalSecondaryIndex({
      indexName: 'SourceSnippetIndex',
      partitionKey: { name: 'sourceSnippetId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    })

    // Add GSI for target snippet lookup
    this.connectionsTable.addGlobalSecondaryIndex({
      indexName: 'TargetSnippetIndex',
      partitionKey: { name: 'targetSnippetId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    })

    // Add GSI for connection type queries (useful for Neptune migration)
    this.connectionsTable.addGlobalSecondaryIndex({
      indexName: 'ConnectionTypeIndex',
      partitionKey: { name: 'connectionType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    })

    // Versions table (for snippet history)
    this.versionsTable = new dynamodb.Table(this, `AuteuriumVersions-${stage}`, {
      tableName: `auteurium-versions-${stage}`,
      partitionKey: { name: 'snippetId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: stage === 'prod'
      }
    })

    // Add GSI for user-based version queries
    this.versionsTable.addGlobalSecondaryIndex({
      indexName: 'UserVersionsIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    })

    // Output table names for Lambda environment variables
    new cdk.CfnOutput(this, `UsersTableName-${stage}`, {
      value: this.usersTable.tableName,
      exportName: `AuteuriumUsersTable-${stage}`
    })

    new cdk.CfnOutput(this, `ProjectsTableName-${stage}`, {
      value: this.projectsTable.tableName,
      exportName: `AuteuriumProjectsTable-${stage}`
    })

    new cdk.CfnOutput(this, `SnippetsTableName-${stage}`, {
      value: this.snippetsTable.tableName,
      exportName: `AuteuriumSnippetsTable-${stage}`
    })

    new cdk.CfnOutput(this, `ConnectionsTableName-${stage}`, {
      value: this.connectionsTable.tableName,
      exportName: `AuteuriumConnectionsTable-${stage}`
    })

    new cdk.CfnOutput(this, `VersionsTableName-${stage}`, {
      value: this.versionsTable.tableName,
      exportName: `AuteuriumVersionsTable-${stage}`
    })
  }
}