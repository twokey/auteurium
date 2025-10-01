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
const cdk = __importStar(require("aws-cdk-lib"));
const globals_1 = require("@jest/globals");
const assertions_1 = require("aws-cdk-lib/assertions");

const auteurium_media_stack_1 = require("../../../lib/stacks/auteurium-media-stack");
// Explicit Jest type imports to resolve TypeScript issues
(0, globals_1.describe)('AuteuriumMediaStack', () => {
    let app;
    let stack;
    let template;
    (0, globals_1.beforeEach)(() => {
        app = new cdk.App();
        stack = new auteurium_media_stack_1.AuteuriumMediaStack(app, 'TestAuteuriumMediaStack', {
            stage: 'test',
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
        template = assertions_1.Template.fromStack(stack);
    });
    (0, globals_1.describe)('S3 Bucket Configuration', () => {
        (0, globals_1.test)('should create media bucket with correct naming', () => {
            template.hasResourceProperties('AWS::S3::Bucket', {
                BucketName: 'auteurium-media-test-123456789012',
            });
        });
        (0, globals_1.test)('should configure CORS for media uploads', () => {
            template.hasResourceProperties('AWS::S3::Bucket', {
                CorsConfiguration: {
                    CorsRules: [
                        {
                            AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                            AllowedOrigins: ['*'],
                            AllowedHeaders: ['*'],
                            MaxAge: 3000,
                        },
                    ],
                },
            });
        });
        (0, globals_1.test)('should configure lifecycle rules', () => {
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
        (0, globals_1.test)('should set correct deletion policy for stage', () => {
            template.hasResource('AWS::S3::Bucket', {
                DeletionPolicy: 'Delete',
            });
        });
        (0, globals_1.test)('should retain bucket in production', () => {
            const prodStack = new auteurium_media_stack_1.AuteuriumMediaStack(app, 'ProdAuteuriumMediaStack', {
                stage: 'prod',
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
            });
            const prodTemplate = assertions_1.Template.fromStack(prodStack);
            prodTemplate.hasResource('AWS::S3::Bucket', {
                DeletionPolicy: 'Retain',
            });
        });
    });
    (0, globals_1.describe)('Lambda Functions', () => {
        (0, globals_1.test)('should create presigned URL Lambda with Node.js 22.x', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                FunctionName: 'auteurium-presigned-url-test',
                Runtime: 'nodejs22.x',
                Handler: 'presigned-url.handler',
                Timeout: 10,
                MemorySize: 256,
            });
        });
        (0, globals_1.test)('should create upload complete Lambda with Node.js 22.x', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                FunctionName: 'auteurium-upload-complete-test',
                Runtime: 'nodejs22.x',
                Handler: 'upload-complete.handler',
                Timeout: 30,
                MemorySize: 256,
            });
        });
        (0, globals_1.test)('should configure correct environment variables', () => {
            const expectedEnvVars = {
                STAGE: 'test',
                MEDIA_BUCKET: 'auteurium-media-test-123456789012',
            };
            template.hasResourceProperties('AWS::Lambda::Function', {
                FunctionName: 'auteurium-presigned-url-test',
                Environment: {
                    Variables: expectedEnvVars,
                },
            });
            template.hasResourceProperties('AWS::Lambda::Function', {
                FunctionName: 'auteurium-upload-complete-test',
                Environment: {
                    Variables: expectedEnvVars,
                },
            });
        });
        (0, globals_1.test)('should use correct code asset paths', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                FunctionName: 'auteurium-presigned-url-test',
                Code: {
                    S3Bucket: globals_1.expect.any(Object),
                    S3Key: globals_1.expect.any(String),
                },
            });
        });
    });
    (0, globals_1.describe)('S3 Event Notifications', () => {
        (0, globals_1.test)('should configure S3 event notification for upload completion', () => {
            template.hasResourceProperties('AWS::S3::Bucket', {
                NotificationConfiguration: {
                    LambdaConfigurations: [
                        {
                            Event: 's3:ObjectCreated:*',
                            Function: {
                                'Fn::GetAtt': [
                                    globals_1.expect.any(String),
                                    'Arn',
                                ],
                            },
                        },
                    ],
                },
            });
        });
        (0, globals_1.test)('should create bucket notifications handler', () => {
            // CDK creates a custom resource handler for S3 notifications
            template.hasResourceProperties('AWS::Lambda::Function', {
                Runtime: 'python3.13',
                Handler: 'index.handler',
                Description: globals_1.expect.stringContaining('AWS CloudFormation handler'),
            });
        });
    });
    (0, globals_1.describe)('IAM Permissions', () => {
        (0, globals_1.test)('should grant S3 permissions to Lambda functions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: [
                        {
                            Effect: 'Allow',
                            Action: [
                                's3:DeleteObject*',
                                's3:GetBucket*',
                                's3:GetObject*',
                                's3:List*',
                                's3:PutObject',
                                's3:PutObjectLegalHold',
                                's3:PutObjectRetention',
                                's3:PutObjectTagging',
                                's3:PutObjectVersionTagging',
                            ],
                            Resource: [
                                {
                                    'Fn::GetAtt': [globals_1.expect.any(String), 'Arn'],
                                },
                                {
                                    'Fn::Join': [
                                        '',
                                        [
                                            {
                                                'Fn::GetAtt': [globals_1.expect.any(String), 'Arn'],
                                            },
                                            '/*',
                                        ],
                                    ],
                                },
                            ],
                        },
                    ],
                },
            });
        });
        (0, globals_1.test)('should allow Lambda invocation from S3', () => {
            template.hasResourceProperties('AWS::Lambda::Permission', {
                Action: 'lambda:InvokeFunction',
                Principal: 's3.amazonaws.com',
                SourceAccount: '123456789012',
            });
        });
    });
    (0, globals_1.describe)('Stack Outputs', () => {
        (0, globals_1.test)('should export media bucket name', () => {
            template.hasOutput('MediaBucketName', {
                Value: 'auteurium-media-test-123456789012',
                Export: {
                    Name: 'Auteurium-MediaBucketName-test',
                },
            });
        });
        (0, globals_1.test)('should export presigned URL function ARN', () => {
            template.hasOutput('PresignedUrlFunctionArn', {
                Value: {
                    'Fn::GetAtt': [globals_1.expect.any(String), 'Arn'],
                },
                Export: {
                    Name: 'Auteurium-PresignedUrlFunctionArn-test',
                },
            });
        });
    });
    (0, globals_1.describe)('Resource Count Validation', () => {
        (0, globals_1.test)('should create exactly one S3 bucket', () => {
            template.resourceCountIs('AWS::S3::Bucket', 1);
        });
        (0, globals_1.test)('should create exactly two application Lambda functions', () => {
            // Note: CDK may create additional Lambda functions for custom resources
            const functions = template.findResources('AWS::Lambda::Function');
            const appFunctions = Object.values(functions).filter((func) => func.Properties.FunctionName &&
                func.Properties.FunctionName.includes('auteurium'));
            (0, globals_1.expect)(appFunctions).toHaveLength(2);
        });
    });
    (0, globals_1.describe)('Security Configuration', () => {
        (0, globals_1.test)('should not allow public read access to bucket', () => {
            // Ensure bucket doesn't have public read permissions
            const bucket = template.findResources('AWS::S3::Bucket');
            Object.values(bucket).forEach((bucketResource) => {
                (0, globals_1.expect)(bucketResource.Properties.PublicAccessBlockConfiguration).toBeTruthy();
            });
        });
        (0, globals_1.test)('should block public ACLs and policies', () => {
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
    (0, globals_1.describe)('Public Properties', () => {
        (0, globals_1.test)('should expose media bucket as public property', () => {
            (0, globals_1.expect)(stack.mediaBucket).toBeDefined();
            (0, globals_1.expect)(stack.mediaBucket.bucketName).toBe('auteurium-media-test-123456789012');
        });
        (0, globals_1.test)('should expose presigned URL function as public property', () => {
            (0, globals_1.expect)(stack.presignedUrlFunction).toBeDefined();
            (0, globals_1.expect)(stack.presignedUrlFunction.functionName).toBe('auteurium-presigned-url-test');
        });
    });
    (0, globals_1.describe)('Stage-specific Configuration', () => {
        (0, globals_1.test)('should include stage in all resource names', () => {
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
        (0, globals_1.test)('should handle different stages correctly', () => {
            const devStack = new auteurium_media_stack_1.AuteuriumMediaStack(app, 'DevAuteuriumMediaStack', {
                stage: 'dev',
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
            });
            const devTemplate = assertions_1.Template.fromStack(devStack);
            devTemplate.hasResourceProperties('AWS::S3::Bucket', {
                BucketName: 'auteurium-media-dev-123456789012',
            });
            devTemplate.hasResourceProperties('AWS::Lambda::Function', {
                FunctionName: 'auteurium-presigned-url-dev',
            });
        });
    });
    (0, globals_1.describe)('Runtime Version Validation', () => {
        (0, globals_1.test)('should use Node.js 22.x for all application Lambda functions', () => {
            const functions = template.findResources('AWS::Lambda::Function');
            Object.values(functions).forEach((func) => {
                if (func.Properties.FunctionName &&
                    func.Properties.FunctionName.includes('auteurium') &&
                    func.Properties.Runtime &&
                    func.Properties.Runtime.startsWith('nodejs')) {
                    (0, globals_1.expect)(func.Properties.Runtime).toBe('nodejs22.x');
                }
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkaWEtc3RhY2sudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1lZGlhLXN0YWNrLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBa0Q7QUFDbEQscUZBQWdGO0FBRWhGLDBEQUEwRDtBQUMxRCwyQ0FBbUU7QUFFbkUsSUFBQSxrQkFBUSxFQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNuQyxJQUFJLEdBQVksQ0FBQztJQUNqQixJQUFJLEtBQTBCLENBQUM7SUFDL0IsSUFBSSxRQUFrQixDQUFDO0lBRXZCLElBQUEsb0JBQVUsRUFBQyxHQUFHLEVBQUU7UUFDZCxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDcEIsS0FBSyxHQUFHLElBQUksMkNBQW1CLENBQUMsR0FBRyxFQUFFLHlCQUF5QixFQUFFO1lBQzlELEtBQUssRUFBRSxNQUFNO1lBQ2IsR0FBRyxFQUFFO2dCQUNILE9BQU8sRUFBRSxjQUFjO2dCQUN2QixNQUFNLEVBQUUsV0FBVzthQUNwQjtTQUNGLENBQUMsQ0FBQztRQUNILFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsa0JBQVEsRUFBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsSUFBQSxjQUFJLEVBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1lBQzFELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDaEQsVUFBVSxFQUFFLG1DQUFtQzthQUNoRCxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUEsY0FBSSxFQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtZQUNuRCxRQUFRLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ2hELGlCQUFpQixF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cG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBBdXRldXJpdW1NZWRpYVN0YWNrIH0gZnJvbSAnLi4vLi4vLi4vbGliL3N0YWNrcy9hdXRldXJpdW0tbWVkaWEtc3RhY2snO1xuXG4vLyBFeHBsaWNpdCBKZXN0IHR5cGUgaW1wb3J0cyB0byByZXNvbHZlIFR5cGVTY3JpcHQgaXNzdWVzXG5pbXBvcnQgeyBkZXNjcmliZSwgdGVzdCwgYmVmb3JlRWFjaCwgZXhwZWN0IH0gZnJvbSAnQGplc3QvZ2xvYmFscyc7XG5cbmRlc2NyaWJlKCdBdXRldXJpdW1NZWRpYVN0YWNrJywgKCkgPT4ge1xuICBsZXQgYXBwOiBjZGsuQXBwO1xuICBsZXQgc3RhY2s6IEF1dGV1cml1bU1lZGlhU3RhY2s7XG4gIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGU7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBzdGFjayA9IG5ldyBBdXRldXJpdW1NZWRpYVN0YWNrKGFwcCwgJ1Rlc3RBdXRldXJpdW1NZWRpYVN0YWNrJywge1xuICAgICAgc3RhZ2U6ICd0ZXN0JyxcbiAgICAgIGVudjoge1xuICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICB9KTtcblxuICBkZXNjcmliZSgnUzMgQnVja2V0IENvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBtZWRpYSBidWNrZXQgd2l0aCBjb3JyZWN0IG5hbWluZycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgICBCdWNrZXROYW1lOiAnYXV0ZXVyaXVtLW1lZGlhLXRlc3QtMTIzNDU2Nzg5MDEyJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNvbmZpZ3VyZSBDT1JTIGZvciBtZWRpYSB1cGxvYWRzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XG4gICAgICAgIENvcnNDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgQ29yc1J1bGVzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEFsbG93ZWRNZXRob2RzOiBbJ0dFVCcsICdQT1NUJywgJ1BVVCcsICdERUxFVEUnLCAnSEVBRCddLFxuICAgICAgICAgICAgICBBbGxvd2VkT3JpZ2luczogWycqJ10sIC8vIFRPRE86IFNob3VsZCBiZSByZXN0cmljdGVkIGluIHByb2R1Y3Rpb25cbiAgICAgICAgICAgICAgQWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICAgICAgICBNYXhBZ2U6IDMwMDAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjb25maWd1cmUgbGlmZWN5Y2xlIHJ1bGVzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XG4gICAgICAgIExpZmVjeWNsZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICBSdWxlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBJZDogJ0RlbGV0ZUluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICAgICAgU3RhdHVzOiAnRW5hYmxlZCcsXG4gICAgICAgICAgICAgIEFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZDoge1xuICAgICAgICAgICAgICAgIERheXNBZnRlckluaXRpYXRpb246IDcsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBzZXQgY29ycmVjdCBkZWxldGlvbiBwb2xpY3kgZm9yIHN0YWdlJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2UoJ0FXUzo6UzM6OkJ1Y2tldCcsIHtcbiAgICAgICAgRGVsZXRpb25Qb2xpY3k6ICdEZWxldGUnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgcmV0YWluIGJ1Y2tldCBpbiBwcm9kdWN0aW9uJywgKCkgPT4ge1xuICAgICAgY29uc3QgcHJvZFN0YWNrID0gbmV3IEF1dGV1cml1bU1lZGlhU3RhY2soYXBwLCAnUHJvZEF1dGV1cml1bU1lZGlhU3RhY2snLCB7XG4gICAgICAgIHN0YWdlOiAncHJvZCcsXG4gICAgICAgIGVudjoge1xuICAgICAgICAgIGFjY291bnQ6ICcxMjM0NTY3ODkwMTInLFxuICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb2RUZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhwcm9kU3RhY2spO1xuXG4gICAgICBwcm9kVGVtcGxhdGUuaGFzUmVzb3VyY2UoJ0FXUzo6UzM6OkJ1Y2tldCcsIHtcbiAgICAgICAgRGVsZXRpb25Qb2xpY3k6ICdSZXRhaW4nLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdMYW1iZGEgRnVuY3Rpb25zJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBjcmVhdGUgcHJlc2lnbmVkIFVSTCBMYW1iZGEgd2l0aCBOb2RlLmpzIDIyLngnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIHtcbiAgICAgICAgRnVuY3Rpb25OYW1lOiAnYXV0ZXVyaXVtLXByZXNpZ25lZC11cmwtdGVzdCcsXG4gICAgICAgIFJ1bnRpbWU6ICdub2RlanMyMi54JyxcbiAgICAgICAgSGFuZGxlcjogJ3ByZXNpZ25lZC11cmwuaGFuZGxlcicsXG4gICAgICAgIFRpbWVvdXQ6IDEwLFxuICAgICAgICBNZW1vcnlTaXplOiAyNTYsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjcmVhdGUgdXBsb2FkIGNvbXBsZXRlIExhbWJkYSB3aXRoIE5vZGUuanMgMjIueCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xuICAgICAgICBGdW5jdGlvbk5hbWU6ICdhdXRldXJpdW0tdXBsb2FkLWNvbXBsZXRlLXRlc3QnLFxuICAgICAgICBSdW50aW1lOiAnbm9kZWpzMjIueCcsXG4gICAgICAgIEhhbmRsZXI6ICd1cGxvYWQtY29tcGxldGUuaGFuZGxlcicsXG4gICAgICAgIFRpbWVvdXQ6IDMwLFxuICAgICAgICBNZW1vcnlTaXplOiAyNTYsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjb25maWd1cmUgY29ycmVjdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBleHBlY3RlZEVudlZhcnMgPSB7XG4gICAgICAgIFNUQUdFOiAndGVzdCcsXG4gICAgICAgIE1FRElBX0JVQ0tFVDogJ2F1dGV1cml1bS1tZWRpYS10ZXN0LTEyMzQ1Njc4OTAxMicsXG4gICAgICB9O1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIHtcbiAgICAgICAgRnVuY3Rpb25OYW1lOiAnYXV0ZXVyaXVtLXByZXNpZ25lZC11cmwtdGVzdCcsXG4gICAgICAgIEVudmlyb25tZW50OiB7XG4gICAgICAgICAgVmFyaWFibGVzOiBleHBlY3RlZEVudlZhcnMsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogJ2F1dGV1cml1bS11cGxvYWQtY29tcGxldGUtdGVzdCcsXG4gICAgICAgIEVudmlyb25tZW50OiB7XG4gICAgICAgICAgVmFyaWFibGVzOiBleHBlY3RlZEVudlZhcnMsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB1c2UgY29ycmVjdCBjb2RlIGFzc2V0IHBhdGhzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogJ2F1dGV1cml1bS1wcmVzaWduZWQtdXJsLXRlc3QnLFxuICAgICAgICBDb2RlOiB7XG4gICAgICAgICAgUzNCdWNrZXQ6IGV4cGVjdC5hbnkoT2JqZWN0KSxcbiAgICAgICAgICBTM0tleTogZXhwZWN0LmFueShTdHJpbmcpLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTMyBFdmVudCBOb3RpZmljYXRpb25zJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBjb25maWd1cmUgUzMgZXZlbnQgbm90aWZpY2F0aW9uIGZvciB1cGxvYWQgY29tcGxldGlvbicsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgICBOb3RpZmljYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgTGFtYmRhQ29uZmlndXJhdGlvbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgRXZlbnQ6ICdzMzpPYmplY3RDcmVhdGVkOionLFxuICAgICAgICAgICAgICBGdW5jdGlvbjoge1xuICAgICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICAgICAgZXhwZWN0LmFueShTdHJpbmcpLCAvLyBVcGxvYWQgY29tcGxldGUgZnVuY3Rpb24gbG9naWNhbCBJRFxuICAgICAgICAgICAgICAgICAgJ0FybicsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBidWNrZXQgbm90aWZpY2F0aW9ucyBoYW5kbGVyJywgKCkgPT4ge1xuICAgICAgLy8gQ0RLIGNyZWF0ZXMgYSBjdXN0b20gcmVzb3VyY2UgaGFuZGxlciBmb3IgUzMgbm90aWZpY2F0aW9uc1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICAgIFJ1bnRpbWU6ICdweXRob24zLjEzJyxcbiAgICAgICAgSGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgICBEZXNjcmlwdGlvbjogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ0FXUyBDbG91ZEZvcm1hdGlvbiBoYW5kbGVyJyksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0lBTSBQZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgZ3JhbnQgUzMgcGVybWlzc2lvbnMgdG8gTGFtYmRhIGZ1bmN0aW9ucycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICAgICAgUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgICBBY3Rpb246IFtcbiAgICAgICAgICAgICAgICAnczM6RGVsZXRlT2JqZWN0KicsXG4gICAgICAgICAgICAgICAgJ3MzOkdldEJ1Y2tldConLFxuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QqJyxcbiAgICAgICAgICAgICAgICAnczM6TGlzdConLFxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3RMZWdhbEhvbGQnLFxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3RSZXRlbnRpb24nLFxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3RUYWdnaW5nJyxcbiAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0VmVyc2lvblRhZ2dpbmcnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBSZXNvdXJjZTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW2V4cGVjdC5hbnkoU3RyaW5nKSwgJ0FybiddLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgJ0ZuOjpKb2luJzogW1xuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW2V4cGVjdC5hbnkoU3RyaW5nKSwgJ0FybiddLFxuICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgJy8qJyxcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGFsbG93IExhbWJkYSBpbnZvY2F0aW9uIGZyb20gUzMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJywge1xuICAgICAgICBBY3Rpb246ICdsYW1iZGE6SW52b2tlRnVuY3Rpb24nLFxuICAgICAgICBQcmluY2lwYWw6ICdzMy5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgU291cmNlQWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1N0YWNrIE91dHB1dHMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGV4cG9ydCBtZWRpYSBidWNrZXQgbmFtZScsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnTWVkaWFCdWNrZXROYW1lJywge1xuICAgICAgICBWYWx1ZTogJ2F1dGV1cml1bS1tZWRpYS10ZXN0LTEyMzQ1Njc4OTAxMicsXG4gICAgICAgIEV4cG9ydDoge1xuICAgICAgICAgIE5hbWU6ICdBdXRldXJpdW0tTWVkaWFCdWNrZXROYW1lLXRlc3QnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgZXhwb3J0IHByZXNpZ25lZCBVUkwgZnVuY3Rpb24gQVJOJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdQcmVzaWduZWRVcmxGdW5jdGlvbkFybicsIHtcbiAgICAgICAgVmFsdWU6IHtcbiAgICAgICAgICAnRm46OkdldEF0dCc6IFtleHBlY3QuYW55KFN0cmluZyksICdBcm4nXSxcbiAgICAgICAgfSxcbiAgICAgICAgRXhwb3J0OiB7XG4gICAgICAgICAgTmFtZTogJ0F1dGV1cml1bS1QcmVzaWduZWRVcmxGdW5jdGlvbkFybi10ZXN0JyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUmVzb3VyY2UgQ291bnQgVmFsaWRhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIGV4YWN0bHkgb25lIFMzIGJ1Y2tldCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpTMzo6QnVja2V0JywgMSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIGV4YWN0bHkgdHdvIGFwcGxpY2F0aW9uIExhbWJkYSBmdW5jdGlvbnMnLCAoKSA9PiB7XG4gICAgICAvLyBOb3RlOiBDREsgbWF5IGNyZWF0ZSBhZGRpdGlvbmFsIExhbWJkYSBmdW5jdGlvbnMgZm9yIGN1c3RvbSByZXNvdXJjZXNcbiAgICAgIGNvbnN0IGZ1bmN0aW9ucyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicpO1xuICAgICAgY29uc3QgYXBwRnVuY3Rpb25zID0gT2JqZWN0LnZhbHVlcyhmdW5jdGlvbnMpLmZpbHRlcigoZnVuYzogYW55KSA9PlxuICAgICAgICBmdW5jLlByb3BlcnRpZXMuRnVuY3Rpb25OYW1lICYmXG4gICAgICAgIGZ1bmMuUHJvcGVydGllcy5GdW5jdGlvbk5hbWUuaW5jbHVkZXMoJ2F1dGV1cml1bScpXG4gICAgICApO1xuXG4gICAgICBleHBlY3QoYXBwRnVuY3Rpb25zKS50b0hhdmVMZW5ndGgoMik7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTZWN1cml0eSBDb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBub3QgYWxsb3cgcHVibGljIHJlYWQgYWNjZXNzIHRvIGJ1Y2tldCcsICgpID0+IHtcbiAgICAgIC8vIEVuc3VyZSBidWNrZXQgZG9lc24ndCBoYXZlIHB1YmxpYyByZWFkIHBlcm1pc3Npb25zXG4gICAgICBjb25zdCBidWNrZXQgPSB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OlMzOjpCdWNrZXQnKTtcbiAgICAgIE9iamVjdC52YWx1ZXMoYnVja2V0KS5mb3JFYWNoKChidWNrZXRSZXNvdXJjZTogYW55KSA9PiB7XG4gICAgICAgIGV4cGVjdChidWNrZXRSZXNvdXJjZS5Qcm9wZXJ0aWVzLlB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbikudG9CZVRydXRoeSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgYmxvY2sgcHVibGljIEFDTHMgYW5kIHBvbGljaWVzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XG4gICAgICAgIFB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIEJsb2NrUHVibGljQWNsczogdHJ1ZSxcbiAgICAgICAgICBCbG9ja1B1YmxpY1BvbGljeTogdHJ1ZSxcbiAgICAgICAgICBJZ25vcmVQdWJsaWNBY2xzOiB0cnVlLFxuICAgICAgICAgIFJlc3RyaWN0UHVibGljQnVja2V0czogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUHVibGljIFByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGV4cG9zZSBtZWRpYSBidWNrZXQgYXMgcHVibGljIHByb3BlcnR5JywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHN0YWNrLm1lZGlhQnVja2V0KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHN0YWNrLm1lZGlhQnVja2V0LmJ1Y2tldE5hbWUpLnRvQmUoJ2F1dGV1cml1bS1tZWRpYS10ZXN0LTEyMzQ1Njc4OTAxMicpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGV4cG9zZSBwcmVzaWduZWQgVVJMIGZ1bmN0aW9uIGFzIHB1YmxpYyBwcm9wZXJ0eScsICgpID0+IHtcbiAgICAgIGV4cGVjdChzdGFjay5wcmVzaWduZWRVcmxGdW5jdGlvbikudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChzdGFjay5wcmVzaWduZWRVcmxGdW5jdGlvbi5mdW5jdGlvbk5hbWUpLnRvQmUoJ2F1dGV1cml1bS1wcmVzaWduZWQtdXJsLXRlc3QnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1N0YWdlLXNwZWNpZmljIENvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGluY2x1ZGUgc3RhZ2UgaW4gYWxsIHJlc291cmNlIG5hbWVzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XG4gICAgICAgIEJ1Y2tldE5hbWU6ICdhdXRldXJpdW0tbWVkaWEtdGVzdC0xMjM0NTY3ODkwMTInLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xuICAgICAgICBGdW5jdGlvbk5hbWU6ICdhdXRldXJpdW0tcHJlc2lnbmVkLXVybC10ZXN0JyxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIHtcbiAgICAgICAgRnVuY3Rpb25OYW1lOiAnYXV0ZXVyaXVtLXVwbG9hZC1jb21wbGV0ZS10ZXN0JyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBkaWZmZXJlbnQgc3RhZ2VzIGNvcnJlY3RseScsICgpID0+IHtcbiAgICAgIGNvbnN0IGRldlN0YWNrID0gbmV3IEF1dGV1cml1bU1lZGlhU3RhY2soYXBwLCAnRGV2QXV0ZXVyaXVtTWVkaWFTdGFjaycsIHtcbiAgICAgICAgc3RhZ2U6ICdkZXYnLFxuICAgICAgICBlbnY6IHtcbiAgICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZUZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhkZXZTdGFjayk7XG5cbiAgICAgIGRldlRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgICBCdWNrZXROYW1lOiAnYXV0ZXVyaXVtLW1lZGlhLWRldi0xMjM0NTY3ODkwMTInLFxuICAgICAgfSk7XG5cbiAgICAgIGRldlRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xuICAgICAgICBGdW5jdGlvbk5hbWU6ICdhdXRldXJpdW0tcHJlc2lnbmVkLXVybC1kZXYnLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdSdW50aW1lIFZlcnNpb24gVmFsaWRhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgdXNlIE5vZGUuanMgMjIueCBmb3IgYWxsIGFwcGxpY2F0aW9uIExhbWJkYSBmdW5jdGlvbnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBmdW5jdGlvbnMgPSB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nKTtcbiAgICAgIE9iamVjdC52YWx1ZXMoZnVuY3Rpb25zKS5mb3JFYWNoKChmdW5jOiBhbnkpID0+IHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGZ1bmMuUHJvcGVydGllcy5GdW5jdGlvbk5hbWUgJiZcbiAgICAgICAgICBmdW5jLlByb3BlcnRpZXMuRnVuY3Rpb25OYW1lLmluY2x1ZGVzKCdhdXRldXJpdW0nKSAmJlxuICAgICAgICAgIGZ1bmMuUHJvcGVydGllcy5SdW50aW1lICYmXG4gICAgICAgICAgZnVuYy5Qcm9wZXJ0aWVzLlJ1bnRpbWUuc3RhcnRzV2l0aCgnbm9kZWpzJylcbiAgICAgICAgKSB7XG4gICAgICAgICAgZXhwZWN0KGZ1bmMuUHJvcGVydGllcy5SdW50aW1lKS50b0JlKCdub2RlanMyMi54Jyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==