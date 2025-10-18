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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQWtDO0FBRWxDLHNFQUFnRTtBQUNoRSx3RUFBa0U7QUFDbEUsZ0ZBQTBFO0FBQzFFLDBFQUFvRTtBQUNwRSwwRUFBb0U7QUFDcEUsc0VBQWdFO0FBQ2hFLDBJQUEwSTtBQUUxSSxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsR0FBRztJQUN2QztRQUNFLEtBQUssRUFBRSxDQUFBO1FBRVAsTUFBTSxXQUFXLEdBQUcsQ0FBQyxLQUF5QixFQUFFLFFBQWdCLEVBQUUsRUFBRSxDQUNsRSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUE7UUFFckUsTUFBTSxHQUFHLEdBQUc7WUFDVixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7WUFDeEMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLFdBQVcsQ0FBQztTQUNqRSxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRW5ELGlDQUFpQztRQUNqQyxNQUFNLFNBQVMsR0FBRyxJQUFJLHlDQUFrQixDQUFDLElBQUksRUFBRSxrQkFBa0IsS0FBSyxFQUFFLEVBQUU7WUFDeEUsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRixpQkFBaUI7UUFDakIsTUFBTSxhQUFhLEdBQUcsSUFBSSxpREFBc0IsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEtBQUssRUFBRSxFQUFFO1lBQ3BGLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsMkJBQTJCO1FBQzNCLE1BQU0sVUFBVSxHQUFHLElBQUksMkNBQW1CLENBQUMsSUFBSSxFQUFFLG1CQUFtQixLQUFLLEVBQUUsRUFBRTtZQUMzRSxHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLCtCQUErQjtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsS0FBSyxFQUFFLEVBQUU7WUFDckUsR0FBRztZQUNILEtBQUs7WUFDTCxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDNUIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO1lBQ3hDLFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVztTQUNwQyxDQUFDLENBQUE7UUFFRixnQ0FBZ0M7UUFDaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEtBQUssRUFBRSxFQUFFO1lBQzVFLEdBQUc7WUFDSCxLQUFLO1lBQ0wsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO1lBQy9CLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtZQUM1QixjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWM7WUFDeEMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXO1NBQ3BDLENBQUMsQ0FBQTtRQUVGLHNDQUFzQztRQUN0QyxNQUFNLFNBQVMsR0FBRyxJQUFJLHVDQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsS0FBSyxFQUFFLEVBQUU7WUFDdEUsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRiw4RUFBOEU7UUFDOUUsK0RBQStEO1FBQy9EOzs7Ozs7O1VBT0U7UUFFRixxQkFBcUI7UUFDckIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQyxRQUFRLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3JDLFdBQVcsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDeEMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNyQyxzRkFBc0Y7UUFDdEYscURBQXFEO1FBQ3JELHNEQUFzRDtRQUN0RCxzREFBc0Q7SUFDeEQsQ0FBQztDQUNGO0FBOUVELG9DQThFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcblxuaW1wb3J0IHsgQXV0ZXVyaXVtQXBpU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tYXBpLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtQXV0aFN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWF1dGgtc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1EYXRhYmFzZVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWRhdGFiYXNlLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtR2VuQUlTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1nZW5haS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bU1lZGlhU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tbWVkaWEtc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1XZWJTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS13ZWItc3RhY2snXG4vLyBpbXBvcnQgeyBBdXRldXJpdW1Nb25pdG9yaW5nU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tbW9uaXRvcmluZy1zdGFjaycgLy8gRElTQUJMRUQgLSBzZWUgYXV0ZXVyaXVtLW1vbml0b3Jpbmctc3RhY2sudHMuZGlzYWJsZWRcblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bUFwcCBleHRlbmRzIGNkay5BcHAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpXG5cbiAgICBjb25zdCBjb2FsZXNjZUVudiA9ICh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBmYWxsYmFjazogc3RyaW5nKSA9PlxuICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS50cmltKCkgIT09ICcnID8gdmFsdWUgOiBmYWxsYmFja1xuXG4gICAgY29uc3QgZW52ID0ge1xuICAgICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICAgIHJlZ2lvbjogY29hbGVzY2VFbnYocHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OLCAndXMtZWFzdC0xJylcbiAgICB9XG5cbiAgICBjb25zdCBzdGFnZSA9IGNvYWxlc2NlRW52KHByb2Nlc3MuZW52LlNUQUdFLCAnZGV2JylcbiAgICBcbiAgICAvLyBBdXRoZW50aWNhdGlvbiBzdGFjayAoQ29nbml0bylcbiAgICBjb25zdCBhdXRoU3RhY2sgPSBuZXcgQXV0ZXVyaXVtQXV0aFN0YWNrKHRoaXMsIGBBdXRldXJpdW0tQXV0aC0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIERhdGFiYXNlIHN0YWNrXG4gICAgY29uc3QgZGF0YWJhc2VTdGFjayA9IG5ldyBBdXRldXJpdW1EYXRhYmFzZVN0YWNrKHRoaXMsIGBBdXRldXJpdW0tRGF0YWJhc2UtJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBNZWRpYSBzdG9yYWdlIHN0YWNrIChTMylcbiAgICBjb25zdCBtZWRpYVN0YWNrID0gbmV3IEF1dGV1cml1bU1lZGlhU3RhY2sodGhpcywgYEF1dGV1cml1bS1NZWRpYS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIEFQSSBzdGFjayAoQXBwU3luYyArIExhbWJkYSlcbiAgICBjb25zdCBhcGlTdGFjayA9IG5ldyBBdXRldXJpdW1BcGlTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLUFwaS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlLFxuICAgICAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50OiBhdXRoU3RhY2sudXNlclBvb2xDbGllbnQsXG4gICAgICBtZWRpYUJ1Y2tldDogbWVkaWFTdGFjay5tZWRpYUJ1Y2tldFxuICAgIH0pXG5cbiAgICAvLyBHZW5BSSBzdGFjayAoTExNIGludGVncmF0aW9uKVxuICAgIGNvbnN0IF9nZW5haVN0YWNrID0gbmV3IEF1dGV1cml1bUdlbkFJU3RhY2sodGhpcywgYEF1dGV1cml1bS1HZW5BSS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlLFxuICAgICAgZ3JhcGhxbEFwaTogYXBpU3RhY2suZ3JhcGhxbEFwaSxcbiAgICAgIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXG4gICAgICB1c2VyUG9vbENsaWVudDogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50LFxuICAgICAgbWVkaWFCdWNrZXQ6IG1lZGlhU3RhY2subWVkaWFCdWNrZXRcbiAgICB9KVxuXG4gICAgLy8gV2ViIGhvc3Rpbmcgc3RhY2sgKFMzICsgQ2xvdWRGcm9udClcbiAgICBjb25zdCBfd2ViU3RhY2sgPSBuZXcgQXV0ZXVyaXVtV2ViU3RhY2sodGhpcywgYEF1dGV1cml1bS1XZWItJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBUT0RPOiBNb25pdG9yaW5nIHN0YWNrIChDbG91ZFdhdGNoKSAtIERJU0FCTEVEIGZvciBkZXZlbG9wbWVudCBjb3N0IHNhdmluZ3NcbiAgICAvLyBVbmNvbW1lbnQgd2hlbiByZWFkeSBmb3IgcHJvZHVjdGlvbiBtb25pdG9yaW5nICh+JDUtNy9tb250aClcbiAgICAvKlxuICAgIGNvbnN0IG1vbml0b3JpbmdTdGFjayA9IG5ldyBBdXRldXJpdW1Nb25pdG9yaW5nU3RhY2sodGhpcywgYEF1dGV1cml1bS1Nb25pdG9yaW5nLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2UsXG4gICAgICBhcGlTdGFjayxcbiAgICAgIHdlYlN0YWNrXG4gICAgfSlcbiAgICAqL1xuXG4gICAgLy8gU3RhY2sgZGVwZW5kZW5jaWVzXG4gICAgYXBpU3RhY2suYWRkRGVwZW5kZW5jeShhdXRoU3RhY2spXG4gICAgYXBpU3RhY2suYWRkRGVwZW5kZW5jeShkYXRhYmFzZVN0YWNrKVxuICAgIF9nZW5haVN0YWNrLmFkZERlcGVuZGVuY3koZGF0YWJhc2VTdGFjaylcbiAgICBfZ2VuYWlTdGFjay5hZGREZXBlbmRlbmN5KG1lZGlhU3RhY2spXG4gICAgLy8gTm90ZTogR2VuQUkgc3RhY2sgdXNlcyBhcGlTdGFjay5ncmFwaHFsQXBpIHJlZmVyZW5jZSBidXQgZG9lcyBub3QgbmVlZCBhIGRlcGVuZGVuY3lcbiAgICAvLyBiZWNhdXNlIGl0IG9ubHkgYWRkcyByZXNvbHZlcnMgdG8gdGhlIGV4aXN0aW5nIEFQSVxuICAgIC8vIG1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KGFwaVN0YWNrKSAvLyBESVNBQkxFRFxuICAgIC8vIG1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KHdlYlN0YWNrKSAvLyBESVNBQkxFRFxuICB9XG59XG4iXX0=