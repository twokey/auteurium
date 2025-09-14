import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
interface AuteuriumWebStackProps extends cdk.StackProps {
    stage: string;
}
export declare class AuteuriumWebStack extends cdk.Stack {
    readonly websiteBucket: s3.Bucket;
    readonly distribution: cloudfront.Distribution;
    constructor(scope: Construct, id: string, props: AuteuriumWebStackProps);
}
export {};
