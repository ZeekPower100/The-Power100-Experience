@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"
echo Getting ALB DNS Name...
aws cloudformation describe-stacks --stack-name TPE-Production --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" --output text