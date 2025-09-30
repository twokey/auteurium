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
exports.AuteuriumApp = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const auteurium_api_stack_1 = require("./stacks/auteurium-api-stack");
const auteurium_auth_stack_1 = require("./stacks/auteurium-auth-stack");
const auteurium_database_stack_1 = require("./stacks/auteurium-database-stack");
const auteurium_media_stack_1 = require("./stacks/auteurium-media-stack");
const auteurium_web_stack_1 = require("./stacks/auteurium-web-stack");
// import { AuteuriumMonitoringStack } from './stacks/auteurium-monitoring-stack' // DISABLED - see auteurium-monitoring-stack.ts.disabled
class AuteuriumApp extends cdk.App {
    constructor() {
        super();
        const coalesceEnv = (value, fallback) => typeof value === 'string' && value.trim() !== '' ? value : fallback;
        const env = {
            account: process.env.CDK_DEFAULT_ACCOUNT,
            region: coalesceEnv(process.env.CDK_DEFAULT_REGION, 'us-east-1')
        };
        const stage = coalesceEnv(process.env.STAGE, 'dev');
        // Authentication stack (Cognito)
        const authStack = new auteurium_auth_stack_1.AuteuriumAuthStack(this, `Auteurium-Auth-${stage}`, {
            env,
            stage
        });
        // Database stack
        const databaseStack = new auteurium_database_stack_1.AuteuriumDatabaseStack(this, `Auteurium-Database-${stage}`, {
            env,
            stage
        });
        // API stack (AppSync + Lambda)
        const apiStack = new auteurium_api_stack_1.AuteuriumApiStack(this, `Auteurium-Api-${stage}`, {
            env,
            stage,
            userPool: authStack.userPool,
            userPoolClient: authStack.userPoolClient
        });
        // Media storage stack (S3)
        const _mediaStack = new auteurium_media_stack_1.AuteuriumMediaStack(this, `Auteurium-Media-${stage}`, {
            env,
            stage
        });
        // Web hosting stack (S3 + CloudFront)
        const _webStack = new auteurium_web_stack_1.AuteuriumWebStack(this, `Auteurium-Web-${stage}`, {
            env,
            stage
        });
        // TODO: Monitoring stack (CloudWatch) - DISABLED for development cost savings
        // Uncomment when ready for production monitoring (~$5-7/month)
        /*
        const monitoringStack = new AuteuriumMonitoringStack(this, `Auteurium-Monitoring-${stage}`, {
          env,
          stage,
          apiStack,
          webStack
        })
        */
        // Stack dependencies
        apiStack.addDependency(authStack);
        apiStack.addDependency(databaseStack);
        // monitoringStack.addDependency(apiStack) // DISABLED
        // monitoringStack.addDependency(webStack) // DISABLED
    }
}
exports.AuteuriumApp = AuteuriumApp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsc0VBQWdFO0FBQ2hFLHdFQUFrRTtBQUNsRSxnRkFBMEU7QUFDMUUsMEVBQW9FO0FBQ3BFLHNFQUFnRTtBQUNoRSwwSUFBMEk7QUFFMUksTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEdBQUc7SUFDdkM7UUFDRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLE1BQU0sV0FBVyxHQUFHLENBQUMsS0FBeUIsRUFBRSxRQUFnQixFQUFFLEVBQUUsQ0FDbEUsT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO1FBRXJFLE1BQU0sR0FBRyxHQUFHO1lBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO1lBQ3hDLE1BQU0sRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLENBQUM7U0FDakUsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVuRCxpQ0FBaUM7UUFDakMsTUFBTSxTQUFTLEdBQUcsSUFBSSx5Q0FBa0IsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEtBQUssRUFBRSxFQUFFO1lBQ3hFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsaUJBQWlCO1FBQ2pCLE1BQU0sYUFBYSxHQUFHLElBQUksaURBQXNCLENBQUMsSUFBSSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsRUFBRTtZQUNwRixHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLCtCQUErQjtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsS0FBSyxFQUFFLEVBQUU7WUFDckUsR0FBRztZQUNILEtBQUs7WUFDTCxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDNUIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO1NBQ3pDLENBQUMsQ0FBQTtRQUVGLDJCQUEyQjtRQUMzQixNQUFNLFdBQVcsR0FBRyxJQUFJLDJDQUFtQixDQUFDLElBQUksRUFBRSxtQkFBbUIsS0FBSyxFQUFFLEVBQUU7WUFDNUUsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRixzQ0FBc0M7UUFDdEMsTUFBTSxTQUFTLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEtBQUssRUFBRSxFQUFFO1lBQ3RFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsOEVBQThFO1FBQzlFLCtEQUErRDtRQUMvRDs7Ozs7OztVQU9FO1FBRUYscUJBQXFCO1FBQ3JCLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxzREFBc0Q7UUFDdEQsc0RBQXNEO0lBQ3hELENBQUM7Q0FDRjtBQS9ERCxvQ0ErREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5cbmltcG9ydCB7IEF1dGV1cml1bUFwaVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWFwaS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bUF1dGhTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1hdXRoLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1kYXRhYmFzZS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bU1lZGlhU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tbWVkaWEtc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1XZWJTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS13ZWItc3RhY2snXG4vLyBpbXBvcnQgeyBBdXRldXJpdW1Nb25pdG9yaW5nU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tbW9uaXRvcmluZy1zdGFjaycgLy8gRElTQUJMRUQgLSBzZWUgYXV0ZXVyaXVtLW1vbml0b3Jpbmctc3RhY2sudHMuZGlzYWJsZWRcblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bUFwcCBleHRlbmRzIGNkay5BcHAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpXG5cbiAgICBjb25zdCBjb2FsZXNjZUVudiA9ICh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBmYWxsYmFjazogc3RyaW5nKSA9PlxuICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS50cmltKCkgIT09ICcnID8gdmFsdWUgOiBmYWxsYmFja1xuXG4gICAgY29uc3QgZW52ID0ge1xuICAgICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICAgIHJlZ2lvbjogY29hbGVzY2VFbnYocHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OLCAndXMtZWFzdC0xJylcbiAgICB9XG5cbiAgICBjb25zdCBzdGFnZSA9IGNvYWxlc2NlRW52KHByb2Nlc3MuZW52LlNUQUdFLCAnZGV2JylcbiAgICBcbiAgICAvLyBBdXRoZW50aWNhdGlvbiBzdGFjayAoQ29nbml0bylcbiAgICBjb25zdCBhdXRoU3RhY2sgPSBuZXcgQXV0ZXVyaXVtQXV0aFN0YWNrKHRoaXMsIGBBdXRldXJpdW0tQXV0aC0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIERhdGFiYXNlIHN0YWNrXG4gICAgY29uc3QgZGF0YWJhc2VTdGFjayA9IG5ldyBBdXRldXJpdW1EYXRhYmFzZVN0YWNrKHRoaXMsIGBBdXRldXJpdW0tRGF0YWJhc2UtJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBBUEkgc3RhY2sgKEFwcFN5bmMgKyBMYW1iZGEpXG4gICAgY29uc3QgYXBpU3RhY2sgPSBuZXcgQXV0ZXVyaXVtQXBpU3RhY2sodGhpcywgYEF1dGV1cml1bS1BcGktJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZSxcbiAgICAgIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXG4gICAgICB1c2VyUG9vbENsaWVudDogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50XG4gICAgfSlcblxuICAgIC8vIE1lZGlhIHN0b3JhZ2Ugc3RhY2sgKFMzKVxuICAgIGNvbnN0IF9tZWRpYVN0YWNrID0gbmV3IEF1dGV1cml1bU1lZGlhU3RhY2sodGhpcywgYEF1dGV1cml1bS1NZWRpYS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIFdlYiBob3N0aW5nIHN0YWNrIChTMyArIENsb3VkRnJvbnQpXG4gICAgY29uc3QgX3dlYlN0YWNrID0gbmV3IEF1dGV1cml1bVdlYlN0YWNrKHRoaXMsIGBBdXRldXJpdW0tV2ViLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gVE9ETzogTW9uaXRvcmluZyBzdGFjayAoQ2xvdWRXYXRjaCkgLSBESVNBQkxFRCBmb3IgZGV2ZWxvcG1lbnQgY29zdCBzYXZpbmdzXG4gICAgLy8gVW5jb21tZW50IHdoZW4gcmVhZHkgZm9yIHByb2R1Y3Rpb24gbW9uaXRvcmluZyAofiQ1LTcvbW9udGgpXG4gICAgLypcbiAgICBjb25zdCBtb25pdG9yaW5nU3RhY2sgPSBuZXcgQXV0ZXVyaXVtTW9uaXRvcmluZ1N0YWNrKHRoaXMsIGBBdXRldXJpdW0tTW9uaXRvcmluZy0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlLFxuICAgICAgYXBpU3RhY2ssXG4gICAgICB3ZWJTdGFja1xuICAgIH0pXG4gICAgKi9cblxuICAgIC8vIFN0YWNrIGRlcGVuZGVuY2llc1xuICAgIGFwaVN0YWNrLmFkZERlcGVuZGVuY3koYXV0aFN0YWNrKVxuICAgIGFwaVN0YWNrLmFkZERlcGVuZGVuY3koZGF0YWJhc2VTdGFjaylcbiAgICAvLyBtb25pdG9yaW5nU3RhY2suYWRkRGVwZW5kZW5jeShhcGlTdGFjaykgLy8gRElTQUJMRURcbiAgICAvLyBtb25pdG9yaW5nU3RhY2suYWRkRGVwZW5kZW5jeSh3ZWJTdGFjaykgLy8gRElTQUJMRURcbiAgfVxufVxuIl19