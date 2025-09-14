"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuteuriumWebStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const path = require("path");
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
                origin: new origins.S3Origin(this.websiteBucket, {
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
                    origin: new origins.S3Origin(this.websiteBucket, {
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
        catch (error) {
            // Dist folder doesn't exist yet, skip deployment
            console.log(`Web dist folder not found at ${webAssetsPath}, skipping initial deployment`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLXdlYi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS13ZWItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQWtDO0FBQ2xDLHlDQUF3QztBQUN4Qyx5REFBd0Q7QUFDeEQsOERBQTZEO0FBQzdELDBEQUF5RDtBQUV6RCw2QkFBNEI7QUFNNUIsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUk5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3JFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFdkIsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxzQkFBc0IsS0FBSyxFQUFFLEVBQUU7WUFDdEUsVUFBVSxFQUFFLGlCQUFpQixLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNwRCxhQUFhLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN0RixpQkFBaUIsRUFBRSxLQUFLLEtBQUssTUFBTTtTQUNwQyxDQUFDLENBQUE7UUFFRix3Q0FBd0M7UUFDeEMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEtBQUssRUFBRSxFQUFFO1lBQzlGLE9BQU8sRUFBRSxxQkFBcUIsS0FBSyxFQUFFO1NBQ3RDLENBQUMsQ0FBQTtRQUVGLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRWxELDBCQUEwQjtR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ZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxXQUFXLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCLEVBQUU7WUFDNUQsVUFBVSxFQUFFLDJCQUEyQixLQUFLLEVBQUU7U0FDL0MsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjO1lBQ3ZDLFVBQVUsRUFBRSw0QkFBNEIsS0FBSyxFQUFFO1NBQ2hELENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQWxHRCw4Q0FrR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250J1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJ1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJ1xuXG5pbnRlcmZhY2UgQXV0ZXVyaXVtV2ViU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZ1xufVxuXG5leHBvcnQgY2xhc3MgQXV0ZXVyaXVtV2ViU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgd2Vic2l0ZUJ1Y2tldDogczMuQnVja2V0XG4gIHB1YmxpYyByZWFkb25seSBkaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEF1dGV1cml1bVdlYlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgY29uc3QgeyBzdGFnZSB9ID0gcHJvcHNcblxuICAgIC8vIFMzIGJ1Y2tldCBmb3Igd2ViIGhvc3RpbmdcbiAgICB0aGlzLndlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIGBBdXRldXJpdW1XZWJCdWNrZXQtJHtzdGFnZX1gLCB7XG4gICAgICBidWNrZXROYW1lOiBgYXV0ZXVyaXVtLXdlYi0ke3N0YWdlfS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogc3RhZ2UgIT09ICdwcm9kJ1xuICAgIH0pXG5cbiAgICAvLyBPcmlnaW4gQWNjZXNzIElkZW50aXR5IGZvciBDbG91ZEZyb250XG4gICAgY29uc3Qgb3JpZ2luQWNjZXNzSWRlbnRpdHkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCBgQXV0ZXVyaXVtT0FJLSR7c3RhZ2V9YCwge1xuICAgICAgY29tbWVudDogYE9BSSBmb3IgQXV0ZXVyaXVtICR7c3RhZ2V9YFxuICAgIH0pXG5cbiAgICAvLyBHcmFudCBDbG91ZEZyb250IGFjY2VzcyB0byBTMyBidWNrZXRcbiAgICB0aGlzLndlYnNpdGVCdWNrZXQuZ3JhbnRSZWFkKG9yaWdpbkFjY2Vzc0lkZW50aXR5KVxuXG4gICAgLy8gQ2xvdWRGcm9udCBkaXN0cmlidXRpb25cbiAgICB0aGlzLmRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCBgQXV0ZXVyaXVtRGlzdHJpYnV0aW9uLSR7c3RhZ2V9YCwge1xuICAgICAgY29tbWVudDogYEF1dGV1cml1bSBXZWIgRGlzdHJpYnV0aW9uICR7c3RhZ2V9YCxcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMud2Vic2l0ZUJ1Y2tldCwge1xuICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5XG4gICAgICAgIH0pLFxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQUQsXG4gICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRCxcbiAgICAgICAgY29tcHJlc3M6IHRydWUsXG4gICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVEXG4gICAgICB9LFxuICAgICAgYWRkaXRpb25hbEJlaGF2aW9yczoge1xuICAgICAgICAnL3N0YXRpYy8qJzoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy53ZWJzaXRlQnVja2V0LCB7XG4gICAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgICAgIGNvbXByZXNzOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSlcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSlcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIHByaWNlQ2xhc3M6IHN0YWdlID09PSAncHJvZCcgPyBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfQUxMIDogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCxcbiAgICAgIGVuYWJsZWQ6IHN0YWdlID09PSAncHJvZCcgLy8gRGlzYWJsZSBmb3IgZGV2L3Rlc3Rpbmcgc3RhZ2VzIGZvciBzZWN1cml0eVxuICAgIH0pXG5cbiAgICAvLyBEZXBsb3kgd2ViIGFzc2V0cyAodGhpcyB3aWxsIGJlIGVtcHR5IGluaXRpYWxseSlcbiAgICBjb25zdCB3ZWJBc3NldHNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uL2FwcHMvd2ViL2Rpc3QnKVxuICAgIFxuICAgIC8vIE9ubHkgZGVwbG95IGlmIGRpc3QgZm9sZGVyIGV4aXN0c1xuICAgIHRyeSB7XG4gICAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCBgQXV0ZXVyaXVtV2ViRGVwbG95LSR7c3RhZ2V9YCwge1xuICAgICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHdlYkFzc2V0c1BhdGgpXSxcbiAgICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHRoaXMud2Vic2l0ZUJ1Y2tldCxcbiAgICAgICAgZGlzdHJpYnV0aW9uOiB0aGlzLmRpc3RyaWJ1dGlvbixcbiAgICAgICAgZGlzdHJpYnV0aW9uUGF0aHM6IFsnLyonXVxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gRGlzdCBmb2xkZXIgZG9lc24ndCBleGlzdCB5ZXQsIHNraXAgZGVwbG95bWVudFxuICAgICAgY29uc29sZS5sb2coYFdlYiBkaXN0IGZvbGRlciBub3QgZm91bmQgYXQgJHt3ZWJBc3NldHNQYXRofSwgc2tpcHBpbmcgaW5pdGlhbCBkZXBsb3ltZW50YClcbiAgICB9XG5cbiAgICAvLyBFeHBvcnQgdmFsdWVzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMud2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZXhwb3J0TmFtZTogYEF1dGV1cml1bS1XZWJzaXRlQnVja2V0TmFtZS0ke3N0YWdlfWBcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnRVcmwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHt0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLUNsb3VkRnJvbnRVcmwtJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tRGlzdHJpYnV0aW9uSWQtJHtzdGFnZX1gXG4gICAgfSlcbiAgfVxufSJdfQ==