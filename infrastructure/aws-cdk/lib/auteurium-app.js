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
        const env = {
            account: process.env.CDK_DEFAULT_ACCOUNT,
            region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
        };
        const stage = process.env.STAGE || 'dev';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsd0VBQWtFO0FBQ2xFLGdGQUEwRTtBQUMxRSxzRUFBZ0U7QUFDaEUsMEVBQW9FO0FBQ3BFLHNFQUFnRTtBQUNoRSwwSUFBMEk7QUFFMUksTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEdBQUc7SUFDdkM7UUFDRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLE1BQU0sR0FBRyxHQUFHO1lBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO1lBQ3hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLFdBQVc7U0FDdEQsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQTtRQUV4QyxpQ0FBaUM7UUFDakMsTUFBTSxTQUFTLEdBQUcsSUFBSSx5Q0FBa0IsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEtBQUssRUFBRSxFQUFFO1lBQ3hFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsaUJBQWlCO1FBQ2pCLE1BQU0sYUFBYSxHQUFHLElBQUksaURBQXNCLENBQUMsSUFBSSxFQUFFLHNCQUFzQixLQUFLLEVBQUUsRUFBRTtZQUNwRixHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLCtCQUErQjtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsS0FBSyxFQUFFLEVBQUU7WUFDckUsR0FBRztZQUNILEtBQUs7WUFDTCxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDNUIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO1NBQ3pDLENBQUMsQ0FBQTtRQUVGLDJCQUEyQjtRQUMzQixNQUFNLFVBQVUsR0FBRyxJQUFJLDJDQUFtQixDQUFDLElBQUksRUFBRSxtQkFBbUIsS0FBSyxFQUFFLEVBQUU7WUFDM0UsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRixzQ0FBc0M7UUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEtBQUssRUFBRSxFQUFFO1lBQ3JFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsOEVBQThFO1FBQzlFLCtEQUErRDtRQUMvRDs7Ozs7OztVQU9FO1FBRUYscUJBQXFCO1FBQ3JCLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxzREFBc0Q7UUFDdEQsc0RBQXNEO0lBQ3hELENBQUM7Q0FDRjtBQTVERCxvQ0E0REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtQXV0aFN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWF1dGgtc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1EYXRhYmFzZVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWRhdGFiYXNlLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtQXBpU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tYXBpLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtTWVkaWFTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1tZWRpYS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bVdlYlN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLXdlYi1zdGFjaydcbi8vIGltcG9ydCB7IEF1dGV1cml1bU1vbml0b3JpbmdTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1tb25pdG9yaW5nLXN0YWNrJyAvLyBESVNBQkxFRCAtIHNlZSBhdXRldXJpdW0tbW9uaXRvcmluZy1zdGFjay50cy5kaXNhYmxlZFxuXG5leHBvcnQgY2xhc3MgQXV0ZXVyaXVtQXBwIGV4dGVuZHMgY2RrLkFwcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGVudiA9IHtcbiAgICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xuICAgIH1cblxuICAgIGNvbnN0IHN0YWdlID0gcHJvY2Vzcy5lbnYuU1RBR0UgfHwgJ2RldidcbiAgICBcbiAgICAvLyBBdXRoZW50aWNhdGlvbiBzdGFjayAoQ29nbml0bylcbiAgICBjb25zdCBhdXRoU3RhY2sgPSBuZXcgQXV0ZXVyaXVtQXV0aFN0YWNrKHRoaXMsIGBBdXRldXJpdW0tQXV0aC0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIERhdGFiYXNlIHN0YWNrXG4gICAgY29uc3QgZGF0YWJhc2VTdGFjayA9IG5ldyBBdXRldXJpdW1EYXRhYmFzZVN0YWNrKHRoaXMsIGBBdXRldXJpdW0tRGF0YWJhc2UtJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBBUEkgc3RhY2sgKEFwcFN5bmMgKyBMYW1iZGEpXG4gICAgY29uc3QgYXBpU3RhY2sgPSBuZXcgQXV0ZXVyaXVtQXBpU3RhY2sodGhpcywgYEF1dGV1cml1bS1BcGktJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZSxcbiAgICAgIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXG4gICAgICB1c2VyUG9vbENsaWVudDogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50XG4gICAgfSlcblxuICAgIC8vIE1lZGlhIHN0b3JhZ2Ugc3RhY2sgKFMzKVxuICAgIGNvbnN0IG1lZGlhU3RhY2sgPSBuZXcgQXV0ZXVyaXVtTWVkaWFTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLU1lZGlhLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gV2ViIGhvc3Rpbmcgc3RhY2sgKFMzICsgQ2xvdWRGcm9udClcbiAgICBjb25zdCB3ZWJTdGFjayA9IG5ldyBBdXRldXJpdW1XZWJTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLVdlYi0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIFRPRE86IE1vbml0b3Jpbmcgc3RhY2sgKENsb3VkV2F0Y2gpIC0gRElTQUJMRUQgZm9yIGRldmVsb3BtZW50IGNvc3Qgc2F2aW5nc1xuICAgIC8vIFVuY29tbWVudCB3aGVuIHJlYWR5IGZvciBwcm9kdWN0aW9uIG1vbml0b3JpbmcgKH4kNS03L21vbnRoKVxuICAgIC8qXG4gICAgY29uc3QgbW9uaXRvcmluZ1N0YWNrID0gbmV3IEF1dGV1cml1bU1vbml0b3JpbmdTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLU1vbml0b3JpbmctJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZSxcbiAgICAgIGFwaVN0YWNrLFxuICAgICAgd2ViU3RhY2tcbiAgICB9KVxuICAgICovXG5cbiAgICAvLyBTdGFjayBkZXBlbmRlbmNpZXNcbiAgICBhcGlTdGFjay5hZGREZXBlbmRlbmN5KGF1dGhTdGFjaylcbiAgICBhcGlTdGFjay5hZGREZXBlbmRlbmN5KGRhdGFiYXNlU3RhY2spXG4gICAgLy8gbW9uaXRvcmluZ1N0YWNrLmFkZERlcGVuZGVuY3koYXBpU3RhY2spIC8vIERJU0FCTEVEXG4gICAgLy8gbW9uaXRvcmluZ1N0YWNrLmFkZERlcGVuZGVuY3kod2ViU3RhY2spIC8vIERJU0FCTEVEXG4gIH1cbn0iXX0=