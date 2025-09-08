import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AuteuriumAuthStack } from './stacks/auteurium-auth-stack'
import { AuteuriumDatabaseStack } from './stacks/auteurium-database-stack'
import { AuteuriumApiStack } from './stacks/auteurium-api-stack'
import { AuteuriumMediaStack } from './stacks/auteurium-media-stack'
import { AuteuriumWebStack } from './stacks/auteurium-web-stack'
import { AuteuriumMonitoringStack } from './stacks/auteurium-monitoring-stack'

export class AuteuriumApp extends cdk.App {
  constructor() {
    super()

    const env = {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
    }

    const stage = process.env.STAGE || 'dev'
    
    // Authentication stack (Cognito)
    const authStack = new AuteuriumAuthStack(this, `Auteurium-Auth-${stage}`, {
      env,
      stage
    })

    // Database stack
    const databaseStack = new AuteuriumDatabaseStack(this, `Auteurium-Database-${stage}`, {
      env,
      stage
    })

    // API stack (AppSync + Lambda)
    const apiStack = new AuteuriumApiStack(this, `Auteurium-Api-${stage}`, {
      env,
      stage,
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient
    })

    // Media storage stack (S3)
    const mediaStack = new AuteuriumMediaStack(this, `Auteurium-Media-${stage}`, {
      env,
      stage
    })

    // Web hosting stack (S3 + CloudFront)
    const webStack = new AuteuriumWebStack(this, `Auteurium-Web-${stage}`, {
      env,
      stage
    })

    // Monitoring stack (CloudWatch)
    const monitoringStack = new AuteuriumMonitoringStack(this, `Auteurium-Monitoring-${stage}`, {
      env,
      stage,
      apiStack,
      webStack
    })

    // Stack dependencies
    apiStack.addDependency(authStack)
    apiStack.addDependency(databaseStack)
    monitoringStack.addDependency(apiStack)
    monitoringStack.addDependency(webStack)
  }
}