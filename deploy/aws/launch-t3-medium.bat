@echo off
echo ========================================
echo Launching t3.medium EC2 Instance for TPE
echo ========================================

REM Set AWS CLI path
set "AWS_CLI=C:\Program Files\Amazon\AWSCLIV2\aws.exe"

REM Launch t3.medium EC2 instance with 20GB storage
echo Launching EC2 instance...
""%AWS_CLI%"" ec2 run-instances ^
    --image-id ami-0453ec754f44f9a4a ^
    --instance-type t3.medium ^
    --key-name tpe-working-key ^
    --subnet-id subnet-0a948f68b24acce63 ^
    --security-group-ids sg-0a6a4ed08f1dedc2e ^
    --associate-public-ip-address ^
    --block-device-mappings "[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":20,\"VolumeType\":\"gp3\"}}]" ^
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=TPE-FINAL-WORKING},{Key=Environment,Value=production}]" ^
    --user-data file://ec2-user-data-al2023.sh ^
    --output json > instance-launch.json

REM Get instance ID
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content 'instance-launch.json' | ConvertFrom-Json).Instances[0].InstanceId"') do set INSTANCE_ID=%%i
echo Instance ID: %INSTANCE_ID%

REM Wait for instance to be running
echo.
echo Waiting for instance to be running...
"%AWS_CLI%" ec2 wait instance-running --instance-ids %INSTANCE_ID%
echo Instance is running!

REM Get public IP
for /f "tokens=*" %%i in ('"%AWS_CLI%" ec2 describe-instances --instance-ids %INSTANCE_ID% --query "Reservations[0].Instances[0].PublicIpAddress" --output text') do set PUBLIC_IP=%%i
echo Public IP: %PUBLIC_IP%

REM Get target group ARN from CloudFormation
for /f "tokens=*" %%i in ('"%AWS_CLI%" cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

REM Register instance with target group
if not "%TG_ARN%"=="" (
    echo Registering instance with ALB target group...
    "%AWS_CLI%" elbv2 register-targets --target-group-arn %TG_ARN% --targets Id=%INSTANCE_ID%
) else (
    echo WARNING: No target group found. Instance will not be registered with load balancer.
)

echo.
echo ========================================
echo EC2 Instance Launched Successfully!
echo ========================================
echo Instance ID: %INSTANCE_ID%
echo Public IP: %PUBLIC_IP%
echo Instance Type: t3.medium
echo Storage: 20GB gp3
echo.
echo SSH Access:
echo ssh -i tpe-working-key.pem ec2-user@%PUBLIC_IP%
echo ========================================

REM Clean up
del instance-launch.json 2>nul