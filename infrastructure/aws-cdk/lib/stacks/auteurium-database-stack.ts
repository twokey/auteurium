import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

interface AuteuriumDatabaseStackProps extends cdk.StackProps {
  stage: string
}

export class AuteuriumDatabaseStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table
  public readonly projectsTable: dynamodb.Table
  public readonly snippetsTable: dynamodb.Table
  public readonly connectionsTable: dynamodb.Table

  constructor(scope: Construct, id: string, props: AuteuriumDatabaseStackProps) {
    super(scope, id, props)

    const { stage } = props

    // Users table
    this.usersTable = new dynamodb.Table(this, `AuteuriumUsers-${stage}`, {
      tableName: `auteurium-users-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: stage === 'prod'
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
      pointInTimeRecovery: stage === 'prod'
    })

    // Snippets table
    this.snippetsTable = new dynamodb.Table(this, `AuteuriumSnippets-${stage}`, {
      tableName: `auteurium-snippets-${stage}`,
      partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: stage === 'prod'
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
      pointInTimeRecovery: stage === 'prod'
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
  }
}