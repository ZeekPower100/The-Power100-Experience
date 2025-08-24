@echo off
echo Launching Ubuntu EC2 Instance (This will work!)
set "AWS_CLI=C:\Program Files\Amazon\AWSCLIV2\aws.exe"

REM Ubuntu 22.04 AMI for us-east-1
set AMI_ID=ami-0e2c8caa4b6378d8c

"%AWS_CLI%" ec2 run-instances ^
    --image-id %AMI_ID% ^
    --instance-type t3.medium ^
    --key-name tpe-working-key ^
    --subnet-id subnet-0a948f68b24acce63 ^
    --security-group-ids sg-0a6a4ed08f1dedc2e ^
    --associate-public-ip-address ^
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":20}}]" ^
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=TPE-UBUNTU-WORKING}]" ^
    --user-data file://ubuntu-setup.txt ^
    --output json > ubuntu-instance.json

for /f "tokens=*" %%i in ('powershell -Command "(Get-Content 'ubuntu-instance.json' | ConvertFrom-Json).Instances[0].InstanceId"') do set INSTANCE_ID=%%i
echo Instance ID: %INSTANCE_ID%

"%AWS_CLI%" ec2 wait instance-running --instance-ids %INSTANCE_ID%
for /f "tokens=*" %%i in ('"%AWS_CLI%" ec2 describe-instances --instance-ids %INSTANCE_ID% --query "Reservations[0].Instances[0].PublicIpAddress" --output text') do set PUBLIC_IP=%%i

echo.
echo ========================================
echo Ubuntu Instance Ready!
echo IP: %PUBLIC_IP%
echo SSH: ssh -i tpe-working-key.pem ubuntu@%PUBLIC_IP%
echo ========================================