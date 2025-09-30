import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, test, beforeEach, expect } from '@jest/globals';

import { AuteuriumMediaStack } from '../../../lib/stacks/auteurium-media-stack';

describe('AuteuriumMediaStack', () => {
  let app: cdk.App;
  let stack: AuteuriumMediaStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AuteuriumMediaStack(app, 'TestAuteuriumMediaStack', {
      stage: 'test',
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  describe('S3 Bucket Configuration', () => {
    test('should create media bucket with correct naming', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'auteurium-media-test-123456789012',
      });
    });

    test('should configure CORS for media uploads', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        CorsConfiguration: {
          CorsRules: [
            {
              AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
              AllowedOrigins: ['*'], // TODO: Should be restricted in production
              AllowedHeaders: ['*'],
              MaxAge: 3000,
            },
          ],
        },
      });
    });

    test('should configure lifecycle rules', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'DeleteIncompleteMultipartUploads',
              Status: 'Enabled',
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: 7,
              },
            },
          ],
        },
      });
    });

    test('should set correct deletion policy for stage', () => {
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete',
      });
    });

    test('should retain bucket in production', () => {
      const prodApp = new cdk.App();
      const prodStack = new AuteuriumMediaStack(prodApp, 'ProdAuteuriumMediaStack', {
        stage: 'prod',
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
      });
    });
  });

  describe('Lambda Functions', () => {
    test('should create presigned URL Lambda with Node.js 22.x', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'auteurium-presigned-url-test',
        Runtime: 'nodejs22.x',
        Handler: 'presigned-url.handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    test('should create upload complete Lambda with Node.js 22.x', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'auteurium-upload-complete-test',
        Runtime: 'nodejs22.x',
        Handler: 'upload-complete.handler',
        Timeout: 30,
        MemorySize: 256,
      });
    });

    test('should configure correct environment variables', () => {
      // Check that both functions have environment variables with correct structure
      const functions = template.findResources('AWS::Lambda::Function');
      const appFunctions = Object.values(functions).filter((func: any) =>
        func.Properties.FunctionName &&
        func.Properties.FunctionName.includes('auteurium')
      );

      appFunctions.forEach((func: any) => {
        expect(func.Properties.Environment).toBeDefined();
        expect(func.Properties.Environment.Variables).toBeDefined();
        expect(func.Properties.Environment.Variables.STAGE).toBe('test');
        expect(func.Properties.Environment.Variables.MEDIA_BUCKET).toBeDefined();
        expect(func.Properties.Environment.Variables.MEDIA_BUCKET.Ref).toBeDefined();
      });
    });

    test('should use correct code asset paths', () => {
      // Check that Lambda functions have proper S3 code assets
      const functions = template.findResources('AWS::Lambda::Function');
      const appFunctions = Object.values(functions).filter((func: any) =>
        func.Properties.FunctionName &&
        func.Properties.FunctionName.includes('auteurium')
      );

      appFunctions.forEach((func: any) => {
        expect(func.Properties.Code).toBeDefined();
        expect(func.Properties.Code.S3Bucket).toBeDefined();
        expect(func.Properties.Code.S3Key).toBeDefined();
        expect(func.Properties.Code.S3Key).toMatch(/\.zip$/);
      });
    });
  });

  describe('S3 Event Notifications', () => {
    test('should configure S3 event notification for upload completion', () => {
      // CDK may create S3 bucket notifications through a custom resource instead of directly on the bucket
      // Check for either direct bucket notification or custom resource
      const buckets = template.findResources('AWS::S3::Bucket');
      const customResources = template.findResources('Custom::S3BucketNotifications');

      const hasBucketNotification = Object.values(buckets).some((bucket: any) =>
        bucket.Properties.NotificationConfiguration &&
        bucket.Properties.NotificationConfiguration.LambdaConfigurations
      );

      const hasCustomResourceNotification = Object.keys(customResources).length > 0;

      expect(hasBucketNotification || hasCustomResourceNotification).toBe(true);
    });

    test('should create bucket notifications handler', () => {
      // CDK creates a custom resource handler for S3 notifications
      const functions = template.findResources('AWS::Lambda::Function');
      const notificationHandler = Object.values(functions).find((func: any) =>
        func.Properties.Runtime === 'python3.13' &&
        func.Properties.Handler === 'index.handler'
      );

      expect(notificationHandler).toBeDefined();
      expect(notificationHandler!.Properties.Description).toContain('AWS CloudFormation handler');
    });
  });

  describe('IAM Permissions', () => {
    test('should grant S3 permissions to Lambda functions', () => {
      // Check that IAM policies exist for S3 permissions
      const policies = template.findResources('AWS::IAM::Policy');
      const s3Policies = Object.values(policies).filter((policy: any) =>
        policy.Properties.PolicyDocument.Statement.some((stmt: any) => {
          if (!stmt.Action) return false;
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          return actions.some((action: any) => action.includes('s3:'));
        })
      );

      expect(s3Policies.length).toBeGreaterThan(0);

      s3Policies.forEach((policy: any) => {
        const s3Statement = policy.Properties.PolicyDocument.Statement.find((stmt: any) => {
          if (!stmt.Action) return false;
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          return actions.some((action: any) => action.includes('s3:'));
        });

        expect(s3Statement).toBeDefined();
        expect(s3Statement.Effect).toBe('Allow');
        expect(s3Statement.Resource).toBeDefined();
        // Resource can be an array or a single object
        const resources = Array.isArray(s3Statement.Resource) ? s3Statement.Resource : [s3Statement.Resource];
        expect(resources.length).toBeGreaterThanOrEqual(1);
      });
    });

    test('should allow Lambda invocation from S3', () => {
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        Principal: 's3.amazonaws.com',
        SourceAccount: '123456789012',
      });
    });
  });

  describe('Stack Outputs', () => {
    test('should export media bucket name', () => {
      const outputs = template.findOutputs('MediaBucketName');
      expect(Object.keys(outputs)).toHaveLength(1);

      const output = outputs['MediaBucketName'];
      expect(output.Value).toBeDefined();
      expect(output.Value.Ref).toBeDefined();
      expect(output.Export.Name).toBe('Auteurium-MediaBucketName-test');
    });

    test('should export presigned URL function ARN', () => {
      const outputs = template.findOutputs('PresignedUrlFunctionArn');
      expect(Object.keys(outputs)).toHaveLength(1);

      const output = outputs['PresignedUrlFunctionArn'];
      expect(output.Value).toBeDefined();
      expect(output.Value['Fn::GetAtt']).toBeDefined();
      expect(output.Value['Fn::GetAtt']).toHaveLength(2);
      expect(output.Value['Fn::GetAtt'][1]).toBe('Arn');
      expect(output.Export.Name).toBe('Auteurium-PresignedUrlFunctionArn-test');
    });
  });

  describe('Resource Count Validation', () => {
    test('should create exactly one S3 bucket', () => {
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    test('should create exactly two application Lambda functions', () => {
      // Note: CDK may create additional Lambda functions for custom resources
      const functions = template.findResources('AWS::Lambda::Function');
      const appFunctions = Object.values(functions).filter((func: any) =>
        func.Properties.FunctionName &&
        func.Properties.FunctionName.includes('auteurium')
      );

      expect(appFunctions).toHaveLength(2);
    });
  });

  describe('Security Configuration', () => {
    test('should not allow public read access to bucket', () => {
      // Ensure bucket doesn't have public read permissions
      const bucket = template.findResources('AWS::S3::Bucket');
      Object.values(bucket).forEach((bucketResource: any) => {
        expect(bucketResource.Properties.PublicAccessBlockConfiguration).toBeTruthy();
      });
    });

    test('should block public ACLs and policies', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });
  });

  describe('Public Properties', () => {
    test('should expose media bucket as public property', () => {
      expect(stack.mediaBucket).toBeDefined();
      // CDK tokens are unresolved until deployment, so check for expected format
      expect(stack.mediaBucket.bucketName).toMatch(/\$\{Token|auteurium-media-test/);
    });

    test('should expose presigned URL function as public property', () => {
      expect(stack.presignedUrlFunction).toBeDefined();
      // CDK tokens are unresolved until deployment, so check for expected format
      expect(stack.presignedUrlFunction.functionName).toMatch(/\$\{Token|auteurium-presigned-url-test/);
    });
  });

  describe('Stage-specific Configuration', () => {
    test('should include stage in all resource names', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'auteurium-media-test-123456789012',
      });

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'auteurium-presigned-url-test',
      });

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'auteurium-upload-complete-test',
      });
    });

    test('should handle different stages correctly', () => {
      const devApp = new cdk.App();
      const devStack = new AuteuriumMediaStack(devApp, 'DevAuteuriumMediaStack', {
        stage: 'dev',
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
      });
      const devTemplate = Template.fromStack(devStack);

      devTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'auteurium-media-dev-123456789012',
      });

      devTemplate.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'auteurium-presigned-url-dev',
      });
    });
  });

  describe('Runtime Version Validation', () => {
    test('should use Node.js 22.x for all application Lambda functions', () => {
      const functions = template.findResources('AWS::Lambda::Function');
      Object.values(functions).forEach((func: any) => {
        if (
          func.Properties.FunctionName &&
          func.Properties.FunctionName.includes('auteurium') &&
          func.Properties.Runtime &&
          func.Properties.Runtime.startsWith('nodejs')
        ) {
          expect(func.Properties.Runtime).toBe('nodejs22.x');
        }
      });
    });
  });
});