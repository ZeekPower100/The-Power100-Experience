@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Adding HTTPS listener to ALB...

REM Get the certificate ARN (you'll need to update this after running setup-https.bat)
set /p CERT_ARN="Enter Certificate ARN from previous step: "

REM Get ALB ARN
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::LoadBalancer'].PhysicalResourceId" --output text') do set ALB_ARN=%%i

REM Get Target Group ARN
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo Creating HTTPS listener on port 443...
aws elbv2 create-listener --load-balancer-arn %ALB_ARN% --protocol HTTPS --port 443 --certificates CertificateArn=%CERT_ARN% --default-actions Type=forward,TargetGroupArn=%TG_ARN%

echo.
echo ========================================
echo HTTPS Setup Complete!
echo Your site is now available at:
echo https://tpx.power100.io
echo ========================================