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
exports.AuteuriumWebStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
class AuteuriumWebStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage } = props;
        // S3 bucket for web hosting
        this.websiteBucket = new s3.Bucket(this, `AuteuriumWebBucket-${stage}`, {
            bucketName: `auteurium-web-${stage}-${this.account}`,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: stage !== 'prod'
        });
        // Origin Access Identity for CloudFront
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, `AuteuriumOAI-${stage}`, {
            comment: `OAI for Auteurium ${stage}`
        });
        // Grant CloudFront access to S3 bucket
        this.websiteBucket.grantRead(originAccessIdentity);
        // CloudFront distribution
        this.distribution = new cloudfront.Distribution(this, `AuteuriumDistribution-${stage}`, {
            comment: `Auteurium Web Distribution ${stage}`,
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.websiteBucket, {
                    originAccessIdentity
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
                compress: true,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
            },
            additionalBehaviors: {
                '/static/*': {
                    origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.websiteBucket, {
                        originAccessIdentity
                    }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    compress: true
                }
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5)
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5)
                }
            ],
            priceClass: stage === 'prod' ? cloudfront.PriceClass.PRICE_CLASS_ALL : cloudfront.PriceClass.PRICE_CLASS_100,
            enabled: stage === 'prod' // Disable for dev/testing stages for security
        });
        // Deploy web assets (this will be empty initially)
        const webAssetsPath = path.join(__dirname, '../../../../apps/web/dist');
        // Only deploy if dist folder exists
        try {
            new s3deploy.BucketDeployment(this, `AuteuriumWebDeploy-${stage}`, {
                sources: [s3deploy.Source.asset(webAssetsPath)],
                destinationBucket: this.websiteBucket,
                distribution: this.distribution,
                distributionPaths: ['/*']
            });
        }
        catch (_error) {
            // Dist folder doesn't exist yet, skip deployment
            console.warn(`Web dist folder not found at ${webAssetsPath}, skipping initial deployment`);
        }
        // Export values
        new cdk.CfnOutput(this, 'WebsiteBucketName', {
            value: this.websiteBucket.bucketName,
            exportName: `Auteurium-WebsiteBucketName-${stage}`
        });
        new cdk.CfnOutput(this, 'CloudFrontUrl', {
            value: `https://${this.distribution.distributionDomainName}`,
            exportName: `Auteurium-CloudFrontUrl-${stage}`
        });
        new cdk.CfnOutput(this, 'DistributionId', {
            value: this.distribution.distributionId,
            exportName: `Auteurium-DistributionId-${stage}`
        });
    }
}
exports.AuteuriumWebStack = AuteuriumWebStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLXdlYi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS13ZWItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNEI7QUFFNUIsaURBQWtDO0FBQ2xDLHVFQUF3RDtBQUN4RCw0RUFBNkQ7QUFDN0QsdURBQXdDO0FBQ3hDLHdFQUF5RDtBQU96RCxNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSTlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNkI7UUFDckUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQTtRQUV2Qiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsRUFBRTtZQUN0RSxVQUFVLEVBQUUsaUJBQWlCLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3BELGFBQWEsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3RGLGlCQUFpQixFQUFFLEtBQUssS0FBSyxNQUFNO1NBQ3BDLENBQUMsQ0FBQTtRQUVGLHdDQUF3QztRQUN4QyxNQUFNLG9CQUFvQixHQUFHLElBQUksVUFBVSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxnQkFBZ0IsS0FBSyxFQUFFLEVBQUU7WUFDOUYsT0FBTyxFQUFFLHFCQUFxQixLQUFLLEVBQUU7U0FDdEMsQ0FBQyxDQUFBO1FBRUYsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLG9CQUFvQixD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QUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsV0FBVyxJQUFJLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUFFO1lBQzVELFVBQVUsRUFBRSwyQkFBMkIsS0FBSyxFQUFFO1NBQy9DLENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYztZQUN2QyxVQUFVLEVBQUUsNEJBQTRCLEtBQUssRUFBRTtTQUNoRCxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUFsR0QsOENBa0dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250J1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJ1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnXG5pbXBvcnQgdHlwZSB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5cbmludGVyZmFjZSBBdXRldXJpdW1XZWJTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBzdGFnZTogc3RyaW5nXG59XG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1XZWJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB3ZWJzaXRlQnVja2V0OiBzMy5CdWNrZXRcbiAgcHVibGljIHJlYWRvbmx5IGRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb25cblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXV0ZXVyaXVtV2ViU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpXG5cbiAgICBjb25zdCB7IHN0YWdlIH0gPSBwcm9wc1xuXG4gICAgLy8gUzMgYnVja2V0IGZvciB3ZWIgaG9zdGluZ1xuICAgIHRoaXMud2Vic2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgYEF1dGV1cml1bVdlYkJ1Y2tldC0ke3N0YWdlfWAsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBhdXRldXJpdW0td2ViLSR7c3RhZ2V9LSR7dGhpcy5hY2NvdW50fWAsXG4gICAgICByZW1vdmFsUG9saWN5OiBzdGFnZSA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBzdGFnZSAhPT0gJ3Byb2QnXG4gICAgfSlcblxuICAgIC8vIE9yaWdpbiBBY2Nlc3MgSWRlbnRpdHkgZm9yIENsb3VkRnJvbnRcbiAgICBjb25zdCBvcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG5ldyBjbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsIGBBdXRldXJpdW1PQUktJHtzdGFnZX1gLCB7XG4gICAgICBjb21tZW50OiBgT0FJIGZvciBBdXRldXJpdW0gJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIC8vIEdyYW50IENsb3VkRnJvbnQgYWNjZXNzIHRvIFMzIGJ1Y2tldFxuICAgIHRoaXMud2Vic2l0ZUJ1Y2tldC5ncmFudFJlYWQob3JpZ2luQWNjZXNzSWRlbnRpdHkpXG5cbiAgICAvLyBDbG91ZEZyb250IGRpc3RyaWJ1dGlvblxuICAgIHRoaXMuZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsIGBBdXRldXJpdW1EaXN0cmlidXRpb24tJHtzdGFnZX1gLCB7XG4gICAgICBjb21tZW50OiBgQXV0ZXVyaXVtIFdlYiBEaXN0cmlidXRpb24gJHtzdGFnZX1gLFxuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogb3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcy53ZWJzaXRlQnVja2V0LCB7XG4gICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHlcbiAgICAgICAgfSksXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRCxcbiAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFELFxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRURcbiAgICAgIH0sXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XG4gICAgICAgICcvc3RhdGljLyonOiB7XG4gICAgICAgICAgb3JpZ2luOiBvcmlnaW5zLlMzQnVja2V0T3JpZ2luLndpdGhPcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLndlYnNpdGVCdWNrZXQsIHtcbiAgICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5XG4gICAgICAgICAgfSksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgICAgY29tcHJlc3M6IHRydWVcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgcHJpY2VDbGFzczogc3RhZ2UgPT09ICdwcm9kJyA/IGNsb3VkZnJvbnQuUHJpY2VDbGFzcy5QUklDRV9DTEFTU19BTEwgOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxuICAgICAgZW5hYmxlZDogc3RhZ2UgPT09ICdwcm9kJyAvLyBEaXNhYmxlIGZvciBkZXYvdGVzdGluZyBzdGFnZXMgZm9yIHNlY3VyaXR5XG4gICAgfSlcblxuICAgIC8vIERlcGxveSB3ZWIgYXNzZXRzICh0aGlzIHdpbGwgYmUgZW1wdHkgaW5pdGlhbGx5KVxuICAgIGNvbnN0IHdlYkFzc2V0c1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vYXBwcy93ZWIvZGlzdCcpXG4gICAgXG4gICAgLy8gT25seSBkZXBsb3kgaWYgZGlzdCBmb2xkZXIgZXhpc3RzXG4gICAgdHJ5IHtcbiAgICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsIGBBdXRldXJpdW1XZWJEZXBsb3ktJHtzdGFnZX1gLCB7XG4gICAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQod2ViQXNzZXRzUGF0aCldLFxuICAgICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogdGhpcy53ZWJzaXRlQnVja2V0LFxuICAgICAgICBkaXN0cmlidXRpb246IHRoaXMuZGlzdHJpYnV0aW9uLFxuICAgICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddXG4gICAgICB9KVxuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgLy8gRGlzdCBmb2xkZXIgZG9lc24ndCBleGlzdCB5ZXQsIHNraXAgZGVwbG95bWVudFxuICAgICAgY29uc29sZS53YXJuKGBXZWIgZGlzdCBmb2xkZXIgbm90IGZvdW5kIGF0ICR7d2ViQXNzZXRzUGF0aH0sIHNraXBwaW5nIGluaXRpYWwgZGVwbG95bWVudGApXG4gICAgfVxuXG4gICAgLy8gRXhwb3J0IHZhbHVlc1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLndlYnNpdGVCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tV2Vic2l0ZUJ1Y2tldE5hbWUtJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250VXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxuICAgICAgZXhwb3J0TmFtZTogYEF1dGV1cml1bS1DbG91ZEZyb250VXJsLSR7c3RhZ2V9YFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlzdHJpYnV0aW9uSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLURpc3RyaWJ1dGlvbklkLSR7c3RhZ2V9YFxuICAgIH0pXG4gIH1cbn0iXX0=