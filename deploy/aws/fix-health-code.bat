@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo Fixing health check to expect HTTP 200...
aws elbv2 modify-target-group --target-group-arn %TG_ARN% --matcher HttpCode=200

echo Done! Waiting for health check...
timeout /t 30 /nobreak

echo.
echo Checking health status...
aws elbv2 describe-target-health --target-group-arn %TG_ARN% --query "TargetHealthDescriptions[0].TargetHealth.[State,Reason]" --output table

echo.
echo ========================================
echo Your site should now work at:
echo http://tpx.power100.io
echo ========================================