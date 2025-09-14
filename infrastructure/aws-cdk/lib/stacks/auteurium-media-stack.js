"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuteuriumMediaStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3Notifications = require("aws-cdk-lib/aws-s3-notifications");
const path = require("path");
class AuteuriumMediaStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage } = props;
        // S3 bucket for media storage
        this.mediaBucket = new s3.Bucket(this, `AuteuriumMediaBucket-${stage}`, {
            bucketName: `auteurium-media-${stage}-${this.account}`,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.DELETE,
                        s3.HttpMethods.HEAD
                    ],
                    allowedOrigins: ['*'],
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
            runtime: lambda.Runtime.NODEJS_18_X,
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
            runtime: lambda.Runtime.NODEJS_18_X,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLW1lZGlhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0ZXVyaXVtLW1lZGlhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFrQztBQUNsQyx5Q0FBd0M7QUFFeEMsaURBQWdEO0FBQ2hELG9FQUFtRTtBQUVuRSw2QkFBNEI7QUFNNUIsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUloRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFdkIsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSx3QkFBd0IsS0FBSyxFQUFFLEVBQUU7WUFDdEUsVUFBVSxFQUFFLG1CQUFtQixLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUN0RCxJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsY0FBYyxFQUFFO3dCQUNkLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJO3dCQUNuQixFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUc7d0JBQ2xCLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTTt3QkFDckIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJO3FCQUNwQjtvQkFDRCxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsTUFBTSxFQUFFLElBQUk7aUJBQ2I7YUFDRjtZQUNELGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxFQUFFLEVBQUUsa0NBQWtDO29CQUN0QyxtQ0FBbUMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7aUJBQzFEO2FBQ0Y7WUFDRCxhQUFhLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN2RixDQUFDLENBQUE7UUFFRixnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsaUNBQWlDLEtBQUssRUFBRSxFQUFFO1lBQzlGLFlBQVksRUFBRSwyQkFBMkIsS0FBSyxFQUFFO1lBQ2hELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLHVCQUF1QjtZQUNoQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztZQUNwRixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsV0FBVyxFQUFFO2dCQUNYLEtBQUssRUFBRSxLQUFLO2dCQUNaLFlBQVksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVU7YUFDMUM7U0FDRixDQUFDLENBQUE7UUFFRixpREFBaUQ7UUFDakQsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG1DQUFtQyxLQUFLLEVBQUUsRUFBRTtZQUNuRyxZQUFZLEVBQUUsNkJBQTZCLEtBQUssRUFBRTtZQUNsRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSx5QkFBeUI7WUFDbEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7WUFDcEYsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLFdBQVcsRUFBRTtnQkFDWCxLQUFLLEVBQUUsS0FBSztnQkFDWixZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVO2FBQzFDO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsMkNBQTJDO1FBQzNDLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFFdkQsa0RBQWtEO1FBQ2xELElBQUksQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQ25DLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUMzQixJQUFJLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUM5RCxDQUFBO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDekMsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVTtZQUNsQyxVQUFVLEVBQUUsNkJBQTZCLEtBQUssRUFBRTtTQUNqRCxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ2pELEtBQUssRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVztZQUM1QyxVQUFVLEVBQUUscUNBQXFDLEtBQUssRUFBRTtTQUN6RCxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUFwRkQsa0RBb0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCAqIGFzIHMzTm90aWZpY2F0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtbm90aWZpY2F0aW9ucydcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5cbmludGVyZmFjZSBBdXRldXJpdW1NZWRpYVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bU1lZGlhU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgbWVkaWFCdWNrZXQ6IHMzLkJ1Y2tldFxuICBwdWJsaWMgcmVhZG9ubHkgcHJlc2lnbmVkVXJsRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvblxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBdXRldXJpdW1NZWRpYVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgY29uc3QgeyBzdGFnZSB9ID0gcHJvcHNcblxuICAgIC8vIFMzIGJ1Y2tldCBmb3IgbWVkaWEgc3RvcmFnZVxuICAgIHRoaXMubWVkaWFCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIGBBdXRldXJpdW1NZWRpYUJ1Y2tldC0ke3N0YWdlfWAsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBhdXRldXJpdW0tbWVkaWEtJHtzdGFnZX0tJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIGNvcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5HRVQsXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5QT1NULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuREVMRVRFLFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuSEVBRFxuICAgICAgICAgIF0sXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLCAvLyBUT0RPOiBSZXN0cmljdCB0byBhY3R1YWwgZG9tYWluIGluIHByb2R1Y3Rpb25cbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogWycqJ10sXG4gICAgICAgICAgbWF4QWdlOiAzMDAwXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdEZWxldGVJbmNvbXBsZXRlTXVsdGlwYXJ0VXBsb2FkcycsXG4gICAgICAgICAgYWJvcnRJbmNvbXBsZXRlTXVsdGlwYXJ0VXBsb2FkQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDcpXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICByZW1vdmFsUG9saWN5OiBzdGFnZSA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGdlbmVyYXRpbmcgcHJlc2lnbmVkIFVSTHNcbiAgICB0aGlzLnByZXNpZ25lZFVybEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBgQXV0ZXVyaXVtUHJlc2lnbmVkVXJsRnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tcHJlc2lnbmVkLXVybC0ke3N0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwcmVzaWduZWQtdXJsLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9tZWRpYS9kaXN0JykpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBR0U6IHN0YWdlLFxuICAgICAgICBNRURJQV9CVUNLRVQ6IHRoaXMubWVkaWFCdWNrZXQuYnVja2V0TmFtZVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGhhbmRsaW5nIHVwbG9hZCBjb21wbGV0aW9uXG4gICAgY29uc3QgdXBsb2FkQ29tcGxldGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgYEF1dGV1cml1bVVwbG9hZENvbXBsZXRlRnVuY3Rpb24tJHtzdGFnZX1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBhdXRldXJpdW0tdXBsb2FkLWNvbXBsZXRlLSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3VwbG9hZC1jb21wbGV0ZS5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vc2VydmljZXMvbWVkaWEvZGlzdCcpKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgICAgTUVESUFfQlVDS0VUOiB0aGlzLm1lZGlhQnVja2V0LmJ1Y2tldE5hbWVcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgUzMgcGVybWlzc2lvbnMgdG8gTGFtYmRhIGZ1bmN0aW9uc1xuICAgIHRoaXMubWVkaWFCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodGhpcy5wcmVzaWduZWRVcmxGdW5jdGlvbilcbiAgICB0aGlzLm1lZGlhQnVja2V0LmdyYW50UmVhZFdyaXRlKHVwbG9hZENvbXBsZXRlRnVuY3Rpb24pXG5cbiAgICAvLyBBZGQgUzMgZXZlbnQgbm90aWZpY2F0aW9uIGZvciB1cGxvYWQgY29tcGxldGlvblxuICAgIHRoaXMubWVkaWFCdWNrZXQuYWRkRXZlbnROb3RpZmljYXRpb24oXG4gICAgICBzMy5FdmVudFR5cGUuT0JKRUNUX0NSRUFURUQsXG4gICAgICBuZXcgczNOb3RpZmljYXRpb25zLkxhbWJkYURlc3RpbmF0aW9uKHVwbG9hZENvbXBsZXRlRnVuY3Rpb24pXG4gICAgKVxuXG4gICAgLy8gRXhwb3J0IGJ1Y2tldCBuYW1lXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01lZGlhQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLm1lZGlhQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLU1lZGlhQnVja2V0TmFtZS0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ByZXNpZ25lZFVybEZ1bmN0aW9uQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMucHJlc2lnbmVkVXJsRnVuY3Rpb24uZnVuY3Rpb25Bcm4sXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLVByZXNpZ25lZFVybEZ1bmN0aW9uQXJuLSR7c3RhZ2V9YFxuICAgIH0pXG4gIH1cbn0iXX0=