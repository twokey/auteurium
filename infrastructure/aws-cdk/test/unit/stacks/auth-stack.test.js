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
const assertions_1 = require("aws-cdk-lib/assertions");

const auteurium_auth_stack_1 = require("../../../lib/stacks/auteurium-auth-stack");

describe('AuteuriumAuthStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new auteurium_auth_stack_1.AuteuriumAuthStack(app, 'TestAuteuriumAuthStack', {
            stage: 'test',
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
        template = assertions_1.Template.fromStack(stack);
    });
    describe('Cognito User Pool', () => {
        test('should create a user pool with correct naming convention', () => {
            template.hasResourceProperties('AWS::Cognito::UserPool', {
                UserPoolName: 'auteurium-users-test',
            });
        });
        test('should enable self sign-up', () => {
            template.hasResourceProperties('AWS::Cognito::UserPool', {
                Policies: {
                    PasswordPolicy: {
                        MinimumLength: 8,
                        RequireLowercase: true,
                        RequireNumbers: true,
                        RequireSymbols: false,
                        RequireUppercase: true,
                    },
                },
            });
        });
        test('should configure email as sign-in alias', () => {
            template.hasResourceProperties('AWS::Cognito::UserPool', {
                AliasAttributes: ['email'],
            });
        });
        test('should set correct account recovery method', () => {
            template.hasResourceProperties('AWS::Cognito::UserPool', {
                AccountRecoverySetting: {
                    RecoveryMechanisms: [
                        {
                            Name: 'verified_email',
                            Priority: 1,
                        },
                    ],
                },
            });
        });
        test('should have correct removal policy for test stage', () => {
            template.hasResource('AWS::Cognito::UserPool', {
                DeletionPolicy: 'Delete',
            });
        });
        test('should have retention policy for production stage', () => {
            const prodStack = new auteurium_auth_stack_1.AuteuriumAuthStack(app, 'ProdAuteuriumAuthStack', {
                stage: 'prod',
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
            });
            const prodTemplate = assertions_1.Template.fromStack(prodStack);
            prodTemplate.hasResource('AWS::Cognito::UserPool', {
                DeletionPolicy: 'Retain',
            });
        });
    });
    describe('Cognito User Pool Client', () => {
        test('should create user pool client with correct naming', () => {
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                ClientName: 'auteurium-web-client-test',
                GenerateSecret: false,
            });
        });
        test('should configure correct auth flows', () => {
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                ExplicitAuthFlows: [
                    'ALLOW_USER_PASSWORD_AUTH',
                    'ALLOW_USER_SRP_AUTH',
                    'ALLOW_REFRESH_TOKEN_AUTH',
                ],
            });
        });
        test('should configure OAuth settings', () => {
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                SupportedIdentityProviders: ['COGNITO'],
                AllowedOAuthFlows: ['code'],
                AllowedOAuthScopes: ['email', 'openid', 'profile'],
            });
        });
    });
    describe('Stack Outputs', () => {
        test('should export user pool ID', () => {
            template.hasOutput('UserPoolId', {
                Export: {
                    Name: 'Auteurium-UserPoolId-test',
                },
            });
        });
        test('should export user pool client ID', () => {
            template.hasOutput('UserPoolClientId', {
                Export: {
                    Name: 'Auteurium-UserPoolClientId-test',
                },
            });
        });
    });
    describe('Security Configuration', () => {
        test('should enforce strong password policy', () => {
            template.hasResourceProperties('AWS::Cognito::UserPool', {
                Policies: {
                    PasswordPolicy: {
                        MinimumLength: 8,
                        RequireLowercase: true,
                        RequireNumbers: true,
                        RequireUppercase: true,
                        RequireSymbols: false, // Explicitly set to false per requirements
                    },
                },
            });
        });
        test('should not allow unauthenticated identities', () => {
            // Ensure no identity pool is created that allows unauthenticated access
            template.resourceCountIs('AWS::Cognito::IdentityPool', 0);
        });
    });
    describe('Resource Count Validation', () => {
        test('should create exactly one user pool', () => {
            template.resourceCountIs('AWS::Cognito::UserPool', 1);
        });
        test('should create exactly one user pool client', () => {
            template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
        });
        test('should create correct number of outputs', () => {
            const outputs = template.findOutputs('*');
            expect(Object.keys(outputs)).toHaveLength(2);
        });
    });
    describe('Stage-specific Configuration', () => {
        test('should include stage in resource names', () => {
            template.hasResourceProperties('AWS::Cognito::UserPool', {
                UserPoolName: 'auteurium-users-test',
            });
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                ClientName: 'auteurium-web-client-test',
            });
        });
        test('should handle different stages correctly', () => {
            const devStack = new auteurium_auth_stack_1.AuteuriumAuthStack(app, 'DevAuteuriumAuthStack', {
                stage: 'dev',
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
            });
            const devTemplate = assertions_1.Template.fromStack(devStack);
            devTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
                UserPoolName: 'auteurium-users-dev',
            });
        });
    });
    describe('Public Properties', () => {
        test('should expose user pool as public property', () => {
            expect(stack.userPool).toBeDefined();
            expect(stack.userPool.userPoolId).toBeDefined();
        });
        test('should expose user pool client as public property', () => {
            expect(stack.userPoolClient).toBeDefined();
            expect(stack.userPoolClient.userPoolClientId).toBeDefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0aC1zdGFjay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQWtEO0FBQ2xELG1GQUE4RTtBQUU5RSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLElBQUksR0FBWSxDQUFDO0lBQ2pCLElBQUksS0FBeUIsQ0FBQztJQUM5QixJQUFJLFFBQWtCLENBQUM7SUFFdkIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNwQixLQUFLLEdBQUcsSUFBSSx5Q0FBa0IsQ0FBQyxHQUFHLEVBQUUsd0JBQXdCLEVBQUU7WUFDNUQsS0FBSyxFQUFFLE1BQU07WUFDYixHQUFHLEVBQUU7Z0JBQ0gsT0FBTyxFQUFFLGNBQWM7Z0JBQ3ZCLE1BQU0sRUFBRSxXQUFXO2FBQ3BCO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxJQUFJLENBQUMsMERBQTBELEVBQUUsR0FBRyxFQUFFO1lBQ3BFLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsRUFBRTtnQkFDdkQsWUFBWSxFQUFFLHNCQUFzQjthQUNyQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7WUFDdEMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixFQUFFO2dCQUN2RCxRQUFRLEVBQUU7b0JBQ1IsY0FBYyxFQUFFO3dCQUNkLGFBQWEsRUFBRSxDQUFDO3dCQUNoQixnQkFBZ0IsRUFB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UUFDakMsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtZQUN0RCxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtZQUM3RCxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBBdXRldXJpdW1BdXRoU3RhY2sgfSBmcm9tICcuLi8uLi8uLi9saWIvc3RhY2tzL2F1dGV1cml1bS1hdXRoLXN0YWNrJztcblxuZGVzY3JpYmUoJ0F1dGV1cml1bUF1dGhTdGFjaycsICgpID0+IHtcbiAgbGV0IGFwcDogY2RrLkFwcDtcbiAgbGV0IHN0YWNrOiBBdXRldXJpdW1BdXRoU3RhY2s7XG4gIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGU7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBzdGFjayA9IG5ldyBBdXRldXJpdW1BdXRoU3RhY2soYXBwLCAnVGVzdEF1dGV1cml1bUF1dGhTdGFjaycsIHtcbiAgICAgIHN0YWdlOiAndGVzdCcsXG4gICAgICBlbnY6IHtcbiAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0NvZ25pdG8gVXNlciBQb29sJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBjcmVhdGUgYSB1c2VyIHBvb2wgd2l0aCBjb3JyZWN0IG5hbWluZyBjb252ZW50aW9uJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sJywge1xuICAgICAgICBVc2VyUG9vbE5hbWU6ICdhdXRldXJpdW0tdXNlcnMtdGVzdCcsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBlbmFibGUgc2VsZiBzaWduLXVwJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sJywge1xuICAgICAgICBQb2xpY2llczoge1xuICAgICAgICAgIFBhc3N3b3JkUG9saWN5OiB7XG4gICAgICAgICAgICBNaW5pbXVtTGVuZ3RoOiA4LFxuICAgICAgICAgICAgUmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIFJlcXVpcmVOdW1iZXJzOiB0cnVlLFxuICAgICAgICAgICAgUmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxuICAgICAgICAgICAgUmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY29uZmlndXJlIGVtYWlsIGFzIHNpZ24taW4gYWxpYXMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q29nbml0bzo6VXNlclBvb2wnLCB7XG4gICAgICAgIEFsaWFzQXR0cmlidXRlczogWydlbWFpbCddLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgc2V0IGNvcnJlY3QgYWNjb3VudCByZWNvdmVyeSBtZXRob2QnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q29nbml0bzo6VXNlclBvb2wnLCB7XG4gICAgICAgIEFjY291bnRSZWNvdmVyeVNldHRpbmc6IHtcbiAgICAgICAgICBSZWNvdmVyeU1lY2hhbmlzbXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ3ZlcmlmaWVkX2VtYWlsJyxcbiAgICAgICAgICAgICAgUHJpb3JpdHk6IDEsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYXZlIGNvcnJlY3QgcmVtb3ZhbCBwb2xpY3kgZm9yIHRlc3Qgc3RhZ2UnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZSgnQVdTOjpDb2duaXRvOjpVc2VyUG9vbCcsIHtcbiAgICAgICAgRGVsZXRpb25Qb2xpY3k6ICdEZWxldGUnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGF2ZSByZXRlbnRpb24gcG9saWN5IGZvciBwcm9kdWN0aW9uIHN0YWdlJywgKCkgPT4ge1xuICAgICAgY29uc3QgcHJvZFN0YWNrID0gbmV3IEF1dGV1cml1bUF1dGhTdGFjayhhcHAsICdQcm9kQXV0ZXVyaXVtQXV0aFN0YWNrJywge1xuICAgICAgICBzdGFnZTogJ3Byb2QnLFxuICAgICAgICBlbnY6IHtcbiAgICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBwcm9kVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2socHJvZFN0YWNrKTtcblxuICAgICAgcHJvZFRlbXBsYXRlLmhhc1Jlc291cmNlKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sJywge1xuICAgICAgICBEZWxldGlvblBvbGljeTogJ1JldGFpbicsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCcsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIHVzZXIgcG9vbCBjbGllbnQgd2l0aCBjb3JyZWN0IG5hbWluZycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDb2duaXRvOjpVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgICAgQ2xpZW50TmFtZTogJ2F1dGV1cml1bS13ZWItY2xpZW50LXRlc3QnLFxuICAgICAgICBHZW5lcmF0ZVNlY3JldDogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjb25maWd1cmUgY29ycmVjdCBhdXRoIGZsb3dzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sQ2xpZW50Jywge1xuICAgICAgICBFeHBsaWNpdEF1dGhGbG93czogW1xuICAgICAgICAgICdBTExPV19VU0VSX1BBU1NXT1JEX0FVVEgnLFxuICAgICAgICAgICdBTExPV19VU0VSX1NSUF9BVVRIJyxcbiAgICAgICAgICAnQUxMT1dfUkVGUkVTSF9UT0tFTl9BVVRIJyxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNvbmZpZ3VyZSBPQXV0aCBzZXR0aW5ncycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDb2duaXRvOjpVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgICAgU3VwcG9ydGVkSWRlbnRpdHlQcm92aWRlcnM6IFsnQ09HTklUTyddLFxuICAgICAgICBBbGxvd2VkT0F1dGhGbG93czogWydjb2RlJ10sXG4gICAgICAgIEFsbG93ZWRPQXV0aFNjb3BlczogWydlbWFpbCcsICdvcGVuaWQnLCAncHJvZmlsZSddLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTdGFjayBPdXRwdXRzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBleHBvcnQgdXNlciBwb29sIElEJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdVc2VyUG9vbElkJywge1xuICAgICAgICBFeHBvcnQ6IHtcbiAgICAgICAgICBOYW1lOiAnQXV0ZXVyaXVtLVVzZXJQb29sSWQtdGVzdCcsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBleHBvcnQgdXNlciBwb29sIGNsaWVudCBJRCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnVXNlclBvb2xDbGllbnRJZCcsIHtcbiAgICAgICAgRXhwb3J0OiB7XG4gICAgICAgICAgTmFtZTogJ0F1dGV1cml1bS1Vc2VyUG9vbENsaWVudElkLXRlc3QnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTZWN1cml0eSBDb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBlbmZvcmNlIHN0cm9uZyBwYXNzd29yZCBwb2xpY3knLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q29nbml0bzo6VXNlclBvb2wnLCB7XG4gICAgICAgIFBvbGljaWVzOiB7XG4gICAgICAgICAgUGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgICAgIE1pbmltdW1MZW5ndGg6IDgsXG4gICAgICAgICAgICBSZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxuICAgICAgICAgICAgUmVxdWlyZU51bWJlcnM6IHRydWUsXG4gICAgICAgICAgICBSZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICAgICAgUmVxdWlyZVN5bWJvbHM6IGZhbHNlLCAvLyBFeHBsaWNpdGx5IHNldCB0byBmYWxzZSBwZXIgcmVxdWlyZW1lbnRzXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIG5vdCBhbGxvdyB1bmF1dGhlbnRpY2F0ZWQgaWRlbnRpdGllcycsICgpID0+IHtcbiAgICAgIC8vIEVuc3VyZSBubyBpZGVudGl0eSBwb29sIGlzIGNyZWF0ZWQgdGhhdCBhbGxvd3MgdW5hdXRoZW50aWNhdGVkIGFjY2Vzc1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkNvZ25pdG86OklkZW50aXR5UG9vbCcsIDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUmVzb3VyY2UgQ291bnQgVmFsaWRhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIGV4YWN0bHkgb25lIHVzZXIgcG9vbCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpDb2duaXRvOjpVc2VyUG9vbCcsIDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBleGFjdGx5IG9uZSB1c2VyIHBvb2wgY2xpZW50JywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sQ2xpZW50JywgMSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY3JlYXRlIGNvcnJlY3QgbnVtYmVyIG9mIG91dHB1dHMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBvdXRwdXRzID0gdGVtcGxhdGUuZmluZE91dHB1dHMoJyonKTtcbiAgICAgIGV4cGVjdChPYmplY3Qua2V5cyhvdXRwdXRzKSkudG9IYXZlTGVuZ3RoKDIpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnU3RhZ2Utc3BlY2lmaWMgQ29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgaW5jbHVkZSBzdGFnZSBpbiByZXNvdXJjZSBuYW1lcycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDb2duaXRvOjpVc2VyUG9vbCcsIHtcbiAgICAgICAgVXNlclBvb2xOYW1lOiAnYXV0ZXVyaXVtLXVzZXJzLXRlc3QnLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDb2duaXRvOjpVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgICAgQ2xpZW50TmFtZTogJ2F1dGV1cml1bS13ZWItY2xpZW50LXRlc3QnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIGRpZmZlcmVudCBzdGFnZXMgY29ycmVjdGx5JywgKCkgPT4ge1xuICAgICAgY29uc3QgZGV2U3RhY2sgPSBuZXcgQXV0ZXVyaXVtQXV0aFN0YWNrKGFwcCwgJ0RldkF1dGV1cml1bUF1dGhTdGFjaycsIHtcbiAgICAgICAgc3RhZ2U6ICdkZXYnLFxuICAgICAgICBlbnY6IHtcbiAgICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZUZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhkZXZTdGFjayk7XG5cbiAgICAgIGRldlRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDb2duaXRvOjpVc2VyUG9vbCcsIHtcbiAgICAgICAgVXNlclBvb2xOYW1lOiAnYXV0ZXVyaXVtLXVzZXJzLWRldicsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1B1YmxpYyBQcm9wZXJ0aWVzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBleHBvc2UgdXNlciBwb29sIGFzIHB1YmxpYyBwcm9wZXJ0eScsICgpID0+IHtcbiAgICAgIGV4cGVjdChzdGFjay51c2VyUG9vbCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChzdGFjay51c2VyUG9vbC51c2VyUG9vbElkKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGV4cG9zZSB1c2VyIHBvb2wgY2xpZW50IGFzIHB1YmxpYyBwcm9wZXJ0eScsICgpID0+IHtcbiAgICAgIGV4cGVjdChzdGFjay51c2VyUG9vbENsaWVudCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChzdGFjay51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==