import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
interface AuteuriumApiStackProps extends cdk.StackProps {
    stage: string;
    userPool: cognito.IUserPool;
    userPoolClient: cognito.IUserPoolClient;
}
export declare class AuteuriumApiStack extends cdk.Stack {
    readonly graphqlApi: appsync.GraphqlApi;
    constructor(scope: Construct, id: string, props: AuteuriumApiStackProps);
}
export {};
