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
            userPoolClient: authStack.userPoolClient,
            mediaBucket: mediaStack.mediaBucket
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsc0VBQWdFO0FBQ2hFLHdFQUFrRTtBQUNsRSxnRkFBMEU7QUFDMUUsMEVBQW9FO0FBQ3BFLDBFQUFvRTtBQUNwRSxzRUFBZ0U7QUFDaEUsMElBQTBJO0FBRTFJLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxHQUFHO0lBQ3ZDO1FBQ0UsS0FBSyxFQUFFLENBQUE7UUFFUCxNQUFNLFdBQVcsR0FBRyxDQUFDLEtBQXlCLEVBQUUsUUFBZ0IsRUFBRSxFQUFFLENBQ2xFLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUVyRSxNQUFNLEdBQUcsR0FBRztZQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtZQUN4QyxNQUFNLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsV0FBVyxDQUFDO1NBQ2pFLENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFbkQsaUNBQWlDO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUkseUNBQWtCLENBQUMsSUFBSSxFQUFFLGtCQUFrQixLQUFLLEVBQUUsRUFBRTtZQUN4RSxHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLGlCQUFpQjtRQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFJLGlEQUFzQixDQUFDLElBQUksRUFBRSxzQkFBc0IsS0FBSyxFQUFFLEVBQUU7WUFDcEYsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEtBQUssRUFBRSxFQUFFO1lBQzNFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsK0JBQStCO1FBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUksdUNBQWlCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixLQUFLLEVBQUUsRUFBRTtZQUNyRSxHQUFHO1lBQ0gsS0FBSztZQUNMLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtZQUM1QixjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWM7WUFDeEMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXO1NBQ3BDLENBQUMsQ0FBQTtRQUVGLGdDQUFnQztRQUNoQyxNQUFNLFdBQVcsR0FBRyxJQUFJLDJDQUFtQixDQUFDLElBQUksRUFBRSxtQkFBbUIsS0FBSyxFQUFFLEVBQUU7WUFDNUUsR0FBRztZQUNILEtBQUs7WUFDTCxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDL0IsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO1lBQzVCLGNBQWMsRUFBRSxTQUFTLENBQUMsY0FBYztZQUN4QyxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVc7U0FDcEMsQ0FBQyxDQUFBO1FBRUYsc0NBQXNDO1FBQ3RDLE1BQU0sU0FBUyxHQUFHLElBQUksdUNBQWlCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixLQUFLLEVBQUUsRUFBRTtZQUN0RSxHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLDhFQUE4RTtRQUM5RSwrREFBK0Q7UUFDL0Q7Ozs7Ozs7VUFPRTtRQUVGLHFCQUFxQjtRQUNyQixRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pDLFFBQVEsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDckMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN4QyxXQUFXLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3JDLHNGQUFzRjtRQUN0RixxREFBcUQ7UUFDckQsc0RBQXNEO1FBQ3RELHNEQUFzRDtJQUN4RCxDQUFDO0NBQ0Y7QUE5RUQsb0NBOEVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuXG5pbXBvcnQgeyBBdXRldXJpdW1BcGlTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1hcGktc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1BdXRoU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tYXV0aC1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bURhdGFiYXNlU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tZGF0YWJhc2Utc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1HZW5BSVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWdlbmFpLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtTWVkaWFTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1tZWRpYS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bVdlYlN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLXdlYi1zdGFjaydcbi8vIGltcG9ydCB7IEF1dGV1cml1bU1vbml0b3JpbmdTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1tb25pdG9yaW5nLXN0YWNrJyAvLyBESVNBQkxFRCAtIHNlZSBhdXRldXJpdW0tbW9uaXRvcmluZy1zdGFjay50cy5kaXNhYmxlZFxuXG5leHBvcnQgY2xhc3MgQXV0ZXVyaXVtQXBwIGV4dGVuZHMgY2RrLkFwcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGNvYWxlc2NlRW52ID0gKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBzdHJpbmcpID0+XG4gICAgICB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIHZhbHVlLnRyaW0oKSAhPT0gJycgPyB2YWx1ZSA6IGZhbGxiYWNrXG5cbiAgICBjb25zdCBlbnYgPSB7XG4gICAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgICAgcmVnaW9uOiBjb2FsZXNjZUVudihwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04sICd1cy1lYXN0LTEnKVxuICAgIH1cblxuICAgIGNvbnN0IHN0YWdlID0gY29hbGVzY2VFbnYocHJvY2Vzcy5lbnYuU1RBR0UsICdkZXYnKVxuICAgIFxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIHN0YWNrIChDb2duaXRvKVxuICAgIGNvbnN0IGF1dGhTdGFjayA9IG5ldyBBdXRldXJpdW1BdXRoU3RhY2sodGhpcywgYEF1dGV1cml1bS1BdXRoLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gRGF0YWJhc2Ugc3RhY2tcbiAgICBjb25zdCBkYXRhYmFzZVN0YWNrID0gbmV3IEF1dGV1cml1bURhdGFiYXNlU3RhY2sodGhpcywgYEF1dGV1cml1bS1EYXRhYmFzZS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIE1lZGlhIHN0b3JhZ2Ugc3RhY2sgKFMzKVxuICAgIGNvbnN0IG1lZGlhU3RhY2sgPSBuZXcgQXV0ZXVyaXVtTWVkaWFTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLU1lZGlhLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gQVBJIHN0YWNrIChBcHBTeW5jICsgTGFtYmRhKVxuICAgIGNvbnN0IGFwaVN0YWNrID0gbmV3IEF1dGV1cml1bUFwaVN0YWNrKHRoaXMsIGBBdXRldXJpdW0tQXBpLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2UsXG4gICAgICB1c2VyUG9vbDogYXV0aFN0YWNrLnVzZXJQb29sLFxuICAgICAgdXNlclBvb2xDbGllbnQ6IGF1dGhTdGFjay51c2VyUG9vbENsaWVudCxcbiAgICAgIG1lZGlhQnVja2V0OiBtZWRpYVN0YWNrLm1lZGlhQnVja2V0XG4gICAgfSlcblxuICAgIC8vIEdlbkFJIHN0YWNrIChMTE0gaW50ZWdyYXRpb24pXG4gICAgY29uc3QgX2dlbmFpU3RhY2sgPSBuZXcgQXV0ZXVyaXVtR2VuQUlTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLUdlbkFJLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2UsXG4gICAgICBncmFwaHFsQXBpOiBhcGlTdGFjay5ncmFwaHFsQXBpLFxuICAgICAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50OiBhdXRoU3RhY2sudXNlclBvb2xDbGllbnQsXG4gICAgICBtZWRpYUJ1Y2tldDogbWVkaWFTdGFjay5tZWRpYUJ1Y2tldFxuICAgIH0pXG5cbiAgICAvLyBXZWIgaG9zdGluZyBzdGFjayAoUzMgKyBDbG91ZEZyb250KVxuICAgIGNvbnN0IF93ZWJTdGFjayA9IG5ldyBBdXRldXJpdW1XZWJTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLVdlYi0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIFRPRE86IE1vbml0b3Jpbmcgc3RhY2sgKENsb3VkV2F0Y2gpIC0gRElTQUJMRUQgZm9yIGRldmVsb3BtZW50IGNvc3Qgc2F2aW5nc1xuICAgIC8vIFVuY29tbWVudCB3aGVuIHJlYWR5IGZvciBwcm9kdWN0aW9uIG1vbml0b3JpbmcgKH4kNS03L21vbnRoKVxuICAgIC8qXG4gICAgY29uc3QgbW9uaXRvcmluZ1N0YWNrID0gbmV3IEF1dGV1cml1bU1vbml0b3JpbmdTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLU1vbml0b3JpbmctJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZSxcbiAgICAgIGFwaVN0YWNrLFxuICAgICAgd2ViU3RhY2tcbiAgICB9KVxuICAgICovXG5cbiAgICAvLyBTdGFjayBkZXBlbmRlbmNpZXNcbiAgICBhcGlTdGFjay5hZGREZXBlbmRlbmN5KGF1dGhTdGFjaylcbiAgICBhcGlTdGFjay5hZGREZXBlbmRlbmN5KGRhdGFiYXNlU3RhY2spXG4gICAgX2dlbmFpU3RhY2suYWRkRGVwZW5kZW5jeShkYXRhYmFzZVN0YWNrKVxuICAgIF9nZW5haVN0YWNrLmFkZERlcGVuZGVuY3kobWVkaWFTdGFjaylcbiAgICAvLyBOb3RlOiBHZW5BSSBzdGFjayB1c2VzIGFwaVN0YWNrLmdyYXBocWxBcGkgcmVmZXJlbmNlIGJ1dCBkb2VzIG5vdCBuZWVkIGEgZGVwZW5kZW5jeVxuICAgIC8vIGJlY2F1c2UgaXQgb25seSBhZGRzIHJlc29sdmVycyB0byB0aGUgZXhpc3RpbmcgQVBJXG4gICAgLy8gbW9uaXRvcmluZ1N0YWNrLmFkZERlcGVuZGVuY3koYXBpU3RhY2spIC8vIERJU0FCTEVEXG4gICAgLy8gbW9uaXRvcmluZ1N0YWNrLmFkZERlcGVuZGVuY3kod2ViU3RhY2spIC8vIERJU0FCTEVEXG4gIH1cbn1cbiJdfQ==