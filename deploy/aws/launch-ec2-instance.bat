@echo off
echo ========================================
echo Launching EC2 Instance for TPE Application
echo ========================================

REM Get CloudFormation outputs and resources
echo Getting CloudFormation outputs...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name TPE-Production --query "Stacks[0].Outputs[?OutputKey=='VPCId'].OutputValue" --output text') do set VPC_ID=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name TPE-Production --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue" --output text') do set DB_ENDPOINT=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name TPE-Production --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" --output text') do set ALB_DNS=%%i

REM Get resources directly from stack since outputs might be missing
echo Getting resources from stack...
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::EC2::Subnet' && contains(LogicalResourceId,'PublicSubnet1')].PhysicalResourceId" --output text') do set SUBNET_ID=%%i
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::EC2::SecurityGroup' && contains(LogicalResourceId,'EC2SecurityGroup')].PhysicalResourceId" --output text') do set SG_ID=%%i
for /f "tokens=*" %%i in ('aws cloudformation list-stack-resources --stack-name TPE-Production --query "StackResourceSummaries[?ResourceType=='AWS::ElasticLoadBalancingV2::TargetGroup'].PhysicalResourceId" --output text') do set TG_ARN=%%i

echo VPC ID: %VPC_ID%
echo Subnet ID: %SUBNET_ID%
echo Security Group ID: %SG_ID%
echo Target Group ARN: %TG_ARN%
echo Database Endpoint: %DB_ENDPOINT%
echo ALB DNS: %ALB_DNS%

REM Check if we have required values
if "%SUBNET_ID%"=="" (
    echo ERROR: Could not find Subnet ID. Checking for any public subnet in VPC...
    for /f "tokens=*" %%i in ('aws ec2 describe-subnets --filters "Name=vpc-id,Values=%VPC_ID%" --query "Subnets[0].SubnetId" --output text') do set SUBNET_ID=%%i
    echo Using Subnet: %SUBNET_ID%
)

if "%SG_ID%"=="" (
    echo ERROR: Could not find Security Group ID. Creating a new one...
    aws ec2 create-security-group --group-name TPE-EC2-SG --description "Security group for TPE EC2" --vpc-id %VPC_ID% --output text > sg-temp.txt
    set /p SG_ID=<sg-temp.txt
    del sg-temp.txt
    aws ec2 authorize-security-group-ingress --group-id %SG_ID% --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id %SG_ID% --protocol tcp --port 3000 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id %SG_ID% --protocol tcp --port 5000 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id %SG_ID% --protocol tcp --port 22 --cidr 0.0.0.0/0
    echo Created Security Group: %SG_ID%
)

REM Create key pair if it doesn't exist
echo.
echo Creating EC2 key pair...
aws ec2 create-key-pair --key-name tpe-prod-key2 --query "KeyMaterial" --output text > tpe-prod-key2.pem 2>nul
if %errorlevel% neq 0 (
    echo Key pair already exists, continuing...
)

REM Get latest Amazon Linux 2023 AMI (supports Node.js 18)
echo.
echo Getting latest Amazon Linux 2023 AMI...
for /f "tokens=*" %%i in ('aws ec2 describe-images --owners amazon --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text') do set AMI_ID=%%i
echo AMI ID: %AMI_ID%

REM Prepare user data with environment variables
echo.
echo Preparing user data script...
powershell -Command "(Get-Content 'ec2-user-data-al2023.sh') -replace '\${DB_ENDPOINT}', '%DB_ENDPOINT%' -replace '\${ALB_DNS}', '%ALB_DNS%' -replace '\${DB_PASSWORD}', $env:DB_PASSWORD -replace '\${JWT_SECRET}', $env:JWT_SECRET | Out-File -encoding ASCII 'ec2-user-data-temp.sh'"

REM Launch EC2 instance
echo.
echo Launching EC2 instance...
aws ec2 run-instances ^
    --image-id %AMI_ID% ^
    --instance-type t3.small ^
    --key-name tpe-prod-key2 ^
    --subnet-id %SUBNET_ID% ^
    --security-group-ids %SG_ID% ^
    --associate-public-ip-address ^
    --user-data file://ec2-user-data-temp.sh ^
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=TPE-Production-Instance},{Key=Environment,Value=production}]" ^
    --output json > instance-launch.json

REM Get instance ID
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content 'instance-launch.json' | ConvertFrom-Json).Instances[0].InstanceId"') do set INSTANCE_ID=%%i
echo Instance ID: %INSTANCE_ID%

REM Wait for instance to be running
echo.
echo Waiting for instance to be running...
aws ec2 wait instance-running --instance-ids %INSTANCE_ID%
echo Instance is running!

REM Get public IP
for /f "tokens=*" %%i in ('aws ec2 describe-instances --instance-ids %INSTANCE_ID% --query "Reservations[0].Instances[0].PublicIpAddress" --output text') do set PUBLIC_IP=%%i
echo Public IP: %PUBLIC_IP%

REM Register instance with target group
echo.
if not "%TG_ARN%"=="" (
    echo Registering instance with ALB target group...
    aws elbv2 register-targets --target-group-arn %TG_ARN% --targets Id=%INSTANCE_ID%
) else (
    echo WARNING: No target group found. Instance will not be registered with load balancer.
    echo You can access the application directly at: http://%PUBLIC_IP%
)

echo.
echo ========================================
echo EC2 Instance Launched Successfully!
echo ========================================
echo Instance ID: %INSTANCE_ID%
echo Public IP: %PUBLIC_IP%
echo.
echo The application will be available in 3-5 minutes at:
echo http://%ALB_DNS%
echo.
echo You can SSH to the instance using:
echo ssh -i tpe-prod-key2.pem ec2-user@%PUBLIC_IP%
echo ========================================

REM Clean up temp files
del ec2-user-data-temp.sh 2>nul
del instance-launch.json 2>nul
