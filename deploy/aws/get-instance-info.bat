@echo off
set "AWS_CLI=C:\Program Files\Amazon\AWSCLIV2\aws.exe"
set INSTANCE_ID=i-04492d168b41611d5

echo Getting instance information...
echo.

REM Get public IP
for /f "tokens=*" %%i in ('"%AWS_CLI%" ec2 describe-instances --instance-ids %INSTANCE_ID% --query "Reservations[0].Instances[0].PublicIpAddress" --output text') do set PUBLIC_IP=%%i

REM Get instance state
for /f "tokens=*" %%i in ('"%AWS_CLI%" ec2 describe-instances --instance-ids %INSTANCE_ID% --query "Reservations[0].Instances[0].State.Name" --output text') do set STATE=%%i

REM Get target group ARN
for /f "tokens=*" %%i in ('"%AWS_CLI%" cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo ========================================
echo Instance Information
echo ========================================
echo Instance ID: %INSTANCE_ID%
echo State: %STATE%
echo Public IP: %PUBLIC_IP%
echo.
echo SSH Access:
echo ssh -i tpe-working-key.pem ec2-user@%PUBLIC_IP%
echo.

REM Register with target group if not already
if not "%TG_ARN%"=="" (
    echo Registering instance with ALB target group...
    "%AWS_CLI%" elbv2 register-targets --target-group-arn %TG_ARN% --targets Id=%INSTANCE_ID%
    echo Instance registered with load balancer!
) else (
    echo WARNING: No target group found.
)

echo ========================================