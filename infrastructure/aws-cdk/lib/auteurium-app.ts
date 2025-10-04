import * as cdk from 'aws-cdk-lib'

import { AuteuriumApiStack } from './stacks/auteurium-api-stack'
import { AuteuriumAuthStack } from './stacks/auteurium-auth-stack'
import { AuteuriumDatabaseStack } from './stacks/auteurium-database-stack'
import { AuteuriumGenAIStack } from './stacks/auteurium-genai-stack'
import { AuteuriumMediaStack } from './stacks/auteurium-media-stack'
import { AuteuriumWebStack } from './stacks/auteurium-web-stack'
// import { AuteuriumMonitoringStack } from './stacks/auteurium-monitoring-stack' // DISABLED - see auteurium-monitoring-stack.ts.disabled

export class AuteuriumApp extends cdk.App {
  constructor() {
    super()

    const coalesceEnv = (value: string | undefined, fallback: string) =>
      typeof value === 'string' && value.trim() !== '' ? value : fallback

    const env = {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: coalesceEnv(process.env.CDK_DEFAULT_REGION, 'us-east-1')
    }

    const stage = coalesceEnv(process.env.STAGE, 'dev')
    
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

    // GenAI stack (LLM integration)
    const _genaiStack = new AuteuriumGenAIStack(this, `Auteurium-GenAI-${stage}`, {
      env,
      stage,
      graphqlApi: apiStack.graphqlApi,
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient
    })

    // Media storage stack (S3)
    const _mediaStack = new AuteuriumMediaStack(this, `Auteurium-Media-${stage}`, {
      env,
      stage
    })

    // Web hosting stack (S3 + CloudFront)
    const _webStack = new AuteuriumWebStack(this, `Auteurium-Web-${stage}`, {
      env,
      stage
    })

    // TODO: Monitoring stack (CloudWatch) - DISABLED for development cost savings
    // Uncomment when ready for production monitoring (~$5-7/month)
    /*
    const monitoringStack = new AuteuriumMonitoringStack(this, `Auteurium-Monitoring-${stage}`, {
      env,
      stage,
      apiStack,
      webStack
    })
    */

    // Stack dependencies
    apiStack.addDependency(authStack)
    apiStack.addDependency(databaseStack)
    _genaiStack.addDependency(databaseStack)
    // Note: GenAI stack uses apiStack.graphqlApi reference but does not need a dependency
    // because it only adds resolvers to the existing API
    // monitoringStack.addDependency(apiStack) // DISABLED
    // monitoringStack.addDependency(webStack) // DISABLED
  }
}
