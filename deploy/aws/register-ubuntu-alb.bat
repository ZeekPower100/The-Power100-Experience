@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Getting Target Group ARN...
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo Registering Ubuntu instance with ALB...
aws elbv2 register-targets --target-group-arn %TG_ARN% --targets Id=i-02fc62e00d42a85b6

echo Checking health...
aws elbv2 describe-target-health --target-group-arn %TG_ARN% --targets Id=i-02fc62e00d42a85b6

echo.
echo Getting ALB DNS...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name TPE-Production --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" --output text') do set ALB_DNS=%%i
echo.
echo ========================================
echo Access your app at:
echo http://%ALB_DNS%
echo Direct access:
echo http://3.95.250.211:3000
echo ========================================