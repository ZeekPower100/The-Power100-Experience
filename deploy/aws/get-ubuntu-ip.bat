@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"
aws ec2 describe-instances --instance-ids i-02fc62e00d42a85b6 --query "Reservations[0].Instances[0].PublicIpAddress" --output text