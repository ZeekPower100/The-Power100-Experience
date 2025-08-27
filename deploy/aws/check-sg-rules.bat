@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Checking Security Group rules...
aws ec2 describe-security-groups --group-ids sg-0a6a4ed08f1dedc2e --query "SecurityGroups[0].IpPermissions[?ToPort==`3000`]" --output json

echo.
echo Testing direct access from outside...
curl -I http://3.95.250.211:3000/