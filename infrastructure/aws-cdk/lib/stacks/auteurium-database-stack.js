"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuteuriumDatabaseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
class AuteuriumDatabaseStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage } = props;
        // Users table
        this.usersTable = new dynamodb.Table(this, `AuteuriumUsers-${stage}`, {
            tableName: `auteurium-users-${stage}`,
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: stage === 'prod'
            }
        });
        // Add GSI for email lookup
        this.usersTable.addGlobalSecondaryIndex({
            indexName: 'EmailIndex',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Projects table
        this.projectsTable = new dynamodb.Table(this, `AuteuriumProjects-${stage}`, {
            tableName: `auteurium-projects-${stage}`,
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: stage === 'prod'
            }
        });
        // Snippets table
        this.snippetsTable = new dynamodb.Table(this, `AuteuriumSnippets-${stage}`, {
            tableName: `auteurium-snippets-${stage}`,
            partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: stage === 'prod'
            }
        });
        // Add GSI for user lookup
        this.snippetsTable.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Connections table (for snippet relationships)
        this.connectionsTable = new dynamodb.Table(this, `AuteuriumConnections-${stage}`, {
            tableName: `auteurium-connections-${stage}`,
            partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: stage === 'prod'
            }
        });
        // Add GSI for source snippet lookup
        this.connectionsTable.addGlobalSecondaryIndex({
            indexName: 'SourceSnippetIndex',
            partitionKey: { name: 'sourceSnippetId', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Add GSI for target snippet lookup
        this.connectionsTable.addGlobalSecondaryIndex({
            indexName: 'TargetSnippetIndex',
            partitionKey: { name: 'targetSnippetId', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Add GSI for connection type queries (useful for Neptune migration)
        this.connectionsTable.addGlobalSecondaryIndex({
            indexName: 'ConnectionTypeIndex',
            partitionKey: { name: 'connectionType', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Versions table (for snippet history)
        this.versionsTable = new dynamodb.Table(this, `AuteuriumVersions-${stage}`, {
            tableName: `auteurium-versions-${stage}`,
            partitionKey: { name: 'snippetId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: stage === 'prod'
            }
        });
        // Add GSI for user-based version queries
        this.versionsTable.addGlobalSecondaryIndex({
            indexName: 'UserVersionsIndex',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Output table names for Lambda environment variables
        new cdk.CfnOutput(this, `UsersTableName-${stage}`, {
            value: this.usersTable.tableName,
            exportName: `AuteuriumUsersTable-${stage}`
        });
        new cdk.CfnOutput(this, `ProjectsTableName-${stage}`, {
            value: this.projectsTable.tableName,
            exportName: `AuteuriumProjectsTable-${stage}`
        });
        new cdk.CfnOutput(this, `SnippetsTableName-${stage}`, {
            value: this.snippetsTable.tableName,
            exportName: `AuteuriumSnippetsTable-${stage}`
        });
        new cdk.CfnOutput(this, `ConnectionsTableName-${stage}`, {
            value: this.connectionsTable.tableName,
            exportName: `AuteuriumConnectionsTable-${stage}`
        });
        new cdk.CfnOutput(this, `VersionsTableName-${stage}`, {
            value: this.versionsTable.tableName,
            exportName: `AuteuriumVersionsTable-${stage}`
        });
    }
}
exports.AuteuriumDatabaseStack = AuteuriumDatabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWRhdGFiYXNlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0ZXVyaXVtLWRhdGFiYXNlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQWtDO0FBQ2xDLG1FQUFvRDtBQU9wRCxNQUFhLHNCQUF1QixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBT25ELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0M7UUFDMUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQTtRQUV2QixjQUFjO1FBQ2QsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixLQUFLLEVBQUUsRUFBRTtZQUNwRSxTQUFTLEVBQUUsbUJBQW1CLEtBQUssRUFBRTtZQUNyQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNqRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELGFBQWEsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3RGLGdDQUFnQyxFQUFFO2dCQUNoQywwQkFBMEIsRUFBRSxLQUFLLEtBQUssTUFBTTthQUM3QztTQUNGLENBQUMsQ0FBQTtRQUVGLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1lBQ3RDLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxF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S0FBSyxFQUFFO1NBQzNDLENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEtBQUssRUFBRSxFQUFFO1lBQ3BELEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVM7WUFDbkMsVUFBVSxFQUFFLDBCQUEwQixLQUFLLEVBQUU7U0FDOUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsS0FBSyxFQUFFLEVBQUU7WUFDcEQsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUztZQUNuQyxVQUFVLEVBQUUsMEJBQTBCLEtBQUssRUFBRTtTQUM5QyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHdCQUF3QixLQUFLLEVBQUUsRUFBRTtZQUN2RCxLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVM7WUFDdEMsVUFBVSxFQUFFLDZCQUE2QixLQUFLLEVBQUU7U0FDakQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsS0FBSyxFQUFFLEVBQUU7WUFDcEQsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUztZQUNuQyxVQUFVLEVBQUUsMEJBQTBCLEtBQUssRUFBRTtTQUM5QyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUE5SUQsd0RBOElDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJ1xuaW1wb3J0IHsgdHlwZSBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5pbnRlcmZhY2UgQXV0ZXVyaXVtRGF0YWJhc2VTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBzdGFnZTogc3RyaW5nXG59XG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1EYXRhYmFzZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJzVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHB1YmxpYyByZWFkb25seSBwcm9qZWN0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICBwdWJsaWMgcmVhZG9ubHkgc25pcHBldHNUYWJsZTogZHluYW1vZGIuVGFibGVcbiAgcHVibGljIHJlYWRvbmx5IGNvbm5lY3Rpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHB1YmxpYyByZWFkb25seSB2ZXJzaW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZVxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBdXRldXJpdW1EYXRhYmFzZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgY29uc3QgeyBzdGFnZSB9ID0gcHJvcHNcblxuICAgIC8vIFVzZXJzIHRhYmxlXG4gICAgdGhpcy51c2Vyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGBBdXRldXJpdW1Vc2Vycy0ke3N0YWdlfWAsIHtcbiAgICAgIHRhYmxlTmFtZTogYGF1dGV1cml1bS11c2Vycy0ke3N0YWdlfWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBzdGFnZSA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7XG4gICAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiBzdGFnZSA9PT0gJ3Byb2QnXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIGVtYWlsIGxvb2t1cFxuICAgIHRoaXMudXNlcnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdFbWFpbEluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxuICAgIH0pXG5cbiAgICAvLyBQcm9qZWN0cyB0YWJsZVxuICAgIHRoaXMucHJvamVjdHNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBgQXV0ZXVyaXVtUHJvamVjdHMtJHtzdGFnZX1gLCB7XG4gICAgICB0YWJsZU5hbWU6IGBhdXRldXJpdW0tcHJvamVjdHMtJHtzdGFnZX1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHtcbiAgICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IHN0YWdlID09PSAncHJvZCdcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gU25pcHBldHMgdGFibGVcbiAgICB0aGlzLnNuaXBwZXRzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgYEF1dGV1cml1bVNuaXBwZXRzLSR7c3RhZ2V9YCwge1xuICAgICAgdGFibGVOYW1lOiBgYXV0ZXVyaXVtLXNuaXBwZXRzLSR7c3RhZ2V9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncHJvamVjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBzdGFnZSA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7XG4gICAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiBzdGFnZSA9PT0gJ3Byb2QnXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXIgbG9va3VwXG4gICAgdGhpcy5zbmlwcGV0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1VzZXJJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxuICAgIH0pXG5cbiAgICAvLyBDb25uZWN0aW9ucyB0YWJsZSAoZm9yIHNuaXBwZXQgcmVsYXRpb25zaGlwcylcbiAgICB0aGlzLmNvbm5lY3Rpb25zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgYEF1dGV1cml1bUNvbm5lY3Rpb25zLSR7c3RhZ2V9YCwge1xuICAgICAgdGFibGVOYW1lOiBgYXV0ZXVyaXVtLWNvbm5lY3Rpb25zLSR7c3RhZ2V9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncHJvamVjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBzdGFnZSA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7XG4gICAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiBzdGFnZSA9PT0gJ3Byb2QnXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHNvdXJjZSBzbmlwcGV0IGxvb2t1cFxuICAgIHRoaXMuY29ubmVjdGlvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdTb3VyY2VTbmlwcGV0SW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzb3VyY2VTbmlwcGV0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciB0YXJnZXQgc25pcHBldCBsb29rdXBcbiAgICB0aGlzLmNvbm5lY3Rpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnVGFyZ2V0U25pcHBldEluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndGFyZ2V0U25pcHBldElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcbiAgICB9KVxuXG4gICAgLy8gQWRkIEdTSSBmb3IgY29ubmVjdGlvbiB0eXBlIHF1ZXJpZXMgKHVzZWZ1bCBmb3IgTmVwdHVuZSBtaWdyYXRpb24pXG4gICAgdGhpcy5jb25uZWN0aW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ0Nvbm5lY3Rpb25UeXBlSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdjb25uZWN0aW9uVHlwZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxuICAgIH0pXG5cbiAgICAvLyBWZXJzaW9ucyB0YWJsZSAoZm9yIHNuaXBwZXQgaGlzdG9yeSlcbiAgICB0aGlzLnZlcnNpb25zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgYEF1dGV1cml1bVZlcnNpb25zLSR7c3RhZ2V9YCwge1xuICAgICAgdGFibGVOYW1lOiBgYXV0ZXVyaXVtLXZlcnNpb25zLSR7c3RhZ2V9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc25pcHBldElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3ZlcnNpb24nLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHtcbiAgICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IHN0YWdlID09PSAncHJvZCdcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gQWRkIEdTSSBmb3IgdXNlci1iYXNlZCB2ZXJzaW9uIHF1ZXJpZXNcbiAgICB0aGlzLnZlcnNpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnVXNlclZlcnNpb25zSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcbiAgICB9KVxuXG4gICAgLy8gT3V0cHV0IHRhYmxlIG5hbWVzIGZvciBMYW1iZGEgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYFVzZXJzVGFibGVOYW1lLSR7c3RhZ2V9YCwge1xuICAgICAgdmFsdWU6IHRoaXMudXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtVXNlcnNUYWJsZS0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYFByb2plY3RzVGFibGVOYW1lLSR7c3RhZ2V9YCwge1xuICAgICAgdmFsdWU6IHRoaXMucHJvamVjdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtUHJvamVjdHNUYWJsZS0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYFNuaXBwZXRzVGFibGVOYW1lLSR7c3RhZ2V9YCwge1xuICAgICAgdmFsdWU6IHRoaXMuc25pcHBldHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtU25pcHBldHNUYWJsZS0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYENvbm5lY3Rpb25zVGFibGVOYW1lLSR7c3RhZ2V9YCwge1xuICAgICAgdmFsdWU6IHRoaXMuY29ubmVjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtQ29ubmVjdGlvbnNUYWJsZS0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYFZlcnNpb25zVGFibGVOYW1lLSR7c3RhZ2V9YCwge1xuICAgICAgdmFsdWU6IHRoaXMudmVyc2lvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtVmVyc2lvbnNUYWJsZS0ke3N0YWdlfWBcbiAgICB9KVxuICB9XG59Il19