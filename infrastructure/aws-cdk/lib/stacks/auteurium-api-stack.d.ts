import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type * as cognito from 'aws-cdk-lib/aws-cognito';
import type { Construct } from 'constructs';
interface AuteuriumApiStackProps extends cdk.StackProps {
    stage: string;
    userPool: cognito.IUserPool;
    userPoolClient: cognito.IUserPoolClient;
    mediaBucket: s3.IBucket;
}
export declare class AuteuriumApiStack extends cdk.Stack {
    readonly graphqlApi: appsync.GraphqlApi;
    constructor(scope: Construct, id: string, props: AuteuriumApiStackProps);
}
export {};
