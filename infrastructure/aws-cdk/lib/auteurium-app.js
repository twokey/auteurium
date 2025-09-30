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
const auteurium_auth_stack_1 = require("./stacks/auteurium-auth-stack");
const auteurium_database_stack_1 = require("./stacks/auteurium-database-stack");
const auteurium_api_stack_1 = require("./stacks/auteurium-api-stack");
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
        const mediaStack = new auteurium_media_stack_1.AuteuriumMediaStack(this, `Auteurium-Media-${stage}`, {
            env,
            stage
        });
        // Web hosting stack (S3 + CloudFront)
        const webStack = new auteurium_web_stack_1.AuteuriumWebStack(this, `Auteurium-Web-${stage}`, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsd0VBQWtFO0FBQ2xFLGdGQUEwRTtBQUMxRSxzRUFBZ0U7QUFDaEUsMEVBQW9FO0FBQ3BFLHNFQUFnRTtBQUNoRSwwSUFBMEk7QUFFMUksTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEdBQUc7SUFDdkM7UUFDRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLE1BQU0sV0FBVyxHQUFHLENBQUMsS0FBeUIsRUFBRSxRQUFnQixFQUFFLEVBQUUsQ0FDbEUsT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO1FBRXJFLE1BQU0sR0FBRyxHQUFHO1lBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO1lBQ3hDLE1BQU0sRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLENBQUM7U0FDakUsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVuRCxpQ0FBaUM7UUFDakMsTUFBTSxTQUFTLEdBQUcsSUFBSSx5Q0FBa0IsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEtBQUssRUFBRSxFQUFFO1lBQ3hFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsaUJBQWlCO1FBQ2pCLE1BQU0sYUFBYSxHQUFHLElBQUksaURBQXNCLENBQUMsSUFBSSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsRUFBRTtZQUNwRixHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLCtCQUErQjtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsS0FBSyxFQUFFLEVBQUU7WUFDckUsR0FBRztZQUNILEtBQUs7WUFDTCxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDNUIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO1NBQ3pDLENBQUMsQ0FBQTtRQUVGLDJCQUEyQjtRQUMzQixNQUFNLFVBQVUsR0FBRyxJQUFJLDJDQUFtQixDQUFDLElBQUksRUFBRSxtQkFBbUIsS0FBSyxFQUFFLEVBQUU7WUFDM0UsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRixzQ0FBc0M7UUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEtBQUssRUFBRSxFQUFFO1lBQ3JFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsOEVBQThFO1FBQzlFLCtEQUErRDtRQUMvRDs7Ozs7OztVQU9FO1FBRUYscUJBQXFCO1FBQ3JCLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxzREFBc0Q7UUFDdEQsc0RBQXNEO0lBQ3hELENBQUM7Q0FDRjtBQS9ERCxvQ0ErREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtQXV0aFN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWF1dGgtc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1EYXRhYmFzZVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWRhdGFiYXNlLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtQXBpU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tYXBpLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtTWVkaWFTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1tZWRpYS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bVdlYlN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLXdlYi1zdGFjaydcbi8vIGltcG9ydCB7IEF1dGV1cml1bU1vbml0b3JpbmdTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1tb25pdG9yaW5nLXN0YWNrJyAvLyBESVNBQkxFRCAtIHNlZSBhdXRldXJpdW0tbW9uaXRvcmluZy1zdGFjay50cy5kaXNhYmxlZFxuXG5leHBvcnQgY2xhc3MgQXV0ZXVyaXVtQXBwIGV4dGVuZHMgY2RrLkFwcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGNvYWxlc2NlRW52ID0gKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBzdHJpbmcpID0+XG4gICAgICB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIHZhbHVlLnRyaW0oKSAhPT0gJycgPyB2YWx1ZSA6IGZhbGxiYWNrXG5cbiAgICBjb25zdCBlbnYgPSB7XG4gICAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgICAgcmVnaW9uOiBjb2FsZXNjZUVudihwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04sICd1cy1lYXN0LTEnKVxuICAgIH1cblxuICAgIGNvbnN0IHN0YWdlID0gY29hbGVzY2VFbnYocHJvY2Vzcy5lbnYuU1RBR0UsICdkZXYnKVxuICAgIFxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIHN0YWNrIChDb2duaXRvKVxuICAgIGNvbnN0IGF1dGhTdGFjayA9IG5ldyBBdXRldXJpdW1BdXRoU3RhY2sodGhpcywgYEF1dGV1cml1bS1BdXRoLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gRGF0YWJhc2Ugc3RhY2tcbiAgICBjb25zdCBkYXRhYmFzZVN0YWNrID0gbmV3IEF1dGV1cml1bURhdGFiYXNlU3RhY2sodGhpcywgYEF1dGV1cml1bS1EYXRhYmFzZS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIEFQSSBzdGFjayAoQXBwU3luYyArIExhbWJkYSlcbiAgICBjb25zdCBhcGlTdGFjayA9IG5ldyBBdXRldXJpdW1BcGlTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLUFwaS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlLFxuICAgICAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50OiBhdXRoU3RhY2sudXNlclBvb2xDbGllbnRcbiAgICB9KVxuXG4gICAgLy8gTWVkaWEgc3RvcmFnZSBzdGFjayAoUzMpXG4gICAgY29uc3QgbWVkaWFTdGFjayA9IG5ldyBBdXRldXJpdW1NZWRpYVN0YWNrKHRoaXMsIGBBdXRldXJpdW0tTWVkaWEtJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBXZWIgaG9zdGluZyBzdGFjayAoUzMgKyBDbG91ZEZyb250KVxuICAgIGNvbnN0IHdlYlN0YWNrID0gbmV3IEF1dGV1cml1bVdlYlN0YWNrKHRoaXMsIGBBdXRldXJpdW0tV2ViLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gVE9ETzogTW9uaXRvcmluZyBzdGFjayAoQ2xvdWRXYXRjaCkgLSBESVNBQkxFRCBmb3IgZGV2ZWxvcG1lbnQgY29zdCBzYXZpbmdzXG4gICAgLy8gVW5jb21tZW50IHdoZW4gcmVhZHkgZm9yIHByb2R1Y3Rpb24gbW9uaXRvcmluZyAofiQ1LTcvbW9udGgpXG4gICAgLypcbiAgICBjb25zdCBtb25pdG9yaW5nU3RhY2sgPSBuZXcgQXV0ZXVyaXVtTW9uaXRvcmluZ1N0YWNrKHRoaXMsIGBBdXRldXJpdW0tTW9uaXRvcmluZy0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlLFxuICAgICAgYXBpU3RhY2ssXG4gICAgICB3ZWJTdGFja1xuICAgIH0pXG4gICAgKi9cblxuICAgIC8vIFN0YWNrIGRlcGVuZGVuY2llc1xuICAgIGFwaVN0YWNrLmFkZERlcGVuZGVuY3koYXV0aFN0YWNrKVxuICAgIGFwaVN0YWNrLmFkZERlcGVuZGVuY3koZGF0YWJhc2VTdGFjaylcbiAgICAvLyBtb25pdG9yaW5nU3RhY2suYWRkRGVwZW5kZW5jeShhcGlTdGFjaykgLy8gRElTQUJMRURcbiAgICAvLyBtb25pdG9yaW5nU3RhY2suYWRkRGVwZW5kZW5jeSh3ZWJTdGFjaykgLy8gRElTQUJMRURcbiAgfVxufVxuIl19