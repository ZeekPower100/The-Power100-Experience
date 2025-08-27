@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo Checking target health...
aws elbv2 describe-target-health --target-group-arn %TG_ARN% --query "TargetHealthDescriptions[0].TargetHealth.[State,Reason]" --output table

echo.
echo States:
echo - initial = Still registering (wait 30-60 seconds)
echo - healthy = Working! Site should be accessible
echo - unhealthy = Health check failing (check if app is running)
echo.
echo Your site: http://tpx.power100.io