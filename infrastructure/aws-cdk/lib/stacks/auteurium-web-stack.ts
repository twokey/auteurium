import * as path from 'path'

import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'

import type { Construct } from 'constructs'

interface AuteuriumWebStackProps extends cdk.StackProps {
  stage: string
}

export class AuteuriumWebStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution

  constructor(scope: Construct, id: string, props: AuteuriumWebStackProps) {
    super(scope, id, props)

    const { stage } = props

    // S3 bucket for web hosting
    this.websiteBucket = new s3.Bucket(this, `AuteuriumWebBucket-${stage}`, {
      bucketName: `auteurium-web-${stage}-${this.account}`,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod'
    })

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, `AuteuriumOAI-${stage}`, {
      comment: `OAI for Auteurium ${stage}`
    })

    // Grant CloudFront access to S3 bucket
    this.websiteBucket.grantRead(originAccessIdentity)

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
    })

    // Deploy web assets (this will be empty initially)
    const webAssetsPath = path.join(__dirname, '../../../../apps/web/dist')
    
    // Only deploy if dist folder exists
    try {
      new s3deploy.BucketDeployment(this, `AuteuriumWebDeploy-${stage}`, {
        sources: [s3deploy.Source.asset(webAssetsPath)],
        destinationBucket: this.websiteBucket,
        distribution: this.distribution,
        distributionPaths: ['/*']
      })
    } catch (_error) {
      // Dist folder doesn't exist yet, skip deployment
      console.warn(`Web dist folder not found at ${webAssetsPath}, skipping initial deployment`)
    }

    // Export values
    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: this.websiteBucket.bucketName,
      exportName: `Auteurium-WebsiteBucketName-${stage}`
    })

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      exportName: `Auteurium-CloudFrontUrl-${stage}`
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      exportName: `Auteurium-DistributionId-${stage}`
    })
  }
}