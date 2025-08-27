@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Getting Target Group ARN...
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo Updating health check to use root path...
aws elbv2 modify-target-group --target-group-arn %TG_ARN% --health-check-path "/" --health-check-port 3000 --health-check-protocol HTTP

echo Waiting for health check update...
timeout /t 10 /nobreak > nul

echo Checking health status...
aws elbv2 describe-target-health --target-group-arn %TG_ARN%

echo.
echo Health check updated! Wait 30-60 seconds for it to become healthy.
echo Your app will then be available at http://tpx.power100.io