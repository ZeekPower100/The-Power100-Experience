@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Getting VPC CIDR for ALB access...
for /f "tokens=*" %%i in ('aws ec2 describe-vpcs --vpc-ids vpc-028f67a675f47aaa3 --query "Vpcs[0].CidrBlock" --output text') do set VPC_CIDR=%%i

echo VPC CIDR: %VPC_CIDR%
echo.
echo Adding security group rule to allow ALB traffic on port 3000...
aws ec2 authorize-security-group-ingress --group-id sg-0a6a4ed08f1dedc2e --protocol tcp --port 3000 --source-group sg-0a6a4ed08f1dedc2e

echo Also allowing all VPC traffic to port 3000...
aws ec2 authorize-security-group-ingress --group-id sg-0a6a4ed08f1dedc2e --protocol tcp --port 3000 --cidr %VPC_CIDR%

echo.
echo Waiting for changes to apply...
timeout /t 15 /nobreak

echo.
echo Checking health status...
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i
aws elbv2 describe-target-health --target-group-arn %TG_ARN% --query "TargetHealthDescriptions[0].TargetHealth.State" --output text

echo.
echo Done! Your site should work at http://tpx.power100.io