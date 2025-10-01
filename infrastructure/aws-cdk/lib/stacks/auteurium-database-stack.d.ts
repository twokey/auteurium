import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { type Construct } from 'constructs';
interface AuteuriumDatabaseStackProps extends cdk.StackProps {
    stage: string;
}
export declare class AuteuriumDatabaseStack extends cdk.Stack {
    readonly usersTable: dynamodb.Table;
    readonly projectsTable: dynamodb.Table;
    readonly snippetsTable: dynamodb.Table;
    readonly connectionsTable: dynamodb.Table;
    readonly versionsTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: AuteuriumDatabaseStackProps);
}
export {};
