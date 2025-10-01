import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { type Construct } from 'constructs'

interface AuteuriumAuthStackProps extends cdk.StackProps {
  stage: string
}

export class AuteuriumAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, id: string, props: AuteuriumAuthStackProps) {
    super(scope, id, props)

    const { stage } = props

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, `AuteuriumUserPool-${stage}`, {
      userPoolName: `auteurium-users-${stage}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    })

    // Create User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, `AuteuriumUserPoolClient-${stage}`, {
      userPool: this.userPool,
      userPoolClientName: `auteurium-web-client-${stage}`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE
        ]
      }
    })

    // Export values for other stacks
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: `Auteurium-UserPoolId-${stage}`
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `Auteurium-UserPoolClientId-${stage}`
    })
  }
}