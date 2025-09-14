import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AuteuriumApiStack } from './auteurium-api-stack';
import { AuteuriumWebStack } from './auteurium-web-stack';
interface AuteuriumMonitoringStackProps extends cdk.StackProps {
    stage: string;
    apiStack: AuteuriumApiStack;
    webStack: AuteuriumWebStack;
}
export declare class AuteuriumMonitoringStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AuteuriumMonitoringStackProps);
}
export {};
