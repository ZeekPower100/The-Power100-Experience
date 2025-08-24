@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Getting Target Group ARN...
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo Target Group: %TG_ARN%
echo.
echo Registering instance i-04492d168b41611d5 with ALB...
aws elbv2 register-targets --target-group-arn %TG_ARN% --targets Id=i-04492d168b41611d5

echo.
echo Checking target health...
aws elbv2 describe-target-health --target-group-arn %TG_ARN% --targets Id=i-04492d168b41611d5