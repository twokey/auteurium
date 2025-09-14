import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
interface AuteuriumMediaStackProps extends cdk.StackProps {
    stage: string;
}
export declare class AuteuriumMediaStack extends cdk.Stack {
    readonly mediaBucket: s3.Bucket;
    readonly presignedUrlFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: AuteuriumMediaStackProps);
}
export {};
