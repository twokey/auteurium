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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLW1lZGlhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0ZXVyaXVtLW1lZGlhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE0QjtBQUU1QixpREFBa0M7QUFDbEMsK0RBQWdEO0FBQ2hELHVEQUF3QztBQUN4QyxrRkFBbUU7QUFRbkUsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUloRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFdkIsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSx3QkFBd0IsS0FBSyxFQUFFLEVBQUU7WUFDdEUsVUFBVSxFQUFFLG1CQUFtQixLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUN0RCxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsY0FBYyxFQUFFO3dCQUNkLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJO3dCQUNuQixFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUc7d0JBQ2xCLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTTt3QkFDckIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJO3FCQUNwQjtvQkFDRCxjQUFjLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQztvQkFDekMsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixNQUFNLEVBQUUsSUFBSTtpQkFDYjthQUNGO1lBQ0QsY0FBYyxF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IGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgczNOb3RpZmljYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1ub3RpZmljYXRpb25zJ1xuXG5pbXBvcnQgdHlwZSB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5cbmludGVyZmFjZSBBdXRldXJpdW1NZWRpYVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bU1lZGlhU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgbWVkaWFCdWNrZXQ6IHMzLkJ1Y2tldFxuICBwdWJsaWMgcmVhZG9ubHkgcHJlc2lnbmVkVXJsRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvblxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBdXRldXJpdW1NZWRpYVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgY29uc3QgeyBzdGFnZSB9ID0gcHJvcHNcblxuICAgIC8vIFMzIGJ1Y2tldCBmb3IgbWVkaWEgc3RvcmFnZVxuICAgIHRoaXMubWVkaWFCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIGBBdXRldXJpdW1NZWRpYUJ1Y2tldC0ke3N0YWdlfWAsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBhdXRldXJpdW0tbWVkaWEtJHtzdGFnZX0tJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICBjb3JzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW1xuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuR0VULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUE9TVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLlBVVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkRFTEVURSxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkhFQURcbiAgICAgICAgICBdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCddLFxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgICBtYXhBZ2U6IDMwMDBcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0RlbGV0ZUluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoNylcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgZ2VuZXJhdGluZyBwcmVzaWduZWQgVVJMc1xuICAgIHRoaXMucHJlc2lnbmVkVXJsRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGBBdXRldXJpdW1QcmVzaWduZWRVcmxGdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS1wcmVzaWduZWQtdXJsLSR7c3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgaGFuZGxlcjogJ3ByZXNpZ25lZC11cmwuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL3NlcnZpY2VzL21lZGlhL2Rpc3QnKSksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICAgIE1FRElBX0JVQ0tFVDogdGhpcy5tZWRpYUJ1Y2tldC5idWNrZXROYW1lXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgaGFuZGxpbmcgdXBsb2FkIGNvbXBsZXRpb25cbiAgICBjb25zdCB1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBgQXV0ZXVyaXVtVXBsb2FkQ29tcGxldGVGdW5jdGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGF1dGV1cml1bS11cGxvYWQtY29tcGxldGUtJHtzdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBoYW5kbGVyOiAndXBsb2FkLWNvbXBsZXRlLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9zZXJ2aWNlcy9tZWRpYS9kaXN0JykpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBR0U6IHN0YWdlLFxuICAgICAgICBNRURJQV9CVUNLRVQ6IHRoaXMubWVkaWFCdWNrZXQuYnVja2V0TmFtZVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBHcmFudCBTMyBwZXJtaXNzaW9ucyB0byBMYW1iZGEgZnVuY3Rpb25zXG4gICAgdGhpcy5tZWRpYUJ1Y2tldC5ncmFudFJlYWRXcml0ZSh0aGlzLnByZXNpZ25lZFVybEZ1bmN0aW9uKVxuICAgIHRoaXMubWVkaWFCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodXBsb2FkQ29tcGxldGVGdW5jdGlvbilcblxuICAgIC8vIEFkZCBTMyBldmVudCBub3RpZmljYXRpb24gZm9yIHVwbG9hZCBjb21wbGV0aW9uXG4gICAgdGhpcy5tZWRpYUJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcbiAgICAgIHMzLkV2ZW50VHlwZS5PQkpFQ1RfQ1JFQVRFRCxcbiAgICAgIG5ldyBzM05vdGlmaWNhdGlvbnMuTGFtYmRhRGVzdGluYXRpb24odXBsb2FkQ29tcGxldGVGdW5jdGlvbilcbiAgICApXG5cbiAgICAvLyBFeHBvcnQgYnVja2V0IG5hbWVcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTWVkaWFCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMubWVkaWFCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tTWVkaWFCdWNrZXROYW1lLSR7c3RhZ2V9YFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJlc2lnbmVkVXJsRnVuY3Rpb25Bcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5wcmVzaWduZWRVcmxGdW5jdGlvbi5mdW5jdGlvbkFybixcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tUHJlc2lnbmVkVXJsRnVuY3Rpb25Bcm4tJHtzdGFnZX1gXG4gICAgfSlcbiAgfVxufVxuIl19