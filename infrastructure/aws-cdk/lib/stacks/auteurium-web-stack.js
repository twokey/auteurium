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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLXdlYi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS13ZWItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNEI7QUFFNUIsaURBQWtDO0FBQ2xDLHVFQUF3RDtBQUN4RCw0RUFBNkQ7QUFDN0QsdURBQXdDO0FBQ3hDLHdFQUF5RDtBQVF6RCxNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSTlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNkI7UUFDckUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQTtRQUV2Qiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsRUFBRTtZQUN0RSxVQUFVLEVBQUUsaUJBQWlCLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3BELGFBQWEsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3RGLGlCQUFpQixFQUFFLEtBQUssS0FBSyxNQUFNO1NBQ3BDLENBQUMsQ0FBQTtRQUVGLHdDQUF3QztRQUN4QyxNQUFNLG9CQUFvQixHQUFHLElBQUksVUFBVSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxnQkFBZ0IsS0FBSyxFQUFFLEVBQUU7WUFDOUYsT0FBTyxFQUFFLHFCQUFxQixLQUFLLEVBQUU7U0FDdEMsQ0FBQyxDQUFBO1FBRUYsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLG9CQUFvQixD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QUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsV0FBVyxJQUFJLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUFFO1lBQzVELFVBQVUsRUFBRSwyQkFBMkIsS0FBSyxFQUFFO1NBQy9DLENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYztZQUN2QyxVQUFVLEVBQUUsNEJBQTRCLEtBQUssRUFBRTtTQUNoRCxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUFsR0QsOENBa0dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250J1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJ1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnXG5cbmltcG9ydCB0eXBlIHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuaW50ZXJmYWNlIEF1dGV1cml1bVdlYlN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bVdlYlN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHdlYnNpdGVCdWNrZXQ6IHMzLkJ1Y2tldFxuICBwdWJsaWMgcmVhZG9ubHkgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250LkRpc3RyaWJ1dGlvblxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBdXRldXJpdW1XZWJTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIGNvbnN0IHsgc3RhZ2UgfSA9IHByb3BzXG5cbiAgICAvLyBTMyBidWNrZXQgZm9yIHdlYiBob3N0aW5nXG4gICAgdGhpcy53ZWJzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBgQXV0ZXVyaXVtV2ViQnVja2V0LSR7c3RhZ2V9YCwge1xuICAgICAgYnVja2V0TmFtZTogYGF1dGV1cml1bS13ZWItJHtzdGFnZX0tJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHN0YWdlICE9PSAncHJvZCdcbiAgICB9KVxuXG4gICAgLy8gT3JpZ2luIEFjY2VzcyBJZGVudGl0eSBmb3IgQ2xvdWRGcm9udFxuICAgIGNvbnN0IG9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNsb3VkZnJvbnQuT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcywgYEF1dGV1cml1bU9BSS0ke3N0YWdlfWAsIHtcbiAgICAgIGNvbW1lbnQ6IGBPQUkgZm9yIEF1dGV1cml1bSAke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgQ2xvdWRGcm9udCBhY2Nlc3MgdG8gUzMgYnVja2V0XG4gICAgdGhpcy53ZWJzaXRlQnVja2V0LmdyYW50UmVhZChvcmlnaW5BY2Nlc3NJZGVudGl0eSlcblxuICAgIC8vIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uXG4gICAgdGhpcy5kaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgYEF1dGV1cml1bURpc3RyaWJ1dGlvbi0ke3N0YWdlfWAsIHtcbiAgICAgIGNvbW1lbnQ6IGBBdXRldXJpdW0gV2ViIERpc3RyaWJ1dGlvbiAke3N0YWdlfWAsXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBvcmlnaW5zLlMzQnVja2V0T3JpZ2luLndpdGhPcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLndlYnNpdGVCdWNrZXQsIHtcbiAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eVxuICAgICAgICB9KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFELFxuICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQUQsXG4gICAgICAgIGNvbXByZXNzOiB0cnVlLFxuICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRFxuICAgICAgfSxcbiAgICAgIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgICAgJy9zdGF0aWMvKic6IHtcbiAgICAgICAgICBvcmlnaW46IG9yaWdpbnMuUzNCdWNrZXRPcmlnaW4ud2l0aE9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMud2Vic2l0ZUJ1Y2tldCwge1xuICAgICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHlcbiAgICAgICAgICB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBjb21wcmVzczogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBwcmljZUNsYXNzOiBzdGFnZSA9PT0gJ3Byb2QnID8gY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTX0FMTCA6IGNsb3VkZnJvbnQuUHJpY2VDbGFzcy5QUklDRV9DTEFTU18xMDAsXG4gICAgICBlbmFibGVkOiBzdGFnZSA9PT0gJ3Byb2QnIC8vIERpc2FibGUgZm9yIGRldi90ZXN0aW5nIHN0YWdlcyBmb3Igc2VjdXJpdHlcbiAgICB9KVxuXG4gICAgLy8gRGVwbG95IHdlYiBhc3NldHMgKHRoaXMgd2lsbCBiZSBlbXB0eSBpbml0aWFsbHkpXG4gICAgY29uc3Qgd2ViQXNzZXRzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi9hcHBzL3dlYi9kaXN0JylcbiAgICBcbiAgICAvLyBPbmx5IGRlcGxveSBpZiBkaXN0IGZvbGRlciBleGlzdHNcbiAgICB0cnkge1xuICAgICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgYEF1dGV1cml1bVdlYkRlcGxveS0ke3N0YWdlfWAsIHtcbiAgICAgICAgc291cmNlczogW3MzZGVwbG95LlNvdXJjZS5hc3NldCh3ZWJBc3NldHNQYXRoKV0sXG4gICAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiB0aGlzLndlYnNpdGVCdWNrZXQsXG4gICAgICAgIGRpc3RyaWJ1dGlvbjogdGhpcy5kaXN0cmlidXRpb24sXG4gICAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbJy8qJ11cbiAgICAgIH0pXG4gICAgfSBjYXRjaCAoX2Vycm9yKSB7XG4gICAgICAvLyBEaXN0IGZvbGRlciBkb2Vzbid0IGV4aXN0IHlldCwgc2tpcCBkZXBsb3ltZW50XG4gICAgICBjb25zb2xlLndhcm4oYFdlYiBkaXN0IGZvbGRlciBub3QgZm91bmQgYXQgJHt3ZWJBc3NldHNQYXRofSwgc2tpcHBpbmcgaW5pdGlhbCBkZXBsb3ltZW50YClcbiAgICB9XG5cbiAgICAvLyBFeHBvcnQgdmFsdWVzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMud2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZXhwb3J0TmFtZTogYEF1dGV1cml1bS1XZWJzaXRlQnVja2V0TmFtZS0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnRVcmwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHt0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLUNsb3VkRnJvbnRVcmwtJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tRGlzdHJpYnV0aW9uSWQtJHtzdGFnZX1gXG4gICAgfSlcbiAgfVxufSJdfQ==