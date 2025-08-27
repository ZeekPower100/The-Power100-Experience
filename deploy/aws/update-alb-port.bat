@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Getting Target Group ARN...
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo Registering Ubuntu instance on port 3000...
aws elbv2 register-targets --target-group-arn %TG_ARN% --targets Id=i-02fc62e00d42a85b6,Port=3000

echo Checking health...
aws elbv2 describe-target-health --target-group-arn %TG_ARN%

echo.
echo ========================================
echo Your app will be available at:
echo http://tpx.power100.io
echo (After DNS propagates in 5-30 minutes)
echo ========================================