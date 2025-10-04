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
        _genaiStack.addDependency(databaseStack);
        // Note: GenAI stack uses apiStack.graphqlApi reference but does not need a dependency
        // because it only adds resolvers to the existing API
        // monitoringStack.addDependency(apiStack) // DISABLED
        // monitoringStack.addDependency(webStack) // DISABLED
    }
}
exports.AuteuriumApp = AuteuriumApp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsc0VBQWdFO0FBQ2hFLHdFQUFrRTtBQUNsRSxnRkFBMEU7QUFDMUUsMEVBQW9FO0FBQ3BFLDBFQUFvRTtBQUNwRSxzRUFBZ0U7QUFDaEUsMElBQTBJO0FBRTFJLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxHQUFHO0lBQ3ZDO1FBQ0UsS0FBSyxFQUFFLENBQUE7UUFFUCxNQUFNLFdBQVcsR0FBRyxDQUFDLEtBQXlCLEVBQUUsUUFBZ0IsRUFBRSxFQUFFLENBQ2xFLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUVyRSxNQUFNLEdBQUcsR0FBRztZQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtZQUN4QyxNQUFNLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsV0FBVyxDQUFDO1NBQ2pFLENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFbkQsaUNBQWlDO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUkseUNBQWtCLENBQUMsSUFBSSxFQUFFLGtCQUFrQixLQUFLLEVBQUUsRUFBRTtZQUN4RSxHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLGlCQUFpQjtRQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFJLGlEQUFzQixDQUFDLElBQUksRUFBRSxzQkFBc0IsS0FBSyxFQUFFLEVBQUU7WUFDcEYsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRiwrQkFBK0I7UUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEtBQUssRUFBRSxFQUFFO1lBQ3JFLEdBQUc7WUFDSCxLQUFLO1lBQ0wsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO1lBQzVCLGNBQWMsRUFBRSxTQUFTLENBQUMsY0FBYztTQUN6QyxDQUFDLENBQUE7UUFFRixnQ0FBZ0M7UUFDaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEtBQUssRUFBRSxFQUFFO1lBQzVFLEdBQUc7WUFDSCxLQUFLO1lBQ0wsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO1lBQy9CLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtZQUM1QixjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWM7U0FDekMsQ0FBQyxDQUFBO1FBRUYsMkJBQTJCO1FBQzNCLE1BQU0sV0FBVyxHQUFHLElBQUksMkNBQW1CLENBQUMsSUFBSSxFQUFFLG1CQUFtQixLQUFLLEVBQUUsRUFBRTtZQUM1RSxHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLHNDQUFzQztRQUN0QyxNQUFNLFNBQVMsR0FBRyxJQUFJLHVDQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsS0FBSyxFQUFFLEVBQUU7WUFDdEUsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRiw4RUFBOEU7UUFDOUUsK0RBQStEO1FBQy9EOzs7Ozs7O1VBT0U7UUFFRixxQkFBcUI7UUFDckIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQyxRQUFRLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3JDLFdBQVcsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDeEMsc0ZBQXNGO1FBQ3RGLHFEQUFxRDtRQUNyRCxzREFBc0Q7UUFDdEQsc0RBQXNEO0lBQ3hELENBQUM7Q0FDRjtBQTNFRCxvQ0EyRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5cbmltcG9ydCB7IEF1dGV1cml1bUFwaVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWFwaS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bUF1dGhTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1hdXRoLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1kYXRhYmFzZS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bUdlbkFJU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tZ2VuYWktc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1NZWRpYVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLW1lZGlhLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtV2ViU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0td2ViLXN0YWNrJ1xuLy8gaW1wb3J0IHsgQXV0ZXVyaXVtTW9uaXRvcmluZ1N0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLW1vbml0b3Jpbmctc3RhY2snIC8vIERJU0FCTEVEIC0gc2VlIGF1dGV1cml1bS1tb25pdG9yaW5nLXN0YWNrLnRzLmRpc2FibGVkXG5cbmV4cG9ydCBjbGFzcyBBdXRldXJpdW1BcHAgZXh0ZW5kcyBjZGsuQXBwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKVxuXG4gICAgY29uc3QgY29hbGVzY2VFbnYgPSAodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IHN0cmluZykgPT5cbiAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUudHJpbSgpICE9PSAnJyA/IHZhbHVlIDogZmFsbGJhY2tcblxuICAgIGNvbnN0IGVudiA9IHtcbiAgICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgICByZWdpb246IGNvYWxlc2NlRW52KHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiwgJ3VzLWVhc3QtMScpXG4gICAgfVxuXG4gICAgY29uc3Qgc3RhZ2UgPSBjb2FsZXNjZUVudihwcm9jZXNzLmVudi5TVEFHRSwgJ2RldicpXG4gICAgXG4gICAgLy8gQXV0aGVudGljYXRpb24gc3RhY2sgKENvZ25pdG8pXG4gICAgY29uc3QgYXV0aFN0YWNrID0gbmV3IEF1dGV1cml1bUF1dGhTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLUF1dGgtJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBEYXRhYmFzZSBzdGFja1xuICAgIGNvbnN0IGRhdGFiYXNlU3RhY2sgPSBuZXcgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLURhdGFiYXNlLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gQVBJIHN0YWNrIChBcHBTeW5jICsgTGFtYmRhKVxuICAgIGNvbnN0IGFwaVN0YWNrID0gbmV3IEF1dGV1cml1bUFwaVN0YWNrKHRoaXMsIGBBdXRldXJpdW0tQXBpLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2UsXG4gICAgICB1c2VyUG9vbDogYXV0aFN0YWNrLnVzZXJQb29sLFxuICAgICAgdXNlclBvb2xDbGllbnQ6IGF1dGhTdGFjay51c2VyUG9vbENsaWVudFxuICAgIH0pXG5cbiAgICAvLyBHZW5BSSBzdGFjayAoTExNIGludGVncmF0aW9uKVxuICAgIGNvbnN0IF9nZW5haVN0YWNrID0gbmV3IEF1dGV1cml1bUdlbkFJU3RhY2sodGhpcywgYEF1dGV1cml1bS1HZW5BSS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlLFxuICAgICAgZ3JhcGhxbEFwaTogYXBpU3RhY2suZ3JhcGhxbEFwaSxcbiAgICAgIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXG4gICAgICB1c2VyUG9vbENsaWVudDogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50XG4gICAgfSlcblxuICAgIC8vIE1lZGlhIHN0b3JhZ2Ugc3RhY2sgKFMzKVxuICAgIGNvbnN0IF9tZWRpYVN0YWNrID0gbmV3IEF1dGV1cml1bU1lZGlhU3RhY2sodGhpcywgYEF1dGV1cml1bS1NZWRpYS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIFdlYiBob3N0aW5nIHN0YWNrIChTMyArIENsb3VkRnJvbnQpXG4gICAgY29uc3QgX3dlYlN0YWNrID0gbmV3IEF1dGV1cml1bVdlYlN0YWNrKHRoaXMsIGBBdXRldXJpdW0tV2ViLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gVE9ETzogTW9uaXRvcmluZyBzdGFjayAoQ2xvdWRXYXRjaCkgLSBESVNBQkxFRCBmb3IgZGV2ZWxvcG1lbnQgY29zdCBzYXZpbmdzXG4gICAgLy8gVW5jb21tZW50IHdoZW4gcmVhZHkgZm9yIHByb2R1Y3Rpb24gbW9uaXRvcmluZyAofiQ1LTcvbW9udGgpXG4gICAgLypcbiAgICBjb25zdCBtb25pdG9yaW5nU3RhY2sgPSBuZXcgQXV0ZXVyaXVtTW9uaXRvcmluZ1N0YWNrKHRoaXMsIGBBdXRldXJpdW0tTW9uaXRvcmluZy0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlLFxuICAgICAgYXBpU3RhY2ssXG4gICAgICB3ZWJTdGFja1xuICAgIH0pXG4gICAgKi9cblxuICAgIC8vIFN0YWNrIGRlcGVuZGVuY2llc1xuICAgIGFwaVN0YWNrLmFkZERlcGVuZGVuY3koYXV0aFN0YWNrKVxuICAgIGFwaVN0YWNrLmFkZERlcGVuZGVuY3koZGF0YWJhc2VTdGFjaylcbiAgICBfZ2VuYWlTdGFjay5hZGREZXBlbmRlbmN5KGRhdGFiYXNlU3RhY2spXG4gICAgLy8gTm90ZTogR2VuQUkgc3RhY2sgdXNlcyBhcGlTdGFjay5ncmFwaHFsQXBpIHJlZmVyZW5jZSBidXQgZG9lcyBub3QgbmVlZCBhIGRlcGVuZGVuY3lcbiAgICAvLyBiZWNhdXNlIGl0IG9ubHkgYWRkcyByZXNvbHZlcnMgdG8gdGhlIGV4aXN0aW5nIEFQSVxuICAgIC8vIG1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KGFwaVN0YWNrKSAvLyBESVNBQkxFRFxuICAgIC8vIG1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KHdlYlN0YWNrKSAvLyBESVNBQkxFRFxuICB9XG59XG4iXX0=