@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo ALB Health Check Configuration:
echo ================================
aws elbv2 describe-target-groups --target-group-arns %TG_ARN% --query "TargetGroups[0].[HealthCheckPath,HealthCheckPort,Matcher.HttpCode,HealthCheckProtocol,HealthCheckIntervalSeconds,HealthyThresholdCount,UnhealthyThresholdCount]" --output table

echo.
echo Target Registration Details:
aws elbv2 describe-target-health --target-group-arn %TG_ARN% --query "TargetHealthDescriptions[*].[Target.Id,Target.Port,TargetHealth.State,TargetHealth.Description]" --output table