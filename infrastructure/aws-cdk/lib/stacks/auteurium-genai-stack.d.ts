import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';
interface AuteuriumGenAIStackProps extends cdk.StackProps {
    stage: string;
    graphqlApi: appsync.IGraphqlApi;
    userPool: cognito.IUserPool;
    userPoolClient: cognito.IUserPoolClient;
}
export declare class AuteuriumGenAIStack extends cdk.Stack {
    readonly generationsTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: AuteuriumGenAIStackProps);
}
export {};
