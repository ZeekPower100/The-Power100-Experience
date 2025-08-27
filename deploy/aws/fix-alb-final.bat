@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Getting Target Group ARN...
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo.
echo Current target group configuration:
aws elbv2 describe-target-groups --target-group-arns %TG_ARN% --query "TargetGroups[0].[Port,Protocol,HealthCheckPath,HealthCheckPort]" --output table

echo.
echo Modifying target group to port 3000...
aws elbv2 modify-target-group --target-group-arn %TG_ARN% --port 3000

echo.
echo De-registering old targets...
aws elbv2 deregister-targets --target-group-arn %TG_ARN% --targets Id=i-02fc62e00d42a85b6

echo.
echo Re-registering Ubuntu instance on port 3000...
aws elbv2 register-targets --target-group-arn %TG_ARN% --targets Id=i-02fc62e00d42a85b6,Port=3000

echo.
echo Waiting 30 seconds for changes to apply...
timeout /t 30 /nobreak

echo.
echo Checking final health status...
aws elbv2 describe-target-health --target-group-arn %TG_ARN%

echo.
echo ========================================
echo If health check shows "healthy", your site should work at:
echo http://tpx.power100.io
echo ========================================