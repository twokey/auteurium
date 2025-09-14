"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuteuriumMonitoringStack = void 0;
const cdk = require("aws-cdk-lib");
const cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
const logs = require("aws-cdk-lib/aws-logs");
const sns = require("aws-cdk-lib/aws-sns");
const cloudwatchActions = require("aws-cdk-lib/aws-cloudwatch-actions");
class AuteuriumMonitoringStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, apiStack, webStack } = props;
        // SNS topic for alerts
        const alertTopic = new sns.Topic(this, `AuteuriumAlerts-${stage}`, {
            topicName: `auteurium-alerts-${stage}`,
            displayName: `Auteurium Alerts (${stage})`
        });
        // Log groups
        const apiLogGroup = new logs.LogGroup(this, `AuteuriumApiLogs-${stage}`, {
            logGroupName: `/aws/appsync/apis/${apiStack.graphqlApi.apiId}`,
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        // CloudWatch Dashboard
        const dashboard = new cloudwatch.Dashboard(this, `AuteuriumDashboard-${stage}`, {
            dashboardName: `auteurium-${stage}`,
            widgets: [
                [
                    // API Metrics
                    new cloudwatch.GraphWidget({
                        title: 'GraphQL API Requests',
                        left: [
                            new cloudwatch.Metric({
                                namespace: 'AWS/AppSync',
                                metricName: '4XXError',
                                dimensionsMap: {
                                    GraphQLAPIId: apiStack.graphqlApi.apiId
                                },
                                statistic: 'Sum'
                            }),
                            new cloudwatch.Metric({
                                namespace: 'AWS/AppSync',
                                metricName: '5XXError',
                                dimensionsMap: {
                                    GraphQLAPIId: apiStack.graphqlApi.apiId
                                },
                                statistic: 'Sum'
                            })
                        ],
                        right: [
                            new cloudwatch.Metric({
                                namespace: 'AWS/AppSync',
                                metricName: 'Latency',
                                dimensionsMap: {
                                    GraphQLAPIId: apiStack.graphqlApi.apiId
                                },
                                statistic: 'Average'
                            })
                        ]
                    })
                ],
                [
                    // CloudFront Metrics
                    new cloudwatch.GraphWidget({
                        title: 'CloudFront Requests',
                        left: [
                            new cloudwatch.Metric({
                                namespace: 'AWS/CloudFront',
                                metricName: 'Requests',
                                dimensionsMap: {
                                    DistributionId: webStack.distribution.distributionId
                                },
                                statistic: 'Sum'
                            })
                        ],
                        right: [
                            new cloudwatch.Metric({
                                namespace: 'AWS/CloudFront',
                                metricName: 'OriginLatency',
                                dimensionsMap: {
                                    DistributionId: webStack.distribution.distributionId
                                },
                                statistic: 'Average'
                            })
                        ]
                    })
                ]
            ]
        });
        // Alarms
        const apiErrorAlarm = new cloudwatch.Alarm(this, `AuteuriumApiErrors-${stage}`, {
            alarmName: `auteurium-api-errors-${stage}`,
            alarmDescription: 'High error rate in GraphQL API',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/AppSync',
                metricName: '5XXError',
                dimensionsMap: {
                    GraphQLAPIId: apiStack.graphqlApi.apiId
                },
                statistic: 'Sum'
            }),
            threshold: 5,
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        const apiLatencyAlarm = new cloudwatch.Alarm(this, `AuteuriumApiLatency-${stage}`, {
            alarmName: `auteurium-api-latency-${stage}`,
            alarmDescription: 'High latency in GraphQL API',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/AppSync',
                metricName: 'Latency',
                dimensionsMap: {
                    GraphQLAPIId: apiStack.graphqlApi.apiId
                },
                statistic: 'Average'
            }),
            threshold: 5000,
            evaluationPeriods: 3,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Add SNS actions to alarms
        if (stage === 'prod') {
            apiErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
            apiLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
        }
        // Export monitoring resources
        new cdk.CfnOutput(this, 'DashboardUrl', {
            value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
            exportName: `Auteurium-DashboardUrl-${stage}`
        });
        new cdk.CfnOutput(this, 'AlertTopicArn', {
            value: alertTopic.topicArn,
            exportName: `Auteurium-AlertTopicArn-${stage}`
        });
    }
}
exports.AuteuriumMonitoringStack = AuteuriumMonitoringStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0ZXVyaXVtLW1vbml0b3Jpbmctc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRldXJpdW0tbW9uaXRvcmluZy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBa0M7QUFDbEMseURBQXdEO0FBQ3hELDZDQUE0QztBQUM1QywyQ0FBMEM7QUFFMUMsd0VBQXVFO0FBV3ZFLE1BQWEsd0JBQXlCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDckQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQztRQUM1RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QixNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFM0MsdUJBQXVCO1FBQ3ZCLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEtBQUssRUFBRSxFQUFFO1lBQ2pFLFNBQVMsRUFBRSxvQkFBb0IsS0FBSyxFQUFFO1lBQ3RDLFdBQVcsRUFBRSxxQkFBcUIsS0FBSyxHQUFHO1NBQzNDLENBQUMsQ0FBQTtRQUVGLGFBQWE7UUFDYixNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG9CQUFvQixLQUFLLEVBQUUsRUFBRTtZQUN2RSxZQUFZLEVBQUUscUJBQXFCLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFO1lBQzlELFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7WUFDdEMsYUFBYSxFQUFFLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDdkYsQ0FBQyxDQUFBO1FBRUYsdUJBQXVCO1FBQ3ZCLE1BQU0sU0FBUyxH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Y2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCdcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucydcbmltcG9ydCAqIGFzIHN1YnNjcmlwdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zJ1xuaW1wb3J0ICogYXMgY2xvdWR3YXRjaEFjdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gtYWN0aW9ucydcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5pbXBvcnQgeyBBdXRldXJpdW1BcGlTdGFjayB9IGZyb20gJy4vYXV0ZXVyaXVtLWFwaS1zdGFjaydcbmltcG9ydCB7IEF1dGV1cml1bVdlYlN0YWNrIH0gZnJvbSAnLi9hdXRldXJpdW0td2ViLXN0YWNrJ1xuXG5pbnRlcmZhY2UgQXV0ZXVyaXVtTW9uaXRvcmluZ1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmdcbiAgYXBpU3RhY2s6IEF1dGV1cml1bUFwaVN0YWNrXG4gIHdlYlN0YWNrOiBBdXRldXJpdW1XZWJTdGFja1xufVxuXG5leHBvcnQgY2xhc3MgQXV0ZXVyaXVtTW9uaXRvcmluZ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEF1dGV1cml1bU1vbml0b3JpbmdTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIGNvbnN0IHsgc3RhZ2UsIGFwaVN0YWNrLCB3ZWJTdGFjayB9ID0gcHJvcHNcblxuICAgIC8vIFNOUyB0b3BpYyBmb3IgYWxlcnRzXG4gICAgY29uc3QgYWxlcnRUb3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgYEF1dGV1cml1bUFsZXJ0cy0ke3N0YWdlfWAsIHtcbiAgICAgIHRvcGljTmFtZTogYGF1dGV1cml1bS1hbGVydHMtJHtzdGFnZX1gLFxuICAgICAgZGlzcGxheU5hbWU6IGBBdXRldXJpdW0gQWxlcnRzICgke3N0YWdlfSlgXG4gICAgfSlcblxuICAgIC8vIExvZyBncm91cHNcbiAgICBjb25zdCBhcGlMb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsIGBBdXRldXJpdW1BcGlMb2dzLSR7c3RhZ2V9YCwge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9hcHBzeW5jL2FwaXMvJHthcGlTdGFjay5ncmFwaHFsQXBpLmFwaUlkfWAsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSlcblxuICAgIC8vIENsb3VkV2F0Y2ggRGFzaGJvYXJkXG4gICAgY29uc3QgZGFzaGJvYXJkID0gbmV3IGNsb3Vkd2F0Y2guRGFzaGJvYXJkKHRoaXMsIGBBdXRldXJpdW1EYXNoYm9hcmQtJHtzdGFnZX1gLCB7XG4gICAgICBkYXNoYm9hcmROYW1lOiBgYXV0ZXVyaXVtLSR7c3RhZ2V9YCxcbiAgICAgIHdpZGdldHM6IFtcbiAgICAgICAgW1xuICAgICAgICAgIC8vIEFQSSBNZXRyaWNzXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgICAgICAgdGl0bGU6ICdHcmFwaFFMIEFQSSBSZXF1ZXN0cycsXG4gICAgICAgICAgICBsZWZ0OiBbXG4gICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwcFN5bmMnLFxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICc0WFhFcnJvcicsXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICAgICAgR3JhcGhRTEFQSUlkOiBhcGlTdGFjay5ncmFwaHFsQXBpLmFwaUlkXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nXG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcHBTeW5jJyxcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnNVhYRXJyb3InLFxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcbiAgICAgICAgICAgICAgICAgIEdyYXBoUUxBUElJZDogYXBpU3RhY2suZ3JhcGhxbEFwaS5hcGlJZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJ1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJpZ2h0OiBbXG4gICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwcFN5bmMnLFxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdMYXRlbmN5JyxcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgICAgICBHcmFwaFFMQVBJSWQ6IGFwaVN0YWNrLmdyYXBocWxBcGkuYXBpSWRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSlcbiAgICAgICAgXSxcbiAgICAgICAgW1xuICAgICAgICAgIC8vIENsb3VkRnJvbnQgTWV0cmljc1xuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgICAgIHRpdGxlOiAnQ2xvdWRGcm9udCBSZXF1ZXN0cycsXG4gICAgICAgICAgICBsZWZ0OiBbXG4gICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0Nsb3VkRnJvbnQnLFxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdSZXF1ZXN0cycsXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICAgICAgRGlzdHJpYnV0aW9uSWQ6IHdlYlN0YWNrLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJ1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJpZ2h0OiBbXG4gICAgICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0Nsb3VkRnJvbnQnLFxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdPcmlnaW5MYXRlbmN5JyxcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgICAgICBEaXN0cmlidXRpb25JZDogd2ViU3RhY2suZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJ1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH0pXG4gICAgICAgIF1cbiAgICAgIF1cbiAgICB9KVxuXG4gICAgLy8gQWxhcm1zXG4gICAgY29uc3QgYXBpRXJyb3JBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsIGBBdXRldXJpdW1BcGlFcnJvcnMtJHtzdGFnZX1gLCB7XG4gICAgICBhbGFybU5hbWU6IGBhdXRldXJpdW0tYXBpLWVycm9ycy0ke3N0YWdlfWAsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnSGlnaCBlcnJvciByYXRlIGluIEdyYXBoUUwgQVBJJyxcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwcFN5bmMnLFxuICAgICAgICBtZXRyaWNOYW1lOiAnNVhYRXJyb3InLFxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgR3JhcGhRTEFQSUlkOiBhcGlTdGFjay5ncmFwaHFsQXBpLmFwaUlkXG4gICAgICAgIH0sXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bSdcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiA1LFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElOR1xuICAgIH0pXG5cbiAgICBjb25zdCBhcGlMYXRlbmN5QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCBgQXV0ZXVyaXVtQXBpTGF0ZW5jeS0ke3N0YWdlfWAsIHtcbiAgICAgIGFsYXJtTmFtZTogYGF1dGV1cml1bS1hcGktbGF0ZW5jeS0ke3N0YWdlfWAsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnSGlnaCBsYXRlbmN5IGluIEdyYXBoUUwgQVBJJyxcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwcFN5bmMnLFxuICAgICAgICBtZXRyaWNOYW1lOiAnTGF0ZW5jeScsXG4gICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcbiAgICAgICAgICBHcmFwaFFMQVBJSWQ6IGFwaVN0YWNrLmdyYXBocWxBcGkuYXBpSWRcbiAgICAgICAgfSxcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZSdcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiA1MDAwLCAvLyA1IHNlY29uZHNcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAzLFxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkdcbiAgICB9KVxuXG4gICAgLy8gQWRkIFNOUyBhY3Rpb25zIHRvIGFsYXJtc1xuICAgIGlmIChzdGFnZSA9PT0gJ3Byb2QnKSB7XG4gICAgICBhcGlFcnJvckFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24oYWxlcnRUb3BpYykpXG4gICAgICBhcGlMYXRlbmN5QWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbihhbGVydFRvcGljKSlcbiAgICB9XG5cbiAgICAvLyBFeHBvcnQgbW9uaXRvcmluZyByZXNvdXJjZXNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGFzaGJvYXJkVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy5yZWdpb259LmNvbnNvbGUuYXdzLmFtYXpvbi5jb20vY2xvdWR3YXRjaC9ob21lP3JlZ2lvbj0ke3RoaXMucmVnaW9ufSNkYXNoYm9hcmRzOm5hbWU9JHtkYXNoYm9hcmQuZGFzaGJvYXJkTmFtZX1gLFxuICAgICAgZXhwb3J0TmFtZTogYEF1dGV1cml1bS1EYXNoYm9hcmRVcmwtJHtzdGFnZX1gXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbGVydFRvcGljQXJuJywge1xuICAgICAgdmFsdWU6IGFsZXJ0VG9waWMudG9waWNBcm4sXG4gICAgICBleHBvcnROYW1lOiBgQXV0ZXVyaXVtLUFsZXJ0VG9waWNBcm4tJHtzdGFnZX1gXG4gICAgfSlcbiAgfVxufSJdfQ==