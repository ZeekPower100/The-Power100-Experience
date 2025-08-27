@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo ===========================================
echo FULL ALB DIAGNOSTIC
echo ===========================================
echo.

for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo 1. Target Health Status:
aws elbv2 describe-target-health --target-group-arn %TG_ARN%

echo.
echo 2. ALB Listener Configuration:
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::LoadBalancer'].PhysicalResourceId" --output text') do set ALB_ARN=%%i
aws elbv2 describe-listeners --load-balancer-arn %ALB_ARN% --query "Listeners[*].[Port,Protocol,DefaultActions[0].TargetGroupArn]" --output table

echo.
echo 3. Security Group Inbound Rules:
aws ec2 describe-security-groups --group-ids sg-0a6a4ed08f1dedc2e --query "SecurityGroups[0].IpPermissions[*].[FromPort,ToPort,IpProtocol,IpRanges[0].CidrIp]" --output table

echo.
echo 4. Testing Direct Access:
curl -I http://3.95.250.211:3000/

echo.
echo 5. Testing ALB Access:
curl -I http://TPE-ALB-production-20459154.us-east-1.elb.amazonaws.com/