"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuteuriumApp = void 0;
const cdk = require("aws-cdk-lib");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGV1cml1bS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQWtDO0FBRWxDLHdFQUFrRTtBQUNsRSxnRkFBMEU7QUFDMUUsc0VBQWdFO0FBQ2hFLDBFQUFvRTtBQUNwRSxzRUFBZ0U7QUFDaEUsMElBQTBJO0FBRTFJLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxHQUFHO0lBQ3ZDO1FBQ0UsS0FBSyxFQUFFLENBQUE7UUFFUCxNQUFNLEdBQUcsR0FBRztZQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtZQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO1NBQ3RELENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUE7UUFFeEMsaUNBQWlDO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUkseUNBQWtCLENBQUMsSUFBSSxFQUFFLGtCQUFrQixLQUFLLEVBQUUsRUFBRTtZQUN4RSxHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLGlCQUFpQjtRQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFJLGlEQUFzQixDQUFDLElBQUksRUFBRSxzQkFBc0IsS0FBSyxFQUFFLEVBQUU7WUFDcEYsR0FBRztZQUNILEtBQUs7U0FDTixDQUFDLENBQUE7UUFFRiwrQkFBK0I7UUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEtBQUssRUFBRSxFQUFFO1lBQ3JFLEdBQUc7WUFDSCxLQUFLO1lBQ0wsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO1lBQzVCLGNBQWMsRUFBRSxTQUFTLENBQUMsY0FBYztTQUN6QyxDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEtBQUssRUFBRSxFQUFFO1lBQzNFLEdBQUc7WUFDSCxLQUFLO1NBQ04sQ0FBQyxDQUFBO1FBRUYsc0NBQXNDO1FBQ3RDLE1BQU0sUUFBUSxHQUFHLElBQUksdUNBQWlCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixLQUFLLEVBQUUsRUFBRTtZQUNyRSxHQUFHO1lBQ0gsS0FBSztTQUNOLENBQUMsQ0FBQTtRQUVGLDhFQUE4RTtRQUM5RSwrREFBK0Q7UUFDL0Q7Ozs7Ozs7VUFPRTtRQUVGLHFCQUFxQjtRQUNyQixRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pDLFFBQVEsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDckMsc0RBQXNEO1FBQ3RELHNEQUFzRDtJQUN4RCxDQUFDO0NBQ0Y7QUE1REQsb0NBNERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcbmltcG9ydCB7IEF1dGV1cml1bUF1dGhTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1hdXRoLXN0YWNrJ1xuaW1wb3J0IHsgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS1kYXRhYmFzZS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bUFwaVN0YWNrIH0gZnJvbSAnLi9zdGFja3MvYXV0ZXVyaXVtLWFwaS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bU1lZGlhU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tbWVkaWEtc3RhY2snXG5pbXBvcnQgeyBBdXRldXJpdW1XZWJTdGFjayB9IGZyb20gJy4vc3RhY2tzL2F1dGV1cml1bS13ZWItc3RhY2snXG4vLyBpbXBvcnQgeyBBdXRldXJpdW1Nb25pdG9yaW5nU3RhY2sgfSBmcm9tICcuL3N0YWNrcy9hdXRldXJpdW0tbW9uaXRvcmluZy1zdGFjaycgLy8gRElTQUJMRUQgLSBzZWUgYXV0ZXVyaXVtLW1vbml0b3Jpbmctc3RhY2sudHMuZGlzYWJsZWRcblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bUFwcCBleHRlbmRzIGNkay5BcHAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpXG5cbiAgICBjb25zdCBlbnYgPSB7XG4gICAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ3VzLWVhc3QtMSdcbiAgICB9XG5cbiAgICBjb25zdCBzdGFnZSA9IHByb2Nlc3MuZW52LlNUQUdFIHx8ICdkZXYnXG4gICAgXG4gICAgLy8gQXV0aGVudGljYXRpb24gc3RhY2sgKENvZ25pdG8pXG4gICAgY29uc3QgYXV0aFN0YWNrID0gbmV3IEF1dGV1cml1bUF1dGhTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLUF1dGgtJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBEYXRhYmFzZSBzdGFja1xuICAgIGNvbnN0IGRhdGFiYXNlU3RhY2sgPSBuZXcgQXV0ZXVyaXVtRGF0YWJhc2VTdGFjayh0aGlzLCBgQXV0ZXVyaXVtLURhdGFiYXNlLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2VcbiAgICB9KVxuXG4gICAgLy8gQVBJIHN0YWNrIChBcHBTeW5jICsgTGFtYmRhKVxuICAgIGNvbnN0IGFwaVN0YWNrID0gbmV3IEF1dGV1cml1bUFwaVN0YWNrKHRoaXMsIGBBdXRldXJpdW0tQXBpLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2UsXG4gICAgICB1c2VyUG9vbDogYXV0aFN0YWNrLnVzZXJQb29sLFxuICAgICAgdXNlclBvb2xDbGllbnQ6IGF1dGhTdGFjay51c2VyUG9vbENsaWVudFxuICAgIH0pXG5cbiAgICAvLyBNZWRpYSBzdG9yYWdlIHN0YWNrIChTMylcbiAgICBjb25zdCBtZWRpYVN0YWNrID0gbmV3IEF1dGV1cml1bU1lZGlhU3RhY2sodGhpcywgYEF1dGV1cml1bS1NZWRpYS0ke3N0YWdlfWAsIHtcbiAgICAgIGVudixcbiAgICAgIHN0YWdlXG4gICAgfSlcblxuICAgIC8vIFdlYiBob3N0aW5nIHN0YWNrIChTMyArIENsb3VkRnJvbnQpXG4gICAgY29uc3Qgd2ViU3RhY2sgPSBuZXcgQXV0ZXVyaXVtV2ViU3RhY2sodGhpcywgYEF1dGV1cml1bS1XZWItJHtzdGFnZX1gLCB7XG4gICAgICBlbnYsXG4gICAgICBzdGFnZVxuICAgIH0pXG5cbiAgICAvLyBUT0RPOiBNb25pdG9yaW5nIHN0YWNrIChDbG91ZFdhdGNoKSAtIERJU0FCTEVEIGZvciBkZXZlbG9wbWVudCBjb3N0IHNhdmluZ3NcbiAgICAvLyBVbmNvbW1lbnQgd2hlbiByZWFkeSBmb3IgcHJvZHVjdGlvbiBtb25pdG9yaW5nICh+JDUtNy9tb250aClcbiAgICAvKlxuICAgIGNvbnN0IG1vbml0b3JpbmdTdGFjayA9IG5ldyBBdXRldXJpdW1Nb25pdG9yaW5nU3RhY2sodGhpcywgYEF1dGV1cml1bS1Nb25pdG9yaW5nLSR7c3RhZ2V9YCwge1xuICAgICAgZW52LFxuICAgICAgc3RhZ2UsXG4gICAgICBhcGlTdGFjayxcbiAgICAgIHdlYlN0YWNrXG4gICAgfSlcbiAgICAqL1xuXG4gICAgLy8gU3RhY2sgZGVwZW5kZW5jaWVzXG4gICAgYXBpU3RhY2suYWRkRGVwZW5kZW5jeShhdXRoU3RhY2spXG4gICAgYXBpU3RhY2suYWRkRGVwZW5kZW5jeShkYXRhYmFzZVN0YWNrKVxuICAgIC8vIG1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KGFwaVN0YWNrKSAvLyBESVNBQkxFRFxuICAgIC8vIG1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KHdlYlN0YWNrKSAvLyBESVNBQkxFRFxuICB9XG59Il19