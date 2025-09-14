"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuteuriumAuthStack = void 0;
const cdk = require("aws-cdk-lib");
const cognito = require("aws-cdk-lib/aws-cognito");
class AuteuriumAuthStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage } = props;
        // Create Cognito User Pool
        this.userPool = new cognito.UserPool(this, `AuteuriumUserPool-${stage}`, {
            userPoolName: `auteurium-users-${stage}`,
            selfSignUpEnabled: true,
            signInAliases: {
                email: true
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        // Create User Pool Client
        this.userPoolClient = new cognito.UserPoolClient(this, `AuteuriumUserPoolClient-${stage}`, {
            userPool: this.userPool,
            userPoolClientName: `auteurium-web-client-${stage}`,
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE
                ]
            }
        });
        // Export values for other stacks
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            exportName: `Auteurium-UserPoolId-${stage}`
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            exportName: `Auteurium-UserPoolClientId-${stage}`
        });
    }
}
exports.AuteuriumAuthStack = AuteuriumAuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLWF1dGgtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRldXJpdW0tYXV0aC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBa0M7QUFDbEMsbURBQWtEO0FBT2xELE1BQWEsa0JBQW1CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE4QjtRQUN0RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBRXZCLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEtBQUssRUFBRSxFQUFFO1lBQ3ZFLFlBQVksRUFBRSxtQkFBbUIsS0FBSyxFQUFFO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxLQUFLO2FBQ3RCO1lBQ0QsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUNuRCxhQUFhLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN2RixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLDJCQUEyQixLQUFLLEVBQUUsRUFBRTtZQUN6RixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsa0JBQWtCLEVBQUUsd0JBQXdCLEtBQUssRUFBRTtZQUNuRCxjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUU7Z0JBQ1QsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLE9BQU8sRUFBRSxJQUFJO2FBQ2Q7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsS0FBSyxFQUFFO29CQUNMLHNCQUFzQixFQUFFLElBQUk7aUJBQzdCO2dCQUNELE1BQU0sRUFBRTtvQkFDTixPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUs7b0JBQ3hCLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTTtvQkFDekIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPO2lCQUMzQjthQUNGO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsaUNBQWlDO1FBQ2pDLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVU7WUFDL0IsVUFBVSxFQUFFLHdCQUF3QixLQUFLLEVBQUU7U0FDNUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDM0MsVUFBVSxFQUFFLDhCQUE4QixLQUFLLEVBQUU7U0FDbEQsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBM0RELGdEQTJEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5pbnRlcmZhY2UgQXV0ZXVyaXVtQXV0aFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIEF1dGV1cml1bUF1dGhTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbFxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnRcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXV0ZXVyaXVtQXV0aFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgY29uc3QgeyBzdGFnZSB9ID0gcHJvcHNcblxuICAgIC8vIENyZWF0ZSBDb2duaXRvIFVzZXIgUG9vbFxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCBgQXV0ZXVyaXVtVXNlclBvb2wtJHtzdGFnZX1gLCB7XG4gICAgICB1c2VyUG9vbE5hbWU6IGBhdXRldXJpdW0tdXNlcnMtJHtzdGFnZX1gLFxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XG4gICAgICAgIGVtYWlsOiB0cnVlXG4gICAgICB9LFxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgbWluTGVuZ3RoOiA4LFxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxuICAgICAgICByZXF1aXJlU3ltYm9sczogZmFsc2VcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICByZW1vdmFsUG9saWN5OiBzdGFnZSA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgVXNlciBQb29sIENsaWVudFxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCBgQXV0ZXVyaXVtVXNlclBvb2xDbGllbnQtJHtzdGFnZX1gLCB7XG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogYGF1dGV1cml1bS13ZWItY2xpZW50LSR7c3RhZ2V9YCxcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgIHVzZXJTcnA6IHRydWVcbiAgICAgIH0sXG4gICAgICBvQXV0aDoge1xuICAgICAgICBmbG93czoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGVzOiBbXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLFxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5PUEVOSUQsXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEVcbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBFeHBvcnQgdmFsdWVzIGZvciBvdGhlciBzdGFja3NcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLVVzZXJQb29sSWQtJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGV4cG9ydE5hbWU6IGBBdXRldXJpdW0tVXNlclBvb2xDbGllbnRJZC0ke3N0YWdlfWBcbiAgICB9KVxuICB9XG59Il19