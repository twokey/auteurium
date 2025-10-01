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
exports.AuteuriumMediaStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3Notifications = __importStar(require("aws-cdk-lib/aws-s3-notifications"));
class AuteuriumMediaStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage } = props;
        // S3 bucket for media storage
        this.mediaBucket = new s3.Bucket(this, `AuteuriumMediaBucket-${stage}`, {
            bucketName: `auteurium-media-${stage}-${this.account}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.DELETE,
                        s3.HttpMethods.HEAD
                    ],
                    allowedOrigins: ['http://localhost:3000'],
                    allowedHeaders: ['*'],
                    maxAge: 3000
                }
            ],
            lifecycleRules: [
                {
                    id: 'DeleteIncompleteMultipartUploads',
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(7)
                }
            ],
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        // Lambda function for generating presigned URLs
        this.presignedUrlFunction = new lambda.Function(this, `AuteuriumPresignedUrlFunction-${stage}`, {
            functionName: `auteurium-presigned-url-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'presigned-url.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../../services/media/dist')),
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            environment: {
                STAGE: stage,
                MEDIA_BUCKET: this.mediaBucket.bucketName
            }
        });
        // Lambda function for handling upload completion
        const uploadCompleteFunction = new lambda.Function(this, `AuteuriumUploadCompleteFunction-${stage}`, {
            functionName: `auteurium-upload-complete-${stage}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'upload-complete.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../../services/media/dist')),
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                STAGE: stage,
                MEDIA_BUCKET: this.mediaBucket.bucketName
            }
        });
        // Grant S3 permissions to Lambda functions
        this.mediaBucket.grantReadWrite(this.presignedUrlFunction);
        this.mediaBucket.grantReadWrite(uploadCompleteFunction);
        // Add S3 event notification for upload completion
        this.mediaBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.LambdaDestination(uploadCompleteFunction));
        // Export bucket name
        new cdk.CfnOutput(this, 'MediaBucketName', {
            value: this.mediaBucket.bucketName,
            exportName: `Auteurium-MediaBucketName-${stage}`
        });
        new cdk.CfnOutput(this, 'PresignedUrlFunctionArn', {
            value: this.presignedUrlFunction.functionArn,
            exportName: `Auteurium-PresignedUrlFunctionArn-${stage}`
        });
    }
}
exports.AuteuriumMediaStack = AuteuriumMediaStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLW1lZGlhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0ZXVyaXVtLW1lZGlhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRCO0FBRTVCLGlEQUFrQztBQUNsQywrREFBZ0Q7QUFDaEQsdURBQXdDO0FBQ3hDLGtGQUFtRTtBQVFuRSxNQUFhLG1CQUFvQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSWhELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBK0I7UUFDdkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQTtRQUV2Qiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHdCQUF3QixLQUFLLEVBQUUsRUFBRTtZQUN0RSxVQUFVLEVBQUUsbUJBQW1CLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3RELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELElBQUksRUFBRTtnQkFDSjtvQkFDRSxjQUFjLEVBQUU7d0JBQ2QsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHO3dCQUNsQixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUk7d0JBQ25CLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNO3dCQUNyQixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUk7cUJBQ3BCO29CQUNELGNBQWMsRUFBRSxDQUFDLHVCQUF1QixDQUFDO29CQUN6QyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLE1BQU0sRUFBRSxJQUFJO2lCQUNiO2FBQ0Y7WUFDRCxjQUFjLEVBQUU7Z0JBQ2Q7b0JBQ0UsRUFBRSxFQUFFLGtDQUFrQztvQkFDdEMsbUNBQW1DLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUMxRDthQUNGO1lBQ0QsYUFBYSxFQUFFLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDdkYsQ0FBQyxDQUFBO1FBRUYsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGlDQUFpQyxLQUFLLEVBQUUsRUFBRTtZQUM5RixZQUFZLEVBQUUsMkJBQTJCLEtBQUssRUFBRTtZQUNoRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSx1QkFBdUI7WUFDaEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7WUFDcEYsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLFdBQVcsRUFBRTtnQkFDWCxLQUFLLEVBQUUsS0FBSztnQkFDWixZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVO2FBQzFDO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsaURBQWlEO1FBQ2pELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxtQ0FBbUMsS0FBSyxFQUFFLEVBQUU7WUFDbkcsWUFBWSxFQUFFLDZCQUE2QixLQUFLLEVBQUU7WUFDbEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUseUJBQXlCO1lBQ2xDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1lBQ3BGLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixXQUFXLEVBQUU7Z0JBQ1gsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osWUFBWSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVTthQUMxQztTQUNGLENBQUMsQ0FBQTtRQUVGLDJDQUEyQztRQUMzQyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBRXZELGtEQUFrRDtRQUNsRCxJQUFJLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUNuQyxFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFDM0IsSUFBSSxlQUFlLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsQ0FDOUQsQ0FBQTtRQUVELHFCQUFxQjtRQUNyQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVU7WUFDbEMsVUFBVSxFQUFFLDZCQUE2QixLQUFLLEVBQUU7U0FDakQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNqRCxLQUFLLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7WUFDNUMsVUFBVSxFQUFFLHFDQUFxQyxLQUFLLEVBQUU7U0FDekQsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBckZELGtEQXFGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXG5pbXBvcnQgKiBhcyBzM05vdGlmaWNhdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLW5vdGlmaWNhdGlvbnMnXG5cbmltcG9ydCB0eXBlIHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuaW50ZXJmYWNlIEF1dGV1cml1bU1lZGlhU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZ1xufVxuXG5leHBvcnQgY2xhc3MgQXV0ZXVyaXVtTWVkaWFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBtZWRpYUJ1Y2tldDogczMuQnVja2V0XG4gIHB1YmxpYyByZWFkb25seSBwcmVzaWduZWRVcmxGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEF1dGV1cml1bU1lZGlhU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpXG5cbiAgICBjb25zdCB7IHN0YWdlIH0gPSBwcm9wc1xuXG4gICAgLy8gUzMgYnVja2V0IGZvciBtZWRpYSBzdG9yYWdlXG4gICAgdGhpcy5tZWRpYUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgYEF1dGV1cml1bU1lZGlhQnVja2V0LSR7c3RhZ2V9YCwge1xuICAgICAgYnVja2V0TmFtZTogYGF1dGV1cml1bS1tZWRpYS0ke3N0YWdlfS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGNvcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5HRVQsXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5QT1NULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuREVMRVRFLFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuSEVBRFxuICAgICAgICAgIF0sXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnaHR0cDovL2xvY2FsaG9zdDozMDAwJ10sXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICAgIG1heEFnZTogMzAwMFxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnRGVsZXRlSW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZHMnLFxuICAgICAgICAgIGFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZEFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg3KVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1lcbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBnZW5lcmF0aW5nIHByZXNpZ25lZCBVUkxzXG4gICAgdGhpcy5wcmVzaWduZWRVcmxGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgYEF1dGV1cml1bVByZXNpZ25lZFVybEZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLXByZXNpZ25lZC11cmwtJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBoYW5kbGVyOiAncHJlc2lnbmVkLXVybC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvbWVkaWEvZGlzdCcpKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgTUVESUFfQlVDS0VUOiB0aGlzLm1lZGlhQnVja2V0LmJ1Y2tldE5hbWVcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBoYW5kbGluZyB1cGxvYWQgY29tcGxldGlvblxuICAgIGNvbnN0IHVwbG9hZENvbXBsZXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGBBdXRldXJpdW1VcGxvYWRDb21wbGV0ZUZ1bmN0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgYXV0ZXVyaXVtLXVwbG9hZC1jb21wbGV0ZS0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGhhbmRsZXI6ICd1cGxvYWQtY29tcGxldGUuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL21lZGlhL2Rpc3QnKSksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIE1FRElBX0JVQ0tFVDogdGhpcy5tZWRpYUJ1Y2tldC5idWNrZXROYW1lXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEdyYW50IFMzIHBlcm1pc3Npb25zIHRvIExhbWJkYSBmdW5jdGlvbnNcbiAgICB0aGlzLm1lZGlhQnVja2V0LmdyYW50UmVhZFdyaXRlKHRoaXMucHJlc2lnbmVkVXJsRnVuY3Rpb24pXG4gICAgdGhpcy5tZWRpYUJ1Y2tldC5ncmFudFJlYWRXcml0ZSh1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKVxuXG4gICAgLy8gQWRkIFMzIGV2ZW50IG5vdGlmaWNhdGlvbiBmb3IgdXBsb2FkIGNvbXBsZXRpb25cbiAgICB0aGlzLm1lZGlhQnVja2V0LmFkZEV2ZW50Tm90aWZpY2F0aW9uKFxuICAgICAgczMuRXZlbnRUeXBlLk9CSkVDVF9DUkVBVEVELFxuICAgICAgbmV3IHMzTm90aWZpY2F0aW9ucy5MYW1iZGFEZXN0aW5hdGlvbih1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKVxuICAgIClcblxuICAgIC8vIEV4cG9ydCBidWNrZXQgbmFtZVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdNZWRpYUJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5tZWRpYUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZXhwb3J0TmFtZTogYEF1dGV1cml1bS1NZWRpYUJ1Y2tldE5hbWUtJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcmVzaWduZWRVcmxGdW5jdGlvbkFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnByZXNpZ25lZFVybEZ1bmN0aW9uLmZ1bmN0aW9uQXJuLFxuICAgICAgZXhwb3J0TmFtZTogYEF1dGV1cml1bS1QcmVzaWduZWRVcmxGdW5jdGlvbkFybi0ke3N0YWdlfWBcbiAgICB9KVxuICB9XG59Il19