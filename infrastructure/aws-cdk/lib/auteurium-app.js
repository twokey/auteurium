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
const auteurium_genai_stack_1 = require("./stacks/auteurium-genai-stack");
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
        // Media storage stack (S3)
        const mediaStack = new auteurium_media_stack_1.AuteuriumMediaStack(this, `Auteurium-Media-${stage}`, {
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
        // GenAI stack (LLM integration)
        const _genaiStack = new auteurium_genai_stack_1.AuteuriumGenAIStack(this, `Auteurium-GenAI-${stage}`, {
            env,
            stage,
            graphqlApi: apiStack.graphqlApi,
            userPool: authStack.userPool,
            userPoolClient: authStack.userPoolClient,
            mediaBucket: mediaStack.mediaBucket
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
        _genaiStack.addDependency(databaseStack);
        _genaiStack.addDependency(mediaStack);
        // Note: GenAI stack uses apiStack.graphqlApi reference but does not need a dependency
        // because it only adds resolvers to the existing API
        // monitoringStack.addDependency(apiStack) // DISABLED
        // monitoringStack.addDependency(webStack) // DISABLED
    }
}
exports.AuteuriumApp = AuteuriumApp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsc0VBQWdFO0FBQ2hFLHdFQUFrRTtBQUNsRSxnRkFBMEU7QUFDMUUsMEVBQW9FO0FBQ3BFLDBFQUFvRTtBQUNwRSxzRUFBZ0U7QUFDaEUsMElBQTBJO0FBRTFJLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxHQUFHO0lBQ3ZDO1FBQ0UsS0FBSyxFQUFFLENBQUE7UUFFUCxNQUFNLFdBQVcsR0FBRyxDQUFDLEtBQXlCLEVBQUUsUUFBZ0IsRUFBRSxFQUFFLENBQ2xFLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUVyRSxNQUFNLEdBQUcsR0FBRztZQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtZQUN4QyxNQUFNLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsV0FBVyxDQUFDO1NBQ2pFLENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFbkQsaUNBQWlDO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUkseUNBQWtCLENBQUMsSUFBSSxFQUFFLGtCQUFrQixLQUFLLEVBQUUsRUFBRTtZQUN4RSxHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLGlCQUFpQjtRQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFJLGlEQUFzQixDQUFDLElBQUksRUFBRSxzQkFBc0IsS0FBSyxFQUFFLEVBQUU7WUFDcEYsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEtBQUssRUFBRSxFQUFFO1lBQzNFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsK0JBQStCO1FBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUksdUNBQWlCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixLQUFLLEVBQUUsRUFBRTtZQUNyRSxHQUFHO1lBQ0gsS0FBSztZQUNMLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtZQUM1QixjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWM7U0FDekMsQ0FBQyxDQUFBO1FBRUYsZ0NBQWdDO1FBQ2hDLE1BQU0sV0FBVyxHQUFHLElBQUksMkNBQW1CLENBQUMsSUFBSSxFQUFFLG1CQUFtQixLQUFLLEVBQUUsRUFBRTtZQUM1RSxHQUFHO1lBQ0gsS0FBSztZQUNMLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVTtZQUMvQixRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDNUIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO1lBQ3hDLFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVztTQUNwQyxDQUFDLENBQUE7UUFFRixzQ0FBc0M7UUFDdEMsTUFBTSxTQUFTLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEtBQUssRUFBRSxFQUFFO1lBQ3RFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsOEVBQThFO1FBQzlFLCtEQUErRDtRQUMvRDs7Ozs7OztVQU9FO1FBRUYscUJBQXFCO1FBQ3JCLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxXQUFXLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3hDLFdBQVcsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDckMsc0ZBQXNGO1FBQ3RGLHFEQUFxRDtRQUNyRCxzREFBc0Q7UUFDdEQsc0RBQXNEO0lBQ3hELENBQUM7Q0FDRjtBQTdFRCxvQ0E2RUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5cbmltcG9ydCB7IEF1dGV1cml1bUFwaVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWFwaS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bUF1dGhTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1hdXRoLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1kYXRhYmFzZS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bUdlbkFJU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tZ2VuYWktc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1NZWRpYVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLW1lZGlhLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtV2ViU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0td2ViLXN0YWNrJ1xuLy8gaW1wb3J0IHsgQXV0ZXVyaXVtTW9uaXRvcmluZ1N0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLW1vbml0b3Jpbmctc3RhY2snIC8vIERJU0FCTEVEIC0gc2VlIGF1dGV1cml1bS1tb25pdG9yaW5nLXN0YWNrLnRzLmRpc2FibGVkXG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1BcHAgZXh0ZW5kcyBjZGsuQXBwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKVxuXG4gICAgY29uc3QgY29hbGVzY2VFbnYgPSAodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IHN0cmluZykgPT5cbiAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUudHJpbSgpICE9PSAnJyA/IHZhbHVlIDogZmFsbGJhY2tcblxuICAgIGNvbnN0IGVudiA9IHtcbiAgICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgICByZWdpb246IGNvYWxlc2NlRW52KHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiwgJ3VzLWVhc3QtMScpXG4gICAgfVxuXG4gICAgY29uc3Qgc3RhZ2UgPSBjb2FsZXNjZUVudihwcm9jZXNzLmVudi5TVEFHRSwgJ2RldicpXG4gICAgXG4gICAgLy8gQXV0aGVudGljYXRpb24gc3RhY2sgKENvZ25pdG8pXG4gICAgY29uc3QgYXV0aFN0YWNrID0gbmV3IEF1dGV1cml1bUF1dGhTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLUF1dGgtJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBEYXRhYmFzZSBzdGFja1xuICAgIGNvbnN0IGRhdGFiYXNlU3RhY2sgPSBuZXcgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLURhdGFiYXNlLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gTWVkaWEgc3RvcmFnZSBzdGFjayAoUzMpXG4gICAgY29uc3QgbWVkaWFTdGFjayA9IG5ldyBBdXRldXJpdW1NZWRpYVN0YWNrKHRoaXMsIGBBdXRldXJpdW0tTWVkaWEtJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBBUEkgc3RhY2sgKEFwcFN5bmMgKyBMYW1iZGEpXG4gICAgY29uc3QgYXBpU3RhY2sgPSBuZXcgQXV0ZXVyaXVtQXBpU3RhY2sodGhpcywgYEF1dGV1cml1bS1BcGktJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZSxcbiAgICAgIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXG4gICAgICB1c2VyUG9vbENsaWVudDogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50XG4gICAgfSlcblxuICAgIC8vIEdlbkFJIHN0YWNrIChMTE0gaW50ZWdyYXRpb24pXG4gICAgY29uc3QgX2dlbmFpU3RhY2sgPSBuZXcgQXV0ZXVyaXVtR2VuQUlTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLUdlbkFJLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2UsXG4gICAgICBncmFwaHFsQXBpOiBhcGlTdGFjay5ncmFwaHFsQXBpLFxuICAgICAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50OiBhdXRoU3RhY2sudXNlclBvb2xDbGllbnQsXG4gICAgICBtZWRpYUJ1Y2tldDogbWVkaWFTdGFjay5tZWRpYUJ1Y2tldFxuICAgIH0pXG5cbiAgICAvLyBXZWIgaG9zdGluZyBzdGFjayAoUzMgKyBDbG91ZEZyb250KVxuICAgIGNvbnN0IF93ZWJTdGFjayA9IG5ldyBBdXRldXJpdW1XZWJTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLVdlYi0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIFRPRE86IE1vbml0b3Jpbmcgc3RhY2sgKENsb3VkV2F0Y2gpIC0gRElTQUJMRUQgZm9yIGRldmVsb3BtZW50IGNvc3Qgc2F2aW5nc1xuICAgIC8vIFVuY29tbWVudCB3aGVuIHJlYWR5IGZvciBwcm9kdWN0aW9uIG1vbml0b3JpbmcgKH4kNS03L21vbnRoKVxuICAgIC8qXG4gICAgY29uc3QgbW9uaXRvcmluZ1N0YWNrID0gbmV3IEF1dGV1cml1bU1vbml0b3JpbmdTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLU1vbml0b3JpbmctJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZSxcbiAgICAgIGFwaVN0YWNrLFxuICAgICAgd2ViU3RhY2tcbiAgICB9KVxuICAgICovXG5cbiAgICAvLyBTdGFjayBkZXBlbmRlbmNpZXNcbiAgICBhcGlTdGFjay5hZGREZXBlbmRlbmN5KGF1dGhTdGFjaylcbiAgICBhcGlTdGFjay5hZGREZXBlbmRlbmN5KGRhdGFiYXNlU3RhY2spXG4gICAgX2dlbmFpU3RhY2suYWRkRGVwZW5kZW5jeShkYXRhYmFzZVN0YWNrKVxuICAgIF9nZW5haVN0YWNrLmFkZERlcGVuZGVuY3kobWVkaWFTdGFjaylcbiAgICAvLyBOb3RlOiBHZW5BSSBzdGFjayB1c2VzIGFwaVN0YWNrLmdyYXBocWxBcGkgcmVmZXJlbmNlIGJ1dCBkb2VzIG5vdCBuZWVkIGEgZGVwZW5kZW5jeVxuICAgIC8vIGJlY2F1c2UgaXQgb25seSBhZGRzIHJlc29sdmVycyB0byB0aGUgZXhpc3RpbmcgQVBJXG4gICAgLy8gbW9uaXRvcmluZ1N0YWNrLmFkZERlcGVuZGVuY3koYXBpU3RhY2spIC8vIERJU0FCTEVEXG4gICAgLy8gbW9uaXRvcmluZ1N0YWNrLmFkZERlcGVuZGVuY3kod2ViU3RhY2spIC8vIERJU0FCTEVEXG4gIH1cbn1cbiJdfQ==