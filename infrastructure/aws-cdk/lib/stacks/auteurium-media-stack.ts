import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications'
import { Construct } from 'constructs'
import * as path from 'path'

interface AuteuriumMediaStackProps extends cdk.StackProps {
  stage: string
}

export class AuteuriumMediaStack extends cdk.Stack {
  public readonly mediaBucket: s3.Bucket
  public readonly presignedUrlFunction: lambda.Function

  constructor(scope: Construct, id: string, props: AuteuriumMediaStackProps) {
    super(scope, id, props)

    const { stage } = props

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
          allowedOrigins: ['*'], // TODO: Restrict to actual domain in production
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
    })

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
    })

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
    })

    // Grant S3 permissions to Lambda functions
    this.mediaBucket.grantReadWrite(this.presignedUrlFunction)
    this.mediaBucket.grantReadWrite(uploadCompleteFunction)

    // Add S3 event notification for upload completion
    this.mediaBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(uploadCompleteFunction)
    )

    // Export bucket name
    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: this.mediaBucket.bucketName,
      exportName: `Auteurium-MediaBucketName-${stage}`
    })

    new cdk.CfnOutput(this, 'PresignedUrlFunctionArn', {
      value: this.presignedUrlFunction.functionArn,
      exportName: `Auteurium-PresignedUrlFunctionArn-${stage}`
    })
  }
}